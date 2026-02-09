---
name: debug-tests
description: Launch 3-agent team to run infrastructure, execute e2e tests, and fix code through debugging
user-invocable: true
---

# Debug Tests - 3 Agent Team

Launch a collaborative team of 3 agents that work together to run tests and fix failures through log-based debugging.

## Usage

```
/debug-tests <test-file-or-pattern>
```

Examples:
- `/debug-tests tests/users-api/sign-in.spec.ts`
- `/debug-tests tests/project-api`
- `/debug-tests` (runs all tests)

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR (you)                       │
│  - Coordinates agents                                           │
│  - Passes messages between agents                               │
│  - Makes final decisions                                        │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ AGENT 1       │    │ AGENT 2       │    │ AGENT 3       │
│ INFRA         │◄───│ TEST RUNNER   │───►│ CODE FIXER    │
│               │    │               │    │               │
│ - Docker      │    │ - Playwright  │    │ - Edit code   │
│ - Gateway     │    │ - Run tests   │    │ - Add logs    │
│ - Bootstrap   │    │ - Read logs   │    │ - Debug       │
│ - Read logs   │    │ - Report      │    │ - Ask for     │
│ - Postgres    │    │   failures    │    │   logs        │
└───────────────┘    └───────────────┘    └───────────────┘
```

## Workflow

### Phase 1: Start Infrastructure (Agent 1)

Launch Agent 1 in background to start all services:

```
Prompt: "Start the development infrastructure for Shopana.

1. Start Docker containers (postgres, redis, etc.):
   docker compose up -d

2. Wait for postgres to be ready:
   docker compose logs -f postgres (until 'ready to accept connections')

3. Start the gateway in background:
   Use mcp__shopana-cli__shopana_gateway tool

4. Start bootstrap service (runs all microservices):
   Use mcp__shopana-cli__shopana_dev tool

5. Wait for bootstrap to be healthy by checking logs for 'Server is running' or similar

6. Keep running and be ready to provide logs when asked.

When asked for logs, run:
- Bootstrap logs: check the dev server output
- Postgres logs: docker compose logs postgres --tail=100
- Gateway logs: check gateway output

Stay running and respond to log requests."

Subagent type: general-purpose
Run in background: true
```

### Phase 2: Run Tests (Agent 2)

After infrastructure is ready, launch Agent 2:

```
Prompt: "Run Playwright e2e tests for Shopana.

Test path: {test_path}

1. Navigate to e2e directory: cd /Users/phl/Projects/shopana-io/services/e2e

2. Run tests one file at a time using:
   npx playwright test {test_file} --reporter=list

3. For each test file:
   - Report: PASS or FAIL
   - If FAIL: capture full error message, stack trace, and test output
   - Note which specific test case failed

4. After running, provide a summary:
   - Total tests: X
   - Passed: X
   - Failed: X
   - List of failures with error details

5. For failures, extract:
   - Test name
   - Error message
   - Expected vs Actual
   - Stack trace pointing to service code

Return detailed failure information for the Code Fixer agent."

Subagent type: general-purpose
```

### Phase 3: Fix Failures (Agent 3)

If tests fail, launch Agent 3:

```
Prompt: "Fix failing e2e tests through debugging.

Failed tests from Agent 2:
{failure_details}

Your debugging workflow:

1. ANALYZE the failure:
   - Read the test file to understand what it's testing
   - Read the error message and stack trace
   - Identify which service/endpoint is failing

2. ADD LOGGING to the suspected code:
   - Add console.log/logger.info statements
   - Log request inputs, intermediate values, outputs
   - Focus on the code path indicated by stack trace

3. REQUEST LOGS from infrastructure:
   - Tell the orchestrator you need bootstrap logs
   - Wait for logs to be provided
   - Analyze the log output

4. IDENTIFY the root cause:
   - Compare expected vs actual behavior
   - Check database queries, GraphQL resolvers, scripts

5. FIX the code:
   - Make minimal, targeted fixes
   - Don't over-engineer
   - Keep changes focused on the failing test

6. REPORT your changes:
   - List files modified
   - Explain the fix
   - Request test re-run

Files you can modify:
- services/*/src/**/*.ts (service code)
- packages/*/src/**/*.ts (shared packages)

DO NOT modify:
- e2e tests (unless explicitly asked)
- migrations
- generated files"

Subagent type: general-purpose
```

## Orchestration Loop

As the orchestrator, follow this loop:

```
1. START INFRA (Agent 1 in background)
   - Wait for "infrastructure ready" confirmation
   - Store agent ID for log requests

2. RUN TESTS (Agent 2)
   - Pass test path from user
   - Collect results

3. IF all tests pass:
   - Report success
   - Kill infra agent
   - Done

4. IF tests fail:
   - Launch CODE FIXER (Agent 3) with failure details
   - When Agent 3 requests logs:
     a. Use TaskOutput to get output from Agent 1
     b. Or resume Agent 1 with log request
     c. Pass logs back to Agent 3
   - When Agent 3 reports fix complete:
     a. Go back to step 2 (re-run tests)

5. LOOP until:
   - All tests pass, OR
   - Max iterations (3) reached, OR
   - User interrupts
```

## Log Request Protocol

When Agent 3 needs logs:

1. Agent 3 says: "I need bootstrap logs for the last 2 minutes" or "I need postgres logs"

2. You (orchestrator):
   - Resume Agent 1 with: "Provide bootstrap logs from the last 2 minutes"
   - Or run directly: `docker compose logs postgres --tail=100`
   - Pass the logs to Agent 3

3. Agent 3 analyzes and continues debugging

## Example Session

```
User: /debug-tests tests/users-api/sign-in.spec.ts

Orchestrator:
  [Launches Agent 1 - Infra] Starting infrastructure...
  [Agent 1 reports] Infrastructure ready. Bootstrap running.

  [Launches Agent 2 - Tests] Running sign-in.spec.ts...
  [Agent 2 reports]
    FAIL: should sign in with valid credentials
    Error: Expected status 200, got 500
    Stack: at SignInScript.ts:45

  [Launches Agent 3 - Fixer] Analyzing failure...
  [Agent 3] Added logging to SignInScript.ts
  [Agent 3] Need bootstrap logs

  [Orchestrator gets logs from Agent 1]
  [Passes logs to Agent 3]

  [Agent 3] Found issue: password hash comparison failing
  [Agent 3] Fixed: Updated bcrypt compare logic
  [Agent 3] Ready for re-test

  [Orchestrator re-runs Agent 2]
  [Agent 2 reports] PASS: all tests passed

  [Orchestrator] Success! Cleaning up...
  [Kills Agent 1]
```

## Important Notes

1. **Keep Agent 1 running** - It maintains the dev server
2. **Sequential test runs** - Don't parallelize test execution
3. **Max 3 fix iterations** - Prevent infinite loops
4. **Clean up** - Always kill background agents when done
5. **Log context** - Always provide enough log context to Agent 3

## Commands Reference

Infrastructure:
- `docker compose up -d` - Start containers
- `docker compose logs postgres --tail=100` - Postgres logs
- `docker compose down` - Stop containers

Gateway:
- `mcp__shopana-cli__shopana_gateway` - Start gateway

Dev Server:
- `mcp__shopana-cli__shopana_dev` - Start all services

Tests:
- `cd e2e && npx playwright test <file>` - Run specific test
- `cd e2e && npx playwright test` - Run all tests
