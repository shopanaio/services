---
name: team-test
description: Spawn 3-agent team for test debugging (infra + test-runner + code-fixer)
user-invocable: true
---

# Agents Spawn - Test Debugging Team

Orchestrate a team of 3 specialized agents to run tests and fix failures.

## Usage

```
/agents-spawn <test-file>
```

Examples:
- `/agents-spawn tests/users-api/sign-in.spec.ts`
- `/agents-spawn tests/project-api/create.spec.ts`

## Agent Team

You spawn 3 agents, each with their own skill:

| Agent | Skill | Role |
|-------|-------|------|
| Agent 1 | `/infra-start` | Start docker, gateway, bootstrap; provide logs |
| Agent 2 | `/test-run` | Run playwright tests, report results |
| Agent 3 | `/code-fix` | Debug and fix code with hot-reload |

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

### Step 2: Spawn Test Runner Agent

Launch Agent 2 with `/test-run` skill:

```
Task tool:
  prompt: "Execute the /test-run skill for: {test_file}"
  subagent_type: general-purpose
```

Wait for test results.

### Step 3: Check Results

If all tests passed:
- Report success
- Resume Agent 1 with "Cleanup and stop"
- Done!

If tests failed:
- Continue to Step 4

### Step 4: Spawn Code Fixer Agent

Launch Agent 3 with `/code-fix` skill:

```
Task tool:
  prompt: "Execute the /code-fix skill.

  Failed tests:
  {failure_details_from_agent_2}

  Debug and fix the code."
  subagent_type: general-purpose
```

### Step 5: Handle Log Requests

When Agent 3 says "I need bootstrap logs":

1. Resume Agent 1:
   ```
   Task tool (resume):
     resume: {agent_1_id}
     prompt: "Provide bootstrap logs, grep for [DEBUG"
   ```

2. Pass the logs to Agent 3:
   ```
   Task tool (resume):
     resume: {agent_3_id}
     prompt: "Here are the logs:
     {logs_from_agent_1}

     Continue debugging."
   ```

### Step 6: Re-run Tests

When Agent 3 reports "Ready for re-test":

1. Wait 3 seconds (for hot-reload)
2. Go back to Step 2 (spawn test runner again)

### Step 7: Loop Control

- Maximum 3 iterations
- If still failing after 3 attempts:
  ```
  Max iterations reached.
  Last failure: {details}
  Manual intervention needed.
  ```

## Message Passing Protocol

### Orchestrator to Agent 1 (get logs)

```
Resume Agent 1:
"Provide {log_type} logs.
Look for: {pattern}"
```

### Orchestrator to Agent 3 (send logs)

```
Resume Agent 3:
"Here are the bootstrap logs:
---
{log_content}
---
Continue your analysis."
```

### Agent 3 to Orchestrator (request logs)

Agent 3 will say something like:
```
I added logging to SignInScript.ts.
I need bootstrap logs to see my [DEBUG SignInScript] output.
```

You then get logs from Agent 1 and pass them back.

## Example Flow

```
User: /agents-spawn tests/users-api/sign-in.spec.ts

[You] Spawning infra agent...
[Agent 1] Starting docker... gateway... bootstrap...
[Agent 1] INFRASTRUCTURE READY

[You] Spawning test runner...
[Agent 2] Running sign-in.spec.ts
[Agent 2] FAILED: should handle expired tokens
         Error: Expected 401, got 500

[You] Spawning code fixer...
[Agent 3] Analyzing SignInScript.ts
[Agent 3] Adding debug logs...
[Agent 3] Need bootstrap logs

[You] Getting logs from Agent 1...
[Agent 1] [DEBUG validateToken] error: jwt expired

[You] Passing to Agent 3...
[Agent 3] Found issue! Fixing...
[Agent 3] Ready for re-test

[You] Waiting 3s for hot-reload...
[You] Re-running tests...
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
