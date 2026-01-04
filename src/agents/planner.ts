/**
 * Planner Agent
 *
 * LEARNING NOTE: The planner is the strategic agent. It reads requirements
 * and creates comprehensive test plans. Key responsibilities:
 * - Risk analysis
 * - Test prioritization
 * - Coverage mapping
 * - Identifying unknowns
 *
 * INTERVIEW POINT: "The planner agent focuses on 'what' to test, not 'how'.
 * It performs risk-based prioritization and identifies gaps. The output is
 * a human-reviewable document that gets approved before implementation."
 */

import { AgentInput, PlannerPayload } from '../types.js';
import { LLMMessage } from '../utils/llm.js';
import { BaseAgent } from './base.js';
import { buildPlannerPrompt, processPlannerResponse } from '../prompts/index.js';

export class PlannerAgent extends BaseAgent {
  name = 'PlannerAgent';
  description = 'Creates comprehensive test plans from requirements';

  protected validateInput(input: AgentInput): void {
    super.validateInput(input);
    const payload = input.payload as PlannerPayload;

    if (!payload.story) {
      throw new Error('Story content is required');
    }
    if (!payload.storyId) {
      throw new Error('Story ID is required');
    }
  }

  protected buildPrompt(input: AgentInput): LLMMessage[] {
    const payload = input.payload as PlannerPayload;

    // Use prompt module
    const prompt = buildPlannerPrompt(input.context, payload);
    this.lastPrompt = prompt;

    return [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user },
    ];
  }

  protected processResponse(response: string, input: AgentInput): string {
    const payload = input.payload as PlannerPayload;
    return processPlannerResponse(response, payload.storyId);
  }
}
