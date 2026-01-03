/**
 * Local Storage Provider
 *
 * File-system based implementation of StorageProvider.
 * Uses Node.js fs module for all operations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageProvider } from './types.js';

/**
 * Local file system storage provider
 */
export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  private resolvePath(relativePath: string): string {
    // Ensure we don't escape the base path
    const resolved = path.resolve(this.basePath, relativePath);
    if (!resolved.startsWith(this.basePath)) {
      throw new Error(`Path ${relativePath} escapes base path`);
    }
    return resolved;
  }

  async read(relativePath: string): Promise<string> {
    const fullPath = this.resolvePath(relativePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  async write(relativePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(relativePath);

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = this.resolvePath(relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix: string): Promise<string[]> {
    try {
      const fullPath = this.resolvePath(prefix);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      return entries.map(entry => {
        const relativePath = path.join(prefix, entry.name);
        return entry.isDirectory() ? relativePath + '/' : relativePath;
      });
    } catch {
      return [];
    }
  }

  async delete(relativePath: string): Promise<void> {
    const fullPath = this.resolvePath(relativePath);
    await fs.unlink(fullPath);
  }

  async getModifiedTime(relativePath: string): Promise<number | undefined> {
    try {
      const fullPath = this.resolvePath(relativePath);
      const stats = await fs.stat(fullPath);
      return stats.mtimeMs;
    } catch {
      return undefined;
    }
  }
}

/**
 * Local file-based state store
 */
import { WorkflowState, WorkflowPhase } from '../types.js';
import { StateStore, StateFilter, WorkflowSummary } from './types.js';

const STATE_DIR = 'state';

export class LocalStateStore implements StateStore {
  private storage: StorageProvider;

  constructor(storage: StorageProvider) {
    this.storage = storage;
  }

  private getStatePath(workflowId: string): string {
    return path.join(STATE_DIR, `${workflowId}.json`);
  }

  async getState(workflowId: string): Promise<WorkflowState | null> {
    const statePath = this.getStatePath(workflowId);

    try {
      const exists = await this.storage.exists(statePath);
      if (!exists) return null;

      const content = await this.storage.read(statePath);
      const state = JSON.parse(content) as WorkflowState;

      // Convert date strings back to Date objects
      state.metadata.startedAt = new Date(state.metadata.startedAt);
      state.metadata.updatedAt = new Date(state.metadata.updatedAt);
      if (state.metadata.completedAt) {
        state.metadata.completedAt = new Date(state.metadata.completedAt);
      }
      for (const event of state.history) {
        event.timestamp = new Date(event.timestamp);
      }

      return state;
    } catch {
      return null;
    }
  }

  async saveState(state: WorkflowState): Promise<void> {
    const statePath = this.getStatePath(state.storyId);
    await this.storage.write(statePath, JSON.stringify(state, null, 2));
  }

  async updatePhase(workflowId: string, phase: WorkflowPhase): Promise<void> {
    const state = await this.getState(workflowId);
    if (!state) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    state.phase = phase;
    state.metadata.updatedAt = new Date();
    state.history.push({
      timestamp: new Date(),
      phase,
      action: `Phase changed to ${phase}`,
    });

    await this.saveState(state);
  }

  async listWorkflows(filter?: StateFilter): Promise<WorkflowSummary[]> {
    const stateDir = STATE_DIR;

    try {
      const files = await this.storage.list(stateDir);
      const summaries: WorkflowSummary[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const state = await this.getState(
          path.basename(file, '.json')
        );

        if (!state) continue;

        // Apply filters
        if (filter?.storyId && state.storyId !== filter.storyId) continue;
        if (filter?.since && state.metadata.startedAt < filter.since) continue;
        if (filter?.status) {
          const isCompleted = state.phase === 'completed';
          const isFailed = state.phase === 'failed';
          const isActive = !isCompleted && !isFailed;

          if (filter.status === 'completed' && !isCompleted) continue;
          if (filter.status === 'failed' && !isFailed) continue;
          if (filter.status === 'active' && !isActive) continue;
        }

        summaries.push({
          storyId: state.storyId,
          phase: state.phase,
          startedAt: state.metadata.startedAt,
          updatedAt: state.metadata.updatedAt,
          completedAt: state.metadata.completedAt,
          outcome: state.phase === 'completed' ? 'success' :
                   state.phase === 'failed' ? 'failed' : undefined,
        });
      }

      // Sort by updatedAt descending
      summaries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // Apply limit
      if (filter?.limit) {
        return summaries.slice(0, filter.limit);
      }

      return summaries;
    } catch {
      return [];
    }
  }

  async deleteState(workflowId: string): Promise<void> {
    const statePath = this.getStatePath(workflowId);
    await this.storage.delete(statePath);
  }
}
