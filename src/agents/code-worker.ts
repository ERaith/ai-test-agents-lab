/**
 * Worker Agent - Code Mode
 * 
 * LEARNING NOTE: This agent generates test code from Gherkin scenarios.
 * The key challenge is matching existing project patterns and knowing
 * what to leave as TODOs vs. what to implement.
 * 
 * INTERVIEW POINT: "The code worker uses few-shot learning - we show it
 * examples of existing tests so it matches our patterns. It marks unknowns
 * with clear TODOs rather than hallucinating selectors or implementation
 * details."
 */

import { AgentInput, SystemContext } from '../types.js';
import { LLMMessage } from '../utils/llm.js';
import { BaseAgent, formatContext } from './base.js';

export interface CodeWorkerPayload {
  gherkinScenarios: string;
  storyId: string;
  exampleTests?: string;
  helpers?: string;
}

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
    const userPrompt = this.buildUserPrompt(payload);

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  private buildSystemPrompt(context: SystemContext): string {
    return `You are a test automation engineer generating ${context.techStack.testFramework} test code.

${formatContext(context)}

## Your Task

Convert Gherkin scenarios into ${context.techStack.testFramework} test code in ${context.techStack.language}.

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

  private buildUserPrompt(payload: CodeWorkerPayload): string {
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
      prompt += `
## Available Helpers (commands.ts)

Use these existing commands where applicable:

${payload.helpers}
`;
    }

    prompt += `
---

Generate the Cypress test file. Output ONLY TypeScript code - no markdown formatting.
Start with a file comment indicating the output path.`;

    return prompt;
  }

  protected processResponse(response: string, input: AgentInput): string {
    const payload = input.payload as CodeWorkerPayload;
    
    // Clean up any markdown formatting
    let cleaned = response
      .replace(/```typescript\n?/g, '')
      .replace(/```ts\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Ensure file path comment exists
    const expectedPath = `// cypress/e2e/${payload.storyId}.cy.ts`;
    if (!cleaned.includes('cypress/e2e/')) {
      cleaned = `${expectedPath}\n\n${cleaned}`;
    }

    return cleaned;
  }
}
