/**
 * Workflow Orchestrator
 * 
 * LEARNING NOTE: The orchestrator is the "brain" that coordinates agents.
 * Key responsibilities:
 * - Workflow state management
 * - Agent sequencing
 * - Human approval gates
 * - Error handling and recovery
 * - Artifact persistence
 * 
 * INTERVIEW POINT: "Our orchestrator implements a state machine pattern.
 * Each phase has clear inputs, outputs, and transition rules. Human approval
 * gates are built-in, making the workflow auditable and trustworthy.
 * The state is persisted, so we can resume from failures."
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
import { loadSystemContext } from '../utils/context.js';
import { readFile, writeFile, fileExists, getArtifactPath } from '../utils/files.js';
import { createLLMClient } from '../utils/llm.js';

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

  constructor(config: Partial<OrchestratorConfig> = {}, verbose = false) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.verbose = verbose;
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
      this.context = await loadSystemContext();

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
    this.context = await loadSystemContext();

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
    this.context = await loadSystemContext();

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
    this.context = await loadSystemContext();

    await this.loadStory(state);
    await this.loadExistingPlan(state);
    await this.loadExistingScenarios(state);
    await this.generateCode(state);

    return state;
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
    this.log(`Loaded story: ${storyPath}`);
  }

  private async loadExistingPlan(state: WorkflowState): Promise<void> {
    const planPath = getArtifactPath(state.storyId, 'test-plan.md');
    
    if (!await fileExists(planPath)) {
      throw new Error(`Test plan not found: ${planPath}. Run planning first.`);
    }

    state.artifacts.testPlan = await readFile(planPath);
    this.log(`Loaded existing plan: ${planPath}`);
  }

  private async loadExistingScenarios(state: WorkflowState): Promise<void> {
    const scenariosPath = getArtifactPath(state.storyId, 'scenarios.feature');
    
    if (!await fileExists(scenariosPath)) {
      throw new Error(`Scenarios not found: ${scenariosPath}. Run case generation first.`);
    }

    state.artifacts.gherkinScenarios = await readFile(scenariosPath);
    this.log(`Loaded existing scenarios: ${scenariosPath}`);
  }

  private async generatePlan(state: WorkflowState): Promise<void> {
    this.transitionTo(state, 'planning', 'Starting test plan generation');

    if (!this.context || !state.artifacts.story) {
      throw new Error('Context and story must be loaded');
    }

    const llm = createLLMClient();
    const planner = new PlannerAgent(llm, this.verbose);

    const result = await planner.execute({
      context: this.context,
      payload: {
        story: state.artifacts.story,
        storyId: state.storyId,
      },
    });

    if (!result.success || !result.result) {
      throw new Error(`Planning failed: ${result.error}`);
    }

    state.artifacts.testPlan = result.result;

    // Save artifact
    const planPath = getArtifactPath(state.storyId, 'test-plan.md');
    await writeFile(planPath, result.result);
  }

  private async generateCases(state: WorkflowState): Promise<void> {
    this.transitionTo(state, 'generating_cases', 'Starting test case generation');

    if (!this.context || !state.artifacts.testPlan) {
      throw new Error('Context and test plan must be loaded');
    }

    const llm = createLLMClient();
    const caseWorker = new CaseWorkerAgent(llm, this.verbose);

    const result = await caseWorker.execute({
      context: this.context,
      payload: {
        testPlan: state.artifacts.testPlan,
        storyId: state.storyId,
        story: state.artifacts.story || '',
      },
    });

    if (!result.success || !result.result) {
      throw new Error(`Case generation failed: ${result.error}`);
    }

    state.artifacts.gherkinScenarios = result.result;

    // Save artifact
    const scenariosPath = getArtifactPath(state.storyId, 'scenarios.feature');
    await writeFile(scenariosPath, result.result);
  }

  private async generateCode(state: WorkflowState): Promise<void> {
    this.transitionTo(state, 'generating_code', 'Starting test code generation');

    if (!this.context || !state.artifacts.gherkinScenarios) {
      throw new Error('Context and scenarios must be loaded');
    }

    const llm = createLLMClient();
    const codeWorker = new CodeWorkerAgent(llm, this.verbose);

    // Try to load example tests and helpers
    let exampleTests = '';
    let helpers = '';

    try {
      const testFiles = await this.findExampleTests();
      if (testFiles.length > 0) {
        exampleTests = await readFile(testFiles[0]);
      }
    } catch {
      // No example tests available
    }

    try {
      helpers = await readFile('cypress/support/commands.ts');
    } catch {
      // No helpers available
    }

    const result = await codeWorker.execute({
      context: this.context,
      payload: {
        gherkinScenarios: state.artifacts.gherkinScenarios,
        storyId: state.storyId,
        exampleTests,
        helpers,
      },
    });

    if (!result.success || !result.result) {
      throw new Error(`Code generation failed: ${result.error}`);
    }

    state.artifacts.testCode = result.result;

    // Save artifact
    const codePath = `cypress/e2e/${state.storyId}.cy.ts`;
    await writeFile(codePath, result.result);
  }

  private async findExampleTests(): Promise<string[]> {
    // This would scan for existing test files to use as examples
    // For now, return empty
    return [];
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
