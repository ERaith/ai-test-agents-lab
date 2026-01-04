#!/usr/bin/env bash
# ==============================================================================
# setup-story.sh - Create story file from content or PR body
# ==============================================================================
#
# Usage:
#   ./scripts/ci/setup-story.sh <story_id> [story_content]
#
# Environment:
#   STORY_CONTENT - Story content (alternative to argument)
#
# Output:
#   Creates specs/<story_id>.md
#   Writes story_path to $GITHUB_OUTPUT if available
#
# ==============================================================================

set -euo pipefail

STORY_ID="${1:-}"
STORY_CONTENT="${2:-${STORY_CONTENT:-}}"

if [[ -z "$STORY_ID" ]]; then
  echo "Error: story_id is required"
  echo "Usage: $0 <story_id> [story_content]"
  exit 1
fi

# Create specs directory
mkdir -p specs

STORY_PATH="specs/${STORY_ID}.md"

if [[ -n "$STORY_CONTENT" ]]; then
  echo "$STORY_CONTENT" > "$STORY_PATH"
  echo "Created story file from content: $STORY_PATH"
else
  # Create placeholder
  cat > "$STORY_PATH" << EOF
# ${STORY_ID}

Story content not provided.
EOF
  echo "Created placeholder story file: $STORY_PATH"
fi

# Output for GitHub Actions
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "story_path=$STORY_PATH" >> "$GITHUB_OUTPUT"
fi

echo "story_path=$STORY_PATH"
