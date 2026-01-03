# Templates

This directory contains templates for setting up AI test generation in other repositories.

## Quick Start

### Option 1: Copy the template directory

```bash
# Copy to your target repository
cp -r templates/target-repo/.github /path/to/your-repo/

# Update the workflow reference
sed -i 's/YOUR_ORG/your-actual-org/g' /path/to/your-repo/.github/workflows/generate-tests.yml
```

### Option 2: Manual setup

1. Copy `.github/workflows/generate-tests.yml` to your target repo
2. Copy `.github/SETUP.md` for reference
3. Follow the setup instructions in SETUP.md

## What's Included

```
target-repo/
└── .github/
    ├── workflows/
    │   └── generate-tests.yml   # Main workflow file
    └── SETUP.md                 # Setup instructions
```

## Configuration Needed

After copying, you need to:

1. **Update workflow reference**: Change `YOUR_ORG` to your organization name
2. **Add secrets**: `ANTHROPIC_API_KEY`, optionally AWS credentials
3. **Add variables**: `TEST_FRAMEWORK`, `S3_BUCKET`, `AWS_REGION`
4. **Create labels**: `generate-tests`, `awaiting-plan-approval`, etc.

See [IMPLEMENTATION-GUIDE.md](../docs/IMPLEMENTATION-GUIDE.md) for complete instructions.

## Minimal Working Example

The absolute minimum to get started:

```yaml
# .github/workflows/generate-tests.yml
name: Generate Tests

on:
  pull_request:
    types: [labeled]

jobs:
  generate:
    if: contains(github.event.pull_request.labels.*.name, 'generate-tests')
    uses: YOUR_ORG/ai-test-agents-lab/.github/workflows/test-generation-reusable.yml@main
    with:
      phase: full
      story_id: pr-${{ github.event.pull_request.number }}
      story_content: "${{ github.event.pull_request.body }}"
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

This runs all 3 phases automatically without approval gates.
