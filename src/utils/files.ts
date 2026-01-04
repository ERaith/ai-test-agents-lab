/**
 * File System Utilities
 *
 * Centralized file operations with consistent error handling.
 * Supports both Playwright (default) and Cypress test frameworks.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

const PROJECT_ROOT = process.cwd();

// ============================================================================
// TEST FRAMEWORK CONFIGURATION
// ============================================================================

export type TestFramework = 'playwright' | 'cypress';

/**
 * Get the configured test framework from environment or default to Playwright
 */
export function getTestFramework(): TestFramework {
  const framework = process.env.TEST_FRAMEWORK?.toLowerCase();
  if (framework === 'cypress') return 'cypress';
  return 'playwright';
}

/**
 * Get test directory based on framework
 */
export function getTestDir(framework: TestFramework = getTestFramework()): string {
  return framework === 'cypress' ? 'cypress/e2e' : 'playwright/tests';
}

/**
 * Get helpers/fixtures path based on framework
 */
export function getHelpersPath(framework: TestFramework = getTestFramework()): string {
  return framework === 'cypress'
    ? 'cypress/support/commands.ts'
    : 'playwright/fixtures/base.ts';
}

/**
 * Get test file extension based on framework
 */
export function getTestExtension(framework: TestFramework = getTestFramework()): string {
  return framework === 'cypress' ? '.cy.ts' : '.spec.ts';
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

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

// ============================================================================
// PATH HELPERS
// ============================================================================

/**
 * Get artifact path for a story
 */
export function getArtifactPath(storyId: string, filename: string): string {
  return `test-artifacts/${storyId}/${filename}`;
}

/**
 * Get test file path for a story
 * Uses configured test framework (Playwright by default)
 */
export function getTestPath(
  storyId: string,
  framework: TestFramework = getTestFramework()
): string {
  const dir = getTestDir(framework);
  const ext = getTestExtension(framework);
  return `${dir}/${storyId}${ext}`;
}

/**
 * Get all test file paths in the test directory
 */
export async function listTestFiles(
  framework: TestFramework = getTestFramework()
): Promise<string[]> {
  const dir = getTestDir(framework);
  const ext = getTestExtension(framework);
  const files = await listFiles(dir, ext);
  return files.map(f => `${dir}/${f}`);
}

/**
 * Find example test files for few-shot learning
 * Returns paths to up to N existing test files
 */
export async function findExampleTests(
  limit: number = 2,
  framework: TestFramework = getTestFramework()
): Promise<string[]> {
  const files = await listTestFiles(framework);
  return files.slice(0, limit);
}
