/**
 * Jira REST API Client
 *
 * Minimal client for Jira integration.
 * Supports story fetching, subtask creation, and status updates.
 */

import {
  JiraConfig,
  JiraIssue,
  CreateIssueRequest,
  JiraComment,
  JiraTransition,
} from './types.js';

/**
 * Jira REST API client
 */
export class JiraClient {
  private baseUrl: string;
  private auth: string;
  private projectKey: string;

  constructor(config: JiraConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    this.projectKey = config.projectKey;
  }

  /**
   * Make an authenticated request to Jira API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/rest/api/3${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error (${response.status}): ${error}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;

    return JSON.parse(text);
  }

  /**
   * Get an issue by key
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    const data = await this.request<any>(`/issue/${issueKey}`);

    return {
      key: data.key,
      id: data.id,
      summary: data.fields.summary,
      description: this.extractDescription(data.fields.description),
      status: data.fields.status?.name || 'Unknown',
      labels: data.fields.labels || [],
      issueType: data.fields.issuetype?.name || 'Unknown',
      priority: data.fields.priority?.name,
      assignee: data.fields.assignee?.displayName,
      reporter: data.fields.reporter?.displayName,
      created: data.fields.created,
      updated: data.fields.updated,
    };
  }

  /**
   * Create an issue
   */
  async createIssue(request: CreateIssueRequest): Promise<string> {
    const body: any = {
      fields: {
        project: { key: request.projectKey || this.projectKey },
        issuetype: { name: request.issueType },
        summary: request.summary,
        description: this.createDescription(request.description),
      },
    };

    if (request.labels?.length) {
      body.fields.labels = request.labels;
    }

    if (request.parentKey) {
      body.fields.parent = { key: request.parentKey };
    }

    if (request.assignee) {
      body.fields.assignee = { name: request.assignee };
    }

    if (request.priority) {
      body.fields.priority = { name: request.priority };
    }

    if (request.customFields) {
      Object.assign(body.fields, request.customFields);
    }

    const data = await this.request<any>('/issue', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return data.key;
  }

  /**
   * Create a subtask
   */
  async createSubtask(
    parentKey: string,
    summary: string,
    description: string,
    assignee?: string
  ): Promise<string> {
    return this.createIssue({
      projectKey: this.projectKey,
      issueType: 'Sub-task',
      summary,
      description,
      parentKey,
      assignee,
    });
  }

  /**
   * Add a comment to an issue
   */
  async addComment(issueKey: string, comment: string): Promise<void> {
    await this.request(`/issue/${issueKey}/comment`, {
      method: 'POST',
      body: JSON.stringify({
        body: this.createDescription(comment),
      }),
    });
  }

  /**
   * Get comments on an issue
   */
  async getComments(issueKey: string): Promise<JiraComment[]> {
    const data = await this.request<any>(`/issue/${issueKey}/comment`);

    return (data.comments || []).map((c: any) => ({
      id: c.id,
      body: this.extractDescription(c.body),
      author: c.author?.displayName || 'Unknown',
      created: c.created,
      updated: c.updated,
    }));
  }

  /**
   * Get available transitions for an issue
   */
  async getTransitions(issueKey: string): Promise<JiraTransition[]> {
    const data = await this.request<any>(`/issue/${issueKey}/transitions`);

    return (data.transitions || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      to: {
        id: t.to.id,
        name: t.to.name,
      },
    }));
  }

  /**
   * Transition an issue to a new status
   */
  async transitionIssue(issueKey: string, transitionName: string): Promise<void> {
    const transitions = await this.getTransitions(issueKey);
    const transition = transitions.find(
      t => t.name.toLowerCase() === transitionName.toLowerCase()
    );

    if (!transition) {
      const available = transitions.map(t => t.name).join(', ');
      throw new Error(
        `Transition "${transitionName}" not found. Available: ${available}`
      );
    }

    await this.request(`/issue/${issueKey}/transitions`, {
      method: 'POST',
      body: JSON.stringify({
        transition: { id: transition.id },
      }),
    });
  }

  /**
   * Update issue fields
   */
  async updateIssue(
    issueKey: string,
    fields: Record<string, unknown>
  ): Promise<void> {
    await this.request(`/issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify({ fields }),
    });
  }

  /**
   * Add labels to an issue
   */
  async addLabels(issueKey: string, labels: string[]): Promise<void> {
    await this.request(`/issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify({
        update: {
          labels: labels.map(l => ({ add: l })),
        },
      }),
    });
  }

  /**
   * Search for issues using JQL
   */
  async search(jql: string, maxResults = 50): Promise<JiraIssue[]> {
    const data = await this.request<any>(
      `/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}`
    );

    return (data.issues || []).map((issue: any) => ({
      key: issue.key,
      id: issue.id,
      summary: issue.fields.summary,
      description: this.extractDescription(issue.fields.description),
      status: issue.fields.status?.name || 'Unknown',
      labels: issue.fields.labels || [],
      issueType: issue.fields.issuetype?.name || 'Unknown',
      priority: issue.fields.priority?.name,
      assignee: issue.fields.assignee?.displayName,
      reporter: issue.fields.reporter?.displayName,
      created: issue.fields.created,
      updated: issue.fields.updated,
    }));
  }

  /**
   * Extract plain text from Atlassian Document Format
   */
  private extractDescription(adf: any): string {
    if (!adf) return '';
    if (typeof adf === 'string') return adf;

    // Handle ADF format
    if (adf.content) {
      return adf.content
        .map((block: any) => this.extractBlockText(block))
        .filter(Boolean)
        .join('\n\n');
    }

    return '';
  }

  private extractBlockText(block: any): string {
    if (!block) return '';

    if (block.type === 'paragraph' && block.content) {
      return block.content
        .map((item: any) => item.text || '')
        .join('');
    }

    if (block.type === 'heading' && block.content) {
      const text = block.content.map((item: any) => item.text || '').join('');
      const level = block.attrs?.level || 1;
      return '#'.repeat(level) + ' ' + text;
    }

    if (block.type === 'bulletList' && block.content) {
      return block.content
        .map((item: any) => '- ' + this.extractBlockText(item))
        .join('\n');
    }

    if (block.type === 'listItem' && block.content) {
      return block.content.map((c: any) => this.extractBlockText(c)).join('');
    }

    if (block.type === 'codeBlock') {
      const code = block.content?.map((c: any) => c.text || '').join('') || '';
      return '```\n' + code + '\n```';
    }

    return '';
  }

  /**
   * Create Atlassian Document Format from plain text
   */
  private createDescription(text: string): any {
    const lines = text.split('\n');
    const content: any[] = [];

    for (const line of lines) {
      if (line.trim()) {
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: line }],
        });
      }
    }

    return {
      type: 'doc',
      version: 1,
      content: content.length > 0 ? content : [
        { type: 'paragraph', content: [{ type: 'text', text: ' ' }] }
      ],
    };
  }
}

/**
 * Create a Jira client from environment variables
 */
export function createJiraClientFromEnv(): JiraClient | null {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!baseUrl || !email || !apiToken || !projectKey) {
    return null;
  }

  return new JiraClient({
    baseUrl,
    email,
    apiToken,
    projectKey,
  });
}
