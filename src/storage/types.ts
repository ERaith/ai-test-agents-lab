/**
 * Storage Types
 *
 * Interfaces for storage providers (local filesystem, S3, etc.)
 * and state stores (local, DynamoDB, etc.)
 */

import { WorkflowState, WorkflowPhase } from '../types.js';

/**
 * Storage provider interface for file-like operations
 * Implemented by LocalStorageProvider and S3StorageProvider
 */
export interface StorageProvider {
  /**
   * Read content from a path
   * @throws Error if file doesn't exist
   */
  read(path: string): Promise<string>;

  /**
   * Write content to a path (creates directories if needed)
   */
  write(path: string, content: string): Promise<void>;

  /**
   * Check if a path exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * List files in a directory/prefix
   */
  list(prefix: string): Promise<string[]>;

  /**
   * Delete a file
   */
  delete(path: string): Promise<void>;

  /**
   * Get the last modified time (for cache validation)
   */
  getModifiedTime(path: string): Promise<number | undefined>;
}

/**
 * Configuration for storage provider
 */
export interface StorageConfig {
  provider: 'local' | 's3';
  basePath?: string;  // For local storage
  s3?: {
    bucket: string;
    region: string;
    prefix?: string;
  };
}

/**
 * State store interface for workflow state persistence
 * Implemented by LocalStateStore and DynamoDBStateStore
 */
export interface StateStore {
  /**
   * Get workflow state by ID
   */
  getState(workflowId: string): Promise<WorkflowState | null>;

  /**
   * Save workflow state
   */
  saveState(state: WorkflowState): Promise<void>;

  /**
   * Update just the phase (optimized for frequent updates)
   */
  updatePhase(workflowId: string, phase: WorkflowPhase): Promise<void>;

  /**
   * List workflows with optional filter
   */
  listWorkflows(filter?: StateFilter): Promise<WorkflowSummary[]>;

  /**
   * Delete a workflow state
   */
  deleteState(workflowId: string): Promise<void>;
}

/**
 * Filter for listing workflows
 */
export interface StateFilter {
  status?: 'active' | 'completed' | 'failed';
  since?: Date;
  storyId?: string;
  limit?: number;
}

/**
 * Summary of a workflow for listing
 */
export interface WorkflowSummary {
  storyId: string;
  phase: WorkflowPhase;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  outcome?: 'success' | 'failed';
}

/**
 * Configuration for state store
 */
export interface StateStoreConfig {
  provider: 'local' | 'dynamodb';
  localPath?: string;  // For local storage
  dynamodb?: {
    tableName: string;
    region: string;
  };
}

/**
 * Factory function type for creating storage providers
 */
export type StorageProviderFactory = (config: StorageConfig) => StorageProvider;

/**
 * Factory function type for creating state stores
 */
export type StateStoreFactory = (config: StateStoreConfig) => StateStore;
