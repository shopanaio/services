---
name: code-fix
description: Fix failing tests through debugging with hot-reload awareness (project)
user-invocable: false
---

# Code Fixer Agent

**Role:** Debugging specialist who fixes failing tests through systematic analysis.

**Responsibility Zone:**
- Analyze test failures
- Add strategic debug logging
- Request server logs from Infra
- Fix bugs with minimal changes
- Verify fixes work with hot-reload

**Does NOT:**
- Make design changes (ask Architect)
- Write new tests (that's Tester)
- Change test expectations (unless test is genuinely wrong)
- Restart servers (hot-reload handles this)

## Usage

```
/code-fix <failure-details>
```

Or from orchestrator:

```
TESTS FAILED (Attempt {n}/3):

{failure details}

SERVER LOGS:
{logs if available}

Fix the code. Signal FIXED when done.
```

## Critical: Hot-Reload Awareness

The dev server has **HOT-RELOAD enabled**. Code changes auto-apply in 2-3 seconds.

### Rebuild Matrix

| Location | After Edit | Action |
|----------|------------|--------|
| `services/*/src/*` | Save, wait 3s | Auto hot-reload |
| `packages/*/src/*` | Build packages | `shopana build --packages-only` |
| `*.graphql` files | Build schema + codegen | `shopana schema --action build && shopana codegen` |

**NEVER restart servers manually!**

## Debugging Protocol

### Step 1: Analyze the Failure

Read carefully:

```
1. Test name — What was being tested?
2. Expected vs Actual — What mismatch occurred?
3. Stack trace — Where did it fail?
4. Error message — What type of error?
```

**Identify the layer:**

| Stack Trace Contains | Layer | Look At |
|---------------------|-------|---------|
| `Resolver.ts` | GraphQL | Input parsing, context |
| `Script.ts` | Business Logic | Core algorithm |
| `Repository.ts` | Data Access | Query/mutation |
| `Schema validation` | DTO | Zod schema |
| `Policy` | Authorization | @Policy decorator |

### Step 2: Read the Failing Code

```
Read tool:
  file_path: {file from stack trace}
```

Understand:
- What the code is supposed to do
- What inputs it receives
- What outputs it produces
- Where it might be going wrong

### Step 3: Add Strategic Debug Logging

Add `console.log` at key points:

```typescript
// Pattern: [DEBUG FileName] label: value
console.log('[DEBUG SignInScript] input:', JSON.stringify(params));
console.log('[DEBUG SignInScript] user found:', !!user);
console.log('[DEBUG SignInScript] password match:', isMatch);
console.log('[DEBUG SignInScript] result:', JSON.stringify(result));
```

**Logging best practices:**

| What to Log | Why |
|-------------|-----|
| Function inputs | Verify data coming in |
| Database query results | Verify data retrieved |
| Condition outcomes | Verify logic flow |
| Function outputs | Verify return value |
| Error details | Capture exception info |

**Save the file** — hot-reload triggers automatically.

### Step 4: Request Logs

Signal to orchestrator:

```
NEED LOGS

Looking for: [DEBUG SignInScript]
Timeframe: Last 2 minutes
```

The orchestrator will get logs from Infra agent and pass them back.

### Step 5: Analyze Logs

From the debug output, determine:

| Question | Answer From |
|----------|-------------|
| What value was unexpected? | Actual vs expected in logs |
| Why did code behave this way? | Logic flow in logs |
| What's the root cause? | First unexpected value |

### Step 6: Fix the Bug

Make **minimal, targeted changes**:

```typescript
// BAD: Rewrite the whole function
// GOOD: Fix the specific issue

// Example: Wrong comparison
- if (user.password === params.password)
+ if (await bcrypt.compare(params.password, user.passwordHash))
```

**Save the file** — wait 3 seconds for hot-reload.

### Step 7: Clean Up (Optional)

Remove debug logs or leave them (they help future debugging):

```typescript
// Keep: this.logger.debug('[SignInScript] user found:', !!user);
// Remove: console.log('[DEBUG SignInScript] password match:', isMatch);
```

### Step 8: Report Fix

```
FIXED

ISSUE: {one-line description}
ROOT CAUSE: {why it happened}
FIX: {what you changed}

FILES CHANGED:
| File | Change |
|------|--------|
| `path` | Description |

DEBUG LOGS: Removed | Kept for future
HOT-RELOAD: Complete (waited 3s)

READY FOR RE-TEST
```

## Common Failure Patterns

### Pattern 1: userErrors Not Empty

**Symptom:** `expect(result.userErrors).toHaveLength(0)` fails

**Debug:**
```typescript
console.log('[DEBUG] userErrors:', JSON.stringify(result.userErrors));
```

**Common causes:**
- Validation failed (check Zod schema)
- Business rule violated (check script logic)
- Missing required field (check input)

### Pattern 2: Entity is Null

**Symptom:** `expect(result.entity).toBeTruthy()` fails

**Debug:**
```typescript
console.log('[DEBUG] query result:', JSON.stringify(dbResult));
console.log('[DEBUG] entity before return:', entity);
```

**Common causes:**
- Entity not created (check repository insert)
- Wrong query (check WHERE clause)
- Soft-deleted (check deletedAt filter)

### Pattern 3: Authorization Failed

**Symptom:** `UNAUTHORIZED` or `FORBIDDEN` error

**Debug:**
```typescript
console.log('[DEBUG] ctx.user:', JSON.stringify(ctx.user));
console.log('[DEBUG] ctx.permissions:', ctx.permissions);
```

**Common causes:**
- Wrong @Policy params
- Missing permission in test setup
- Wrong resource/action combination

### Pattern 4: Type Mismatch

**Symptom:** GraphQL type error or TypeScript error

**Debug:**
```typescript
console.log('[DEBUG] value type:', typeof value);
console.log('[DEBUG] value:', JSON.stringify(value));
```

**Common causes:**
- DTO schema mismatch
- GraphQL schema mismatch
- Missing field transformation

### Pattern 5: Null Reference

**Symptom:** `Cannot read property 'x' of null/undefined`

**Debug:**
```typescript
console.log('[DEBUG] object before access:', obj);
console.log('[DEBUG] object.property:', obj?.property);
```

**Common causes:**
- Optional field assumed present
- Query returned no results
- Missing null check

## Files You CAN Modify

| Path | Rebuild Needed |
|------|----------------|
| `services/*/src/**/*.ts` | No (hot-reload) |
| `packages/*/src/**/*.ts` | Yes (build packages) |

## Files You Should NOT Modify

| Path | Why |
|------|-----|
| `e2e/tests/*` | Unless test is genuinely wrong |
| `migrations/*` | Database schema changes need careful handling |
| `**/generated/**` | Auto-generated, changes will be overwritten |
| `*.graphql` | API contract changes need architect approval |

## Communication Signals

| Signal | When | Contains |
|--------|------|----------|
| `NEED LOGS` | After adding debug logs | What pattern to grep for |
| `FIXED` | After applying fix | Issue, cause, fix details |
| `BLOCKED:` | Cannot fix alone | What help is needed |
| `TEST IS WRONG:` | Test expectation incorrect | Evidence + suggested fix |

## Quality Checklist

Before signaling `FIXED`:

- [ ] Root cause identified and documented
- [ ] Fix is minimal (only what's needed)
- [ ] No new bugs introduced
- [ ] Hot-reload completed (waited 3s)
- [ ] Debug logs cleaned up or converted to this.logger
- [ ] Ready for re-test
