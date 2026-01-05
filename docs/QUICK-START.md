# Quick Start Guide

Get AI-powered test generation running in under 5 minutes.

## Prerequisites

- Node.js 18+
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

## Local Development

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_ORG/ai-test-agents-lab.git
cd ai-test-agents-lab
npm install
```

### 2. Configure API Key

```bash
# Create .env file
cp .env.example .env

# Add your API key
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

### 3. Create a Test Story

```bash
cat > specs/my-feature.md << 'EOF'
# User Login Feature

## User Story
As a user, I want to log in to my account so that I can access my dashboard.

## Acceptance Criteria
- User enters email and password
- Invalid credentials show error message
- Successful login redirects to dashboard
- "Remember me" checkbox persists session

## Technical Notes
- Login endpoint: POST /api/auth/login
- Dashboard URL: /dashboard
EOF
```

### 4. Generate Tests

```bash
# Generate test plan
npx tsx src/cli.ts plan my-feature --skip-approval

# Generate Gherkin scenarios
npx tsx src/cli.ts cases my-feature --skip-approval

# Generate Playwright code
npx tsx src/cli.ts code my-feature --skip-approval
```

### 5. Check Results

```
test-artifacts/my-feature/
├── test-plan.md           # Test strategy document
├── scenarios.feature      # Gherkin scenarios
├── prompt-planner.md      # Prompt used (for debugging)
├── prompt-cases.md
└── prompt-code.md

playwright/tests/
└── my-feature.spec.ts     # Generated Playwright test
```

## Improve Generated Output

Not happy with the results? Provide feedback:

```bash
# Create feedback file
cat > test-artifacts/my-feature/feedback.md << 'EOF'
## Code Improvements
- Use data-testid selectors instead of text
- Add accessibility testing with axe-core
- Include mobile viewport tests
EOF

# Re-run with feedback
npx tsx src/cli.ts code my-feature --with-feedback --skip-approval
```

## GitHub Integration

To automatically generate tests on PRs:

1. Add `ANTHROPIC_API_KEY` to repository secrets
2. Copy workflow to your target repo:

```bash
mkdir -p .github/workflows
curl -o .github/workflows/generate-tests.yml \
  https://raw.githubusercontent.com/YOUR_ORG/ai-test-agents-lab/main/templates/target-repo/.github/workflows/generate-tests.yml
```

3. Create PR labels: `generate-tests`, `approve-plan`, `approve-cases`

4. On any PR, add `generate-tests` label to trigger generation

## CLI Reference

| Command | Description |
|---------|-------------|
| `plan <story>` | Generate test plan |
| `cases <story>` | Generate Gherkin scenarios |
| `code <story>` | Generate test code |
| `full <story>` | Run all phases |
| `list` | List available stories |
| `demo` | Interactive demo |

| Flag | Description |
|------|-------------|
| `-v, --verbose` | Detailed output |
| `-y, --skip-approval` | Skip approval prompts |
| `-f, --with-feedback` | Include feedback.md |

## Troubleshooting

### "API key not found"
```bash
# Check .env file exists
cat .env | grep ANTHROPIC

# Or set directly
export ANTHROPIC_API_KEY=sk-ant-...
```

### "Story not found"
```bash
# List available stories
npx tsx src/cli.ts list

# Stories must be in specs/ directory
ls specs/
```

### "No output generated"
Check `test-artifacts/<story>/prompt-*.md` to see what was sent to the LLM.

## Next Steps

- Read [Implementation Guide](IMPLEMENTATION-GUIDE.md) for full setup
- Customize prompts in `src/prompts/`
- Add example tests to `playwright/tests/` for better output quality
