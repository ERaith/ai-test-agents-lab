#!/usr/bin/env bash
# ==============================================================================
# commit-tests.sh - Commit generated test files to caller repo
# ==============================================================================
#
# Usage:
#   ./scripts/ci/commit-tests.sh <caller_repo_path> <pr_number>
#
# Arguments:
#   caller_repo_path - Path to cloned caller repository
#   pr_number        - PR number for commit message
#
# Environment:
#   TEST_FRAMEWORK - playwright or cypress (default: playwright)
#
# This script:
#   1. Finds generated test files in artifacts
#   2. Copies them to the caller repo
#   3. Commits and pushes
#
# ==============================================================================

set -euo pipefail

CALLER_REPO_PATH="${1:-}"
PR_NUMBER="${2:-}"
TEST_FRAMEWORK="${TEST_FRAMEWORK:-playwright}"

if [[ -z "$CALLER_REPO_PATH" ]] || [[ -z "$PR_NUMBER" ]]; then
  echo "Error: caller_repo_path and pr_number are required"
  echo "Usage: $0 <caller_repo_path> <pr_number>"
  exit 1
fi

if [[ ! -d "$CALLER_REPO_PATH" ]]; then
  echo "Error: Caller repo path does not exist: $CALLER_REPO_PATH"
  exit 1
fi

# Determine test directory
TEST_DIR="playwright/tests"
if [[ "$TEST_FRAMEWORK" == "cypress" ]]; then
  TEST_DIR="cypress/e2e"
fi

# Create test directory in caller repo
mkdir -p "${CALLER_REPO_PATH}/${TEST_DIR}"

# Find and copy test files
COPIED=0

# From artifacts directory (downloaded from upload-artifact)
if [[ -d "./artifacts" ]]; then
  while IFS= read -r -d '' file; do
    cp "$file" "${CALLER_REPO_PATH}/${TEST_DIR}/"
    echo "Copied: $file"
    ((COPIED++)) || true
  done < <(find ./artifacts -name "*.spec.ts" -print0 2>/dev/null)
fi

# Also check local test directory
if [[ -d "./${TEST_DIR}" ]]; then
  while IFS= read -r -d '' file; do
    cp "$file" "${CALLER_REPO_PATH}/${TEST_DIR}/"
    echo "Copied: $file"
    ((COPIED++)) || true
  done < <(find "./${TEST_DIR}" -name "*.spec.ts" -print0 2>/dev/null)
fi

if [[ $COPIED -eq 0 ]]; then
  echo "Warning: No test files found to commit"
  exit 0
fi

echo "Copied $COPIED test file(s)"

# Commit and push
cd "$CALLER_REPO_PATH"

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

git add "${TEST_DIR}/"

if git diff --staged --quiet; then
  echo "No changes to commit"
  exit 0
fi

git commit -m "🤖 Add generated ${TEST_FRAMEWORK^} tests for PR #${PR_NUMBER}"
git push

echo "✅ Committed and pushed test files"
