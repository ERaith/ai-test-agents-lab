# 🎤 Interview Quick Reference Card

> Print this or keep it handy for interview prep

---

## The 30-Second Pitch

> "Agentic testing uses AI agents that can autonomously plan and execute test activities. Unlike traditional automation that follows rigid scripts, our agents analyze requirements, perform risk-based prioritization, and generate comprehensive test suites. The key is human-in-the-loop - AI accelerates, humans validate."

---

## Core Architecture (Draw This)

```
┌──────────────┐
│ Orchestrator │ ← State machine, manages workflow
└──────┬───────┘
       │
   ┌───┴───┐
   ▼       ▼       ▼
Planner → Cases → Code → Human Review
   │         │       │
   ▼         ▼       ▼
Plan.md  .feature  .cy.ts
```

---

## Key Differentiators

| Traditional | Agentic |
|-------------|---------|
| Scripts | Plans |
| Brittle | Adaptive |
| Manual design | AI-assisted |
| Static | Dynamic |

---

## The Three Agents

1. **Planner** - Strategic, risk-based, creates test strategy
2. **Case Worker** - Converts plan to Gherkin scenarios  
3. **Code Worker** - Generates framework-specific test code

---

## Enterprise Concerns & Answers

**Q: Security?**
> Private LLMs for sensitive data, input sanitization, no credentials in prompts

**Q: Quality?**
> Human approval gates, mutation testing validation, incremental trust

**Q: Cost?**
> Smaller models for simple tasks, caching, per-project budgets (~$0.03/story)

**Q: Governance?**
> Version-controlled artifacts, audit trails, approval records

---

## Orchestration Patterns

1. **Sequential** - Simple, clear handoffs
2. **Human-in-Loop** - Quality gates, trust building ✅ START HERE
3. **Parallel Workers** - Faster for large stories
4. **Self-Correcting** - Auto-retry on failures

---

## When Asked "How Would You Implement?"

1. **Define agents** with clear interfaces (BaseAgent pattern)
2. **Build orchestrator** as state machine with phases
3. **Add human gates** between each phase
4. **Store artifacts** in version control
5. **Start simple** - sequential pipeline first
6. **Measure** - cost, quality, time saved

---

## Tools to Mention

| Category | Options |
|----------|---------|
| Orchestration | LangGraph, CrewAI, custom Node.js |
| LLMs | Claude (reasoning), GPT-4 (code) |
| Testing | Playwright, Cypress |
| CI/CD | GitHub Actions, Jenkins |

---

## Code Snippet to Reference

```typescript
// Simplified orchestrator pattern
async function runWorkflow(storyId: string) {
  const plan = await plannerAgent.execute(story);
  await humanApproval(plan);
  
  const cases = await caseWorker.execute(plan);
  await humanApproval(cases);
  
  const code = await codeWorker.execute(cases);
  await humanApproval(code);
  
  return { plan, cases, code };
}
```

---

## Red Flags to Avoid

❌ "We removed human review because AI is accurate"
❌ "We use the same model for everything"
❌ "The tests write themselves"

## Green Flags to Hit

✅ "Human-in-the-loop for trust and quality"
✅ "Clear artifacts at each stage for audit"
✅ "Incremental adoption as trust builds"
✅ "Cost management through model selection"

---

## Final Sound Bite

> "The goal isn't to replace humans - it's to augment them. AI handles the repetitive parts of test design and code generation. Humans bring judgment, domain expertise, and final validation. Together, we move faster with better coverage."

---

*Good luck! 🚀*
