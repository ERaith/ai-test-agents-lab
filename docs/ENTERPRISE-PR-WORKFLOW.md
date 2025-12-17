# Enterprise PR-Based Test Generation

This document explains the phased, PR-based test generation workflow with human approval gates.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CREATE PR                                    │
│           (story description in PR body)                         │
│                  + label: generate-tests                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Planning                          [AUTO]               │
│  ────────────────────────────────────────────────               │
│  • Agent reads PR description as story                           │
│  • Generates test plan with risk analysis                        │
│  • Posts plan as PR comment                                      │
│  • Label: awaiting-plan-approval                                 │
│                                                                  │
│  ⏸️  BLOCKED - Waiting for: /approve-plan                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Comment: /approve-plan
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: Test Cases                        [ON APPROVAL]        │
│  ────────────────────────────────────────────────               │
│  • Generates Gherkin scenarios from plan                         │
│  • Posts scenarios as PR comment                                 │
│  • Label: awaiting-cases-approval                                │
│                                                                  │
│  ⏸️  BLOCKED - Waiting for: /approve-cases                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                    Comment: /approve-cases
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: Code Generation                   [ON APPROVAL]        │
│  ────────────────────────────────────────────────               │
│  • Generates Cypress test code                                   │
│  • COMMITS code directly to PR branch                            │
│  • Posts completion summary                                      │
│  • Label: tests-generated                                        │
│                                                                  │
│  ✅ COMPLETE - Ready for review & merge                          │
└─────────────────────────────────────────────────────────────────┘
```

## How to Use

### Step 1: Create a PR with Your Story

Create a new branch and PR. Put your user story in the PR description:

**PR Title:** `Add user registration feature`

**PR Body:**
```markdown
## User Story

As a visitor to the platform
I want to register for a new account
So that I can access the platform's features

## Acceptance Criteria

- [ ] Registration form with email, password, name
- [ ] Email validation
- [ ] Password strength requirements
- [ ] Duplicate email handling
- [ ] Confirmation email sent

## Technical Notes

- API: POST /api/auth/register
- Password hashed with bcrypt
```

### Step 2: Add the Trigger Label

Add the label `generate-tests` to the PR.

This triggers Phase 1 automatically.

### Step 3: Review the Test Plan

The bot will comment with the generated test plan. Review it and either:

- **Request changes:** Comment with feedback
- **Approve:** Comment `/approve-plan`

### Step 4: Review the Gherkin Scenarios

After plan approval, the bot generates Gherkin scenarios. Review and either:

- **Request changes:** Comment with feedback
- **Approve:** Comment `/approve-cases`

### Step 5: Review Generated Code

After cases approval, the bot:
1. Generates Cypress test code
2. **Commits it directly to your PR branch**
3. Posts a completion summary

### Step 6: Final Review & Merge

1. Review the committed test files
2. Make any manual adjustments needed
3. Run tests locally if desired
4. Merge the PR!

## Labels (State Machine)

| Label | Meaning | Next Action |
|-------|---------|-------------|
| `generate-tests` | Initial trigger | Automatic Phase 1 |
| `awaiting-plan-approval` | Plan ready for review | `/approve-plan` |
| `awaiting-cases-approval` | Cases ready for review | `/approve-cases` |
| `tests-generated` | All phases complete | Merge PR |

## Commands

| Command | When to Use | Effect |
|---------|-------------|--------|
| `/approve-plan` | After reviewing test plan | Triggers Phase 2 |
| `/approve-cases` | After reviewing Gherkin | Triggers Phase 3 |

## Generated Files

After all phases complete, your PR will contain:

```
test-artifacts/pr-{number}/
├── test-plan.md          # Risk analysis & test strategy
└── scenarios.feature     # Gherkin scenarios

cypress/e2e/
└── pr-{number}.cy.ts     # Cypress test code
```

## Enterprise Benefits

### 1. Audit Trail
Every decision is tracked in PR comments and labels.

### 2. Human-in-the-Loop
Nothing is committed without explicit approval at each phase.

### 3. Traceability
Generated tests link back to the PR/story that created them.

### 4. Review Process
Standard PR review process applies to generated tests.

### 5. Rollback
If tests are wrong, simply revert the commit or close the PR.

## Comparison: All-at-Once vs Phased

| Aspect | All-at-Once | Phased (This) |
|--------|-------------|---------------|
| Speed | Faster | Slower (requires approvals) |
| Control | Less | More |
| Error Recovery | Harder | Easier (catch issues early) |
| Audit Trail | Basic | Detailed |
| Enterprise Ready | No | Yes |

## Tips

1. **Write detailed PR descriptions** - Better input = better tests
2. **Review plans carefully** - Catch issues before code generation
3. **Use the preview** - Expand the collapsible sections in comments
4. **Download artifacts** - Full files available in Actions tab

## Troubleshooting

### Workflow didn't trigger
- Check that `generate-tests` label was added
- Verify the workflow file exists in your default branch

### Approval command didn't work
- Ensure you have the correct label (check state machine)
- Command must be exactly `/approve-plan` or `/approve-cases`

### Code wasn't committed
- Check the Actions log for errors
- Verify the bot has write permissions to the repo
