/**
 * LLM Client Abstraction
 * 
 * LEARNING NOTE: Abstract the LLM provider to allow easy switching between
 * providers (Claude, OpenAI, local models). This is crucial for enterprise
 * because you might need to:
 * - Use different models for different tasks (cost optimization)
 * - Switch providers based on availability
 * - Use local models for sensitive data
 * 
 * INTERVIEW POINT: "We use a provider-agnostic interface so we can optimize
 * cost by using smaller models for simple tasks, and we can easily switch
 * to local models when dealing with sensitive customer data."
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'simulation';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// API Response types
interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

interface APIError {
  error?: {
    message?: string;
  };
}

/**
 * LLM Client - abstracts API calls
 */
export class LLMClient {
  private config: LLMConfig;
  private verbose: boolean;

  constructor(config: LLMConfig, verbose = false) {
    this.config = {
      temperature: 0, // Deterministic outputs for testing
      maxTokens: 4096,
      ...config,
    };
    this.verbose = verbose;
  }

  /**
   * Send a completion request
   */
  async complete(messages: LLMMessage[]): Promise<LLMResponse> {
    if (this.verbose) {
      console.log(`\n🔄 LLM Request: ${this.config.provider}/${this.config.model}`);
    }

    if (this.config.provider === 'anthropic' && this.config.apiKey) {
      return this.callAnthropic(messages);
    }
    
    if (this.config.provider === 'openai' && this.config.apiKey) {
      return this.callOpenAI(messages);
    }

    // Simulation mode for demo/testing
    if (this.verbose) {
      console.log('⚠️  Running in simulation mode (no API key provided)');
    }
    return this.simulate(messages);
  }

  private async callAnthropic(messages: LLMMessage[]): Promise<LLMResponse> {
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const nonSystemMessages = messages.filter(m => m.role !== 'system');

    const requestBody = {
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: nonSystemMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      ...(systemMessage && { system: systemMessage }),
    };

    if (this.verbose) {
      console.log(`📤 Anthropic API request to model: ${this.config.model}`);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Anthropic API error (${response.status}): `;
      
      try {
        const errorJson = JSON.parse(errorText) as APIError;
        errorMessage += errorJson.error?.message || errorText;
      } catch {
        errorMessage += errorText;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json() as AnthropicResponse;
    
    if (this.verbose) {
      console.log(`📥 Anthropic API response received`);
      console.log(`   Tokens: ${data.usage?.input_tokens} in / ${data.usage?.output_tokens} out`);
    }

    // Handle different response content types
    let content = '';
    if (data.content && Array.isArray(data.content)) {
      content = data.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
    }

    return {
      content,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
    };
  }

  private async callOpenAI(messages: LLMMessage[]): Promise<LLMResponse> {
    if (this.verbose) {
      console.log(`📤 OpenAI API request to model: ${this.config.model}`);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenAI API error (${response.status}): `;
      
      try {
        const errorJson = JSON.parse(errorText) as APIError;
        errorMessage += errorJson.error?.message || errorText;
      } catch {
        errorMessage += errorText;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json() as OpenAIResponse;

    if (this.verbose) {
      console.log(`📥 OpenAI API response received`);
      console.log(`   Tokens: ${data.usage?.prompt_tokens} in / ${data.usage?.completion_tokens} out`);
    }

    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      },
    };
  }

  /**
   * Simulation for demo purposes
   */
  private async simulate(messages: LLMMessage[]): Promise<LLMResponse> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    if (lastMessage.includes('test plan') || lastMessage.includes('Test Plan')) {
      return { content: this.getSimulatedPlan(lastMessage), usage: { inputTokens: 500, outputTokens: 1000 } };
    }
    
    if (lastMessage.includes('Gherkin') || lastMessage.includes('scenarios')) {
      return { content: this.getSimulatedGherkin(lastMessage), usage: { inputTokens: 800, outputTokens: 1200 } };
    }
    
    if (lastMessage.includes('Cypress') || lastMessage.includes('TypeScript')) {
      return { content: this.getSimulatedCode(lastMessage), usage: { inputTokens: 1000, outputTokens: 1500 } };
    }

    return { 
      content: 'LLM connection successful! (simulation mode)',
      usage: { inputTokens: 50, outputTokens: 10 },
    };
  }

  private getSimulatedPlan(prompt: string): string {
    const storyMatch = prompt.match(/story[- ]?(\d+)/i);
    const storyId = storyMatch ? `story-${storyMatch[1]}` : 'story-xxx';

    return `# Test Plan: ${storyId}

**Note**: This is simulated output. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY for real generation.

## Summary

This test plan covers the functionality described in the user story.

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data validation bypass | Medium | High | Comprehensive input testing |
| Unauthorized access | Low | Critical | Security-focused test cases |

## Test Groups

### E2E Tests (Smoke)

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| E2E-001 | Happy path - complete flow | Critical | @smoke @e2e |
| E2E-002 | Form validation errors | High | @smoke @validation |

### API Tests

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| API-001 | Success response | Critical | @api @smoke |
| API-002 | Validation errors (400) | High | @api |

## Open Questions

- [ ] TODO: Confirm exact selectors with dev team
- [ ] TODO: Verify API endpoint structure
`;
  }

  private getSimulatedGherkin(prompt: string): string {
    const storyMatch = prompt.match(/story[- ]?(\d+)/i);
    const storyId = storyMatch ? `story-${storyMatch[1]}` : 'story-xxx';

    return `Feature: ${storyId} - Feature Under Test

  Background:
    Given the application is running

  @${storyId} @smoke @e2e
  Scenario: Happy path - complete flow successfully
    Given I am logged in as an authorized user
    When I perform the primary action
    Then I should see a success confirmation

  @${storyId} @regression @security
  Scenario: Unauthorized user cannot access feature
    Given I am logged in as a regular user
    When I attempt to access the restricted feature
    Then I should be denied access
`;
  }

  private getSimulatedCode(prompt: string): string {
    const storyMatch = prompt.match(/story[- ]?(\d+)/i);
    const storyId = storyMatch ? `story-${storyMatch[1]}` : 'story-xxx';

    return `// cypress/e2e/${storyId}.cy.ts
// Generated by Agentic Testing Workflow (Simulation Mode)

describe('${storyId} – Feature Under Test', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('@smoke @e2e Happy path - complete flow successfully', () => {
    // TODO: Implement test
    cy.log('TODO: Implement full test');
  });

  it('@regression @security Unauthorized user cannot access feature', () => {
    cy.visit('/restricted-feature', { failOnStatusCode: false });
    // TODO: cy.contains('Access Denied').should('be.visible');
  });
});
`;
  }
}

/**
 * Create a configured LLM client from environment
 */
export function createLLMClient(verbose = false): LLMClient {
  // Import config inline to avoid circular dependency
  const { config } = require('../config/index.js');

  if (config.llm.provider === 'anthropic' && config.llm.anthropicKey) {
    console.log('🔑 Using Anthropic API');
    return new LLMClient({
      provider: 'anthropic',
      model: config.llm.anthropicModel,
      apiKey: config.llm.anthropicKey,
    }, verbose);
  }

  if (config.llm.provider === 'openai' && config.llm.openaiKey) {
    console.log('🔑 Using OpenAI API');
    return new LLMClient({
      provider: 'openai',
      model: config.llm.openaiModel,
      apiKey: config.llm.openaiKey,
    }, verbose);
  }

  console.log('⚠️  No API key found - using simulation mode');
  return new LLMClient({
    provider: 'simulation',
    model: 'simulation',
  }, verbose);
}
