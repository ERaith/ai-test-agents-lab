/**
 * Centralized Configuration
 *
 * All environment variables and configuration in one place.
 * Import config from here instead of reading process.env directly.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Config {
  // LLM
  llm: {
    provider: 'anthropic' | 'openai' | 'mock';
    anthropicKey?: string;
    anthropicModel: string;
    openaiKey?: string;
    openaiModel: string;
  };

  // Test Framework
  testFramework: 'playwright' | 'cypress';

  // Storage
  storage: {
    provider: 'local' | 's3';
    basePath: string;
    s3?: {
      bucket: string;
      region: string;
      prefix: string;
    };
  };

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================================================
// LOAD FROM ENVIRONMENT
// ============================================================================

function loadConfig(): Config {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Determine LLM provider
  let llmProvider: Config['llm']['provider'] = 'mock';
  if (anthropicKey) llmProvider = 'anthropic';
  else if (openaiKey) llmProvider = 'openai';

  // Determine storage provider
  const s3Bucket = process.env.S3_BUCKET;
  const storageProvider = process.env.STORAGE_PROVIDER === 's3' || s3Bucket ? 's3' : 'local';

  // Determine test framework
  const testFramework = process.env.TEST_FRAMEWORK?.toLowerCase() === 'cypress'
    ? 'cypress'
    : 'playwright';

  // Build config
  const config: Config = {
    llm: {
      provider: llmProvider,
      anthropicKey,
      anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      openaiKey,
      openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
    },

    testFramework,

    storage: {
      provider: storageProvider,
      basePath: process.cwd(),
    },

    logLevel: (process.env.LOG_LEVEL as Config['logLevel']) || 'info',
  };

  // Add S3 config if applicable
  if (storageProvider === 's3' && s3Bucket) {
    config.storage.s3 = {
      bucket: s3Bucket,
      region: process.env.AWS_REGION || 'us-east-1',
      prefix: process.env.S3_PREFIX || process.env.GITHUB_REPOSITORY || '',
    };
  }

  return config;
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Global configuration object - loaded once from environment
 */
export const config = loadConfig();

/**
 * Check if LLM is configured (not mock)
 */
export function hasLLMProvider(): boolean {
  return config.llm.provider !== 'mock';
}

/**
 * Check if S3 storage is configured
 */
export function hasS3Storage(): boolean {
  return config.storage.provider === 's3' && !!config.storage.s3?.bucket;
}
