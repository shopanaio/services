---
name: team-tdd
description: Spawn 5-agent team for feature implementation (architect + infra + code + tests)
user-invocable: true
---

# TDD Development Team Orchestrator

Coordinate a professional 5-agent team to implement features using Test-Driven Development.

## Usage

```
/team-tdd <feature-description>
```

Examples:
- `/team-tdd implement warehouse stock transfer between locations`
- `/team-tdd add organization logo upload with image validation`

## Team Roster

| Agent | Skill | Responsibility | Runs In |
|-------|-------|----------------|---------|
| Infra | `/infra-start` | Docker, gateway, dev server, logs | Background |
| Architect | `/solution-architect` | Design decisions, implementation plan | Foreground |
| Developer | `/code-write` | Write code following the plan | Foreground |
| Tester | `/test-write` | Write e2e tests | Foreground |
| Runner | `/test-run` | Execute tests, report results | Foreground |

## Architecture Flow

```
                    FEATURE REQUEST
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
      [INFRA]                       [ARCHITECT]
    (background)                    Design Plan
          │                               │
          │         PLAN READY            │
          │◄──────────────────────────────┤
          │                               │
          │                         [DEVELOPER]
          │                      Implement Code
          │                               │
          │      ┌────────────────────────┤
          │      │ Design Question?       │
          │      ▼                        │
          │  [ARCHITECT]                  │
          │   Answer ────────────────────►│
          │                               │
          │         IMPLEMENTED           │
          │◄──────────────────────────────┤
          │                               │
          │        Schema/Codegen?        │
          │        Build Packages?        │
          │        Type Check?            │
          │                               │
          │                         [TESTER]
          │                       Write Tests
          │                               │
          │         TESTS WRITTEN         │
          │◄──────────────────────────────┤
          │                               │
          │                         [RUNNER]
          │                        Run Tests
          │                               │
          │    ┌──────────────────────────┤
          │    │                          │
          │    ▼                          ▼
          │ [PASS]                     [FAIL]
          │    │                          │
          │    │                    [DEVELOPER]
          │    │                     Fix Code
          │    │                          │
          │    │         Need Logs?       │
          │◄───┼──────────────────────────┤
          │    │    Provide Logs          │
          │────┼─────────────────────────►│
          │    │                          │
          │    │◄─────────────────────────┤
          │    │      (max 3 iterations)  │
          │    │                          │
          ▼    ▼                          │
     [CLEANUP]◄───────────────────────────┘
```

## Execution Protocol

### Phase 0: Pre-flight Checks

Before starting, verify:

```bash
# 1. Check Docker is running
docker info > /dev/null 2>&1 || echo "Docker not running"

# 2. Check for uncommitted changes (warn only)
git status --porcelain

# 3. Verify node_modules exists
[ -d "node_modules" ] || yarn install
```

If Docker not running → STOP and inform user.

### Phase 1: Infrastructure Setup

**Action:** Spawn Infra agent in background

```
Task tool:
  subagent_type: "general-purpose"
  run_in_background: true
  prompt: |
    /infra-start

    After INFRASTRUCTURE READY, stay running to provide logs on request.
```

**Wait for:** `INFRASTRUCTURE READY` message (check with TaskOutput, block: false)

**Timeout:** 60 seconds. If not ready → ABORT with infrastructure error.

**Save:** `infra_agent_id` for later log requests.

### Phase 2: Architecture & Design

**Action:** Spawn Architect agent

```
Task tool:
  subagent_type: "general-purpose"
  prompt: |
    /solution-architect

    FEATURE: {feature_description}

    Analyze the codebase and create an implementation plan.
```

**Wait for:** `PLAN READY` signal with:
- Design decisions
- Implementation steps
- Files to create/modify
- Reference patterns

**Save:** Full plan as `architect_plan`.

### Phase 3: Implementation

**Action:** Spawn Developer agent

```
Task tool:
  subagent_type: "general-purpose"
  prompt: |
    /code-write

    ARCHITECT PLAN:
    {architect_plan}

    Implement following the plan exactly. Ask design questions if unclear.
```

**Handle Design Questions:**

If Developer outputs `DESIGN QUESTION:`, then:

1. Resume Architect agent:
   ```
   Task tool:
     resume: {architect_agent_id}
     prompt: |
       DESIGN QUESTION FROM DEVELOPER:
       {question}

       Provide a clear decision with reasoning.
   ```

2. Pass answer back to Developer:
   ```
   Task tool:
     resume: {developer_agent_id}
     prompt: |
       ARCHITECT DECISION:
       {decision}

       Continue implementation.
   ```

**Wait for:** `IMPLEMENTED` signal with:
- Files changed list
- Rebuild requirements (schema/codegen/packages)

### Phase 3.5: Build Pipeline (if needed)

Based on Developer's output, run necessary builds:

```bash
# If GraphQL schema changed:
shopana schema --action build && shopana codegen

# If packages/* changed:
shopana build --packages-only

# Always run type check:
cd /Users/phl/Projects/shopana-io/services
yarn tsc --noEmit --pretty 2>&1 | head -50
```

