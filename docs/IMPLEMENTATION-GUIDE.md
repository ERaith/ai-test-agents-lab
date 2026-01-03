# Implementation Guide

Complete guide for deploying AI Test Agents Lab and connecting target repositories.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI Test Agents Lab                               │
│                      (Central Repository)                                │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Reusable        │  │  PR Diff         │  │  Test            │       │
│  │  Workflow        │  │  Analyzer        │  │  Generators      │       │
│  │                  │  │                  │  │                  │       │
│  │  workflow_call   │  │  Changed files   │  │  Plan → Gherkin  │       │
│  │  inputs/outputs  │  │  Related files   │  │  → Playwright    │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │  Storage Providers                                            │       │
│  │  ┌─────────────┐  ┌─────────────┐                            │       │
│  │  │ Local FS    │  │ S3 Bucket   │                            │       │
│  │  │ (default)   │  │ (optional)  │                            │       │
│  │  └─────────────┘  └─────────────┘                            │       │
│  └──────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ workflow_call
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────┐   ┌───────────┐   ┌───────────┐
            │ Product   │   │ Product   │   │ Product   │
            │ Repo A    │   │ Repo B    │   │ Repo C    │
            │           │   │           │   │           │
            │ PR #123   │   │ PR #456   │   │ PR #789   │
            └───────────┘   └───────────┘   └───────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │   S3 Bucket     │
                          │   (Optional)    │
                          │                 │
                          │  Per-repo       │
                          │  context &      │
                          │  memory         │
                          └─────────────────┘
```

---

## Part 1: Deploy AI Test Agents Lab

### Step 1.1: Fork or Clone the Repository

```bash
# Option A: Fork on GitHub (recommended for orgs)
# Go to github.com/YOUR_SOURCE/ai-test-agents-lab → Fork

# Option B: Clone and push to your org
git clone https://github.com/SOURCE/ai-test-agents-lab.git
cd ai-test-agents-lab
git remote set-url origin https://github.com/YOUR_ORG/ai-test-agents-lab.git
git push -u origin main
```

### Step 1.2: Configure Repository Secrets

Go to **Settings → Secrets and variables → Actions → Secrets**

| Secret | Required | How to Get |
|--------|----------|------------|
| `ANTHROPIC_API_KEY` | Yes | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `AWS_ACCESS_KEY_ID` | For S3 | AWS IAM → Create User → Access Keys |
| `AWS_SECRET_ACCESS_KEY` | For S3 | Same as above |

### Step 1.3: Configure Repository Variables

Go to **Settings → Secrets and variables → Actions → Variables**

| Variable | Value | Description |
|----------|-------|-------------|
| `S3_BUCKET` | `my-test-context` | Your S3 bucket name |
| `AWS_REGION` | `us-east-1` | AWS region |
| `TEST_FRAMEWORK` | `playwright` | Default framework |

### Step 1.4: Create S3 Bucket (Optional but Recommended)

```bash
# Create bucket
aws s3 mb s3://my-test-context --region us-east-1

# Create IAM policy
cat > test-gen-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-test-context",
        "arn:aws:s3:::my-test-context/*"
      ]
    }
  ]
}
EOF

# Create policy
aws iam create-policy \
  --policy-name TestGenerationS3Access \
  --policy-document file://test-gen-policy.json

# Create user and attach policy
aws iam create-user --user-name test-generation-bot
aws iam attach-user-policy \
  --user-name test-generation-bot \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT:policy/TestGenerationS3Access

# Create access keys (save these!)
aws iam create-access-key --user-name test-generation-bot
```

### Step 1.5: Verify Deployment

1. Go to **Actions** tab
2. Run the **Demo Workflow** manually
3. Select a sample story
4. Verify all three phases complete successfully

---

## Part 2: Set Up Target Repository

### Step 2.1: Copy Template Files

```bash
# From ai-test-agents-lab directory
cp -r templates/target-repo/.github /path/to/your-product-repo/
```

Or manually create `.github/workflows/generate-tests.yml`:

```yaml
name: Generate Tests

on:
  pull_request:
    types: [opened, labeled]
  issue_comment:
    types: [created]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  generate:
    if: |
      (github.event_name == 'pull_request' &&
       contains(github.event.pull_request.labels.*.name, 'generate-tests')) ||
      (github.event_name == 'issue_comment' &&
       github.event.issue.pull_request &&
       (contains(github.event.comment.body, '/approve-plan') ||
        contains(github.event.comment.body, '/approve-cases')))

    uses: YOUR_ORG/ai-test-agents-lab/.github/workflows/test-generation-reusable.yml@main
    with:
      phase: ${{ github.event_name == 'pull_request' && 'plan' ||
                 contains(github.event.comment.body, '/approve-plan') && 'cases' ||
                 'code' }}
      story_id: pr-${{ github.event.pull_request.number || github.event.issue.number }}
      story_content: |
        # ${{ github.event.pull_request.title || '' }}
        ${{ github.event.pull_request.body || '' }}
      test_framework: ${{ vars.TEST_FRAMEWORK || 'playwright' }}
      s3_bucket: ${{ vars.S3_BUCKET || '' }}
    secrets:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Step 2.2: Configure Target Repository Secrets

Copy the same secrets to the target repository:

| Secret | Value |
|--------|-------|
| `ANTHROPIC_API_KEY` | Same API key |
| `AWS_ACCESS_KEY_ID` | Same AWS key |
| `AWS_SECRET_ACCESS_KEY` | Same AWS secret |

### Step 2.3: Configure Target Repository Variables

