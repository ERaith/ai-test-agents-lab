/**
 * Context Cache with Checksum Validation
 *
 * Provides caching for SystemContext with MD5 checksum validation
 * to detect when the source file has changed.
 */

import { createHash } from 'crypto';
import { SystemContext, DomainConstraint } from '../types.js';
import {
  CacheEntry,
  CacheConfig,
  ContextCache,
  ContextLoader,
  StorageProvider,
} from './types.js';

const DEFAULT_CONTEXT_PATH = 'src/prompts/system-context.md';

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttlMs: 5 * 60 * 1000, // 5 minutes
  validateOnAccess: true,
};

/**
 * In-memory context cache with checksum validation
 */
export class InMemoryContextCache implements ContextCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    const age = Date.now() - entry.cachedAt.getTime();
    if (age > this.config.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data as T;
  }

  set<T>(key: string, value: T, checksum?: string): void {
    this.cache.set(key, {
      data: value,
      checksum: checksum || '',
      cachedAt: new Date(),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  getChecksum(key: string): string | undefined {
    return this.cache.get(key)?.checksum;
  }
}

/**
 * Caching context loader with file checksum validation
 */
export class CachingContextLoader implements ContextLoader<SystemContext> {
  private cache: ContextCache;
  private storage: StorageProvider;

  constructor(storage: StorageProvider, cache?: ContextCache) {
    this.storage = storage;
    this.cache = cache || new InMemoryContextCache();
  }

  async load(path: string = DEFAULT_CONTEXT_PATH): Promise<SystemContext> {
    // Check cache first
    const cached = this.cache.get<SystemContext>(path);
    if (cached) {
      // Validate checksum if configured
      const currentChecksum = await this.getChecksum(path);
      const cachedChecksum = this.cache.getChecksum(path);

      if (currentChecksum === cachedChecksum) {
        return cached;
      }
      // Checksum mismatch - invalidate and reload
      this.cache.invalidate(path);
    }

    // Load fresh
    const exists = await this.storage.exists(path);
    if (!exists) {
      console.warn(`⚠️  System context not found at ${path}, using defaults`);
      const defaults = getDefaultContext();
      this.cache.set(path, defaults, 'defaults');
      return defaults;
    }

    const content = await this.storage.read(path);
    const context = parseSystemContext(content);
    const checksum = await this.getChecksum(path);

    this.cache.set(path, context, checksum);
    return context;
  }

  async getChecksum(path: string): Promise<string> {
    try {
      const content = await this.storage.read(path);
      return createHash('md5').update(content).digest('hex');
    } catch {
      return 'not-found';
    }
  }

  invalidate(path?: string): void {
    this.cache.invalidate(path);
  }
}

/**
 * Parse markdown system context into structured data
 */
function parseSystemContext(markdown: string): SystemContext {
  const context = getDefaultContext();

  // Extract tech stack
  const techStackMatch = markdown.match(/## Tech Stack\n([\s\S]*?)(?=\n##|$)/);
  if (techStackMatch) {
    const techSection = techStackMatch[1];
    const backendMatch = techSection.match(/Backend:\s*(.+)/);
    const frontendMatch = techSection.match(/Frontend:\s*(.+)/);
    const e2eMatch = techSection.match(/E2E tests:\s*(.+)/);
    const testFrameworkMatch = techSection.match(/Test Framework:\s*(.+)/);

    if (backendMatch) context.techStack.backend = backendMatch[1].trim();
    if (frontendMatch) context.techStack.frontend = frontendMatch[1].trim();
    if (e2eMatch) context.techStack.testFramework = e2eMatch[1].trim();
    if (testFrameworkMatch) context.techStack.testFramework = testFrameworkMatch[1].trim();
  }

  // Extract testing principles
  const principlesMatch = markdown.match(/## Testing Principles\n([\s\S]*?)(?=\n##|$)/);
  if (principlesMatch) {
    const principles = principlesMatch[1]
      .split('\n')
      .filter(line => line.startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim());
    if (principles.length > 0) {
      context.testingPrinciples = principles;
    }
  }

  // Extract domain constraints
  const constraintsMatch = markdown.match(/## Domain Constraints[\s\S]*?\n([\s\S]*?)(?=\n##|$)/);
  if (constraintsMatch) {
    const constraints = parseConstraints(constraintsMatch[1]);
    context.domainConstraints = constraints;
  }

  // Extract output expectations
  const outputMatch = markdown.match(/## Output Expectations\n([\s\S]*?)(?=\n##|$)/);
  if (outputMatch) {
    const outputSection = outputMatch[1];
    const planningMatch = outputSection.match(/planning.*?output\s*\*\*(.+?)\*\*/i);
    const casesMatch = outputSection.match(/test cases.*?output\s*\*\*(.+?)\*\*/i);
    const codeMatch = outputSection.match(/code.*?output\s*\*\*(.+?)\*\*/i);

    if (planningMatch) context.outputExpectations.planning = planningMatch[1];
    if (casesMatch) context.outputExpectations.testCases = casesMatch[1];
    if (codeMatch) context.outputExpectations.code = codeMatch[1];
  }

  // Extract paths if present
  const pathsMatch = markdown.match(/## Paths\n([\s\S]*?)(?=\n##|$)/);
  if (pathsMatch) {
    const pathsSection = pathsMatch[1];
    const specsMatch = pathsSection.match(/specs:\s*(.+)/i);
    const artifactsMatch = pathsSection.match(/artifacts:\s*(.+)/i);
    const testsMatch = pathsSection.match(/tests:\s*(.+)/i);
    const helpersMatch = pathsSection.match(/helpers:\s*(.+)/i);

    if (specsMatch) context.paths.specs = specsMatch[1].trim();
    if (artifactsMatch) context.paths.artifacts = artifactsMatch[1].trim();
    if (testsMatch) context.paths.tests = testsMatch[1].trim();
    if (helpersMatch) context.paths.helpers = helpersMatch[1].trim();
  }

  return context;
}

/**
 * Parse domain constraints from markdown
 */
function parseConstraints(text: string): DomainConstraint[] {
  const constraints: DomainConstraint[] = [];
  const lines = text.split('\n').filter(l => l.trim());

  let currentEntity = '';
  let currentRules: string[] = [];

  for (const line of lines) {
    if (line.startsWith('-') && !line.startsWith('  -')) {
      // New entity
      if (currentEntity && currentRules.length > 0) {
        constraints.push({ entity: currentEntity, rules: currentRules });
      }
      currentEntity = line.replace(/^-\s*/, '').replace(/:$/, '').trim();
      currentRules = [];
    } else if (line.trim().startsWith('-')) {
      // Rule for current entity
      currentRules.push(line.replace(/^\s*-\s*/, '').trim());
    }
  }

  // Don't forget the last entity
  if (currentEntity && currentRules.length > 0) {
    constraints.push({ entity: currentEntity, rules: currentRules });
  }

  // If no structured constraints found, treat each line as a rule
  if (constraints.length === 0) {
    const rules = lines.filter(l => l.startsWith('-')).map(l => l.replace(/^-\s*/, '').trim());
    if (rules.length > 0) {
      constraints.push({ entity: 'General', rules });
    }
  }

  return constraints;
}

/**
 * Default context when no file is found
 * Updated to use Playwright as the default test framework
 */
function getDefaultContext(): SystemContext {
  return {
    techStack: {
      backend: 'Node.js/Express',
      frontend: 'React',
      testFramework: 'Playwright',
      language: 'TypeScript',
    },
    testingPrinciples: [
      'Focus on high-value, maintainable tests',
      'Prefer a few strong tests over many brittle ones',
      'Use BDD/Gherkin style for planning',
      'Use descriptive tags (@smoke, @regression)',
    ],
    domainConstraints: [],
    outputExpectations: {
      planning: 'markdown',
      testCases: 'Gherkin',
      code: 'TypeScript',
    },
    paths: {
      specs: 'specs',
      artifacts: 'test-artifacts',
      tests: 'playwright/tests',
      helpers: 'playwright/fixtures/base.ts',
    },
  };
}

/**
 * Format context as a string for prompts
 */
export function formatContextForPrompt(context: SystemContext): string {
  return `
## Tech Stack
- Backend: ${context.techStack.backend}
- Frontend: ${context.techStack.frontend}
- Test Framework: ${context.techStack.testFramework}
- Language: ${context.techStack.language}

## Testing Principles
${context.testingPrinciples.map(p => `- ${p}`).join('\n')}

## Domain Constraints
${context.domainConstraints.map(c => `
### ${c.entity}
${c.rules.map(r => `- ${r}`).join('\n')}
`).join('\n')}

## Output Expectations
- Planning: ${context.outputExpectations.planning}
- Test Cases: ${context.outputExpectations.testCases}
- Code: ${context.outputExpectations.code}
`.trim();
}

// Export for backward compatibility
export { getDefaultContext };
