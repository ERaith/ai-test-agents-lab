# AI Test Agents Lab 🤖

> An enterprise-ready agentic testing workflow with planning and execution agents

[![CI](https://github.com/ERaith/ai-test-agents-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/ERaith/ai-test-agents-lab/actions/workflows/ci.yml)

## 🎯 Purpose

This repository demonstrates how to build an **agentic testing workflow** that:
- Generates test plans from user stories using AI
- Creates Gherkin scenarios from plans
- Produces test automation code (Cypress)
- Integrates with CI/CD via GitHub Actions
- Includes human approval gates at each phase

**Perfect for**: Learning about AI agents, preparing for interviews, or bootstrapping an enterprise testing workflow.

## 🚀 Quick Start

### Option 1: GitHub Actions (Recommended for Demo)

1. Add `ANTHROPIC_API_KEY` to repository secrets
2. Go to **Actions** → **"🎬 Demo Workflow"** → **Run workflow**
3. Select a story and watch the magic!

### Option 2: Local CLI

```bash
npm install
cp .env.example .env  # Add your ANTHROPIC_API_KEY
npm run demo
```

## 🏢 Enterprise PR Workflow

The flagship feature: **phased test generation with human approval gates**.

```
PR Created (story in description) + label: generate-tests
    │
    ▼
┌─────────────────────────────────────────┐
│  Phase 1: Generate Test Plan            │
│  → Posts plan as PR comment             │
│  → Label: awaiting-plan-approval        │
│  ⏸️  BLOCKED                             │
└─────────────────────────────────────────┘
    │
    │ Comment: /approve-plan
    ▼
┌─────────────────────────────────────────┐
│  Phase 2: Generate Gherkin Scenarios    │
│  → Posts scenarios as PR comment        │
│  → Label: awaiting-cases-approval       │
│  ⏸️  BLOCKED                             │
└─────────────────────────────────────────┘
    │
    │ Comment: /approve-cases
    ▼
┌─────────────────────────────────────────┐
│  Phase 3: Generate Test Code            │
│  → Commits Cypress tests to PR branch   │
│  → Label: tests-generated               │
│  ✅ Ready for review & merge            │
└─────────────────────────────────────────┘
```

**See [Enterprise PR Workflow Guide](docs/ENTERPRISE-PR-WORKFLOW.md) for details.**

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

## 🔄 GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** | Push/PR | Validates code, runs simulation |
| **Demo** | Manual | One-click interview demo |
| **Phased Generation** | PR + label | Enterprise workflow with approval gates |

## 🛠 CLI Commands

```bash
npm run demo                    # Interactive demo
npm run agent:list              # List all stories
npm run agent:full -- story-002 # Full workflow
npm run agent:plan -- story-003 # Just planning phase
npm run agent:cases -- story-003 # Just Gherkin phase
npm run agent:code -- story-003 # Just code phase
```

## 📂 Project Structure

```
ai-test-agents-lab/
├── .github/workflows/          # GitHub Actions
│   ├── ci.yml                  # Code validation
│   ├── demo.yml                # Interview demo
│   └── phased-generation.yml   # Enterprise PR workflow
├── src/
│   ├── agents/                 # AI agent implementations
│   ├── orchestrator/           # Workflow orchestration
│   ├── utils/                  # LLM client, file ops
│   └── cli.ts                  # Command-line interface
├── specs/                      # User stories (input)
├── test-artifacts/             # Generated plans & scenarios
├── cypress/                    # Generated test code
└── docs/                       # Documentation
```

## 💰 Cost Estimates

| Operation | Cost (Claude Sonnet) |
|-----------|---------------------|
| Full story (3 phases) | ~$0.03-0.05 |

## 🎤 Interview Talking Points

1. **What is agentic testing?**
   > AI agents that reason, plan, and execute—not just scripts

2. **How do you trust AI-generated tests?**
   > Human-in-the-loop: approval gates at each phase, full audit trail

3. **How does it integrate with existing workflows?**
   > PR-based: story in PR description, tests committed to PR branch

4. **Enterprise considerations?**
   > Phased approvals, audit trail in PR comments, cost management

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Enterprise PR Workflow](docs/ENTERPRISE-PR-WORKFLOW.md) | **Phased workflow with approval gates** |
| [Agentic Testing Guide](docs/AGENTIC-TESTING-GUIDE.md) | Architecture deep-dive |
| [Interview Quick Reference](docs/INTERVIEW-QUICK-REFERENCE.md) | One-page cheat sheet |
| [GitHub Actions Setup](docs/GITHUB-ACTIONS-SETUP.md) | CI/CD configuration |

## 📜 License

MIT
