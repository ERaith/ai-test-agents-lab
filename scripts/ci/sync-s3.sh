#!/usr/bin/env bash
# ==============================================================================
# sync-s3.sh - Sync context/memory/artifacts with S3
# ==============================================================================
#
# Usage:
#   ./scripts/ci/sync-s3.sh <direction> <story_id> [phase]
#
#   direction: "download" or "upload"
#   story_id:  Story identifier
#   phase:     Phase name (for download, determines what to fetch)
#
# Environment:
#   S3_BUCKET  - S3 bucket name (required)
#   S3_PREFIX  - S3 prefix (defaults to $GITHUB_REPOSITORY)
#   AWS_REGION - AWS region (defaults to us-east-1)
#
# ==============================================================================

set -euo pipefail

DIRECTION="${1:-}"
STORY_ID="${2:-}"
PHASE="${3:-}"

S3_BUCKET="${S3_BUCKET:-}"
S3_PREFIX="${S3_PREFIX:-${GITHUB_REPOSITORY:-}}"
AWS_REGION="${AWS_REGION:-us-east-1}"

if [[ -z "$DIRECTION" ]] || [[ -z "$STORY_ID" ]]; then
  echo "Error: direction and story_id are required"
  echo "Usage: $0 <download|upload> <story_id> [phase]"
  exit 1
fi

if [[ -z "$S3_BUCKET" ]]; then
  echo "S3_BUCKET not set - skipping S3 sync"
  exit 0
fi

S3_BASE="s3://${S3_BUCKET}/${S3_PREFIX}"

case "$DIRECTION" in
  download)
    echo "Downloading from S3: $S3_BASE"

    # Always download context and memory
    aws s3 sync "${S3_BASE}/context/" "./context/" --quiet 2>/dev/null || true
    aws s3 sync "${S3_BASE}/memory/" "./memory/" --quiet 2>/dev/null || true

    # For phases 2 and 3, download previous artifacts
    if [[ "$PHASE" == "cases" ]] || [[ "$PHASE" == "code" ]]; then
      echo "Downloading artifacts from previous phases..."
      mkdir -p "test-artifacts/${STORY_ID}"
      aws s3 sync "${S3_BASE}/artifacts/${STORY_ID}/" \
        "./test-artifacts/${STORY_ID}/" --quiet 2>/dev/null || true

      echo "Downloaded artifacts:"
      ls -la "test-artifacts/${STORY_ID}/" 2>/dev/null || echo "No artifacts found"
    fi

    echo "Download complete"
    ls -la context/ 2>/dev/null || echo "No context directory"
    ls -la memory/ 2>/dev/null || echo "No memory directory"
    ;;

  upload)
    echo "Uploading to S3: $S3_BASE"

    # Upload context and memory
    aws s3 sync "./context/" "${S3_BASE}/context/" --quiet 2>/dev/null || true
    aws s3 sync "./memory/" "${S3_BASE}/memory/" --quiet 2>/dev/null || true

    # Upload artifacts for this story
    if [[ -d "test-artifacts/${STORY_ID}" ]]; then
      aws s3 sync "./test-artifacts/${STORY_ID}/" \
        "${S3_BASE}/artifacts/${STORY_ID}/" --quiet 2>/dev/null || true
    fi

    echo "Upload complete"
    ;;

  *)
    echo "Error: direction must be 'download' or 'upload'"
    exit 1
    ;;
esac
