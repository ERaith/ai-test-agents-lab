/**
 * Context Registry
 *
 * Central registry for managing all context types (system, story, artifact, memory).
 * Supports persistence to JSON file for cross-run access.
 */

import {
  ContextType,
  ContextMetadata,
  ContextEntry,
  ContextRegistry,
  RegistryOptions,
  StorageProvider,
} from './types.js';

const REGISTRY_FILE = 'context-registry.json';

/**
 * Default implementation of ContextRegistry
 * Stores contexts in memory with optional persistence to file
 */
export class DefaultContextRegistry implements ContextRegistry {
  private contexts: Map<string, ContextEntry> = new Map();
  private storage?: StorageProvider;

  constructor(storage?: StorageProvider) {
    this.storage = storage;
  }

  private makeKey(type: ContextType, id: string): string {
    return `${type}:${id}`;
  }

  register<T>(
    type: ContextType,
    id: string,
    data: T,
    options: RegistryOptions = {}
  ): void {
    const key = this.makeKey(type, id);

    const metadata: ContextMetadata = {
      type,
      id,
      loadedAt: new Date(),
      source: options.source || 'unknown',
      checksum: options.checksum,
      storyId: options.storyId,
    };

    const entry: ContextEntry<T> = {
      data,
      metadata,
      relatedIds: options.relatedIds,
    };

    this.contexts.set(key, entry);
  }

  get<T>(type: ContextType, id: string): T | undefined {
    const key = this.makeKey(type, id);
    const entry = this.contexts.get(key);
    return entry?.data as T | undefined;
  }

  getAll<T>(type: ContextType): ContextEntry<T>[] {
    const results: ContextEntry<T>[] = [];

    for (const [key, entry] of this.contexts) {
      if (key.startsWith(`${type}:`)) {
        results.push(entry as ContextEntry<T>);
      }
    }

    return results;
  }

  getRelated(storyId: string): ContextEntry[] {
    const results: ContextEntry[] = [];

    for (const entry of this.contexts.values()) {
      // Check if this entry is related to the story
      if (entry.metadata.storyId === storyId) {
        results.push(entry);
      }

      // Check if this entry lists the story in relatedIds
      if (entry.relatedIds?.includes(storyId)) {
        results.push(entry);
      }
    }

    // Deduplicate
    const seen = new Set<string>();
    return results.filter(entry => {
      const key = `${entry.metadata.type}:${entry.metadata.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  has(type: ContextType, id: string): boolean {
    return this.contexts.has(this.makeKey(type, id));
  }

  invalidate(type: ContextType, id?: string): void {
    if (id) {
      this.contexts.delete(this.makeKey(type, id));
    } else {
      // Remove all of this type
      for (const key of this.contexts.keys()) {
        if (key.startsWith(`${type}:`)) {
          this.contexts.delete(key);
        }
      }
    }
  }

  async persist(): Promise<void> {
    if (!this.storage) {
      console.warn('No storage provider configured, skipping persist');
      return;
    }

    const serializable = this.toSerializable();
    await this.storage.write(REGISTRY_FILE, JSON.stringify(serializable, null, 2));
  }

  async restore(): Promise<void> {
    if (!this.storage) {
      return;
    }

    try {
      const exists = await this.storage.exists(REGISTRY_FILE);
      if (!exists) {
        return;
      }

      const content = await this.storage.read(REGISTRY_FILE);
      const data = JSON.parse(content) as SerializedRegistry;
      this.fromSerializable(data);
    } catch (error) {
      console.warn('Failed to restore registry:', error);
    }
  }

  /**
   * Get summary of registered contexts
   */
  getSummary(): RegistrySummary {
    const summary: RegistrySummary = {
      total: this.contexts.size,
      byType: {
        system: 0,
        story: 0,
        artifact: 0,
        memory: 0,
      },
      entries: [],
    };

    for (const entry of this.contexts.values()) {
      summary.byType[entry.metadata.type]++;
      summary.entries.push({
        type: entry.metadata.type,
        id: entry.metadata.id,
        source: entry.metadata.source,
        loadedAt: entry.metadata.loadedAt,
      });
    }

    return summary;
  }

  /**
   * Clear all contexts
   */
  clear(): void {
    this.contexts.clear();
  }

  private toSerializable(): SerializedRegistry {
    const entries: SerializedEntry[] = [];

    for (const [key, entry] of this.contexts) {
      // Only persist certain types (not transient data)
      if (entry.metadata.type === 'system') {
        continue; // System context is loaded fresh
      }

      entries.push({
        key,
        metadata: {
          ...entry.metadata,
          loadedAt: entry.metadata.loadedAt.toISOString(),
        },
        relatedIds: entry.relatedIds,
        // Don't persist actual data for artifacts - just metadata
        hasData: entry.data !== undefined,
      });
    }

    return {
      version: 1,
      savedAt: new Date().toISOString(),
      entries,
    };
  }

  private fromSerializable(data: SerializedRegistry): void {
    // Clear current contexts
    this.contexts.clear();

    for (const entry of data.entries) {
      const metadata: ContextMetadata = {
        ...entry.metadata,
        loadedAt: new Date(entry.metadata.loadedAt as unknown as string),
      };

      // We only restore metadata, not data
      // Data needs to be reloaded from source
      this.contexts.set(entry.key, {
        data: undefined, // Will be loaded on demand
        metadata,
        relatedIds: entry.relatedIds,
      });
    }
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

interface RegistrySummary {
  total: number;
  byType: Record<ContextType, number>;
  entries: Array<{
    type: ContextType;
    id: string;
    source: string;
    loadedAt: Date;
  }>;
}

interface SerializedRegistry {
  version: number;
  savedAt: string;
  entries: SerializedEntry[];
}

interface SerializedEntry {
  key: string;
  metadata: Omit<ContextMetadata, 'loadedAt'> & { loadedAt: string };
  relatedIds?: string[];
  hasData: boolean;
}

/**
 * Create a singleton registry instance
 */
let globalRegistry: DefaultContextRegistry | null = null;

export function getGlobalRegistry(storage?: StorageProvider): DefaultContextRegistry {
  if (!globalRegistry) {
    globalRegistry = new DefaultContextRegistry(storage);
  }
  return globalRegistry;
}

export function resetGlobalRegistry(): void {
  globalRegistry = null;
}
