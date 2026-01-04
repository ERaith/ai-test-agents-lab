/**
 * Base Agent Class
 * 
 * LEARNING NOTE: The base agent provides common functionality:
 * - Logging with consistent formatting
 * - Error handling
 * - Timing/metrics
 * - LLM interaction patterns
 * 
 * INTERVIEW POINT: "Our agents extend a base class that handles cross-cutting
 * concerns. This ensures consistent behavior and makes it easy to add
 * observability features like logging, metrics, and tracing."
 */

import { Agent, AgentInput, AgentOutput } from '../types.js';
import { LLMClient, LLMMessage, createLLMClient } from '../utils/llm.js';
import { BuiltPrompt } from '../prompts/index.js';

export abstract class BaseAgent implements Agent {
  abstract name: string;
  abstract description: string;

  protected llm: LLMClient;
  protected verbose: boolean;

  // Store last used prompt for artifact persistence
  protected lastPrompt?: BuiltPrompt;

  constructor(llm?: LLMClient, verbose = false) {
    this.verbose = verbose;
    this.llm = llm || createLLMClient(verbose);
  }

  /**
   * Get the last used prompt (for artifact persistence)
   */
  getLastPrompt(): BuiltPrompt | undefined {
    return this.lastPrompt;
  }

  /**
   * Main execution method - template method pattern
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    this.log(`Starting execution...`);

    try {
      // Validate input
      this.validateInput(input);

      // Build the prompt
      const messages = this.buildPrompt(input);
      
      if (this.verbose) {
        this.log(`Prompt built with ${messages.length} messages`);
        this.log(
          `System prompt length: ${messages.find(m => m.role === 'system')?.content.length || 0} chars`
        );
        this.log(
          `User prompt length: ${messages.find(m => m.role === 'user')?.content.length || 0} chars`
        );
        if (this.lastPrompt) {
          this.log(`Prompt version: ${this.lastPrompt.metadata.version}`);
        }
      }

      // Call LLM
      this.log(`Calling LLM...`);
      const response = await this.llm.complete(messages);
      
      if (this.verbose && response.usage) {
        this.log(`Tokens used: ${response.usage.inputTokens} in / ${response.usage.outputTokens} out`);
      }

      // Process result
      const result = this.processResponse(response.content, input);

      const duration = Date.now() - startTime;
      this.log(`✅ Completed in ${duration}ms`);

      return {
        success: true,
        result,
        metadata: {
          duration,
          tokens: response.usage,
          promptVersion: this.lastPrompt?.metadata.version,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log(`Failed: ${message}`, 'error');
      
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Validate input - override in subclasses for specific validation
   */
  protected validateInput(input: AgentInput): void {
    if (!input.context) {
      throw new Error('System context is required');
    }
  }

  /**
   * Build the prompt messages - must be implemented by subclasses
   */
  protected abstract buildPrompt(input: AgentInput): LLMMessage[];

  /**
   * Process the LLM response - can be overridden for custom processing
   */
  protected processResponse(response: string, _input: AgentInput): string {
    return response;
  }

  /**
   * Logging helper
   */
  protected log(message: string, level: 'info' | 'error' | 'warn' = 'info'): void {
    const prefix = `[${this.name}]`;
    const icon = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '🤖';
    console.log(`${icon} ${prefix} ${message}`);
  }
}

// Re-export formatContext from prompts for backward compatibility
export { formatContext } from '../prompts/index.js';
