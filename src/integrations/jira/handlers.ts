/**
 * Jira Integration Handlers
 *
 * Story source and approval routing handlers for Jira integration.
 */

import { ApprovalCallback, ApprovalRequest } from '../../types.js';
import { JiraClient } from './client.js';
import {
  ApprovalSubtask,
  StorySourceConfig,
  ApprovalHandlerConfig,
} from './types.js';

const DEFAULT_APPROVAL_CONFIG: Required<ApprovalHandlerConfig> = {
  pollIntervalMs: 30000,  // 30 seconds
  timeoutMs: 3600000,     // 1 hour
  approvedStatus: 'Done',
  rejectedStatus: 'Rejected',
};

/**
 * Fetch story content from Jira issue
 */
export class JiraStorySource {
  constructor(
    private client: JiraClient,
    private config: StorySourceConfig = {}
  ) {}

  /**
   * Fetch story from Jira and format as markdown
   */
  async fetchStory(issueKey: string): Promise<string> {
    const issue = await this.client.getIssue(issueKey);
    return this.formatAsMarkdown(issue);
  }

  /**
   * Convert story ID to Jira issue key
   */
  resolveIssueKey(storyId: string): string {
    // If it looks like a Jira key already, return as-is
    if (/^[A-Z]+-\d+$/.test(storyId)) {
      return storyId;
    }

    // Try to extract from story ID using pattern
    if (this.config.storyIdPattern) {
      const match = storyId.match(this.config.storyIdPattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Default: assume story ID is the issue key
    return storyId.toUpperCase();
  }

  /**
   * Format Jira issue as markdown story
   */
  private formatAsMarkdown(issue: any): string {
    let markdown = `# ${issue.key}: ${issue.summary}\n\n`;

    if (issue.description) {
      markdown += `## Description\n\n${issue.description}\n\n`;
    }

    if (issue.labels?.length) {
      markdown += `## Labels\n\n${issue.labels.map((l: string) => `- ${l}`).join('\n')}\n\n`;
    }

    markdown += `## Metadata\n\n`;
    markdown += `- **Status:** ${issue.status}\n`;
    markdown += `- **Type:** ${issue.issueType}\n`;
    if (issue.priority) markdown += `- **Priority:** ${issue.priority}\n`;
    if (issue.assignee) markdown += `- **Assignee:** ${issue.assignee}\n`;

    return markdown;
  }
}

/**
 * Route approvals through Jira subtasks
 */
export class JiraApprovalRouter {
  private config: Required<ApprovalHandlerConfig>;

  constructor(
    private client: JiraClient,
    private artifactBaseUrl: string = '',
    config: ApprovalHandlerConfig = {}
  ) {
    this.config = { ...DEFAULT_APPROVAL_CONFIG, ...config };
  }

  /**
   * Create an approval callback for a parent issue
   */
  createApprovalCallback(parentIssueKey: string): ApprovalCallback {
    return async (request: ApprovalRequest): Promise<boolean> => {
      const subtask = this.buildSubtask(parentIssueKey, request);

      // Create subtask for review
      const subtaskKey = await this.client.createSubtask(
        subtask.parentKey,
        subtask.summary,
        subtask.description
      );

      console.log(`Created approval subtask: ${subtaskKey}`);

      // Wait for approval
      return this.waitForApproval(subtaskKey);
    };
  }

  /**
   * Build subtask details from approval request
   */
  private buildSubtask(parentKey: string, request: ApprovalRequest): ApprovalSubtask {
    const phaseLabels: Record<string, string> = {
      plan_review: 'Test Plan',
      cases_review: 'Test Cases (Gherkin)',
      code_review: 'Test Code',
    };

    const label = phaseLabels[request.phase] || request.phase;
    const artifactPreview = request.artifact.substring(0, 500);

    let description = `## Review Required: ${label}\n\n`;
    description += `Story: ${request.storyId}\n\n`;

    if (this.artifactBaseUrl) {
      const artifactFile = this.getArtifactFile(request.phase);
      description += `**Artifact URL:** ${this.artifactBaseUrl}/${request.storyId}/${artifactFile}\n\n`;
    }

    description += `## Preview\n\n\`\`\`\n${artifactPreview}${request.artifact.length > 500 ? '\n...' : ''}\n\`\`\`\n\n`;
    description += `## Instructions\n\n`;
    description += `- **Approve:** Transition this subtask to "${this.config.approvedStatus}"\n`;
    description += `- **Reject:** Add a comment with feedback and transition to "${this.config.rejectedStatus}"\n`;

    return {
      parentKey,
      summary: `Review: ${label} for ${request.storyId}`,
      description,
      phase: request.phase as ApprovalSubtask['phase'],
      artifactUrl: this.artifactBaseUrl
        ? `${this.artifactBaseUrl}/${request.storyId}/${this.getArtifactFile(request.phase)}`
        : undefined,
    };
  }

  /**
   * Get artifact filename for phase
   */
  private getArtifactFile(phase: string): string {
    const files: Record<string, string> = {
      plan_review: 'test-plan.md',
      cases_review: 'scenarios.feature',
      code_review: 'test.spec.ts',
    };
    return files[phase] || 'artifact.txt';
  }

  /**
   * Poll Jira until approval or rejection
   */
  private async waitForApproval(subtaskKey: string): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.config.timeoutMs) {
      try {
        const issue = await this.client.getIssue(subtaskKey);
        const status = issue.status.toLowerCase();

        if (status === this.config.approvedStatus.toLowerCase()) {
          console.log(`Approval granted: ${subtaskKey}`);
          return true;
        }

        if (status === this.config.rejectedStatus.toLowerCase()) {
          // Get rejection feedback from comments
          const comments = await this.client.getComments(subtaskKey);
          const lastComment = comments[comments.length - 1];
          if (lastComment) {
            console.log(`Rejection feedback: ${lastComment.body}`);
          }
          console.log(`Approval rejected: ${subtaskKey}`);
          return false;
        }

        // Still waiting
        await this.sleep(this.config.pollIntervalMs);

      } catch (error) {
        console.error(`Error polling approval status: ${error}`);
        await this.sleep(this.config.pollIntervalMs);
      }
    }

    throw new Error(`Approval timeout for ${subtaskKey}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Update Jira issue with test generation status
 */
export class JiraStatusUpdater {
  constructor(
    private client: JiraClient,
    private statusField?: string
  ) {}

  /**
   * Update test generation status on issue
   */
  async updateStatus(
    issueKey: string,
    status: 'started' | 'planning' | 'cases' | 'code' | 'completed' | 'failed',
    details?: string
  ): Promise<void> {
    // Add comment with status update
    let comment = `**Test Generation Status:** ${status.toUpperCase()}`;
    if (details) {
      comment += `\n\n${details}`;
    }

    await this.client.addComment(issueKey, comment);

    // Update custom field if configured
    if (this.statusField) {
      await this.client.updateIssue(issueKey, {
        [this.statusField]: status,
      });
    }

    // Add label for status
    const label = `test-gen-${status}`;
    await this.client.addLabels(issueKey, [label]);
  }

  /**
   * Attach generated artifact paths to issue
   */
  async attachArtifactPaths(
    issueKey: string,
    paths: {
      testPlan?: string;
      scenarios?: string;
      testCode?: string;
    }
  ): Promise<void> {
    let comment = '**Generated Test Artifacts:**\n\n';

    if (paths.testPlan) {
      comment += `- Test Plan: \`${paths.testPlan}\`\n`;
    }
    if (paths.scenarios) {
      comment += `- Scenarios: \`${paths.scenarios}\`\n`;
    }
    if (paths.testCode) {
      comment += `- Test Code: \`${paths.testCode}\`\n`;
    }

    await this.client.addComment(issueKey, comment);
  }
}
