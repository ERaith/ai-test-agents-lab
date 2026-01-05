/**
 * Workflow Orchestrator
 *
 * The orchestrator is the "brain" that coordinates agents.
 * Key responsibilities:
 * - Workflow state management
 * - Agent sequencing
 * - Human approval gates
 * - Error handling and recovery
 * - Artifact persistence
 * - Cross-story memory integration
 */

import {
  WorkflowState,
  WorkflowPhase,
  WorkflowEvent,
  OrchestratorConfig,
  ApprovalCallback,
  SystemContext,
} from '../types.js';
import { PlannerAgent, CaseWorkerAgent, CodeWorkerAgent } from '../agents/index.js';
import {
  readFile,
  writeFile,
  fileExists,
  getArtifactPath,
  getTestPath,
  getHelpersPath,
  findExampleTests,
} from '../utils/files.js';
import { createLLMClient } from '../utils/llm.js';
import { generatePromptArtifact } from '../prompts/index.js';
import { loadFeedback, formatFeedbackForPrompt, Feedback } from '../utils/feedback.js';

// Context system imports
import {
  CachingContextLoader,
  DefaultContextRegistry,
  FileMemoryStore,
  createWorkflowMemory,
  buildMemoryContext,
  formatMemoryForPrompt,
  StorageProvider,
} from '../context/index.js';
import { LocalStorageProvider } from '../storage/index.js';

const DEFAULT_CONFIG: OrchestratorConfig = {
  humanApprovalRequired: true,
  maxRetries: 3,
  timeoutMs: 120000,
  outputDir: 'test-artifacts',
};

export class WorkflowOrchestrator {
  private config: OrchestratorConfig;
  private context: SystemContext | null = null;
  private approvalCallback: ApprovalCallback | null = null;
  private verbose: boolean;
  private useFeedback: boolean;
  private callerRepoPath: string | undefined;
  private feedback: Feedback | null = null;

  // Context management
  private storage: StorageProvider;
  private contextLoader: CachingContextLoader;
  private registry: DefaultContextRegistry;
  private memoryStore: FileMemoryStore;

  constructor(
    config: Partial<OrchestratorConfig> = {},
    verbose = false,
    useFeedback = false,
    callerRepoPath?: string
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.verbose = verbose;
    this.useFeedback = useFeedback;
    this.callerRepoPath = callerRepoPath;

    // Initialize context management
    this.storage = new LocalStorageProvider();
    this.contextLoader = new CachingContextLoader(this.storage);
    this.registry = new DefaultContextRegistry(this.storage);
    this.memoryStore = new FileMemoryStore(this.storage);
  }

  /**
   * Set the approval callback for human-in-the-loop
   */
  setApprovalCallback(callback: ApprovalCallback): void {
    this.approvalCallback = callback;
  }

  /**
   * Run the complete workflow for a story
   */
  async runWorkflow(storyId: string): Promise<WorkflowState> {
    this.log(`Starting workflow for ${storyId}`);

    const state = this.createInitialState(storyId);

    try {
      // Load context with caching
      this.context = await this.contextLoader.load();

      // Register system context
      this.registry.register('system', 'main', this.context, {
        source: 'src/prompts/system-context.md',
      });

      await this.loadStory(state);
      await this.generatePlan(state);

      if (this.config.humanApprovalRequired) {
        await this.requestApproval(state, 'plan_review');
      }

      await this.generateCases(state);

      if (this.config.humanApprovalRequired) {
        await this.requestApproval(state, 'cases_review');
      }

      await this.generateCode(state);

      if (this.config.humanApprovalRequired) {
        await this.requestApproval(state, 'code_review');
      }

      this.transitionTo(state, 'completed');
      this.log(`✅ Workflow completed for ${storyId}`);

      // Save to memory for cross-story learning
      await this.saveToMemory(state);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      state.metadata.error = message;
      this.transitionTo(state, 'failed');
      this.log(`❌ Workflow failed: ${message}`, 'error');
    }

    state.metadata.completedAt = new Date();
    return state;
  }

  /**
   * Run only the planning phase
   */
  async runPlanningOnly(storyId: string): Promise<WorkflowState> {
    this.log(`Running planning only for ${storyId}`);

    const state = this.createInitialState(storyId);
    this.context = await this.contextLoader.load();

    await this.loadStory(state);
    await this.generatePlan(state);

    return state;
  }

