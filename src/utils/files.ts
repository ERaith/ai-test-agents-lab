/**
 * File System Utilities
 * 
 * LEARNING NOTE: In enterprise systems, file operations should be centralized
 * with consistent error handling and logging. This makes debugging easier
 * and ensures all agents interact with files the same way.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

/**
 * Read a file relative to project root
 */
export async function readFile(relativePath: string): Promise<string> {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  try {
    return await fs.readFile(fullPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file: ${relativePath} - ${error}`);
  }
}

/**
 * Write a file relative to project root, creating directories as needed
 */
export async function writeFile(relativePath: string, content: string): Promise<void> {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  const dir = path.dirname(fullPath);
  
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    console.log(`✅ Written: ${relativePath}`);
  } catch (error) {
    throw new Error(`Failed to write file: ${relativePath} - ${error}`);
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * List files in a directory matching a pattern
 */
export async function listFiles(relativePath: string, extension?: string): Promise<string[]> {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  try {
    const files = await fs.readdir(fullPath);
    if (extension) {
      return files.filter(f => f.endsWith(extension));
    }
    return files;
  } catch {
    return [];
  }
}

/**
 * Get artifact path for a story
 */
export function getArtifactPath(storyId: string, filename: string): string {
  return `test-artifacts/${storyId}/${filename}`;
}

/**
 * Get spec path for a story
 */
export function getSpecPath(storyId: string): string {
  return `specs/${storyId}.md`;
}

/**
 * Get test file path for a story
 */
export function getTestPath(storyId: string): string {
  return `cypress/e2e/${storyId}.cy.ts`;
}
