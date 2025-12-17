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
        const errorJson = JSON.parse(errorText);
        errorMessage += errorJson.error?.message || errorText;
      } catch {
        errorMessage += errorText;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (this.verbose) {
      console.log(`📥 Anthropic API response received`);
      console.log(`   Tokens: ${data.usage?.input_tokens} in / ${data.usage?.output_tokens} out`);
    }

    // Handle different response content types
    let content = '';
    if (data.content && Array.isArray(data.content)) {
      content = data.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
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
        const errorJson = JSON.parse(errorText);
        errorMessage += errorJson.error?.message || errorText;
      } catch {
        errorMessage += errorText;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();

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
   * Returns placeholder content based on the last user message
   */
  private async simulate(messages: LLMMessage[]): Promise<LLMResponse> {
    // Add artificial delay to feel more realistic
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Detect what type of output is expected
    if (lastMessage.includes('test plan') || lastMessage.includes('Test Plan')) {
      return { content: this.getSimulatedPlan(lastMessage) };
    }
    
    if (lastMessage.includes('Gherkin') || lastMessage.includes('scenarios')) {
      return { content: this.getSimulatedGherkin(lastMessage) };
    }
    
    if (lastMessage.includes('Cypress') || lastMessage.includes('TypeScript')) {
      return { content: this.getSimulatedCode(lastMessage) };
    }

    // Default response for other prompts
    return { 
      content: 'LLM connection successful! (simulation mode)',
      usage: { inputTokens: 50, outputTokens: 10 },
    };
  }

  private getSimulatedPlan(prompt: string): string {
    // Extract story ID from prompt if possible
    const storyMatch = prompt.match(/story[- ]?(\d+)/i);
    const storyId = storyMatch ? `story-${storyMatch[1]}` : 'story-xxx';

    return `# Test Plan: ${storyId}

**Note**: This is simulated output. Configure ANTHROPIC_API_KEY or OPENAI_API_KEY for real generation.

## Summary

This test plan covers the functionality described in the user story. The testing approach 
focuses on validating happy paths first, followed by error handling and edge cases.

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data validation bypass | Medium | High | Comprehensive input testing |
| Unauthorized access | Low | Critical | Security-focused test cases |
| UI state inconsistency | Medium | Medium | E2E tests with various flows |

## Test Groups

### E2E Tests (Smoke)

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| E2E-001 | Happy path - complete flow | Critical | @smoke @e2e |
| E2E-002 | Form validation errors | High | @smoke @validation |
| E2E-003 | Authentication required | High | @smoke @security |

### E2E Tests (Regression)

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| E2E-004 | Edge case - empty state | Medium | @regression |
| E2E-005 | Concurrent operations | Medium | @regression |
| E2E-006 | Browser back/forward | Low | @regression |

### API Tests

| ID | Test Case | Priority | Tags |
|----|-----------|----------|------|
| API-001 | Success response | Critical | @api @smoke |
| API-002 | Validation errors (400) | High | @api |
| API-003 | Authorization (401/403) | High | @api @security |
| API-004 | Not found (404) | Medium | @api |

## Data Requirements

- Test user accounts (admin, regular user, guest)
- Sample data entities for CRUD operations
- Mock API responses for error scenarios

## Open Questions

- [ ] TODO: Confirm exact selectors with dev team
- [ ] TODO: Verify API endpoint structure
- [ ] TODO: Define test data seeding approach
- [ ] TODO: Clarify expected error messages
`;
  }

  private getSimulatedGherkin(prompt: string): string {
    const storyMatch = prompt.match(/story[- ]?(\d+)/i);
    const storyId = storyMatch ? `story-${storyMatch[1]}` : 'story-xxx';

    return `Feature: ${storyId} - Feature Under Test

  Background:
    Given the application is running
    And the database is seeded with test data

  # ============================================================================
  # SMOKE TESTS
  # ============================================================================

  @${storyId} @smoke @e2e
  Scenario: Happy path - complete flow successfully
    Given I am logged in as an authorized user
    When I navigate to the feature page
    And I perform the primary action
    Then I should see a success confirmation
    And the data should be persisted correctly

  @${storyId} @smoke @validation
  Scenario: Form validation prevents invalid submission
    Given I am logged in as an authorized user
    When I navigate to the feature page
    And I submit the form with invalid data
    Then I should see validation error messages
    And the form should not be submitted

  # ============================================================================
  # SECURITY TESTS
  # ============================================================================

  @${storyId} @regression @security
  Scenario: Unauthorized user cannot access feature
    Given I am logged in as a regular user
    When I attempt to access the restricted feature
    Then I should be denied access
    And I should see an appropriate error message

  @${storyId} @regression @security
  Scenario: API returns 403 for unauthorized requests
    Given I am authenticated as a regular user via API
    When I send a request to the restricted endpoint
    Then the response status should be 403
    And the response should indicate forbidden access

  # ============================================================================
  # EDGE CASES
  # ============================================================================

  @${storyId} @regression @edge-case
  Scenario: Handle empty state gracefully
    Given I am logged in as an authorized user
    And there is no existing data
    When I navigate to the feature page
    Then I should see an empty state message
    And I should see a call-to-action to create data

  @${storyId} @regression @edge-case
  Scenario: Handle concurrent modifications
    Given I am logged in as an authorized user
    And another user has modified the data
    When I attempt to save my changes
    Then I should see a conflict notification
    And I should be given options to resolve the conflict
`;
  }

  private getSimulatedCode(prompt: string): string {
    const storyMatch = prompt.match(/story[- ]?(\d+)/i);
    const storyId = storyMatch ? `story-${storyMatch[1]}` : 'story-xxx';

    return `// cypress/e2e/${storyId}.cy.ts
// Generated by Agentic Testing Workflow (Simulation Mode)
// Note: Configure ANTHROPIC_API_KEY or OPENAI_API_KEY for real generation

describe('${storyId} – Feature Under Test', () => {
  /**
   * Test data and constants
   */
  const testData = {
    validUser: {
      email: 'test@example.com',
      password: 'Test123!',
    },
    adminUser: {
      email: 'admin@example.com', 
      password: 'Admin123!',
    },
  };

  // ============================================================================
  // SETUP
  // ============================================================================

  beforeEach(() => {
    // TODO: Reset database to known state
    // cy.task('db:reset');
    
    // TODO: Seed test data
    // cy.task('db:seed');
    
    cy.visit('/');
  });

  // ============================================================================
  // SMOKE TESTS
  // ============================================================================

  it('@smoke @e2e Happy path - complete flow successfully', () => {
    // Given I am logged in as an authorized user
    // TODO: Implement login
    // cy.login('admin');
    
    // When I navigate to the feature page
    // TODO: cy.visit('/feature');
    
    // And I perform the primary action
    // TODO: cy.get('[data-testid="action-btn"]').click();
    
    // Then I should see a success confirmation
    // TODO: cy.contains('Success').should('be.visible');
    
    cy.log('TODO: Implement full test');
  });

  it('@smoke @validation Form validation prevents invalid submission', () => {
    // Given I am logged in as an authorized user
    // TODO: cy.login('user');
    
    // When I submit the form with invalid data
    // TODO: cy.get('[data-testid="submit-btn"]').click();
    
    // Then I should see validation error messages
    // TODO: cy.get('.error-message').should('be.visible');
    
    cy.log('TODO: Implement validation test');
  });

  // ============================================================================
  // SECURITY TESTS
  // ============================================================================

  it('@regression @security Unauthorized user cannot access feature', () => {
    // Given I am logged in as a regular user
    // TODO: cy.login('user');
    
    // When I attempt to access the restricted feature
    cy.visit('/restricted-feature', { failOnStatusCode: false });
    
    // Then I should be denied access
    // TODO: cy.contains('Access Denied').should('be.visible');
    
    cy.log('TODO: Implement security test');
  });

  it('@regression @security API returns 403 for unauthorized requests', () => {
    // Given I am authenticated as a regular user
    const userToken = 'TODO_GET_USER_TOKEN';
    
    // When I send a request to the restricted endpoint
    cy.request({
      method: 'POST',
      url: '/api/restricted',
      headers: { Authorization: \`Bearer \${userToken}\` },
      failOnStatusCode: false,
    }).then((response) => {
      // Then the response status should be 403
      expect(response.status).to.eq(403);
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  it('@regression @edge-case Handle empty state gracefully', () => {
    // Given there is no existing data
    // TODO: cy.task('db:clear');
    
    // When I navigate to the feature page
    // TODO: cy.visit('/feature');
    
    // Then I should see an empty state message
    // TODO: cy.get('[data-testid="empty-state"]').should('be.visible');
    
    cy.log('TODO: Implement empty state test');
  });
});
`;
  }
}

/**
 * Create a configured LLM client from environment
 */
export function createLLMClient(verbose = false): LLMClient {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (anthropicKey) {
    console.log('🔑 Using Anthropic API');
    return new LLMClient({
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      apiKey: anthropicKey,
    }, verbose);
  }

  if (openaiKey) {
    console.log('🔑 Using OpenAI API');
    return new LLMClient({
      provider: 'openai',
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      apiKey: openaiKey,
    }, verbose);
  }

  // Fallback to simulation
  console.log('⚠️  No API key found - using simulation mode');
  return new LLMClient({
    provider: 'simulation',
    model: 'simulation',
  }, verbose);
}
