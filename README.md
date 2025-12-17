# AI Test Agents Lab 🤖

> An enterprise-ready agentic testing workflow with planning and execution agents

[![CI](https://github.com/YOUR_USERNAME/ai-test-agents-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/ai-test-agents-lab/actions/workflows/ci.yml)

## 🎯 Purpose

This repository demonstrates how to build an **agentic testing workflow** that:
- Generates test plans from user stories using AI
- Creates Gherkin scenarios from plans
- Produces test automation code (Cypress)
- Integrates with CI/CD via GitHub Actions
- Includes human review gates at each stage

**Perfect for**: Learning about AI agents, preparing for interviews, or bootstrapping an enterprise testing workflow.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure LLM (Required for real generation)

```bash
cp .env.example .env
# Edit .env and add: ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Run Interactive Demo

```bash
npm run demo
```

### 4. Or Run Integration Test

```bash
npm run test:integration story-001-delete-user
```

## 📚 Available Stories

| Story | Description | Complexity |
|-------|-------------|------------|
| `story-001-delete-user` | Admin deletes a user | Simple (3 pts) |
| `story-002-user-registration` | Full registration with email verification | Medium (5 pts) |
| `story-003-shopping-cart` | E-commerce cart management | Medium (8 pts) |
| `story-004-password-reset` | Secure password reset flow | Medium (5 pts) |
| `story-005-product-search` | Search with filters/sorting | Complex (13 pts) |
| `story-006-user-profile` | Profile editing, avatar, data export | Medium (8 pts) |
| `story-007-checkout` | Full checkout with Stripe | Complex (21 pts) |

## 🔧 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR                            │
│  Manages workflow state, sequencing, and human approvals    │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  PLANNER AGENT  │ │  CASE WORKER    │ │  CODE WORKER    │
│                 │ │                 │ │                 │
│ • Risk analysis │ │ • Gherkin       │ │ • Cypress tests │
│ • Test strategy │ │ • Tagging       │ │ • Pattern match │
│ • Prioritization│ │ • Grouping      │ │ • TODOs         │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Workflow Phases

```
Story → [Planner] → Test Plan → [Human Review] → 
        [Case Worker] → Gherkin → [Human Review] →
        [Code Worker] → Test Code → [Human Review] → Done
```

## 🔄 GitHub Actions Integration

This project includes three GitHub Actions workflows:

### 1. CI Workflow (`ci.yml`)
Runs on every push/PR to validate code quality.

### 2. Agentic Test Generation (`agentic-tests.yml`)
Automatically generates tests when:
- A new story file is added to `specs/`
- A PR is labeled with `generate-tests`
- Manually triggered via `workflow_dispatch`

```
Trigger: PR with new story file
   ↓
Step 1: Planner Agent → Generate test plan
   ↓
Step 2: Post plan as PR comment for review
   ↓
Step 3: Case Worker → Generate Gherkin scenarios
   ↓
Step 4: Code Worker → Generate Cypress tests
   ↓
Step 5: Commit generated tests to PR branch
```

### 3. Demo Workflow (`demo.yml`)
One-click demo for interviews - select a story and watch the magic happen!

**To run a demo:**
1. Go to Actions → "🎬 Demo Workflow"
2. Click "Run workflow"
3. Select a story from the dropdown
4. View the generated artifacts in the Summary

### Setting Up GitHub Actions

1. **Add your API key as a secret:**
   - Go to Settings → Secrets and variables → Actions
   - Add `ANTHROPIC_API_KEY` with your API key

2. **Enable workflows:**
   - Workflows are automatically enabled when you push to GitHub

## 🛠 CLI Commands

```bash
# Interactive demo
npm run demo

# List all stories
npm run agent:list

# Run full workflow
npm run agent:full -- story-002-user-registration

# Run individual phases
npm run agent:plan -- story-003-shopping-cart
npm run agent:cases -- story-003-shopping-cart  
npm run agent:code -- story-003-shopping-cart

# Skip approval prompts (CI mode)
npm run agent:full -- story-004-password-reset --skip-approval

# Test LLM connection
npm run test:llm

# Test workflow (simulation mode)
npm run test:workflow
```

## 📂 Project Structure

```
ai-test-agents-lab/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Code validation
│       ├── agentic-tests.yml   # Auto test generation
│       └── demo.yml            # Interview demo
├── src/
│   ├── agents/                 # AI agent implementations
│   │   ├── base.ts             # Base agent class
│   │   ├── planner.ts          # Test plan generation
│   │   ├── case-worker.ts      # Gherkin generation
│   │   └── code-worker.ts      # Cypress code generation
│   ├── orchestrator/           # Workflow orchestration
│   ├── utils/                  # LLM client, file ops
│   └── cli.ts                  # Command-line interface
├── specs/                      # User stories (input)
├── test-artifacts/             # Generated plans & scenarios
├── cypress/                    # Generated test code
└── docs/                       # Learning documentation
```

## 💰 Cost Estimates

| Operation | Tokens | Cost (Claude Sonnet) |
|-----------|--------|---------------------|
| Test Plan | 2-4K | ~$0.01-0.02 |
| Gherkin Scenarios | 1-2K | ~$0.005-0.01 |
| Test Code | 2-4K | ~$0.01-0.02 |
| **Total per story** | 5-10K | **~$0.03-0.05** |

## 🎤 Interview Talking Points

1. **What is agentic testing?**
   > AI agents that reason, plan, and execute autonomously vs. rigid scripts

2. **How does it differ from traditional automation?**
   > Planning phase - AI analyzes requirements and generates test strategies

3. **What about quality/trust?**
   > Human-in-the-loop pattern with approval gates and clear artifacts

4. **How does it integrate with CI/CD?**
   > GitHub Actions workflow triggers on story changes, posts plans for review

5. **Enterprise considerations?**
   > Private LLMs for sensitive data, cost management, audit trails

## 📖 Learning Resources

| Document | Description |
|----------|-------------|
| [Agentic Testing Guide](docs/AGENTIC-TESTING-GUIDE.md) | Comprehensive architecture guide |
| [Interview Quick Reference](docs/INTERVIEW-QUICK-REFERENCE.md) | One-page cheat sheet |

## 📜 License

MIT - Feel free to use for learning and production.

---

**Questions?** Check the [comprehensive guide](docs/AGENTIC-TESTING-GUIDE.md) or open an issue.
