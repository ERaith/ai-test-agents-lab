/**
 * Worker Agent - Code Mode
 *
 * Generates test code from Gherkin scenarios.
 * Supports both Playwright (default) and Cypress frameworks.
 *
 * The key challenge is matching existing project patterns and knowing
 * what to leave as TODOs vs. what to implement.
 */

import { AgentInput, SystemContext, CodeWorkerPayload } from '../types.js';
import { LLMMessage } from '../utils/llm.js';
import { BaseAgent, formatContext } from './base.js';

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

    const systemPrompt = this.buildSystemPrompt(input.context);
    const userPrompt = this.buildUserPrompt(payload, input.context);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  private buildSystemPrompt(context: SystemContext): string {
    const isPlaywright = context.techStack.testFramework.toLowerCase().includes('playwright');

    if (isPlaywright) {
      return this.buildPlaywrightSystemPrompt(context);
    }
    return this.buildCypressSystemPrompt(context);
  }

  private buildPlaywrightSystemPrompt(context: SystemContext): string {
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

## TODO Guidelines

Use TODOs for:
- Unknown selectors: \`// TODO: Verify selector\`
- Unknown data: \`// TODO: Define test data\`
- Unknown API endpoints: \`// TODO: Confirm endpoint\`
- Complex logic: \`// TODO: Implement ...\``;
  }

  private buildCypressSystemPrompt(context: SystemContext): string {
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

## TODO Guidelines

Use TODOs for:
- Unknown selectors: \`// TODO: Verify selector\`
- Unknown data: \`// TODO: Define test data\`
- Unknown API endpoints: \`// TODO: Confirm endpoint\`
- Complex logic: \`// TODO: Implement ...\``;
  }

  private buildUserPrompt(payload: CodeWorkerPayload, context: SystemContext): string {
    const isPlaywright = context.techStack.testFramework.toLowerCase().includes('playwright');
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
      const helpersLabel = isPlaywright ? 'Available Fixtures (base.ts)' : 'Available Helpers (commands.ts)';
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

  protected processResponse(response: string, input: AgentInput): string {
    const payload = input.payload as CodeWorkerPayload;
    const isPlaywright = input.context.techStack.testFramework.toLowerCase().includes('playwright');

    // Clean up any markdown formatting
    let cleaned = response
      .replace(/```typescript\n?/g, '')
      .replace(/```ts\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Ensure file path comment exists
    if (isPlaywright) {
      const expectedPath = `// playwright/tests/${payload.storyId}.spec.ts`;
      if (!cleaned.includes('playwright/tests/')) {
        cleaned = `${expectedPath}\n\n${cleaned}`;
      }
    } else {
      const expectedPath = `// cypress/e2e/${payload.storyId}.cy.ts`;
      if (!cleaned.includes('cypress/e2e/')) {
        cleaned = `${expectedPath}\n\n${cleaned}`;
      }
    }

    return cleaned;
  }
}
