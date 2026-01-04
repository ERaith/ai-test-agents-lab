#!/usr/bin/env npx tsx
/**
 * post-pr-comment.ts - Post phase results as PR comment
 *
 * Usage:
 *   npx tsx scripts/ci/post-pr-comment.ts
 *
 * Environment:
 *   GITHUB_TOKEN   - GitHub token with repo permissions
 *   CALLER_REPO    - Repository in owner/repo format
 *   PR_NUMBER      - PR number
 *   PHASE          - Phase that completed (plan, cases, code)
 *   TRIGGER_LABEL  - Label to remove after posting
 *   TEST_PLAN      - Test plan content (for plan phase)
 *   SCENARIOS      - Gherkin content (for cases phase)
 *   TEST_CODE      - Test code content (for code phase)
 */

import { Octokit } from '@octokit/rest';

interface Config {
  token: string;
  owner: string;
  repo: string;
  prNumber: number;
  phase: string;
  triggerLabel: string;
  testPlan: string;
  scenarios: string;
  testCode: string;
}

function getConfig(): Config {
  const callerRepo = process.env.CALLER_REPO || '';
  const [owner, repo] = callerRepo.split('/');

  return {
    token: process.env.GITHUB_TOKEN || '',
    owner: owner || '',
    repo: repo || '',
    prNumber: Number(process.env.PR_NUMBER || '0'),
    phase: process.env.PHASE || '',
    triggerLabel: process.env.TRIGGER_LABEL || '',
    testPlan: process.env.TEST_PLAN || '',
    scenarios: process.env.SCENARIOS || '',
    testCode: process.env.TEST_CODE || '',
  };
}

function truncate(content: string, maxLength = 60000): string {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '\n...(truncated)';
}

function buildCommentBody(config: Config): string[] {
  const { phase, testPlan, scenarios, testCode } = config;

  switch (phase) {
    case 'plan': {
      const content = truncate(testPlan);
      return [
        '## 📝 Phase 1: Test Plan',
        '',
        '<details>',
        '<summary>Click to expand</summary>',
        '',
        content,
        '',
        '</details>',
        '',
        '---',
        '**Next:** Add label `approve-plan` to continue to Phase 2',
      ];
    }

    case 'cases': {
      const content = truncate(scenarios);
      return [
        '## 🥒 Phase 2: Gherkin Scenarios',
        '',
        '<details>',
        '<summary>Click to expand</summary>',
        '',
        '```gherkin',
        content,
        '```',
        '',
        '</details>',
        '',
        '---',
        '**Next:** Add label `approve-cases` to continue to Phase 3',
      ];
    }

    case 'code': {
      const preview = testCode.split('\n').slice(0, 50).join('\n');
      return [
        '## 💻 Phase 3: Test Code',
        '',
        '✅ **All phases complete!** Test code committed to this PR.',
        '',
        '<details>',
        '<summary>Click to expand code</summary>',
        '',
        '```typescript',
        preview,
        '```',
        '',
        '</details>',
        '',
        '**Next:** Pull changes, review, and merge!',
      ];
    }

    default:
      return [`Unknown phase: ${phase}`];
  }
}

async function main() {
  const config = getConfig();

  // Validate required fields
  if (!config.token) {
    console.error('Error: GITHUB_TOKEN is required');
    process.exit(1);
  }

  if (!config.owner || !config.repo) {
    console.error('Error: CALLER_REPO must be in owner/repo format');
    process.exit(1);
  }

  if (!config.prNumber) {
    console.error('Error: PR_NUMBER is required');
    process.exit(1);
  }

  if (!config.phase) {
    console.error('Error: PHASE is required');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: config.token });
  const { owner, repo, prNumber, phase, triggerLabel } = config;

  // Build comment body
  const bodyLines = buildCommentBody(config);
  const body = bodyLines.join('\n');

  // Post comment
  console.log(`Posting ${phase} comment to ${owner}/${repo}#${prNumber}`);
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body,
  });
  console.log('Comment posted successfully');

  // Remove trigger label
  if (triggerLabel) {
    console.log(`Removing label: ${triggerLabel}`);
    try {
      await octokit.issues.removeLabel({
        owner,
        repo,
        issue_number: prNumber,
        name: triggerLabel,
      });
      console.log('Label removed');
    } catch (error) {
      // Label might not exist, that's OK
      console.log('Label removal skipped (may not exist)');
    }
  }

  // Add completion label for phase 3
  if (phase === 'code') {
    const completionLabel = 'tests-generated';
    console.log(`Adding label: ${completionLabel}`);
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: [completionLabel],
    });
    console.log('Completion label added');
  }

  console.log('Done');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
