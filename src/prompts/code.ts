/**
 * Code Worker Agent Prompts
 *
 * Prompt module for the Code Worker agent that generates test code.
 * Supports both Playwright (default) and Cypress frameworks.
 */

import { SystemContext, CodeWorkerPayload } from '../types.js';
import {
  PromptMetadata,
  BuiltPrompt,
  formatContext,
  getSharedRules,
} from './base.js';

// ============================================================================
// METADATA
// ============================================================================

export const CODE_PROMPT_METADATA: PromptMetadata = {
  version: '1.0.0',
  name: 'CodeWorkerAgent',
  description: 'Generates test code from Gherkin scenarios',
  lastUpdated: '2025-01-03',
};

// ============================================================================
// PLAYWRIGHT PATTERNS
// ============================================================================

const PLAYWRIGHT_PATTERNS = `
## Playwright Patterns

| Action | Syntax |
|--------|--------|
| Navigate | \`await page.goto('/path')\` |
| Click | \`await page.locator('selector').click()\` |
| Fill input | \`await page.locator('selector').fill('text')\` |
| Get by test ID | \`page.locator('[data-testid="id"]')\` |
| Get by text | \`page.getByText('text')\` |
| Get by role | \`page.getByRole('button', { name: 'Submit' })\` |
| Assert visible | \`await expect(locator).toBeVisible()\` |
| Assert text | \`await expect(locator).toContainText('text')\` |
| Assert URL | \`await expect(page).toHaveURL(/pattern/)\` |
| API request | \`await request.get('/api/path')\` |
| Mock API | \`await page.route('**/api/*', route => route.fulfill({ ... }))\` |
`;

const PLAYWRIGHT_STRUCTURE = `
## Code Structure

\`\`\`typescript
// playwright/tests/story-xxx.spec.ts
import { test, expect } from '../fixtures/base';

test.describe('STORY-XXX - Feature Name', () => {
  test.beforeEach(async ({ page, resetDatabase }) => {
    await resetDatabase();
    // TODO: Additional setup
  });

  test('@smoke @story-xxx scenario name', async ({ page, loginAsAdmin }) => {
    await loginAsAdmin();
    // Implementation or TODOs
  });
});
\`\`\`
`;

// ============================================================================
// CYPRESS PATTERNS
// ============================================================================

const CYPRESS_STRUCTURE = `
## Code Structure

\`\`\`typescript
// cypress/e2e/story-xxx.cy.ts

describe('STORY-XXX – Feature Name', () => {
  beforeEach(() => {
    // TODO: Common setup
  });

  it('@smoke @story-xxx scenario name', () => {
    // Implementation or TODOs
  });
});
\`\`\`
`;

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

function buildPlaywrightSystemPrompt(context: SystemContext): string {
  return `You are a test automation engineer generating Playwright test code in TypeScript.

${formatContext(context)}

## Your Task

Convert Gherkin scenarios into Playwright test code.

## Rules

1. **Output ONLY valid code** - no markdown, no explanations outside comments
2. **Follow the example patterns** provided - match existing style exactly
3. **Use existing fixtures** from base.ts where available
4. **Mark unknowns with TODO comments** - don't guess selectors or implementation
5. **Include clear test descriptions** that match Gherkin scenario names
6. **Add tags in test names** using format: test('@tag @tag2 description')
7. **Create a test.beforeEach hook** for common setup
8. **All operations are async** - use await for every Playwright action

${PLAYWRIGHT_STRUCTURE}

${PLAYWRIGHT_PATTERNS}

## TODO Guidelines

Use TODOs for:
- Unknown selectors: \`// TODO: Verify selector\`
- Unknown data: \`// TODO: Define test data\`
- Unknown API endpoints: \`// TODO: Confirm endpoint\`
- Complex logic: \`// TODO: Implement ...\`

${getSharedRules(['noHallucination', 'markUnknowns', 'consistentFormat'])}`;
}

function buildCypressSystemPrompt(context: SystemContext): string {
  return `You are a test automation engineer generating Cypress test code in TypeScript.

${formatContext(context)}

## Your Task

Convert Gherkin scenarios into Cypress test code.

## Rules

1. **Output ONLY valid code** - no markdown, no explanations outside comments
2. **Follow the example patterns** provided - match existing style exactly
3. **Use existing helpers** from commands.ts where available
4. **Mark unknowns with TODO comments** - don't guess selectors or implementation
5. **Include clear test descriptions** that match Gherkin scenario names
6. **Add tags in test names** using format: it('@tag @tag2 description')
7. **Create a beforeEach hook** for common setup

${CYPRESS_STRUCTURE}

## TODO Guidelines

Use TODOs for:
- Unknown selectors: \`// TODO: Verify selector\`
- Unknown data: \`// TODO: Define test data\`
- Unknown API endpoints: \`// TODO: Confirm endpoint\`
- Complex logic: \`// TODO: Implement ...\`

${getSharedRules(['noHallucination', 'markUnknowns', 'consistentFormat'])}`;
}

// ============================================================================
// USER PROMPT
// ============================================================================

function buildUserPrompt(payload: CodeWorkerPayload, isPlaywright: boolean): string {
  const framework = isPlaywright ? 'Playwright' : 'Cypress';

  let prompt = `Generate ${payload.storyId} test code from these Gherkin scenarios:

## Gherkin Scenarios

${payload.gherkinScenarios}
`;

  if (payload.exampleTests) {
    prompt += `
## Example Tests to Follow

Use these as patterns for style and structure:

${payload.exampleTests}
`;
  }

  if (payload.helpers) {
    const helpersLabel = isPlaywright
      ? 'Available Fixtures (base.ts)'
      : 'Available Helpers (commands.ts)';
    prompt += `
## ${helpersLabel}

Use these existing ${isPlaywright ? 'fixtures' : 'commands'} where applicable:

${payload.helpers}
`;
  }

  prompt += `
---

Generate the ${framework} test file. Output ONLY TypeScript code - no markdown formatting.
Start with a file comment indicating the output path.`;

  return prompt;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Build the complete prompt for the Code Worker agent
 */
export function buildCodePrompt(
  context: SystemContext,
  payload: CodeWorkerPayload
): BuiltPrompt {
  const isPlaywright = context.techStack.testFramework.toLowerCase().includes('playwright');

  const system = isPlaywright
    ? buildPlaywrightSystemPrompt(context)
    : buildCypressSystemPrompt(context);

  return {
    system,
    user: buildUserPrompt(payload, isPlaywright),
    metadata: CODE_PROMPT_METADATA,
  };
}

/**
 * Process raw LLM response into final code output
 */
export function processCodeResponse(
  response: string,
  storyId: string,
  isPlaywright: boolean
): string {
  // Clean up any markdown formatting
  let cleaned = response
    .replace(/```typescript\n?/g, '')
    .replace(/```ts\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Ensure file path comment exists
  if (isPlaywright) {
    const expectedPath = `// playwright/tests/${storyId}.spec.ts`;
    if (!cleaned.includes('playwright/tests/')) {
      cleaned = `${expectedPath}\n// Generated by ${CODE_PROMPT_METADATA.name} v${CODE_PROMPT_METADATA.version}\n\n${cleaned}`;
    }
  } else {
    const expectedPath = `// cypress/e2e/${storyId}.cy.ts`;
    if (!cleaned.includes('cypress/e2e/')) {
      cleaned = `${expectedPath}\n// Generated by ${CODE_PROMPT_METADATA.name} v${CODE_PROMPT_METADATA.version}\n\n${cleaned}`;
    }
  }

  return cleaned;
}
