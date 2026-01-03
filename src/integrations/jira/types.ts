/**
 * Jira Integration Types
 *
 * Types for Jira REST API integration.
 */

/**
 * Jira configuration
 */
export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

/**
 * Jira issue representation
 */
export interface JiraIssue {
  key: string;
  id: string;
  summary: string;
  description: string;
  status: string;
  labels: string[];
  issueType: string;
  priority?: string;
  assignee?: string;
  reporter?: string;
  created: string;
  updated: string;
}

/**
 * Jira issue creation request
 */
export interface CreateIssueRequest {
  projectKey: string;
  issueType: string;
  summary: string;
  description: string;
  labels?: string[];
  parentKey?: string;  // For subtasks
  assignee?: string;
  priority?: string;
  customFields?: Record<string, unknown>;
}

/**
 * Jira subtask for approval workflow
 */
export interface ApprovalSubtask {
  parentKey: string;
  summary: string;
  description: string;
  phase: 'plan_review' | 'cases_review' | 'code_review';
  artifactUrl?: string;
  assignee?: string;
}

/**
 * Jira comment
 */
export interface JiraComment {
  id: string;
  body: string;
  author: string;
  created: string;
  updated: string;
}

/**
 * Jira transition
 */
export interface JiraTransition {
  id: string;
  name: string;
  to: {
    id: string;
    name: string;
  };
}

/**
 * Story source configuration
 */
export interface StorySourceConfig {
  /** Map story IDs to Jira issue keys */
  storyIdPattern?: RegExp;
  /** Custom field for acceptance criteria */
  acceptanceCriteriaField?: string;
  /** Custom field for test generation status */
  testStatusField?: string;
}

/**
 * Approval handler configuration
 */
export interface ApprovalHandlerConfig {
  /** Poll interval in ms (default: 30000) */
  pollIntervalMs?: number;
  /** Timeout in ms (default: 3600000 - 1 hour) */
  timeoutMs?: number;
  /** Status that indicates approval */
  approvedStatus?: string;
  /** Status that indicates rejection */
  rejectedStatus?: string;
}
