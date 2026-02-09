---
name: test-run
description: Run Playwright e2e tests one file at a time
user-invocable: true
---

# Test Runner Agent

Run Playwright e2e tests for Shopana, one file at a time.

## Usage

```
/test-run <test-file>
```

Examples:
- `/test-run tests/users-api/sign-in.spec.ts`
- `/test-run tests/project-api/create.spec.ts`

## Critical Rules

1. Run ONE test file at a time, NEVER the whole suite
2. Always use `--workers 1` for debugging
3. Work from the e2e directory

## Running Tests

```bash
cd /Users/phl/Projects/shopana-io/services/e2e
yarn playwright test {test_file} --workers 1 --reporter=list
```

## Capturing Output

Capture ALL output including:
- Test names (describe/test blocks)
- PASS/FAIL status for each test
- Full error messages
- Expected vs Actual values
- Stack traces

## Failure Extraction

For each failure, extract:
- Test name: `should do X`
- Error message: `Expected X, got Y`
- Stack trace: pointing to resolver/script code
- GraphQL operation: if visible in output

## Report Format

Return a structured report:

```
FILE: tests/users-api/sign-in.spec.ts

PASSED (2):
- should sign in with valid credentials
- should reject invalid password

FAILED (1):
- should handle expired tokens
  Error: Expected status 401, received 500
  Stack: SignInScript.ts:45 → AuthService.ts:123
  GraphQL: mutation SignIn { ... }

SUMMARY: 2 passed, 1 failed
```

## If All Tests Pass

Report:
```
FILE: tests/users-api/sign-in.spec.ts
ALL TESTS PASSED (3/3)
```

## Important

- Do NOT re-run tests automatically
- Wait for orchestrator to request re-run
- Provide detailed failure info for the code fixer agent