| Variable | Value |
|----------|-------|
| `S3_BUCKET` | Same bucket name |
| `AWS_REGION` | Same region |
| `TEST_FRAMEWORK` | `playwright` or `cypress` |

### Step 2.4: Create Labels

In the target repository, create these labels:

| Label | Color | Description |
|-------|-------|-------------|
| `generate-tests` | `#0E8A16` (green) | Triggers test generation |
| `awaiting-plan-approval` | `#FBCA04` (yellow) | Waiting for plan review |
| `awaiting-cases-approval` | `#F9A825` (orange) | Waiting for cases review |
| `tests-generated` | `#1976D2` (blue) | All phases complete |

Quick setup via GitHub CLI:
```bash
gh label create "generate-tests" --color "0E8A16" --description "Triggers AI test generation"
gh label create "awaiting-plan-approval" --color "FBCA04" --description "Waiting for test plan approval"
gh label create "awaiting-cases-approval" --color "F9A825" --description "Waiting for test cases approval"
gh label create "tests-generated" --color "1976D2" --description "AI tests generated successfully"
```

### Step 2.5: Test the Integration

1. Create a new branch and PR in the target repo
2. Add the `generate-tests` label
3. Wait for Phase 1 to complete
4. Comment `/approve-plan`
5. Wait for Phase 2 to complete
6. Comment `/approve-cases`
7. Verify test file is committed to PR

---

## Part 3: Deployment Checklist

### AI Test Agents Lab Repository

- [ ] Repository forked/cloned to your org
- [ ] `ANTHROPIC_API_KEY` secret configured
- [ ] `AWS_ACCESS_KEY_ID` secret configured (if using S3)
- [ ] `AWS_SECRET_ACCESS_KEY` secret configured (if using S3)
- [ ] `S3_BUCKET` variable configured (if using S3)
- [ ] `AWS_REGION` variable configured
- [ ] Demo workflow runs successfully
- [ ] Reusable workflow is on default branch

### S3 Bucket (Optional)

- [ ] Bucket created in correct region
- [ ] IAM policy created with correct permissions
- [ ] IAM user created and policy attached
- [ ] Access keys generated and saved securely
- [ ] CORS configured (if needed for pre-signed URLs)

### Each Target Repository

- [ ] `.github/workflows/generate-tests.yml` created
- [ ] Workflow references correct ai-test-agents-lab repo
- [ ] All required secrets copied
- [ ] All required variables set
- [ ] Labels created
- [ ] Test PR works end-to-end

---

## Part 4: S3 Context Structure

When using S3, context is organized per-repository:

```
s3://my-test-context/
├── owner/repo-a/
│   ├── context/
│   │   ├── system-context.json
│   │   └── registry.json
│   ├── memory/
│   │   └── summaries.json
│   └── artifacts/
│       ├── pr-123/
│       │   ├── test-plan.md
│       │   ├── scenarios.feature
│       │   ├── pr.diff
│       │   └── diff-analysis.json
│       └── pr-456/
│           └── ...
├── owner/repo-b/
│   └── ...
└── owner/repo-c/
    └── ...
```

### Benefits of S3 Context

1. **Cross-PR Learning**: Memory persists between PRs
2. **Context Caching**: Faster subsequent runs
3. **Artifact Storage**: Easy access to generated files
4. **Multi-Repo Isolation**: Each repo has its own prefix

---

## Part 5: Customization

### Change Default Framework

In target repo variables, set:
```
TEST_FRAMEWORK=cypress
```

### Add Custom Fixtures

Create Playwright fixtures in your target repo:
```
playwright/
├── fixtures/
│   └── auth.ts      # Your custom auth fixture
└── tests/
    └── ...          # Generated tests will use fixtures
```

### Customize Test Patterns

Add example tests to your repo that demonstrate your preferred patterns. The AI will learn from these examples.

### Jira Integration

Set additional secrets/variables for Jira:
```
JIRA_BASE_URL=https://company.atlassian.net
JIRA_PROJECT_KEY=PROJ
JIRA_EMAIL=bot@company.com
JIRA_API_TOKEN=xxx
```

---

## Troubleshooting

### "Workflow not found" error

1. Ensure ai-test-agents-lab repo is accessible
2. Check the workflow file is on the default branch
3. Verify the repository path in the `uses:` line

### "API key not found" error

1. Verify `ANTHROPIC_API_KEY` is set in secrets
2. Check the secret name matches exactly
3. Ensure the key is valid and has credits

### S3 access denied

1. Check IAM policy has correct bucket name
2. Verify credentials are set correctly
3. Ensure bucket exists in the specified region

### Tests don't match codebase style

1. Add example tests to your repo for the AI to learn from
2. Provide more context in PR descriptions
3. Use `/regenerate-plan` to retry with updated info

### Workflow takes too long

1. Check API rate limits
2. Consider breaking large PRs into smaller ones
3. Use S3 context for faster subsequent runs

---

## Cost Estimation

| Component | Cost |
|-----------|------|
| Claude API | ~$0.03-0.10 per PR (3 phases) |
| S3 Storage | ~$0.023/GB/month |
| GitHub Actions | Free for public repos, minutes for private |

For a team generating 100 tests/month: ~$5-15/month

---

## Security Considerations

1. **API Keys**: Store in GitHub Secrets, never in code
2. **AWS Credentials**: Use least-privilege IAM policies
3. **S3 Bucket**: Keep private, use pre-signed URLs if sharing
4. **Generated Code**: Always review before merging
5. **PR Content**: AI sees PR titles/descriptions - avoid secrets
