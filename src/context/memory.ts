/**
 * Cross-Story Memory Store
 *
 * File-based memory store for learning from previous workflows.
 * Uses simple keyword matching for similarity (no vector DB needed).
 */

import {
  WorkflowMemory,
  MemoryQuery,
  MemoryMatch,
  MemoryStore,
  MemoryContext,
  StorageProvider,
} from './types.js';

const MEMORY_FILE = 'memory/workflow-summaries.json';

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
  'because', 'until', 'while', 'although', 'though', 'after', 'before',
  'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our',
  'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it',
  'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what',
  'which', 'who', 'whom', 'user', 'system', 'test', 'tests', 'testing',
]);

/**
 * File-based memory store implementation
 */
export class FileMemoryStore implements MemoryStore {
  private memories: WorkflowMemory[] = [];
  private loaded = false;
  private storage: StorageProvider;

  constructor(storage: StorageProvider) {
    this.storage = storage;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;

    try {
      const exists = await this.storage.exists(MEMORY_FILE);
      if (exists) {
        const content = await this.storage.read(MEMORY_FILE);
        this.memories = JSON.parse(content);
      }
    } catch (error) {
      console.warn('Failed to load memory store:', error);
      this.memories = [];
    }

    this.loaded = true;
  }

  async save(memory: WorkflowMemory): Promise<void> {
    await this.ensureLoaded();

    // Remove existing entry for same story (update)
    this.memories = this.memories.filter(m => m.storyId !== memory.storyId);

    // Add new entry
    this.memories.push(memory);

    // Persist
    await this.storage.write(MEMORY_FILE, JSON.stringify(this.memories, null, 2));
  }

  async query(query: MemoryQuery): Promise<MemoryMatch[]> {
    await this.ensureLoaded();

    let results = [...this.memories];

    // Filter by tags
    if (query.tags?.length) {
      results = results.filter(m =>
        query.tags!.some(tag => m.tags.includes(tag))
      );
    }

    // Filter by test types
    if (query.testTypes?.length) {
      results = results.filter(m =>
        query.testTypes!.some(type => m.testTypes.includes(type))
      );
    }

    // Score by keyword matching
    const scored: MemoryMatch[] = results.map(memory => {
      const matchedKeywords: string[] = [];
      let score = 0;

      if (query.keywords?.length) {
        for (const kw of query.keywords) {
          const kwLower = kw.toLowerCase();
          if (memory.keywords.some(mk => mk.includes(kwLower) || kwLower.includes(mk))) {
            matchedKeywords.push(kw);
            score += 1;
          }
          if (memory.title.toLowerCase().includes(kwLower)) {
            score += 0.5;
          }
          if (memory.patterns.some(p => p.toLowerCase().includes(kwLower))) {
            score += 0.3;
          }
        }

        // Normalize score
        score = score / query.keywords.length;
      } else {
        score = 1; // No keywords = all match equally
      }

      return {
        memory,
        similarity: Math.min(score, 1),
        matchedKeywords,
      };
    });

    // Filter by minimum similarity
    const filtered = scored.filter(m =>
      m.similarity >= (query.minSimilarity || 0)
    );

    // Sort by similarity descending
    filtered.sort((a, b) => b.similarity - a.similarity);

    // Apply limit
    return filtered.slice(0, query.limit || 10);
  }

  async getSimilar(content: string, limit = 3): Promise<MemoryMatch[]> {
    const keywords = extractKeywords(content);
    return this.query({ keywords, limit, minSimilarity: 0.1 });
  }

