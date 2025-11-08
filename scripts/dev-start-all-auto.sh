#!/bin/bash
# Auto-start ALL services (Orchestrator in tmux + Platform services)
# This script will:
# 1. Start Orchestrator in a tmux session
# 2. Wait for it to be ready
# 3. Start Platform services in current terminal

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🚀 Auto-starting ALL services..."
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$ROOT_DIR"

# Check if tmux is available
if ! command -v tmux &> /dev/null; then
    echo -e "${RED}❌ tmux is not installed!${NC}"
    echo ""
    echo "Please install tmux:"
    echo "  brew install tmux"
    echo ""
    echo "Or use manual 2-terminal setup (see DEV_SETUP.md)"
    exit 1
fi

# Check infrastructure
echo -e "${YELLOW}Checking infrastructure...${NC}"
if ! docker ps | grep -q shopana-nats-dev; then
    echo -e "${RED}NATS not running!${NC}"
    echo "Run: make dev:infra"
    exit 1
fi

if ! docker ps | grep -q shopana-postgres-dev; then
    echo -e "${RED}PostgreSQL not running!${NC}"
    echo "Run: make dev:infra"
    exit 1
fi

echo -e "${GREEN}✓ Infrastructure is running${NC}"
echo ""

# Kill old orchestrator session if exists
tmux kill-session -t orchestrator 2>/dev/null || true

# Clean up ports
echo -e "${YELLOW}Cleaning up ports...${NC}"
./scripts/kill-port.sh 3030 2>/dev/null || true
./scripts/kill-port.sh 10001 2>/dev/null || true
./scripts/kill-port.sh 8000 2>/dev/null || true
./scripts/kill-port.sh 8081 2>/dev/null || true

sleep 1
echo ""

# Start Orchestrator in tmux
echo -e "${BLUE}[1/2] Starting Orchestrator in tmux session...${NC}"
tmux new-session -d -s orchestrator "cd $ROOT_DIR && make dev:orchestrator"
echo "      tmux session: orchestrator"
echo "      To view: tmux attach -t orchestrator"
echo "      To detach: Ctrl+B then D"
echo ""

# Wait for Orchestrator to start
echo -e "${YELLOW}Waiting for Orchestrator to start...${NC}"
for i in {1..30}; do
    if lsof -i:10001 -sTCP:LISTEN >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Orchestrator is running!${NC}"
        break
    fi
    echo -n "."
    sleep 1

    if [ $i -eq 30 ]; then
        echo ""
        echo -e "${RED}✗ Orchestrator failed to start after 30 seconds${NC}"
        echo "Check logs: tmux attach -t orchestrator"
        exit 1
    fi
done

echo ""
echo ""

# Start Platform Services
echo -e "${BLUE}[2/2] Starting Platform Services...${NC}"
echo ""

# Call the existing script
exec ./scripts/dev-start-new-services.sh
