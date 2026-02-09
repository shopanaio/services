---
name: code-fix
description: Fix failing tests through debugging with hot-reload awareness
user-invocable: true
---

# Code Fixer Agent

Debug and fix failing e2e tests using strategic logging.

## Usage

```
/code-fix <failure-details>
```

The failure details come from the test runner agent.

## Critical: Hot-Reload Workflow

The dev server has HOT-RELOAD enabled.
Code changes in services/* auto-reload in 2-3 seconds.
NO rebuild needed for service code!

### What Needs Rebuild?

| Location | After Edit | Rebuild? |
|----------|------------|----------|
| `services/*/src/*` | Just save, wait 2-3s | **NO** |
| `packages/*/src/*` | `shopana build --packages` | **YES** |
| GraphQL schemas | `shopana schema --action build` | **YES** |

### For Service Code (most common)

1. Edit the file
2. Save it
3. Wait 2-3 seconds (hot-reload happens automatically)
4. Ready for test

**NEVER run `yarn build` or restart the server!**

### For Package Code

```bash
# After editing packages/*/src/*
mcp__shopana-cli__shopana_build --packagesOnly true

# Then touch any service file to trigger reload
touch services/catalog/src/index.ts
```

### For GraphQL Schema Changes

```bash
# After editing *.graphql files
mcp__shopana-cli__shopana_schema --action build

# Then rebuild packages if types changed
mcp__shopana-cli__shopana_build --packagesOnly true

# Then touch a service file
touch services/catalog/src/index.ts
```

## Debugging Workflow

### 1. Analyze the Failure

- Read the test file to understand expectations
- Read the stack trace to find failing code
- Identify: resolver? script? repository?

### 2. Add Strategic Logging

Add `console.log()` at key points:

```typescript
console.log('[DEBUG SignInScript] input:', JSON.stringify(input));
console.log('[DEBUG SignInScript] user found:', !!user);
console.log('[DEBUG SignInScript] password match:', isMatch);
```

- Use `[DEBUG FileName]` prefix for easy grep
- Log inputs, outputs, intermediate values
- Save the file (hot-reload triggers automatically)
- Wait 2-3 seconds

### 3. Request Logs

Tell the orchestrator:
```
I need bootstrap logs to see my debug output.
Look for [DEBUG SignInScript]
```

The orchestrator will get logs from the infra agent.

### 4. Identify Root Cause

From the logs, determine:
- What value was unexpected?
- Why did the code behave this way?
- Logic error? Missing data? Wrong query?

### 5. Fix the Code

- Make minimal, targeted fix
- Save the file (hot-reload triggers)
- Wait 2-3 seconds

### 6. Clean Up Logs (optional)

Remove debug `console.log` statements, or leave them for future debugging.

### 7. Report

```
FIXED:
- Root cause: Token validation was throwing generic Error instead of AuthError
- Fix: Added catch for JwtExpiredError, return 401
- Files changed: services/iam/src/scripts/SignInScript.ts
- Ready for re-test
```

## Files You CAN Modify

- `services/*/src/**/*.ts` (auto hot-reload)
- `packages/*/src/**/*.ts` (need build --packages)

## Files You Should NOT Modify

- `e2e/tests/*` (unless the test itself is wrong)
- `migrations/*`
- `**/generated/**`
- `*.graphql` (unless schema change is needed)
