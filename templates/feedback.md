# Feedback/Patch File Template

Use this to improve AI-generated tests. Two ways to use:

## Local Development

Copy to `test-artifacts/<story-id>/feedback.md` and run:
```bash
npx tsx src/cli.ts plan <story-id> --with-feedback
```

## PR Workflow (Recommended)

1. Create `.test-patches/pr-<number>.md` in your repo
2. Commit to your PR branch
3. Re-trigger test generation (remove/re-add the label)
4. Patch file is automatically detected and used
5. Delete patch file before merging

---

## Plan Improvements

- (List changes for test plan generation)
- Example: Add more edge cases for error handling
- Example: Focus on mobile viewport testing

## Cases Improvements

- (List changes for Gherkin scenario generation)
- Example: Include accessibility scenarios
- Example: Add more negative test cases

## Code Improvements

- (List changes for test code generation)
- Example: Use page object pattern
- Example: Add retry logic for flaky selectors
- Example: Use specific data-testid attributes

## General

- (General guidelines that apply to all phases)
- Example: This feature is security-critical, prioritize auth tests
