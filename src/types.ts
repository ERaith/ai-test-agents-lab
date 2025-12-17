/**
 * Core Types for Agentic Testing Workflow
 * 
 * LEARNING NOTE: These types define the contract between agents and orchestrator.
 * In enterprise systems, strong typing prevents integration bugs and makes
 * the workflow self-documenting.
 */

// ============================================================================
// WORKFLOW STATE
// ============================================================================

/**
 * Workflow phases - each represents a distinct step in the pipeline
 * 
 * INTERVIEW POINT: "Our workflow has clear phases with artifacts at each stage.
 * This makes the system auditable and allows human review at natural checkpoints."
 */
export type WorkflowPhase = 
  | 'initialized'
  | 'planning'
  | 'plan_review'
  | 'generating_cases'
  | 'cases_review'
  | 'generating_code'
  | 'code_review'
  | 'completed'
  | 'failed';

export interface WorkflowState {
  storyId: string;
  phase: WorkflowPhase;
  artifacts: WorkflowArtifacts;
  history: WorkflowEvent[];
  metadata: {
    startedAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    error?: string;
  };
}

export interface WorkflowArtifacts {
  story?: string;
  testPlan?: string;
  gherkinScenarios?: string;
  testCode?: string;
}

export interface WorkflowEvent {
  timestamp: Date;
  phase: WorkflowPhase;
  action: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// AGENT INTERFACES
// ============================================================================

/**
 * Base interface for all agents
 * 
 * LEARNING NOTE: Common interface allows the orchestrator to interact with
 * any agent uniformly. This is the Strategy pattern in action.
 */
export interface Agent {
  name: string;
  description: string;
  execute(input: AgentInput): Promise<AgentOutput>;
}

/**
 * Agent input with generic payload
 * Using 'unknown' with explicit casting in agents for flexibility
 */
export interface AgentInput {
  context: SystemContext;
  payload: AgentPayload;
}

/**
 * Union type for all agent payloads
 */
export type AgentPayload = PlannerPayload | CaseWorkerPayload | CodeWorkerPayload;

export interface PlannerPayload {
  story: string;
  storyId: string;
  existingTestPatterns?: string;
}

export interface CaseWorkerPayload {
  testPlan: string;
  storyId: string;
  story: string;
}

export interface CodeWorkerPayload {
  gherkinScenarios: string;
  storyId: string;
  exampleTests?: string;
  helpers?: string;
}

export interface AgentOutput {
  success: boolean;
  result?: string;
  error?: string;
  metadata?: {
    duration?: number;
    tokens?: {
      inputTokens: number;
      outputTokens: number;
    };
    [key: string]: unknown;
  };
}

// ============================================================================
// PLANNER AGENT TYPES
// ============================================================================

export interface PlannerInput {
  story: string;
  existingTests?: string[];
  coverageData?: CoverageData;
}

export interface TestPlan {
  summary: string;
  riskAnalysis: RiskItem[];
  testGroups: TestGroup[];
  dataRequirements: DataRequirement[];
  openQuestions: string[];
}

export interface RiskItem {
  risk: string;
  likelihood: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
  mitigation: string;
}

export interface TestGroup {
  type: 'unit' | 'integration' | 'e2e' | 'property';
  testCases: TestCaseOutline[];
}

export interface TestCaseOutline {
  id: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  tags: string[];
  notes?: string;
}

export interface DataRequirement {
  description: string;
  setupApproach: string;
}

export interface CoverageData {
  totalLines: number;
  coveredLines: number;
  uncoveredFiles: string[];
}

// ============================================================================
// WORKER AGENT TYPES
// ============================================================================

export interface CaseGeneratorInput {
  testPlan: string;
  storyId: string;
}

export interface CodeGeneratorInput {
  gherkinScenarios: string;
  exampleTests: string[];
  helpers: string;
}

// ============================================================================
// SYSTEM CONTEXT
// ============================================================================

/**
 * Shared context provided to all agents
 * 
 * INTERVIEW POINT: "Every agent receives the same system context, ensuring
 * consistency. This includes tech stack, domain constraints, and output
 * expectations. It's like giving every team member the same playbook."
 */
export interface SystemContext {
  techStack: {
    backend: string;
    frontend: string;
    testFramework: string;
    language: string;
  };
  testingPrinciples: string[];
  domainConstraints: DomainConstraint[];
  outputExpectations: {
    planning: string;
    testCases: string;
    code: string;
  };
  paths: {
    specs: string;
    artifacts: string;
    tests: string;
    helpers: string;
  };
}

export interface DomainConstraint {
  entity: string;
  rules: string[];
}

// ============================================================================
// ORCHESTRATOR TYPES
// ============================================================================

export interface OrchestratorConfig {
  humanApprovalRequired: boolean;
  maxRetries: number;
  timeoutMs: number;
  outputDir: string;
}

export interface ApprovalRequest {
  phase: WorkflowPhase;
  artifact: string;
  storyId: string;
}

export type ApprovalCallback = (request: ApprovalRequest) => Promise<boolean>;

// ============================================================================
// CLI TYPES
// ============================================================================

export interface CLIOptions {
  story: string;
  skipApproval?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}
