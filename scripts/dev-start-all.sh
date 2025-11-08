#!/bin/bash
# Start all services for local development

set -e

echo "🚀 Starting all services for local development..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$ROOT_DIR"

# Trap to kill all background jobs on exit
cleanup() {
    echo ""
    echo "${YELLOW}Stopping all services...${NC}"
    jobs -p | xargs -r kill 2>/dev/null
    wait
    echo "${GREEN}All services stopped${NC}"
}
trap cleanup EXIT INT TERM

# Check infrastructure
echo "${YELLOW}Checking infrastructure...${NC}"
if ! docker ps | grep -q shopana-nats-dev; then
    echo "${RED}NATS not running! Start infrastructure first:${NC}"
    echo "  docker-compose -f docker-compose.dev-infrastructure.yml --profile local-db --profile local-storage up -d"
    exit 1
fi

if ! docker ps | grep -q shopana-postgres-dev; then
    echo "${RED}PostgreSQL not running! Start infrastructure first:${NC}"
    echo "  docker-compose -f docker-compose.dev-infrastructure.yml --profile local-db up -d"
    exit 1
fi

echo "${GREEN}✓ Infrastructure is running${NC}"
echo ""

# Kill ports if occupied
echo "${YELLOW}Cleaning up ports...${NC}"
./scripts/kill-port.sh 3030 2>/dev/null || true
./scripts/kill-port.sh 8000 2>/dev/null || true
./scripts/kill-port.sh 10001 2>/dev/null || true

echo ""
echo "${GREEN}Starting services...${NC}"
echo ""

# Start Orchestrator (Node.js services)
echo "${YELLOW}[1/2] Starting Orchestrator (Node.js)...${NC}"
CONFIG_FILE=config.dev.yml yarn workspace @shopana/orchestrator-service run dev > /tmp/orchestrator.log 2>&1 &
ORCHESTRATOR_PID=$!
echo "  PID: $ORCHESTRATOR_PID (logs: tail -f /tmp/orchestrator.log)"

# Start Platform (Go)
echo "${YELLOW}[2/2] Starting Platform (Go)...${NC}"
cd platform
cp .env.dev .env
PLATFORM_ENV=development go run ./project/cmd/main/main.go > /tmp/platform.log 2>&1 &
PLATFORM_PID=$!
echo "  PID: $PLATFORM_PID (logs: tail -f /tmp/platform.log)"
cd ..

echo ""
echo "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo "${GREEN}🎉 All services started!${NC}"
echo "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Services:"
echo "  • Orchestrator (Node.js): http://localhost:10001/graphql"
echo "  • Platform (Go):          http://localhost:8000"
echo "  • Metrics:                http://localhost:3030/metrics"
echo ""
echo "Logs:"
echo "  • tail -f /tmp/orchestrator.log"
echo "  • tail -f /tmp/platform.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for services to start
sleep 5

# Check if services are running
if ! kill -0 $ORCHESTRATOR_PID 2>/dev/null; then
    echo "${RED}✗ Orchestrator failed to start! Check logs:${NC}"
    echo "  tail -f /tmp/orchestrator.log"
fi

if ! kill -0 $PLATFORM_PID 2>/dev/null; then
    echo "${RED}✗ Platform failed to start! Check logs:${NC}"
    echo "  tail -f /tmp/platform.log"
fi

# Wait for background jobs
wait
