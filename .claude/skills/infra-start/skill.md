---
name: infra-start
description: Start Shopana infrastructure (docker, gateway, bootstrap) in background and provide logs
user-invocable: true
---

# Infrastructure Agent

Start all Shopana services in background and provide logs on request.

## Usage

```
/infra-start
```

## Startup Sequence

### 1. Start Docker Containers

```bash
cd /Users/phl/Projects/shopana-io/services
docker compose up -d
```

Wait for postgres:
```bash
docker compose logs postgres --tail=20
# Look for: "database system is ready to accept connections"
```

### 2. Start Gateway IN BACKGROUND

Use Bash tool with `run_in_background: true`:

```
Bash tool:
  command: "cd /Users/phl/Projects/shopana-io/services && yarn gateway"
  run_in_background: true
  description: "Start Apollo Gateway"
```

**Save the task_id** — you'll need it for logs later.

### 3. Start Bootstrap Dev Server IN BACKGROUND

Use Bash tool with `run_in_background: true`:

```
Bash tool:
  command: "cd /Users/phl/Projects/shopana-io/services && yarn dev"
  run_in_background: true
  description: "Start Bootstrap dev server with hot-reload"
```

**Save the task_id** — you'll need it for logs later.

### 4. Wait for Startup

Check background task output using TaskOutput:

```
TaskOutput tool:
  task_id: {bootstrap_task_id}
  block: false
```

Look for:
- `Server is running`
- `Listening on port`
- Service registration messages

Repeat every 2-3 seconds until ready (max 30 seconds).

### 5. Health Check

```bash
# Admin API (4001)
curl -sf http://127.0.0.1:4001/graphql -X POST \
  -H 'Content-Type: application/json' \
  -d '{"query":"{__typename}"}'

# Storefront API (4000)
curl -sf http://127.0.0.1:4000/graphql -X POST \
  -H 'Content-Type: application/json' \
  -d '{"query":"{__typename}"}'
```

### 6. Report Ready

```
INFRASTRUCTURE READY

Docker containers: running
Gateway (4000, 4001): running [task_id: {gateway_task_id}]
Bootstrap dev server: running [task_id: {bootstrap_task_id}]

Hot-reload: ENABLED
Ready to run tests.
```

## Providing Logs

When orchestrator asks for logs:

### Bootstrap Logs

```
TaskOutput tool:
  task_id: {bootstrap_task_id}
  block: false
```

### Gateway Logs

```
TaskOutput tool:
  task_id: {gateway_task_id}
  block: false
```

### Postgres Logs

```bash
docker compose logs postgres --tail=100
```

### Grep for Errors

```bash
docker compose logs --tail=200 2>&1 | grep -i error
```

### Grep for Debug Messages

When asked for specific pattern:
```
TaskOutput tool:
  task_id: {bootstrap_task_id}
  block: false

# Then grep the output for [DEBUG pattern]
```

## Background Task IDs to Track

After startup, you have these background tasks:

| Service | Task ID Variable |
|---------|------------------|
| Gateway | `{gateway_task_id}` |
| Bootstrap | `{bootstrap_task_id}` |

Use these IDs with `TaskOutput` to read logs.

## Cleanup

When told to stop:

```bash
# Kill background tasks
KillShell tool:
  shell_id: {gateway_task_id}

KillShell tool:
  shell_id: {bootstrap_task_id}

# Stop docker
docker compose down
```

## Stay Running

After startup, stay available to:
1. Provide logs on request
2. Check service health
3. Cleanup when done

Do NOT exit until explicitly told to cleanup.
