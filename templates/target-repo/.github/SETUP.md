# Target Repository Setup Guide

This guide explains how to set up AI-powered test generation for this repository.

## Prerequisites

1. Access to an `ai-test-agents-lab` instance (your org's fork or the central repo)
2. Anthropic API key for Claude
3. AWS S3 bucket for artifact storage

---

## Quick Start (10 minutes)

### Step 1: Copy the workflow file

The workflow file is already in place at:
```
.github/workflows/generate-tests.yml
```

### Step 2: Update the workflow reference

Edit `.github/workflows/generate-tests.yml` and update:

```yaml
env:
  TEST_AGENTS_REPO: YOUR_ORG/ai-test-agents-lab  # ← Change this
```

### Step 3: Add repository secrets

Go to **Settings → Secrets and variables → Actions → Secrets**

| Secret | Required | Description |
|--------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `AWS_ACCESS_KEY_ID` | Yes | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS IAM secret key |

### Step 4: Add repository variables

Go to **Settings → Secrets and variables → Actions → Variables**

| Variable | Required | Description |
|----------|----------|-------------|
| `S3_BUCKET` | Yes | S3 bucket name for artifacts |
| `AWS_REGION` | No | AWS region (default: us-east-1) |

### Step 5: Create labels

Go to **Issues → Labels** and create:

| Label | Color | Description |
|-------|-------|-------------|
| `generate-tests` | Green | Triggers Phase 1 (test plan) |
| `approve-plan` | Yellow | Triggers Phase 2 (scenarios) |
| `approve-cases` | Orange | Triggers Phase 3 (code) |
| `tests-generated` | Blue | Added automatically when complete |

---

## Usage

### Generate tests for a PR

1. Create a PR with a clear title and description (the description becomes the "user story")
2. Add the `generate-tests` label
3. Wait for Phase 1 to complete (test plan posted as comment)
4. Review the plan → Add label `approve-plan`
5. Wait for Phase 2 to complete (Gherkin scenarios posted)
6. Review scenarios → Add label `approve-cases`
7. Phase 3 generates test code and commits to your PR
8. `tests-generated` label is added automatically

### Label flow

```
generate-tests → [Phase 1] → approve-plan → [Phase 2] → approve-cases → [Phase 3] → tests-generated
```

Each phase:
- Removes the triggering label
- Posts summary as a PR comment
- Saves artifacts to S3 (only Phase 3 commits code to PR)

---

## What gets generated

**Committed to PR branch:**
```
playwright/tests/
└── pr-{number}.spec.ts  # Generated Playwright test code
```

**Stored in S3** (`s3://{bucket}/{repo}/pr-{number}/{commit}/artifacts/`):
```
├── test-plan.md         # Test strategy and risk analysis
├── scenarios.feature    # Gherkin test scenarios
├── pr.diff              # PR diff for context
└── test-code.spec.ts    # Copy of generated test
```

**Cross-PR learning** (`s3://{bucket}/{repo}/memory/`):
- Patterns from previous PRs help improve future generations

---

## Troubleshooting

### Workflow not triggering

- Ensure the label exists (create it if missing)
- Check that the workflow file is on the default branch
- Verify the workflow reference points to a valid repository

### API errors

- Verify `ANTHROPIC_API_KEY` is set correctly
- Check the API key has sufficient credits

### Phase 2/3 fails with "not found"

- Ensure previous phase completed and committed files
- Pull latest changes and check if artifacts exist
- Re-run by removing and re-adding the label

### Generated tests don't match your codebase

- Add example tests to your repo for the AI to learn from
- Update the PR description with more context about the feature
- Remove label and re-add to regenerate

---

## Cost

Each PR costs approximately $0.03-0.05 using Claude Sonnet (all 3 phases).
