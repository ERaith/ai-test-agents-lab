You are helping test the project in this repository.

## Tech Stack

- Backend: Node.js/Express REST API
- Frontend: Simple HTML/JS table UI (no framework needed for this lab)
- Test Framework: Playwright (TypeScript)
- Fixtures live in `playwright/fixtures/base.ts`
- Test specs live in `playwright/tests/*.spec.ts`

## Testing Principles

- Focus on high-value, maintainable tests.
- Prefer a few strong tests over many brittle ones.
- Use BDD/Gherkin style for planning and test case descriptions.
- Use tags like `@smoke`, `@regression`, `@story-XXX` in test descriptions.
- All Playwright operations are async - always use await.
- Prefer data-testid selectors over CSS classes.

## Domain Constraints (for this lab)

- Users have: `id`, `name`, `role` (`admin` or `user`).
- Deletion is only allowed for `role === "admin"`.
- After a deletion, the user should not be visible via API or UI.
- Each successful deletion should create an audit log entry.

## Output Expectations

- When planning, output **markdown**, not code.
- When generating test cases, output **valid Gherkin**.
- When generating test code, output **TypeScript Playwright** that follows existing patterns.
- Always leave a clear marker for unknown details (e.g. `// TODO: selector`).

## Paths

- specs: specs
- artifacts: test-artifacts
- tests: playwright/tests
- helpers: playwright/fixtures/base.ts
