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

import { AgentInput, SystemContext } from '../types.js';
import { LLMMessage } from '../utils/llm.js';
import { BaseAgent, formatContext } from './base.js';

export interface CaseWorkerPayload {
  testPlan: string;
  storyId: string;
  story: string;
}

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
    
    const systemPrompt = this.buildSystemPrompt(input.context);
    const userPrompt = this.buildUserPrompt(payload);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  private buildSystemPrompt(context: SystemContext): string {
    return `You are a test case writer converting test plans into Gherkin scenarios.

${formatContext(context)}

## Your Task

Convert the test plan into valid Gherkin scenarios. Follow these rules:

1. **Output ONLY valid Gherkin** - no markdown, no explanations
2. **Start with a Feature block** that names the story
3. **Use appropriate tags**:
   - @story-XXX for the story ID
   - @smoke for critical happy path tests
   - @regression for edge cases and negative tests
   - @e2e for end-to-end scenarios
4. **Keep steps high-level but concrete** - stable enough to not break with minor UI changes
5. **Reuse Given/When/Then phrasing** where similar scenarios exist
6. **Group scenarios logically** - happy path first, then negative, then edge cases

## Gherkin Format Example

Feature: Story ID - Feature Name

  @story-001 @smoke @e2e
  Scenario: Happy path description
    Given the precondition is met
    When the user performs the action
    Then the expected result occurs

  @story-001 @regression
  Scenario: Error handling scenario
    Given an error condition exists
    When the user attempts the action
    Then an appropriate error is shown`;
  }

  private buildUserPrompt(payload: CaseWorkerPayload): string {
    return `Convert the following test plan into Gherkin scenarios.

## Story: ${payload.storyId}

${payload.story}

## Test Plan

${payload.testPlan}

---

Generate valid Gherkin scenarios. Output ONLY the Gherkin - no markdown formatting, no explanations.`;
  }

  protected processResponse(response: string, input: AgentInput): string {
    const payload = input.payload as CaseWorkerPayload;
    
    // Clean up any markdown formatting that might have slipped in
    let cleaned = response
      .replace(/```gherkin\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Ensure Feature line exists
    if (!cleaned.startsWith('Feature:')) {
      cleaned = `Feature: ${payload.storyId} - Generated Test Scenarios\n\n${cleaned}`;
    }

    return cleaned;
  }
}
