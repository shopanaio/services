#!/bin/bash
# Start NEW platform microservices (Project + Media)
# NOTE: Orchestrator must be started separately in another terminal!
#
# See DEV_SETUP.md for complete setup instructions
#
# Quick start:
#   Terminal 1: make dev:orchestrator
#   Terminal 2: make dev:new

set -e

echo "🚀 Starting NEW platform services..."
echo -e "${YELLOW}Note: Orchestrator must run in a separate terminal (make dev:orchestrator)${NC}"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Trap to kill all background jobs on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all services...${NC}"
    jobs -p | xargs -r kill 2>/dev/null
    wait
    echo -e "${GREEN}All services stopped${NC}"
}
trap cleanup EXIT INT TERM

# Check infrastructure
echo -e "${YELLOW}Checking infrastructure...${NC}"
if ! docker ps | grep -q shopana-nats-dev; then
    echo -e "${RED}NATS not running!${NC}"
    exit 1
fi

if ! docker ps | grep -q shopana-postgres-dev; then
    echo -e "${RED}PostgreSQL not running!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Infrastructure is running${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$ROOT_DIR"

# Clean up ports
echo -e "${YELLOW}Cleaning up ports...${NC}"
./scripts/kill-port.sh 3030 2>/dev/null || true
./scripts/kill-port.sh 8000 2>/dev/null || true
./scripts/kill-port.sh 8081 2>/dev/null || true
./scripts/kill-port.sh 10001 2>/dev/null || true

echo ""
echo -e "${GREEN}Starting services...${NC}"
echo ""

# Check if Orchestrator is already running
echo -e "${YELLOW}Checking Orchestrator status...${NC}"
if lsof -i:10001 -sTCP:LISTEN >/dev/null 2>&1; then
    ORCHESTRATOR_PID=$(lsof -ti:10001)
    echo -e "${GREEN}✓ Orchestrator already running (PID: $ORCHESTRATOR_PID)${NC}"
else
    echo -e "${RED}✗ Orchestrator not running!${NC}"
    echo -e "${YELLOW}Please start it in a separate terminal:${NC}"
    echo -e "  ${GREEN}make dev:orchestrator${NC}"
    echo ""
    echo "Waiting for Orchestrator to start... (will wait up to 30 seconds)"
    for i in {1..30}; do
        if lsof -i:10001 -sTCP:LISTEN >/dev/null 2>&1; then
            ORCHESTRATOR_PID=$(lsof -ti:10001)
            echo -e "${GREEN}✓ Orchestrator started! (PID: $ORCHESTRATOR_PID)${NC}"
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""
    if ! lsof -i:10001 -sTCP:LISTEN >/dev/null 2>&1; then
        echo -e "${RED}Orchestrator did not start. Please run 'make dev:orchestrator' in another terminal.${NC}"
        echo "Continuing with other services..."
    fi
fi
echo ""

# Start Project Service (Go)
echo -e "${YELLOW}[1/2] Starting Project Service (NEW microservice from services/project/)...${NC}"
cd platform
cp .env.dev .env
PLATFORM_ENV=development go run services/project/cmd/main.go > /tmp/platform-project.log 2>&1 &
PROJECT_PID=$!
echo "  PID: $PROJECT_PID (logs: tail -f /tmp/platform-project.log)"
echo "  Path: platform/services/project/cmd/main.go"

# Start Media Service (Go) with its own .env file
echo -e "${YELLOW}[2/2] Starting Media Service (NEW microservice from services/media/)...${NC}"
cp .env.media .env
PLATFORM_ENV=development go run services/media/cmd/main.go > /tmp/platform-media.log 2>&1 &
MEDIA_PID=$!
echo "  PID: $MEDIA_PID (logs: tail -f /tmp/platform-media.log)"
echo "  Path: platform/services/media/cmd/main.go"
cd ..

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 All NEW services started!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Services:"
echo "  • Orchestrator GraphQL: http://localhost:10001/graphql"
echo "  • Project GraphQL:      http://localhost:8000/api/admin/graphql/query"
echo "  • Project gRPC:         localhost:50051"
echo "  • Media HTTP:           http://localhost:8081"
echo "  • Metrics:              http://localhost:3030/metrics"
echo ""
echo "Logs:"
echo "  • tail -f /tmp/orchestrator.log"
echo "  • tail -f /tmp/platform-project.log"
echo "  • tail -f /tmp/platform-media.log"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for services to start
sleep 10

# Check if services are running
ORCHESTRATOR_RUNNING=true
PROJECT_RUNNING=true
MEDIA_RUNNING=true

# Check if orchestrator is listening on port 10001
if ! lsof -i:10001 -sTCP:LISTEN >/dev/null 2>&1; then
    echo -e "${RED}✗ Orchestrator failed to start! Check logs:${NC}"
    echo "  tail -f /tmp/orchestrator.log"
    ORCHESTRATOR_RUNNING=false
else
    ORCHESTRATOR_PID=$(lsof -ti:10001 2>/dev/null)
    echo -e "${GREEN}✓ Orchestrator is running (PID: $ORCHESTRATOR_PID)${NC}"
fi

if ! kill -0 $PROJECT_PID 2>/dev/null; then
    echo -e "${RED}✗ Project Service failed to start! Check logs:${NC}"
    echo "  tail -f /tmp/platform-project.log"
    PROJECT_RUNNING=false
else
    echo -e "${GREEN}✓ Project Service is running (PID: $PROJECT_PID)${NC}"
fi

if ! kill -0 $MEDIA_PID 2>/dev/null; then
    echo -e "${RED}✗ Media Service failed to start! Check logs:${NC}"
    echo "  tail -f /tmp/platform-media.log"
    MEDIA_RUNNING=false
else
    echo -e "${GREEN}✓ Media Service is running (PID: $MEDIA_PID)${NC}"
fi

echo ""
echo -e "${YELLOW}Monitoring services... (Press Ctrl+C to stop all)${NC}"
echo ""

# Keep script running and monitor processes
while true; do
    sleep 5

    # Check if any process died
    if $ORCHESTRATOR_RUNNING && ! lsof -i:10001 -sTCP:LISTEN >/dev/null 2>&1; then
        echo -e "${RED}✗ Orchestrator stopped unexpectedly!${NC}"
        ORCHESTRATOR_RUNNING=false
    fi

    if $PROJECT_RUNNING && ! kill -0 $PROJECT_PID 2>/dev/null; then
        echo -e "${RED}✗ Project Service stopped unexpectedly!${NC}"
        PROJECT_RUNNING=false
    fi

    if $MEDIA_RUNNING && ! kill -0 $MEDIA_PID 2>/dev/null; then
        echo -e "${RED}✗ Media Service stopped unexpectedly!${NC}"
        MEDIA_RUNNING=false
    fi

    # If all services stopped, exit
    if ! $ORCHESTRATOR_RUNNING && ! $PROJECT_RUNNING && ! $MEDIA_RUNNING; then
        echo -e "${RED}All services stopped. Exiting...${NC}"
        exit 1
    fi
done
