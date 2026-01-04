/**
 * Worker Agent - Test Case Mode
 *
 * LEARNING NOTE: This agent converts approved test plans into Gherkin scenarios.
 * Gherkin provides a human-readable format that bridges business and technical teams.
 *
 * INTERVIEW POINT: "We use Gherkin as an intermediate format because it's
 * executable specification - business stakeholders can review it, and it
 * translates directly to test code. The worker respects the plan's priorities
 * and tags."
 */

import { AgentInput, CaseWorkerPayload } from '../types.js';
import { LLMMessage } from '../utils/llm.js';
import { BaseAgent } from './base.js';
import { buildCasesPrompt, processCasesResponse } from '../prompts/index.js';

export class CaseWorkerAgent extends BaseAgent {
  name = 'CaseWorkerAgent';
  description = 'Generates Gherkin test scenarios from test plans';

  protected validateInput(input: AgentInput): void {
    super.validateInput(input);
    const payload = input.payload as CaseWorkerPayload;

    if (!payload.testPlan) {
      throw new Error('Test plan content is required');
    }
    if (!payload.storyId) {
      throw new Error('Story ID is required');
    }
  }

  protected buildPrompt(input: AgentInput): LLMMessage[] {
    const payload = input.payload as CaseWorkerPayload;

    // Use prompt module
    const prompt = buildCasesPrompt(input.context, payload);
    this.lastPrompt = prompt;

    return [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];
  }

  protected processResponse(response: string, input: AgentInput): string {
    const payload = input.payload as CaseWorkerPayload;
    return processCasesResponse(response, payload.storyId);
  }
}
