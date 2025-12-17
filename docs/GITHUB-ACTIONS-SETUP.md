# GitHub Actions Setup Guide

This document explains how to set up and use the GitHub Actions workflows for the Agentic Testing system.

## Prerequisites

1. **Repository on GitHub** - Push your code to GitHub
2. **API Key Secret** - Add your Anthropic API key as a repository secret

## Setting Up Secrets

1. Go to your repository: `https://github.com/YOUR_USERNAME/ai-test-agents-lab`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add the following secret:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** Your Anthropic API key (starts with `sk-ant-...`)
5. Click **"Add secret"**

## Available Workflows

### 1. 🎬 Demo Workflow (`demo.yml`)

**Purpose:** One-click demo for interviews and showcasing the system.

**How to run:**
1. Go to **Actions** tab in your repository
2. Click **"🎬 Demo Workflow"** in the left sidebar
3. Click **"Run workflow"** dropdown
4. Select a story from the dropdown (e.g., `story-003-shopping-cart`)
5. Click the green **"Run workflow"** button

**What it does:**
- Phase 1: Generates test plan using AI
- Phase 2: Generates Gherkin scenarios
- Phase 3: Generates Cypress test code
- Displays all results in the GitHub Summary
- Uploads artifacts for download

**Viewing Results:**
- Click on the completed workflow run
- Scroll down to see the **Summary** with generated content
- Download artifacts from the **Artifacts** section at the bottom

### 2. ✅ CI Workflow (`ci.yml`)

**Purpose:** Validates code quality on every push/PR.

**Triggers:**
- Every push to `main` or `master`
- Every pull request to `main` or `master`

**What it does:**
- Runs TypeScript type checking
- Runs a test workflow to verify the system works

### 3. 🤖 Agentic Test Generation (`agentic-tests.yml`)

**Purpose:** Automatically generate tests when stories are added.

**Triggers:**
- PR with changes to `specs/**/*.md` files
- PR labeled with `generate-tests`
- Manual trigger via `workflow_dispatch`

**What it does:**
- Detects which stories need tests
- Generates test plans, scenarios, and code
- Uploads each phase as separate artifacts

## Artifacts

GitHub Actions creates downloadable artifacts for each workflow run:

| Artifact | Contents |
|----------|----------|
| `generated-tests-{story-id}` | All generated files for a story |
| `test-plan-{story-id}` | Just the test plan markdown |
| `scenarios-{story-id}` | Just the Gherkin scenarios |
| `test-code-{story-id}` | Just the Cypress test file |

**To download artifacts:**
1. Go to the completed workflow run
2. Scroll to the bottom of the page
3. Find the **Artifacts** section
4. Click on an artifact to download as ZIP

## Troubleshooting

### Workflows not appearing in Actions tab

**Cause:** Workflows only appear from the default branch.

**Fix:** 
1. Go to **Settings** → **General** → **Default branch**
2. Ensure your default branch matches where workflows exist (`main` or `master`)
3. Or merge workflow files to your default branch

### "API key not found" errors

**Cause:** Secret not configured or wrong name.

**Fix:**
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Verify `ANTHROPIC_API_KEY` exists
3. Re-add if necessary

### Workflow fails with type errors

**Cause:** TypeScript compilation issues.

**Fix:**
1. Run `npm run lint` locally to check for errors
2. Fix any TypeScript errors before pushing

## Interview Demo Script

1. Open the Actions tab
2. Show the three available workflows
3. Click "🎬 Demo Workflow" → "Run workflow"
4. Select `story-003-shopping-cart`
5. While it runs, explain the architecture
6. Show the Summary with generated artifacts
7. Download and open the generated files

## Cost Considerations

Each demo run uses approximately:
- ~5,000-10,000 tokens total
- ~$0.03-0.05 per story (Claude Sonnet pricing)

For interviews, consider pre-generating artifacts for some stories to save costs.
