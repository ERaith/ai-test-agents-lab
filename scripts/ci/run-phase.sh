#!/usr/bin/env bash
# ==============================================================================
# run-phase.sh - Run a test generation phase and capture output
# ==============================================================================
#
# Usage:
#   ./scripts/ci/run-phase.sh <phase> <story_id> [--skip-approval]
#
#   phase:    plan, cases, or code
#   story_id: Story identifier
#
# Environment:
#   ANTHROPIC_API_KEY - Required for LLM calls
#   TEST_FRAMEWORK    - playwright or cypress (default: playwright)
#   CALLER_REPO_PATH  - Path to caller repo (for patch file detection)
#
# Patch Files:
#   If CALLER_REPO_PATH is set and a patch file exists at:
#   - .test-patches/pr-<number>.md
#   - .github/test-patches/pr-<number>.md
#   It will be automatically included in generation.
#
# Output:
#   Runs the CLI command and writes content to $GITHUB_OUTPUT
#
# ==============================================================================

set -euo pipefail

PHASE="${1:-}"
STORY_ID="${2:-}"
SKIP_APPROVAL=""
WITH_FEEDBACK=""
CALLER_REPO_ARG=""

# Check for --skip-approval flag
for arg in "$@"; do
  if [[ "$arg" == "--skip-approval" ]]; then
    SKIP_APPROVAL="--skip-approval"
  fi
done

# Check for patch file in caller repo
CALLER_REPO_PATH="${CALLER_REPO_PATH:-}"
if [[ -n "$CALLER_REPO_PATH" ]]; then
  # Extract PR number from story ID (e.g., pr-123 -> 123)
  PR_NUM=$(echo "$STORY_ID" | grep -oE '[0-9]+' | head -1)

  if [[ -n "$PR_NUM" ]]; then
    # Check for patch file
    if [[ -f "${CALLER_REPO_PATH}/.test-patches/pr-${PR_NUM}.md" ]] || \
       [[ -f "${CALLER_REPO_PATH}/.github/test-patches/pr-${PR_NUM}.md" ]]; then
      echo "📝 Found patch file for PR #${PR_NUM}"
      WITH_FEEDBACK="--with-feedback"
      CALLER_REPO_ARG="--caller-repo ${CALLER_REPO_PATH}"
    fi
  fi
fi

if [[ -z "$PHASE" ]] || [[ -z "$STORY_ID" ]]; then
  echo "Error: phase and story_id are required"
  echo "Usage: $0 <plan|cases|code> <story_id> [--skip-approval]"
  exit 1
fi

TEST_FRAMEWORK="${TEST_FRAMEWORK:-playwright}"

# Validate phase
case "$PHASE" in
  plan|cases|code) ;;
  *)
    echo "Error: phase must be plan, cases, or code"
    exit 1
    ;;
esac

# Check prerequisites for phases 2 and 3
ARTIFACT_DIR="test-artifacts/${STORY_ID}"

if [[ "$PHASE" == "cases" ]]; then
  if [[ ! -f "${ARTIFACT_DIR}/test-plan.md" ]]; then
    echo "Error: Test plan not found at ${ARTIFACT_DIR}/test-plan.md"
    echo "Run plan phase first"
    exit 1
  fi
fi

if [[ "$PHASE" == "code" ]]; then
  if [[ ! -f "${ARTIFACT_DIR}/scenarios.feature" ]]; then
    echo "Error: Scenarios not found at ${ARTIFACT_DIR}/scenarios.feature"
    echo "Run cases phase first"
    exit 1
  fi
fi

# Run the phase
echo "Running phase: $PHASE for story: $STORY_ID"
# shellcheck disable=SC2086
npx tsx src/cli.ts "$PHASE" "$STORY_ID" $SKIP_APPROVAL $WITH_FEEDBACK $CALLER_REPO_ARG

# Capture output for GitHub Actions
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  OUTPUT_FILE=""

  case "$PHASE" in
    plan)
      OUTPUT_FILE="${ARTIFACT_DIR}/test-plan.md"
      ;;
    cases)
      OUTPUT_FILE="${ARTIFACT_DIR}/scenarios.feature"
      ;;
    code)
      # Find the generated test file
      TEST_DIR="playwright/tests"
      if [[ "$TEST_FRAMEWORK" == "cypress" ]]; then
        TEST_DIR="cypress/e2e"
      fi
      OUTPUT_FILE=$(find "$TEST_DIR" -name "*${STORY_ID}*" -type f 2>/dev/null | head -1)
      ;;
  esac

  if [[ -n "$OUTPUT_FILE" ]] && [[ -f "$OUTPUT_FILE" ]]; then
    # Use unique delimiter for multiline output
    DELIM="GHOUTPUT_${PHASE}_$(date +%s)_END"
    {
      echo "content<<${DELIM}"
      cat "$OUTPUT_FILE"
      echo ""
      echo "${DELIM}"
    } >> "$GITHUB_OUTPUT"

    echo "Output captured: $OUTPUT_FILE"
  else
    echo "Warning: No output file found for phase $PHASE"
  fi
fi

echo "Phase $PHASE completed successfully"