  async getRecent(limit = 5): Promise<WorkflowMemory[]> {
    await this.ensureLoaded();

    return [...this.memories]
      .sort((a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      )
      .slice(0, limit);
  }

  async get(storyId: string): Promise<WorkflowMemory | undefined> {
    await this.ensureLoaded();
    return this.memories.find(m => m.storyId === storyId);
  }

  async delete(storyId: string): Promise<void> {
    await this.ensureLoaded();
    this.memories = this.memories.filter(m => m.storyId !== storyId);
    await this.storage.write(MEMORY_FILE, JSON.stringify(this.memories, null, 2));
  }

  /**
   * Get all memories (for debugging/admin)
   */
  async getAll(): Promise<WorkflowMemory[]> {
    await this.ensureLoaded();
    return [...this.memories];
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    await this.ensureLoaded();

    const stats: MemoryStats = {
      totalWorkflows: this.memories.length,
      successfulWorkflows: this.memories.filter(m => m.outcome === 'success').length,
      failedWorkflows: this.memories.filter(m => m.outcome === 'failed').length,
      commonTags: {},
      commonPatterns: {},
    };

    // Count tag frequencies
    for (const memory of this.memories) {
      for (const tag of memory.tags) {
        stats.commonTags[tag] = (stats.commonTags[tag] || 0) + 1;
      }
      for (const pattern of memory.patterns) {
        stats.commonPatterns[pattern] = (stats.commonPatterns[pattern] || 0) + 1;
      }
    }

    return stats;
  }
}

/**
 * Extract keywords from content
 */
export function extractKeywords(content: string): string[] {
  // Tokenize
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  // Remove stop words and deduplicate
  const keywords = new Set<string>();
  for (const word of words) {
    if (!STOP_WORDS.has(word)) {
      keywords.add(word);
    }
  }

  // Return top keywords (by order of appearance)
  return Array.from(keywords).slice(0, 20);
}

/**
 * Create a workflow memory from completed workflow data
 */
export function createWorkflowMemory(
  storyId: string,
  title: string,
  storyContent: string,
  options: {
    tags?: string[];
    testTypes?: string[];
    patterns?: string[];
    lessonsLearned?: string[];
    outcome?: 'success' | 'failed';
    artifactPaths?: WorkflowMemory['artifactPaths'];
  } = {}
): WorkflowMemory {
  return {
    storyId,
    title,
    keywords: extractKeywords(storyContent),
    tags: options.tags || [],
    testTypes: options.testTypes || ['e2e'],
    patterns: options.patterns || [],
    lessonsLearned: options.lessonsLearned,
    completedAt: new Date().toISOString(),
    outcome: options.outcome || 'success',
    artifactPaths: options.artifactPaths || {},
  };
}

/**
 * Build memory context for agent prompts
 */
export function buildMemoryContext(matches: MemoryMatch[]): MemoryContext {
  // Extract common patterns
  const patternCounts = new Map<string, number>();
  for (const match of matches) {
    for (const pattern of match.memory.patterns) {
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
    }
  }

  // Sort patterns by frequency
  const commonPatterns = Array.from(patternCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern]) => pattern);

  // Build recommendations from lessons learned
  const recommendations: string[] = [];
  for (const match of matches) {
    if (match.memory.lessonsLearned) {
      recommendations.push(...match.memory.lessonsLearned);
    }
  }

  return {
    relatedStories: matches,
    commonPatterns,
    recommendations: [...new Set(recommendations)].slice(0, 5),
  };
}

/**
 * Format memory context for inclusion in prompts
 */
export function formatMemoryForPrompt(memoryContext: MemoryContext): string {
  if (memoryContext.relatedStories.length === 0) {
    return '';
  }

  let prompt = `\n## Insights from Similar Stories\n\n`;

  // Related stories
  prompt += `### Related Workflows\n`;
  for (const match of memoryContext.relatedStories.slice(0, 3)) {
    const m = match.memory;
    prompt += `- **${m.storyId}**: ${m.title}\n`;
    prompt += `  - Tags: ${m.tags.join(', ') || 'none'}\n`;
    prompt += `  - Patterns: ${m.patterns.slice(0, 3).join(', ') || 'none'}\n`;
    if (match.matchedKeywords.length > 0) {
      prompt += `  - Matched keywords: ${match.matchedKeywords.join(', ')}\n`;
    }
  }

  // Common patterns
  if (memoryContext.commonPatterns.length > 0) {
    prompt += `\n### Common Patterns to Consider\n`;
    for (const pattern of memoryContext.commonPatterns) {
      prompt += `- ${pattern}\n`;
    }
  }

  // Recommendations
  if (memoryContext.recommendations.length > 0) {
    prompt += `\n### Recommendations\n`;
    for (const rec of memoryContext.recommendations) {
      prompt += `- ${rec}\n`;
    }
  }

  return prompt;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

interface MemoryStats {
  totalWorkflows: number;
  successfulWorkflows: number;
  failedWorkflows: number;
  commonTags: Record<string, number>;
  commonPatterns: Record<string, number>;
}