**If type errors:** Resume Developer with errors to fix before proceeding.

### Phase 4: Test Creation

**Action:** Spawn Tester agent

```
Task tool:
  subagent_type: "general-purpose"
  prompt: |
    /test-write

    FEATURE: {feature_description}

    FILES CHANGED:
    {files_from_developer}

    ARCHITECT PLAN:
    {architect_plan}

    Write comprehensive e2e tests for this feature.
```

**Wait for:** `TESTS WRITTEN` signal with:
- Test file path
- Test count
- Test categories covered

### Phase 5: Test Execution

**Action:** Spawn Runner agent

```
Task tool:
  subagent_type: "general-purpose"
  prompt: |
    /test-run {test_file_path}
```

**Wait for:** Test results (PASS or FAIL with details).

### Phase 6: Fix Loop (on failure)

**Iteration limit:** 3 attempts

**On test failure:**

1. Check if Developer needs logs:
   ```
   Task tool:
     resume: {infra_agent_id}
     prompt: |
       Provide last 100 lines of bootstrap logs.
       Also grep for any ERROR or Exception in recent output.
   ```

2. Resume Developer with failure context:
   ```
   Task tool:
     resume: {developer_agent_id}
     prompt: |
       TESTS FAILED (Attempt {n}/3):

       {test_failure_details}

       SERVER LOGS:
       {relevant_logs}

       Fix the code. Signal FIXED when done.
   ```

3. Wait for hot-reload (3 seconds minimum)

4. Re-run tests:
   ```
   Task tool:
     resume: {runner_agent_id}
     prompt: |
       Re-run the same test file.
   ```

**If max iterations reached:**

```
ESCALATION NEEDED

Feature: {feature_description}
Attempts: 3/3 exhausted

LAST FAILURE:
{failure_details}

FILES MODIFIED:
{all_files_changed}

Stopping. Manual intervention required.
```

Then proceed to cleanup.

### Phase 7: Cleanup

**Always execute**, even on failure:

```
Task tool:
  resume: {infra_agent_id}
  prompt: |
    CLEANUP: Stop all services and exit.
```

Verify cleanup:
```bash
# Ensure no orphaned processes
pgrep -f "yarn dev" && pkill -f "yarn dev"
pgrep -f "yarn gateway" && pkill -f "yarn gateway"
```

## Output Format

### On Success

```
FEATURE IMPLEMENTED: {feature_name}

DESIGN DECISIONS:
{from architect}

FILES CHANGED:
| File | Change |
|------|--------|
| path | description |

TESTS: PASSED ({n} tests)
- {test_name_1}
- {test_name_2}

BUILD ARTIFACTS:
- Schema: regenerated (if applicable)
- Codegen: regenerated (if applicable)
- Packages: rebuilt (if applicable)
```

### On Failure

```
FEATURE INCOMPLETE: {feature_name}

STATUS: Failed after {n} fix iterations

DESIGN DECISIONS:
{from architect}

FILES CHANGED:
{list}

LAST TEST FAILURE:
{details}

RECOMMENDED NEXT STEPS:
1. Review test failure details
2. Check server logs manually
3. Run /code-fix with specific error context
```

## Agent Communication Protocol

### Message Signals

| Signal | From | Meaning |
|--------|------|---------|
| `INFRASTRUCTURE READY` | Infra | All services up, ready for work |
| `PLAN READY` | Architect | Design complete, ready for implementation |
| `DESIGN QUESTION:` | Developer | Needs architect decision |
| `ARCHITECT DECISION:` | Architect | Answer to developer question |
| `IMPLEMENTED` | Developer | Code complete, ready for tests |
| `FIXED` | Developer | Bug fix complete, ready for re-test |
| `TESTS WRITTEN` | Tester | Tests created, ready to run |
| `ALL TESTS PASSED` | Runner | Success |
| `TESTS FAILED` | Runner | Failure with details |
| `CLEANUP` | Orchestrator | Shutdown signal |

### Error Escalation

| Error Type | Handler |
|------------|---------|
| Infrastructure fails to start | ABORT immediately |
| Type errors after implementation | Developer fixes before tests |
| Test failures (1-3 attempts) | Developer fix loop |
| Test failures (>3 attempts) | Escalate to user |
| Agent crash/timeout | Log error, attempt cleanup, escalate |

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| Max fix iterations | 3 | Attempts before escalation |
| Hot-reload wait | 3s | Time after code change |
| Infrastructure timeout | 60s | Max wait for services |
| Type check | enabled | Run tsc before tests |

## Best Practices

1. **Never skip phases** — Even for "simple" features, follow the full flow
2. **Trust the architect** — Developer should not make design decisions
3. **One test file** — Runner executes one file at a time for clear feedback
4. **Clean state** — Each test run starts with fresh infrastructure
5. **Always cleanup** — Never leave background processes running
