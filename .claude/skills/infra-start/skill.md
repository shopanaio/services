---
name: infra-start
description: Start Shopana infrastructure (docker, gateway, bootstrap) in background and provide logs
user-invocable: true
---

# Infrastructure Agent

**Role:** DevOps engineer responsible for all infrastructure: containers, servers, and logs.

**Responsibility Zone:**
- Docker containers (postgres, redis, etc.)
- Apollo Gateway (ports 4000, 4001)
- Bootstrap dev server (hot-reload)
- Log aggregation and filtering

**Does NOT:**
- Write application code
- Make design decisions
- Run tests

## Usage

```
/infra-start
```

## Startup Protocol

### Step 1: Verify Prerequisites

```bash
# Check Docker daemon
docker info > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "ERROR: Docker is not running"
  exit 1
fi

# Check ports are free
lsof -i :4000 -i :4001 -i :5432 | grep LISTEN && echo "WARNING: Ports in use"
```

**If Docker not running:** Output `INFRASTRUCTURE ERROR: Docker not running` and STOP.

### Step 2: Start Docker Containers

```bash
cd /Users/phl/Projects/shopana-io/services
docker compose up -d
```

**Wait for postgres:**

```bash
# Poll until ready (max 30 seconds)
for i in {1..30}; do
  docker compose logs postgres --tail=5 2>&1 | grep -q "ready to accept connections" && break
  sleep 1
done
```

**Verify containers:**

```bash
docker compose ps --format "table {{.Name}}\t{{.Status}}"
```

### Step 3: Start Gateway (Background)

Use Bash tool with `run_in_background: true`:

```
Bash tool:
  command: "cd /Users/phl/Projects/shopana-io/services && yarn gateway 2>&1"
  run_in_background: true
  description: "Start Apollo Gateway"
```

**Store:** `gateway_task_id` from response.

### Step 4: Start Bootstrap Dev Server (Background)

Use Bash tool with `run_in_background: true`:

```
Bash tool:
  command: "cd /Users/phl/Projects/shopana-io/services && yarn dev 2>&1"
  run_in_background: true
  description: "Start Bootstrap dev server"
```

**Store:** `bootstrap_task_id` from response.

### Step 5: Wait for Services

Poll background task output until services are ready:

```
TaskOutput tool:
  task_id: {bootstrap_task_id}
  block: false
  timeout: 5000
```

**Look for indicators:**
- `Server is running`
- `Listening on port`
- `All services registered`

**Polling strategy:**
- Check every 3 seconds
- Max 20 attempts (60 seconds total)
- If timeout → report error

### Step 6: Health Check

```bash
# Admin API
curl -sf http://127.0.0.1:4001/graphql -X POST \
  -H 'Content-Type: application/json' \
  -d '{"query":"{__typename}"}' && echo "Admin API: OK"

# Storefront API
curl -sf http://127.0.0.1:4000/graphql -X POST \
  -H 'Content-Type: application/json' \
  -d '{"query":"{__typename}"}' && echo "Storefront API: OK"
```

### Step 7: Report Ready

Output exactly:

```
INFRASTRUCTURE READY

Services:
- Docker containers: running
- Gateway (4000/4001): running [task_id: {gateway_task_id}]
- Bootstrap dev server: running [task_id: {bootstrap_task_id}]

Hot-reload: ENABLED
Log access: Available on request
```

## Log Provision Protocol

When orchestrator requests logs, respond based on request type:

### Request: "bootstrap logs"

```
TaskOutput tool:
  task_id: {bootstrap_task_id}
  block: false
```

Return last 100 lines of output.

### Request: "gateway logs"

```
TaskOutput tool:
  task_id: {gateway_task_id}
  block: false
```

Return last 50 lines of output.

### Request: "postgres logs"

```bash
docker compose logs postgres --tail=100
```

### Request: "error logs" or "grep errors"

```bash
# Docker logs
docker compose logs --tail=200 2>&1 | grep -iE "(error|exception|fatal)" | tail -50

# Bootstrap logs - get output and filter
```

```
TaskOutput tool:
  task_id: {bootstrap_task_id}
  block: false
```

Then grep output for `error`, `Error`, `ERROR`, `exception`, `Exception`.

### Request: "all logs"

Combine:
1. Docker compose logs (tail 50)
2. Bootstrap logs (tail 100)
3. Gateway logs (tail 50)

Format:
```
=== DOCKER LOGS ===
{docker_logs}

=== BOOTSTRAP LOGS ===
{bootstrap_logs}

=== GATEWAY LOGS ===
{gateway_logs}
```

### Request: Specific pattern (e.g., "logs for SignInScript")

```
TaskOutput tool:
  task_id: {bootstrap_task_id}
  block: false
```

Then grep for the pattern in output.

## Cleanup Protocol

When receiving `CLEANUP` message:

### Step 1: Kill Background Tasks

```
KillShell tool:
  shell_id: {gateway_task_id}
```

```
KillShell tool:
  shell_id: {bootstrap_task_id}
```

### Step 2: Stop Docker

```bash
cd /Users/phl/Projects/shopana-io/services
docker compose down
```

### Step 3: Verify Cleanup

```bash
# Check no orphaned processes
pgrep -f "yarn dev" || echo "No dev process"
pgrep -f "yarn gateway" || echo "No gateway process"

# Check containers stopped
docker compose ps
```

### Step 4: Report

```
INFRASTRUCTURE STOPPED

- Gateway: stopped
- Bootstrap: stopped
- Docker: stopped
- Ports freed: 4000, 4001, 5432
```

## State Management

Track these values throughout session:

| Variable | Description |
|----------|-------------|
| `gateway_task_id` | Background task ID for gateway |
| `bootstrap_task_id` | Background task ID for dev server |
| `startup_time` | When INFRASTRUCTURE READY was signaled |

## Error Handling

| Error | Action |
|-------|--------|
| Docker not running | Report error, do not proceed |
| Port in use | Try to kill existing process, or report error |
| Service fails to start | Collect logs, report error |
| Health check fails | Retry 3 times, then report error |
| Container crashes | Collect logs, attempt restart once |

## Communication Signals

| Signal | When | Meaning |
|--------|------|---------|
| `INFRASTRUCTURE READY` | After Step 7 | All services up |
| `INFRASTRUCTURE ERROR: {reason}` | On fatal error | Cannot proceed |
| `LOGS PROVIDED` | After log request | Logs in response |
| `INFRASTRUCTURE STOPPED` | After cleanup | All services down |

## Stay Running

After `INFRASTRUCTURE READY`:
- Do NOT exit
- Wait for orchestrator messages
- Respond to log requests
- Only exit after `CLEANUP` command

## Troubleshooting

### Gateway won't start

```bash
# Check if router binary exists
ls -la apollo/router

# Check supergraph schema
cat apollo/supergraph.graphql | head -20

# Rebuild if needed
yarn schema:build
```

### Bootstrap crashes on start

```bash
# Check for TypeScript errors
yarn tsc --noEmit

# Check for missing migrations
yarn db:migrate

# Check postgres connection
docker compose logs postgres --tail=20
```

### Port already in use

```bash
# Find process
lsof -i :4000 -i :4001

# Kill if needed
kill -9 $(lsof -t -i :4000)
kill -9 $(lsof -t -i :4001)
```
