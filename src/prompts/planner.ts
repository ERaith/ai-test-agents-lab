/**
 * Planner Agent Prompts
 *
 * Prompt module for the Planner agent that creates test plans from requirements.
 */

import { SystemContext, PlannerPayload } from '../types.js';
import {
  PromptMetadata,
  BuiltPrompt,
  formatContext,
  getSharedRules,
} from './base.js';

// ============================================================================
// METADATA
// ============================================================================

export const PLANNER_PROMPT_METADATA: PromptMetadata = {
  version: '1.0.0',
  name: 'PlannerAgent',
  description: 'Creates comprehensive test plans from requirements',
  lastUpdated: '2025-01-03',
};

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

function buildSystemPrompt(context: SystemContext): string {
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

## Rules

${getSharedRules(['noHallucination', 'markUnknowns', 'practicalFocus'])}

Be thorough but practical. Focus on high-value tests that catch real bugs.`;
}

// ============================================================================
// USER PROMPT
// ============================================================================

function buildUserPrompt(payload: PlannerPayload): string {
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

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Build the complete prompt for the Planner agent
 */
export function buildPlannerPrompt(
  context: SystemContext,
  payload: PlannerPayload
): BuiltPrompt {
  return {
    system: buildSystemPrompt(context),
    user: buildUserPrompt(payload),
    metadata: PLANNER_PROMPT_METADATA,
  };
}

/**
 * Process raw LLM response into final output
 */
export function processPlannerResponse(response: string, storyId: string): string {
  let output = response;

  // Add metadata header if not present
  if (!output.includes('# Test Plan:')) {
    output = `# Test Plan: ${storyId}

**Story:** ${storyId}
**Created:** ${new Date().toISOString()}
**Status:** Draft – Awaiting Review
**Prompt Version:** ${PLANNER_PROMPT_METADATA.version}

---

${output}`;
  }

  // Add footer if not present
  if (!output.includes('## Approval')) {
    output += `

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Planner Agent | AI | ${new Date().toLocaleDateString()} | Draft |
| SDET Reviewer | | | Pending |

*This plan should be reviewed by a human before proceeding to test implementation.*
`;
  }

  return output;
}
