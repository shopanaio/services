---
name: team-test
description: Spawn 2-agent team for test debugging (infra + code-fixer/tester)
user-invocable: true
---

# Agents Spawn - Test Debugging Team

Orchestrate a team of 2 specialized agents to run tests and fix failures.

## Usage

```
/team-test <test-file>
```

Examples:
- `/team-test tests/users-api/sign-in.spec.ts`
- `/team-test tests/project-api/create.spec.ts`

## Agent Team

You spawn 2 agents:

| Agent | Skill | Role |
|-------|-------|------|
| Agent 1 | `/infra-start` | Start docker, gateway, bootstrap; provide logs |
| Agent 2 | `/code-fix` | Run tests, debug and fix code with hot-reload |

## Orchestration Steps

### Step 1: Spawn Infra Agent (background)

Launch Agent 1 with `/infra-start` skill:

```
Task tool:
  prompt: "Execute the /infra-start skill. Start all infrastructure and report when ready."
  subagent_type: general-purpose
  run_in_background: true
```

Wait for output containing `INFRASTRUCTURE READY`.

Store the agent ID for later log requests.

### Step 2: Spawn Code Fixer Agent

Launch Agent 2 with `/code-fix` skill:

```
Task tool:
  prompt: "Execute the /code-fix skill for: {test_file}

  1. Run the test first
  2. If tests fail, debug and fix the code
  3. Re-run tests to verify
  4. Repeat until all tests pass (max 3 iterations)"
  subagent_type: general-purpose
```

### Step 3: Handle Log Requests

When Agent 2 says "I need bootstrap logs":

1. Resume Agent 1:
   ```
   Task tool (resume):
     resume: {agent_1_id}
     prompt: "Provide bootstrap logs, grep for [DEBUG"
   ```

2. Pass the logs to Agent 2:
   ```
   Task tool (resume):
     resume: {agent_2_id}
     prompt: "Here are the logs:
     {logs_from_agent_1}

     Continue debugging."
   ```

### Step 4: Check Results

When Agent 2 reports completion:
- If tests passed: Report success
- If max iterations reached: Report failure details
- Resume Agent 1 with "Cleanup and stop"
- Done!

## Message Passing Protocol

### Orchestrator to Agent 1 (get logs)

```
Resume Agent 1:
"Provide {log_type} logs.
Look for: {pattern}"
```

### Orchestrator to Agent 2 (send logs)

```
Resume Agent 2:
"Here are the bootstrap logs:
---
{log_content}
---
Continue your analysis."
```

### Agent 2 to Orchestrator (request logs)

Agent 2 will say something like:
```
I added logging to SignInScript.ts.
I need bootstrap logs to see my [DEBUG SignInScript] output.
```

You then get logs from Agent 1 and pass them back.

## Example Flow

```
User: /team-test tests/users-api/sign-in.spec.ts

[You] Spawning infra agent...
[Agent 1] Starting docker... gateway... bootstrap...
[Agent 1] INFRASTRUCTURE READY

[You] Spawning code fixer agent...
[Agent 2] Running sign-in.spec.ts
[Agent 2] FAILED: should handle expired tokens
         Error: Expected 401, got 500
[Agent 2] Analyzing SignInScript.ts
[Agent 2] Adding debug logs...
[Agent 2] Need bootstrap logs

[You] Getting logs from Agent 1...
[Agent 1] [DEBUG validateToken] error: jwt expired

[You] Passing to Agent 2...
[Agent 2] Found issue! Fixing...
[Agent 2] Re-running tests...
[Agent 2] ALL TESTS PASSED

[You] Success! Cleaning up...
[Agent 1] docker compose down
```

## Cleanup

Always clean up at the end:

```
Resume Agent 1:
"Cleanup: stop all services and run docker compose down"
```

Then kill any remaining background tasks.