  /**
   * Run only test case generation (requires existing plan)
   */
  async runCasesOnly(storyId: string): Promise<WorkflowState> {
    this.log(`Running case generation only for ${storyId}`);

    const state = this.createInitialState(storyId);
    this.context = await this.contextLoader.load();

    await this.loadStory(state);
    await this.loadExistingPlan(state);
    await this.generateCases(state);

    return state;
  }

  /**
   * Run only code generation (requires existing scenarios)
   */
  async runCodeOnly(storyId: string): Promise<WorkflowState> {
    this.log(`Running code generation only for ${storyId}`);

    const state = this.createInitialState(storyId);
    this.context = await this.contextLoader.load();

    await this.loadStory(state);
    await this.loadExistingPlan(state);
    await this.loadExistingScenarios(state);
    await this.generateCode(state);

    return state;
  }

  /**
   * Invalidate cached context (call when system-context.md changes)
   */
  invalidateContext(): void {
    this.contextLoader.invalidate();
    this.registry.invalidate('system');
    this.log('Context cache invalidated');
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats() {
    return this.memoryStore.getStats();
  }

  // ============================================================================
  // PRIVATE METHODS - State Management
  // ============================================================================

  private createInitialState(storyId: string): WorkflowState {
    return {
      storyId,
      phase: 'initialized',
      artifacts: {},
      history: [],
      metadata: {
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  private transitionTo(state: WorkflowState, phase: WorkflowPhase, action?: string): void {
    const event: WorkflowEvent = {
      timestamp: new Date(),
      phase,
      action: action || `Transitioned to ${phase}`,
    };

    state.phase = phase;
    state.history.push(event);
    state.metadata.updatedAt = new Date();

    this.log(`Phase: ${phase}`);
  }

  // ============================================================================
  // PRIVATE METHODS - Workflow Steps
  // ============================================================================

  private async loadStory(state: WorkflowState): Promise<void> {
    const storyPath = `specs/${state.storyId}.md`;

    if (!await fileExists(storyPath)) {
      throw new Error(`Story not found: ${storyPath}`);
    }

    state.artifacts.story = await readFile(storyPath);

    // Register story context
    this.registry.register('story', state.storyId, state.artifacts.story, {
      source: storyPath,
      storyId: state.storyId,
    });

    this.log(`Loaded story: ${storyPath}`);

    // Load feedback/patch file if enabled
    if (this.useFeedback) {
      this.feedback = await loadFeedback(state.storyId, this.callerRepoPath);
      if (this.feedback) {
        this.log(`Loaded feedback from: ${this.feedback.source}`);
      }
    }
  }

  private async loadExistingPlan(state: WorkflowState): Promise<void> {
    const planPath = getArtifactPath(state.storyId, 'test-plan.md');

    if (!await fileExists(planPath)) {
      throw new Error(`Test plan not found: ${planPath}. Run planning first.`);
    }

    state.artifacts.testPlan = await readFile(planPath);

    // Register artifact
    this.registry.register('artifact', `${state.storyId}-plan`, state.artifacts.testPlan, {
      source: planPath,
      storyId: state.storyId,
    });

    this.log(`Loaded existing plan: ${planPath}`);
  }

  private async loadExistingScenarios(state: WorkflowState): Promise<void> {
    const scenariosPath = getArtifactPath(state.storyId, 'scenarios.feature');

    if (!await fileExists(scenariosPath)) {
      throw new Error(`Scenarios not found: ${scenariosPath}. Run case generation first.`);
    }

    state.artifacts.gherkinScenarios = await readFile(scenariosPath);

    // Register artifact
    this.registry.register('artifact', `${state.storyId}-scenarios`, state.artifacts.gherkinScenarios, {
      source: scenariosPath,
      storyId: state.storyId,
    });

    this.log(`Loaded existing scenarios: ${scenariosPath}`);
  }

  private async generatePlan(state: WorkflowState): Promise<void> {
    this.transitionTo(state, 'planning', 'Starting test plan generation');

    if (!this.context || !state.artifacts.story) {
      throw new Error('Context and story must be loaded');
    }

    const llm = createLLMClient();
    const planner = new PlannerAgent(llm, this.verbose);

    // Get memory context for cross-story learning
    const memoryContext = await this.getMemoryContext(state.artifacts.story);
    const memoryPrompt = formatMemoryForPrompt(memoryContext);

    // Build payload with memory context and feedback
    const payload: any = {
      story: state.artifacts.story,
      storyId: state.storyId,
    };

    // Add memory context as existing patterns if available
    if (memoryPrompt) {
      payload.existingTestPatterns = memoryPrompt;
    }

    // Add feedback if available
    if (this.feedback) {
      const feedbackPrompt = formatFeedbackForPrompt(this.feedback, 'plan');
      if (feedbackPrompt) {
        payload.feedback = feedbackPrompt;
        this.log('Including user feedback in plan generation');
      }
    }

    const result = await planner.execute({
      context: this.context,
      payload,
    });

    if (!result.success || !result.result) {
      throw new Error(`Planning failed: ${result.error}`);
    }

    state.artifacts.testPlan = result.result;

    // Save artifact
    const planPath = getArtifactPath(state.storyId, 'test-plan.md');
    await writeFile(planPath, result.result);

    // Save prompt artifact for reproducibility
    const prompt = planner.getLastPrompt();
    if (prompt) {
      const promptPath = getArtifactPath(state.storyId, 'prompt-planner.md');
      await writeFile(promptPath, generatePromptArtifact(prompt));
    }

    // Register artifact
    this.registry.register('artifact', `${state.storyId}-plan`, result.result, {
      source: planPath,
      storyId: state.storyId,
    });
  }

  private async generateCases(state: WorkflowState): Promise<void> {
    this.transitionTo(state, 'generating_cases', 'Starting test case generation');

    if (!this.context || !state.artifacts.testPlan) {
      throw new Error('Context and test plan must be loaded');
    }

    const llm = createLLMClient();
    const caseWorker = new CaseWorkerAgent(llm, this.verbose);

    // Build payload with optional feedback
    const payload: any = {
      testPlan: state.artifacts.testPlan,
      storyId: state.storyId,
      story: state.artifacts.story || '',
    };

    // Add feedback if available
    if (this.feedback) {
      const feedbackPrompt = formatFeedbackForPrompt(this.feedback, 'cases');
      if (feedbackPrompt) {
        payload.feedback = feedbackPrompt;
        this.log('Including user feedback in case generation');
      }
    }

    const result = await caseWorker.execute({
      context: this.context,
      payload,
    });

    if (!result.success || !result.result) {
      throw new Error(`Case generation failed: ${result.error}`);
    }

    state.artifacts.gherkinScenarios = result.result;

    // Save artifact
    const scenariosPath = getArtifactPath(state.storyId, 'scenarios.feature');
    await writeFile(scenariosPath, result.result);

    // Save prompt artifact for reproducibility
    const prompt = caseWorker.getLastPrompt();
    if (prompt) {
      const promptPath = getArtifactPath(state.storyId, 'prompt-cases.md');
      await writeFile(promptPath, generatePromptArtifact(prompt));
    }

    // Register artifact
    this.registry.register('artifact', `${state.storyId}-scenarios`, result.result, {
      source: scenariosPath,
      storyId: state.storyId,
    });
  }

  private async generateCode(state: WorkflowState): Promise<void> {
    this.transitionTo(state, 'generating_code', 'Starting test code generation');

    if (!this.context || !state.artifacts.gherkinScenarios) {
      throw new Error('Context and scenarios must be loaded');
    }

    const llm = createLLMClient();
    const codeWorker = new CodeWorkerAgent(llm, this.verbose);

    // Load example tests and helpers based on configured framework
    let exampleTests = '';
    let helpers = '';

    try {
      const testFiles = await findExampleTests(1);
      if (testFiles.length > 0) {
        exampleTests = await readFile(testFiles[0]);
      }
    } catch {
      // No example tests available
    }

    try {
      const helpersPath = getHelpersPath();
      helpers = await readFile(helpersPath);
    } catch {
      // No helpers available
    }

    // Build payload with optional feedback
    const payload: any = {
      gherkinScenarios: state.artifacts.gherkinScenarios,
      storyId: state.storyId,
      exampleTests,
      helpers,
    };

    // Add feedback if available
    if (this.feedback) {
      const feedbackPrompt = formatFeedbackForPrompt(this.feedback, 'code');
      if (feedbackPrompt) {
        payload.feedback = feedbackPrompt;
        this.log('Including user feedback in code generation');
      }
    }

    const result = await codeWorker.execute({
      context: this.context,
      payload,
    });

    if (!result.success || !result.result) {
      throw new Error(`Code generation failed: ${result.error}`);
    }

    state.artifacts.testCode = result.result;

    // Save artifact using framework-appropriate path
    const codePath = getTestPath(state.storyId);
    await writeFile(codePath, result.result);

    // Save prompt artifact for reproducibility
    const prompt = codeWorker.getLastPrompt();
    if (prompt) {
      const promptPath = getArtifactPath(state.storyId, 'prompt-code.md');
      await writeFile(promptPath, generatePromptArtifact(prompt));
    }

    // Register artifact
    this.registry.register('artifact', `${state.storyId}-code`, result.result, {
      source: codePath,
      storyId: state.storyId,
    });
  }

  private async getMemoryContext(storyContent: string) {
    try {
      const matches = await this.memoryStore.getSimilar(storyContent, 3);
      return buildMemoryContext(matches);
    } catch {
      return { relatedStories: [], commonPatterns: [], recommendations: [] };
    }
  }

  private async saveToMemory(state: WorkflowState): Promise<void> {
    try {
      // Extract title from story (first heading or first line)
      const story = state.artifacts.story || '';
      const titleMatch = story.match(/^#\s+(.+)$/m) || story.match(/^(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : state.storyId;

      // Extract tags from scenarios
      const scenarios = state.artifacts.gherkinScenarios || '';
      const tags = [...new Set(scenarios.match(/@[\w-]+/g) || [])];

      // Determine test types from plan
      const plan = state.artifacts.testPlan || '';
      const testTypes: string[] = [];
      if (plan.includes('E2E') || plan.includes('e2e')) testTypes.push('e2e');
      if (plan.includes('API') || plan.includes('api')) testTypes.push('api');
      if (plan.includes('Unit') || plan.includes('unit')) testTypes.push('unit');
      if (testTypes.length === 0) testTypes.push('e2e'); // Default

      // Extract patterns from plan (section headers as patterns)
      const patterns = (plan.match(/^##\s+(.+)$/gm) || [])
        .map(p => p.replace(/^##\s+/, '').trim())
        .slice(0, 5);

      const memory = createWorkflowMemory(state.storyId, title, story, {
        tags,
        testTypes,
        patterns,
        outcome: state.phase === 'completed' ? 'success' : 'failed',
        artifactPaths: {
          testPlan: getArtifactPath(state.storyId, 'test-plan.md'),
          scenarios: getArtifactPath(state.storyId, 'scenarios.feature'),
          testCode: getTestPath(state.storyId),
        },
      });

      await this.memoryStore.save(memory);
      this.log(`Saved workflow to memory: ${state.storyId}`);
    } catch (error) {
      this.log(`Warning: Failed to save to memory: ${error}`, 'error');
    }
  }

  private async requestApproval(state: WorkflowState, phase: WorkflowPhase): Promise<void> {
    this.transitionTo(state, phase, 'Awaiting human approval');

    // Determine which artifact to review
    let artifact: string;
    switch (phase) {
      case 'plan_review':
        artifact = state.artifacts.testPlan || '';
        break;
      case 'cases_review':
        artifact = state.artifacts.gherkinScenarios || '';
        break;
      case 'code_review':
        artifact = state.artifacts.testCode || '';
        break;
      default:
        throw new Error(`Unknown review phase: ${phase}`);
    }

    if (this.approvalCallback) {
      const approved = await this.approvalCallback({
        phase,
        artifact,
        storyId: state.storyId,
      });

      if (!approved) {
        throw new Error(`Approval rejected at ${phase}`);
      }
    } else {
      // No callback - auto-approve (useful for testing/CI)
      this.log(`⚠️  Auto-approving ${phase} (no callback configured)`);
    }
  }

  private log(message: string, level: 'info' | 'error' = 'info'): void {
    const prefix = '[Orchestrator]';
    const icon = level === 'error' ? '❌' : '🎯';
    console.log(`${icon} ${prefix} ${message}`);
  }
}
