/**
 * Context Management Types
 *
 * Defines interfaces for context caching, registry, and cross-story memory.
 * Designed for cheap implementation with file-based storage first,
 * with abstractions that can swap to AWS later.
 */

import { SystemContext, WorkflowPhase } from '../types.js';

// ============================================================================
// CACHE TYPES
// ============================================================================

/**
 * Cache entry with checksum validation
 */
export interface CacheEntry<T> {
  data: T;
  checksum: string;
  cachedAt: Date;
  fileMtime?: number;  // File modification time for quick validation
}

/**
 * Configuration for context caching
 */
export interface CacheConfig {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttlMs: number;
  /** Whether to validate checksum on every access */
  validateOnAccess: boolean;
}

/**
 * Context cache interface
 */
export interface ContextCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, checksum?: string): void;
  has(key: string): boolean;
  invalidate(key?: string): void;
  getChecksum(key: string): string | undefined;
}

/**
 * Context loader with caching support
 */
export interface ContextLoader<T> {
  load(path?: string): Promise<T>;
  invalidate(path?: string): void;
  getChecksum(path: string): Promise<string>;
}

// ============================================================================
// REGISTRY TYPES
// ============================================================================

/**
 * Types of context that can be registered
 */
export type ContextType = 'system' | 'story' | 'artifact' | 'memory';

/**
 * Metadata about a registered context
 */
export interface ContextMetadata {
  type: ContextType;
  id: string;
  loadedAt: Date;
  source: string;
  checksum?: string;
  storyId?: string;  // For relating artifacts to stories
}

/**
 * A registered context entry
 */
export interface ContextEntry<T = unknown> {
  data: T;
  metadata: ContextMetadata;
  relatedIds?: string[];  // IDs of related contexts
}

/**
 * Context registry for managing all context types
 */
export interface ContextRegistry {
  /** Register a context entry */
  register<T>(type: ContextType, id: string, data: T, options?: RegistryOptions): void;

  /** Get a context by type and id */
  get<T>(type: ContextType, id: string): T | undefined;

  /** Get all contexts of a type */
  getAll<T>(type: ContextType): ContextEntry<T>[];

  /** Get contexts related to a story */
  getRelated(storyId: string): ContextEntry[];

  /** Check if a context exists */
  has(type: ContextType, id: string): boolean;

  /** Invalidate contexts */
  invalidate(type: ContextType, id?: string): void;

  /** Persist registry to storage */
  persist(): Promise<void>;

  /** Load registry from storage */
  restore(): Promise<void>;
}

export interface RegistryOptions {
  source?: string;
  checksum?: string;
  storyId?: string;
  relatedIds?: string[];
}

// ============================================================================
// MEMORY TYPES (Cross-Story Learning)
// ============================================================================

/**
 * Summary of a completed workflow for memory storage
 */
export interface WorkflowMemory {
  storyId: string;
  title: string;
  keywords: string[];       // Extracted from story content
  tags: string[];           // Test tags used (@smoke, @e2e, etc.)
  testTypes: string[];      // Types of tests generated
  patterns: string[];       // Key patterns/approaches used
  lessonsLearned?: string[]; // Optional insights from the workflow
  completedAt: string;
  outcome: 'success' | 'failed';
  artifactPaths: {
    testPlan?: string;
    scenarios?: string;
    testCode?: string;
  };
}

/**
 * Query for retrieving similar workflows
 */
export interface MemoryQuery {
  keywords?: string[];
  tags?: string[];
  testTypes?: string[];
  limit?: number;
  minSimilarity?: number;  // 0-1 score threshold
}

/**
 * Result of a memory query with similarity score
 */
export interface MemoryMatch {
  memory: WorkflowMemory;
  similarity: number;  // 0-1 score
  matchedKeywords: string[];
}

/**
 * Memory store interface for cross-story learning
 */
export interface MemoryStore {
  /** Save a workflow summary to memory */
  save(memory: WorkflowMemory): Promise<void>;

  /** Query for similar workflows */
  query(query: MemoryQuery): Promise<MemoryMatch[]>;

  /** Get workflows similar to given content */
  getSimilar(content: string, limit?: number): Promise<MemoryMatch[]>;

  /** Get most recent workflows */
  getRecent(limit?: number): Promise<WorkflowMemory[]>;

  /** Get a specific workflow by ID */
  get(storyId: string): Promise<WorkflowMemory | undefined>;

  /** Delete a workflow from memory */
  delete(storyId: string): Promise<void>;
}

/**
 * Context provided to agents from memory
 */
export interface MemoryContext {
  relatedStories: MemoryMatch[];
  commonPatterns: string[];
  recommendations: string[];
}

// ============================================================================
// PROVIDER TYPES (for future AWS integration)
// ============================================================================

/**
 * Storage provider interface (implemented by local and S3)
 */
export interface StorageProvider {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  list(prefix: string): Promise<string[]>;
  delete(path: string): Promise<void>;
  getModifiedTime(path: string): Promise<number | undefined>;
}

/**
 * State store interface (for workflow state persistence)
 */
export interface StateStore {
  getState(workflowId: string): Promise<import('../types.js').WorkflowState | null>;
  saveState(state: import('../types.js').WorkflowState): Promise<void>;
  updatePhase(workflowId: string, phase: WorkflowPhase): Promise<void>;
  listWorkflows(filter?: StateFilter): Promise<WorkflowSummary[]>;
}

export interface StateFilter {
  status?: 'active' | 'completed' | 'failed';
  since?: Date;
  storyId?: string;
}

export interface WorkflowSummary {
  storyId: string;
  phase: WorkflowPhase;
  startedAt: Date;
  updatedAt: Date;
}
