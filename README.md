# AI Test Agents Lab

Reusable agent workflow for AI-powered test generation. Analyzes PR diffs, plans tests, and generates code that gets committed to your target repository.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  REPO A (Your Website/App)                                          │
│                                                                     │
│  1. Developer creates PR with feature code                          │
│  2. Adds label "generate-tests"                                     │
│  3. Workflow calls Repo B ─────────────────────────┐                │
│                                                    │                │
│  6. Tests committed to PR branch ◄─────────────────┤                │
│  7. Developer reviews & merges                     │                │
└────────────────────────────────────────────────────│────────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│  REPO B (This Repo - Agent Workflow)                                │
│                                                                     │
│  4. Analyzes PR diff                                                │
│  5. Runs agent pipeline:                                            │
│     [Planner] → Test Plan → [Cases] → Gherkin → [Code] → Tests     │
│                     ↓            ↓           ↓                      │
│                  Review       Review      Review                    │
│                                                                     │
│  Optional: Saves context to S3 for cross-PR learning               │
└─────────────────────────────────────────────────────────────────────┘
```

## Setup

### Step 1: Deploy This Repository (Repo B)

```bash
# Fork/clone to your organization
git clone https://github.com/YOUR_ORG/ai-test-agents-lab.git

# Push to your org
cd ai-test-agents-lab
git remote set-url origin https://github.com/YOUR_ORG/ai-test-agents-lab.git
git push
```

**Add Secret** (Settings → Secrets → Actions):
- `ANTHROPIC_API_KEY` - Get from console.anthropic.com

**Optional S3 Secrets** (for context persistence across PRs):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**Optional Variables** (Settings → Variables → Actions):
- `S3_BUCKET` - Bucket name for context storage
- `AWS_REGION` - AWS region (default: us-east-1)

### Step 2: Configure Target Repository (Repo A)

Copy the workflow template:

```bash
cd /path/to/your-website-repo

# Copy workflow
mkdir -p .github/workflows
cp /path/to/ai-test-agents-lab/templates/target-repo/.github/workflows/generate-tests.yml .github/workflows/

# Update organization name
sed -i 's/YOUR_ORG/your-actual-org/g' .github/workflows/generate-tests.yml
```

**Add secrets** to Repo A:
- `ANTHROPIC_API_KEY` - Claude API key
- `AWS_ACCESS_KEY_ID` - For S3 artifact storage
- `AWS_SECRET_ACCESS_KEY` - For S3 artifact storage

**Add variable** to Repo A:
- `S3_BUCKET` - S3 bucket name for artifacts

**Create labels** in Repo A:
- `generate-tests` - triggers Phase 1
- `approve-plan` - triggers Phase 2
- `approve-cases` - triggers Phase 3
- `tests-generated` - added automatically when complete

### Step 3: Use It

1. Create a PR in Repo A with your feature code
2. Add a user story in the PR description
3. Add label `generate-tests` → Phase 1 runs, generates test plan
4. Review test plan → Add label `approve-plan` → Phase 2 runs
5. Review scenarios → Add label `approve-cases` → Phase 3 runs
6. `tests-generated` label added automatically
7. Pull changes, review, and merge

## Repository Structure

```
├── .github/workflows/
│   ├── phased-generation.yml        # Main workflow with approval gates
│   └── test-generation-reusable.yml # Reusable workflow (called by Repo A)
├── src/
│   ├── agents/          # Planner, CaseWorker, CodeWorker agents
│   ├── orchestrator/    # Workflow state machine
│   ├── context/         # Caching, registry, cross-story memory
│   ├── storage/         # Local + S3 storage providers
│   ├── analysis/        # PR diff analyzer
│   ├── integrations/    # Jira integration (optional)
│   ├── prompts/         # AI prompt templates
│   └── utils/           # LLM client, file helpers
├── templates/           # Workflow files to copy to Repo A
└── docs/
    ├── IMPLEMENTATION-GUIDE.md
    └── DEPLOYMENT-CHECKLIST.md
```

## What Gets Generated

**Committed to PR (Repo A):**
```
playwright/tests/
└── pr-123.spec.ts    # Generated Playwright test
```

**Stored in S3** (`{bucket}/{repo}/pr-{number}/{commit}/`):
```
artifacts/
├── test-plan.md      # Test strategy
├── scenarios.feature # Gherkin scenarios
├── pr.diff           # PR diff for context
└── test-code.spec.ts # Copy of generated test
```

**Cross-PR learning** (`{bucket}/{repo}/memory/`):
- Patterns from previous PRs improve future generations

## Documentation

| Document | Description |
|----------|-------------|
| [Implementation Guide](docs/IMPLEMENTATION-GUIDE.md) | Detailed setup instructions |
| [Deployment Checklist](docs/DEPLOYMENT-CHECKLIST.md) | Step-by-step verification |

## Cost

~$0.03-0.05 per PR using Claude Sonnet

## License

MIT
