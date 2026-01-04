/**
 * Worker Agent - Code Mode
 *
 * Generates test code from Gherkin scenarios.
 * Supports both Playwright (default) and Cypress frameworks.
 *
 * The key challenge is matching existing project patterns and knowing
 * what to leave as TODOs vs. what to implement.
 */

import { AgentInput, CodeWorkerPayload } from '../types.js';
import { LLMMessage } from '../utils/llm.js';
import { BaseAgent } from './base.js';
import { buildCodePrompt, processCodeResponse } from '../prompts/index.js';

export class CodeWorkerAgent extends BaseAgent {
  name = 'CodeWorkerAgent';
  description = 'Generates test code from Gherkin scenarios';

  protected validateInput(input: AgentInput): void {
    super.validateInput(input);
    const payload = input.payload as CodeWorkerPayload;

    if (!payload.gherkinScenarios) {
      throw new Error('Gherkin scenarios are required');
    }
    if (!payload.storyId) {
      throw new Error('Story ID is required');
    }
  }

  protected buildPrompt(input: AgentInput): LLMMessage[] {
    const payload = input.payload as CodeWorkerPayload;

    // Use prompt module
    const prompt = buildCodePrompt(input.context, payload);
    this.lastPrompt = prompt;

    return [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];
  }

  protected processResponse(response: string, input: AgentInput): string {
    const payload = input.payload as CodeWorkerPayload;
    const isPlaywright = input.context.techStack.testFramework
      .toLowerCase()
      .includes('playwright');

    return processCodeResponse(response, payload.storyId, isPlaywright);
  }
}
