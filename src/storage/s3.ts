/**
 * S3 Storage Provider
 *
 * AWS S3 implementation of StorageProvider for cross-PR context persistence.
 * Supports per-repository scoping with configurable prefixes.
 *
 * Required environment variables:
 * - AWS_REGION (or defaults to us-east-1)
 * - S3_BUCKET
 * - S3_PREFIX (optional, defaults to repository name)
 *
 * Authentication via:
 * - OIDC (recommended for GitHub Actions)
 * - AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
 * - IAM role (when running on AWS)
 */

import { StorageProvider } from './types.js';

// Dynamic import for AWS SDK (only loaded when needed)
let s3Client: any = null;
let s3Commands: any = null;

async function getS3Client(region: string) {
  if (!s3Client) {
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3Client = new S3Client({ region });
  }
  return s3Client;
}

async function getS3Commands() {
  if (!s3Commands) {
    s3Commands = await import('@aws-sdk/client-s3');
  }
  return s3Commands;
}

/**
 * S3 Storage Provider configuration
 */
export interface S3StorageConfig {
  bucket: string;
  region?: string;
  prefix?: string;  // Repository-scoped prefix (e.g., "owner/repo")
}

/**
 * S3-based storage provider for cross-PR context persistence
 */
export class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private region: string;
  private prefix: string;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.region = config.region || process.env.AWS_REGION || 'us-east-1';
    this.prefix = config.prefix || '';
  }

  /**
   * Get the full S3 key for a path
   */
  private getKey(path: string): string {
    const cleanPath = path.replace(/^\/+/, '');
    return this.prefix ? `${this.prefix}/${cleanPath}` : cleanPath;
  }

  async read(path: string): Promise<string> {
    const client = await getS3Client(this.region);
    const { GetObjectCommand } = await getS3Commands();

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.getKey(path),
    });

    try {
      const response = await client.send(command);
      return await response.Body?.transformToString() || '';
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  async write(path: string, content: string): Promise<void> {
    const client = await getS3Client(this.region);
    const { PutObjectCommand } = await getS3Commands();

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: this.getKey(path),
      Body: content,
      ContentType: this.getContentType(path),
    });

    await client.send(command);
  }

  async exists(path: string): Promise<boolean> {
    const client = await getS3Client(this.region);
    const { HeadObjectCommand } = await getS3Commands();

    try {
      await client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: this.getKey(path),
      }));
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix: string): Promise<string[]> {
    const client = await getS3Client(this.region);
    const { ListObjectsV2Command } = await getS3Commands();

    const fullPrefix = this.getKey(prefix);
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: fullPrefix,
    });

    try {
      const response = await client.send(command);
      return (response.Contents || [])
        .map((obj: any) => obj.Key || '')
        .filter(Boolean)
        .map((key: string) => {
          // Remove the prefix to return relative paths
          if (this.prefix && key.startsWith(this.prefix + '/')) {
            return key.substring(this.prefix.length + 1);
          }
          return key;
        });
    } catch {
      return [];
    }
  }

  async delete(path: string): Promise<void> {
    const client = await getS3Client(this.region);
    const { DeleteObjectCommand } = await getS3Commands();

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: this.getKey(path),
    });

    await client.send(command);
  }

  async getModifiedTime(path: string): Promise<number | undefined> {
    const client = await getS3Client(this.region);
    const { HeadObjectCommand } = await getS3Commands();

    try {
      const response = await client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: this.getKey(path),
      }));
      return response.LastModified?.getTime();
    } catch {
      return undefined;
    }
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      'json': 'application/json',
      'md': 'text/markdown',
      'ts': 'text/typescript',
      'js': 'application/javascript',
      'feature': 'text/plain',
      'yaml': 'text/yaml',
      'yml': 'text/yaml',
    };
    return types[ext || ''] || 'text/plain';
  }

  /**
   * Copy an object within S3
   */
  async copy(sourcePath: string, destPath: string): Promise<void> {
    const client = await getS3Client(this.region);
    const { CopyObjectCommand } = await getS3Commands();

    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${this.getKey(sourcePath)}`,
      Key: this.getKey(destPath),
    });

    await client.send(command);
  }

  /**
   * Get a pre-signed URL for reading (useful for sharing artifacts)
   */
  async getSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = await getS3Commands();
    const client = await getS3Client(this.region);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: this.getKey(path),
    });

    return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  }
}

/**
 * Create S3 storage provider from environment variables
 */
export function createS3StorageFromEnv(): S3StorageProvider {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error('S3_BUCKET environment variable is required');
  }

  // Default prefix to GitHub repository if available
  const defaultPrefix = process.env.GITHUB_REPOSITORY || '';

  return new S3StorageProvider({
    bucket,
    region: process.env.AWS_REGION || 'us-east-1',
    prefix: process.env.S3_PREFIX || defaultPrefix,
  });
}

/**
 * Check if S3 storage is configured
 */
export function isS3Configured(): boolean {
  return !!process.env.S3_BUCKET;
}
