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

import { AgentInput, SystemContext, PlannerPayload } from '../types.js';
import { LLMMessage } from '../utils/llm.js';
import { BaseAgent, formatContext } from './base.js';

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
    
    const systemPrompt = this.buildSystemPrompt(input.context);
    const userPrompt = this.buildUserPrompt(payload);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  private buildSystemPrompt(context: SystemContext): string {
    return `You are a senior SDET (Software Development Engineer in Test) creating a comprehensive test plan.

Your role is to analyze requirements and create a structured test plan that covers:
1. Risk analysis with likelihood/impact assessment
2. Test groups organized by type (Unit, Integration, E2E)
3. Data requirements and setup approaches
4. Open questions that need human clarification

${formatContext(context)}

## Output Format

Create a detailed markdown test plan with these sections:
1. **Summary** - Brief overview and key risks
2. **Risk Analysis** - Table with Risk, Likelihood, Impact, Mitigation
3. **Test Groups** - Organized by test type with ID, Description, Priority, Tags
4. **Data Requirements** - What test data is needed and how to set it up
5. **Open Questions** - List of items needing clarification (as checkboxes)

Be thorough but practical. Focus on high-value tests that catch real bugs.
Mark unknowns clearly with TODO or questions rather than making assumptions.`;
  }

  private buildUserPrompt(payload: PlannerPayload): string {
    let prompt = `Please create a test plan for the following story:

# Story: ${payload.storyId}

${payload.story}
`;

    if (payload.existingTestPatterns) {
      prompt += `
## Existing Test Patterns

Here are some patterns from existing tests to follow:

${payload.existingTestPatterns}
`;
    }

    prompt += `
Please generate a comprehensive test plan in markdown format.
Include clear TODOs for any details that require human clarification.`;

    return prompt;
  }

  protected processResponse(response: string, input: AgentInput): string {
    const payload = input.payload as PlannerPayload;
    
    // Add metadata header if not present
    if (!response.includes('# Test Plan:')) {
      response = `# Test Plan: ${payload.storyId}

**Story:** ${payload.storyId}
**Created:** ${new Date().toISOString()}
**Status:** Draft – Awaiting Review

---

${response}`;
    }

    // Add footer if not present
    if (!response.includes('## Approval')) {
      response += `

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Planner Agent | AI | ${new Date().toLocaleDateString()} | Draft |
| SDET Reviewer | | | Pending |

*This plan should be reviewed by a human before proceeding to test implementation.*
`;
    }

    return response;
  }
}
