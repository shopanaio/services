#!/bin/bash
# Kill process using specific port
# Usage: ./kill-port.sh 3030

PORT=$1

if [ -z "$PORT" ]; then
    echo "Usage: $0 <port>"
    exit 1
fi

PID=$(lsof -ti :$PORT)

if [ -z "$PID" ]; then
    echo "No process found on port $PORT"
    exit 0
fi

echo "Killing process $PID on port $PORT..."
kill $PID 2>/dev/null || kill -9 $PID 2>/dev/null

sleep 1

# Verify
if lsof -ti :$PORT > /dev/null 2>&1; then
    echo "Failed to kill process on port $PORT"
    exit 1
else
    echo "Successfully killed process on port $PORT"
    exit 0
fi
