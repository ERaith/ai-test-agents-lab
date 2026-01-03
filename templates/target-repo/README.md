# Target Repository Template

This template sets up AI-powered test generation for your repository.

## What You Need

### 1. Files (Already Included)

```
.github/
├── workflows/
│   └── generate-tests.yml   # Main workflow
└── SETUP.md                 # Detailed setup guide
```

### 2. Secrets (Add to Repository)

| Secret | Required | Description |
|--------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key from console.anthropic.com |
| `AWS_ACCESS_KEY_ID` | No | For S3 context persistence |
| `AWS_SECRET_ACCESS_KEY` | No | For S3 context persistence |

### 3. Variables (Add to Repository)

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_FRAMEWORK` | `playwright` | `playwright` or `cypress` |
| `S3_BUCKET` | (none) | S3 bucket name |
| `AWS_REGION` | `us-east-1` | AWS region |

### 4. Labels (Create in Repository)

| Label | Color | Purpose |
|-------|-------|---------|
| `generate-tests` | Green | Triggers generation |
| `awaiting-plan-approval` | Yellow | Waiting for Phase 1 review |
| `awaiting-cases-approval` | Orange | Waiting for Phase 2 review |
| `tests-generated` | Blue | All phases complete |

## Quick Setup

```bash
# 1. Copy template to your repo
cp -r .github /path/to/your-repo/

# 2. Update the workflow reference
# Edit .github/workflows/generate-tests.yml
# Change YOUR_ORG to your organization name

# 3. Add secrets via GitHub UI or CLI
gh secret set ANTHROPIC_API_KEY

# 4. Create labels
gh label create "generate-tests" --color "0E8A16"
gh label create "awaiting-plan-approval" --color "FBCA04"
gh label create "awaiting-cases-approval" --color "F9A825"
gh label create "tests-generated" --color "1976D2"
```

## Usage

1. Create a PR with descriptive title and body
2. Add `generate-tests` label
3. Review generated test plan → `/approve-plan`
4. Review generated scenarios → `/approve-cases`
5. Tests are generated and available in artifacts

## Detailed Instructions

See [SETUP.md](.github/SETUP.md) for complete configuration guide.
