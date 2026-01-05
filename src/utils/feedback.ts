/**
 * Feedback/Patch System
 *
 * Allows users to provide improvement hints for test generation.
 * Feedback is incorporated into the prompt when regenerating.
 *
 * Two modes:
 *
 * 1. LOCAL DEVELOPMENT:
 *    - Create: test-artifacts/<story-id>/feedback.md
 *    - Run: npx tsx src/cli.ts plan <story-id> --with-feedback
 *
 * 2. PR WORKFLOW (caller repo):
 *    - Create: .test-patches/pr-<number>.md in your repo
 *    - Commit to PR branch
 *    - Re-trigger generation (remove/re-add label)
 *    - Patch file auto-removed before merge
 *
 * Feedback file format:
 *   # Feedback for pr-123
 *
 *   ## Plan Improvements
 *   - Add more edge cases for error handling
 *   - Focus on mobile viewport testing
 *
 *   ## Cases Improvements
 *   - Include accessibility scenarios
 *
 *   ## Code Improvements
 *   - Use page object pattern
 *   - Add retry logic for flaky selectors
 */

import { readFile, fileExists, getArtifactPath } from './files.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface Feedback {
  raw: string;
  plan?: string;
  cases?: string;
  code?: string;
  general?: string;
  source?: string;
}

/**
 * Standard patch file locations to check (in order of priority)
 */
const PATCH_LOCATIONS = [
  '.test-patches',      // Recommended location
  '.github/test-patches', // Alternative
];

/**
 * Load feedback/patch file for a story
 *
 * Checks multiple locations:
 * 1. Caller repo patch file (.test-patches/pr-<number>.md)
 * 2. Local artifact feedback (test-artifacts/<id>/feedback.md)
 */
export async function loadFeedback(storyId: string, callerRepoPath?: string): Promise<Feedback | null> {
  // Try caller repo patch file first (for PR workflow)
  if (callerRepoPath) {
    const patchFeedback = await loadPatchFromCallerRepo(storyId, callerRepoPath);
    if (patchFeedback) {
      return patchFeedback;
    }
  }

  // Fall back to local artifact feedback
  const feedbackPath = getArtifactPath(storyId, 'feedback.md');

  if (!await fileExists(feedbackPath)) {
    return null;
  }

  const content = await readFile(feedbackPath);
  const feedback = parseFeedback(content);
  feedback.source = feedbackPath;
  return feedback;
}

/**
 * Load patch file from caller repository
 */
async function loadPatchFromCallerRepo(storyId: string, repoPath: string): Promise<Feedback | null> {
  // Extract PR number from story ID (e.g., "pr-123" -> "123")
  const prMatch = storyId.match(/pr-(\d+)/i);
  if (!prMatch) {
    return null;
  }

  const prNumber = prMatch[1];

  // Check each patch location
  for (const location of PATCH_LOCATIONS) {
    const patchPath = path.join(repoPath, location, `pr-${prNumber}.md`);

    try {
      await fs.access(patchPath);
      const content = await fs.readFile(patchPath, 'utf-8');
      console.log(`📝 Found patch file: ${location}/pr-${prNumber}.md`);
      const feedback = parseFeedback(content);
      feedback.source = patchPath;
      return feedback;
    } catch {
      // File doesn't exist, try next location
    }
  }

  return null;
}

/**
 * Check if a patch file exists for a PR in the caller repo
 */
export async function hasPatchFile(storyId: string, callerRepoPath: string): Promise<boolean> {
  const prMatch = storyId.match(/pr-(\d+)/i);
  if (!prMatch) return false;

  const prNumber = prMatch[1];

  for (const location of PATCH_LOCATIONS) {
    const patchPath = path.join(callerRepoPath, location, `pr-${prNumber}.md`);
    try {
      await fs.access(patchPath);
      return true;
    } catch {
      continue;
    }
  }

  return false;
}

/**
 * Parse feedback markdown into structured sections
 */
export function parseFeedback(content: string): Feedback {
  const feedback: Feedback = { raw: content };

  // Extract sections
  const planMatch = content.match(/## Plan Improvements?\n([\s\S]*?)(?=\n## |$)/i);
  const casesMatch = content.match(/## Cases? Improvements?\n([\s\S]*?)(?=\n## |$)/i);
  const codeMatch = content.match(/## Code Improvements?\n([\s\S]*?)(?=\n## |$)/i);
  const generalMatch = content.match(/## General(?: Feedback)?\n([\s\S]*?)(?=\n## |$)/i);

  if (planMatch) feedback.plan = planMatch[1].trim();
  if (casesMatch) feedback.cases = casesMatch[1].trim();
  if (codeMatch) feedback.code = codeMatch[1].trim();
  if (generalMatch) feedback.general = generalMatch[1].trim();

  // If no sections found, treat entire content as general feedback
  if (!feedback.plan && !feedback.cases && !feedback.code && !feedback.general) {
    // Strip the title if present
    const stripped = content.replace(/^#[^#].*\n/, '').trim();
    if (stripped) {
      feedback.general = stripped;
    }
  }

  return feedback;
}

/**
 * Format feedback for inclusion in agent prompt
 */
export function formatFeedbackForPrompt(feedback: Feedback, phase: 'plan' | 'cases' | 'code'): string {
  const parts: string[] = [];

  // Add phase-specific feedback
  const phaseSpecific = feedback[phase];
  if (phaseSpecific) {
    parts.push(`## Previous Feedback for This Phase\n${phaseSpecific}`);
  }

  // Add general feedback
  if (feedback.general) {
    parts.push(`## General Guidelines\n${feedback.general}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `
---
# User Feedback

The user has provided the following feedback to improve this generation:

${parts.join('\n\n')}

Please incorporate this feedback into your output.
---
`;
}

/**
 * Check if feedback exists for a story
 */
export async function hasFeedback(storyId: string): Promise<boolean> {
  const feedbackPath = getArtifactPath(storyId, 'feedback.md');
  return fileExists(feedbackPath);
}
