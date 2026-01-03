/**
 * Context Module
 *
 * Exports for context caching, registry, and cross-story memory.
 */

// Types
export * from './types.js';

// Cache
export {
  InMemoryContextCache,
  CachingContextLoader,
  formatContextForPrompt,
  getDefaultContext,
} from './cache.js';

// Registry
export {
  DefaultContextRegistry,
  getGlobalRegistry,
  resetGlobalRegistry,
} from './registry.js';

// Memory
export {
  FileMemoryStore,
  extractKeywords,
  createWorkflowMemory,
  buildMemoryContext,
  formatMemoryForPrompt,
} from './memory.js';

// Re-export storage types used by context
export type { StorageProvider } from './types.js';
