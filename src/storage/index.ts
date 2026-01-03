/**
 * Storage Module
 *
 * Exports storage providers and state stores.
 * Use createStorageProvider() and createStateStore() factories
 * to create instances based on configuration.
 */

export * from './types.js';
export * from './local.js';
export * from './s3.js';

import { StorageProvider, StorageConfig, StateStore, StateStoreConfig } from './types.js';
import { LocalStorageProvider, LocalStateStore } from './local.js';
import { S3StorageProvider, createS3StorageFromEnv, isS3Configured } from './s3.js';

/**
 * Create a storage provider based on configuration
 */
export function createStorageProvider(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case 's3':
      if (!config.s3) {
        throw new Error('S3 configuration required for S3 storage provider');
      }
      return new S3StorageProvider({
        bucket: config.s3.bucket,
        region: config.s3.region,
        prefix: config.s3.prefix,
      });

    case 'local':
    default:
      return new LocalStorageProvider(config.basePath);
  }
}

/**
 * Create a state store based on configuration
 */
export function createStateStore(
  config: StateStoreConfig,
  storage?: StorageProvider
): StateStore {
  switch (config.provider) {
    case 'dynamodb':
      // DynamoDB provider not implemented yet - will be added when needed
      throw new Error(
        'DynamoDB state store not implemented. ' +
        'Add @aws-sdk/client-dynamodb dependency and implement DynamoDBStateStore.'
      );

    case 'local':
    default:
      const storageProvider = storage || new LocalStorageProvider(config.localPath);
      return new LocalStateStore(storageProvider);
  }
}

/**
 * Get storage provider from environment configuration
 */
export function getStorageProviderFromEnv(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'local';

  if (provider === 's3' || isS3Configured()) {
    return createS3StorageFromEnv();
  }

  return createStorageProvider({
    provider: 'local',
    basePath: process.cwd(),
  });
}

/**
 * Get state store from environment configuration
 */
export function getStateStoreFromEnv(storage?: StorageProvider): StateStore {
  const provider = process.env.STATE_STORE_PROVIDER || 'local';

  if (provider === 'dynamodb') {
    const tableName = process.env.DYNAMODB_TABLE;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!tableName) {
      throw new Error('DYNAMODB_TABLE environment variable required for DynamoDB state store');
    }

    return createStateStore({
      provider: 'dynamodb',
      dynamodb: { tableName, region },
    });
  }

  return createStateStore(
    { provider: 'local', localPath: process.cwd() },
    storage
  );
}
