#!/bin/bash
# Export environment variables from .env file
# Usage: source export-env.sh [path/to/.env]

set -e

# Determine the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default .env file location
ENV_FILE="${1:-${SCRIPT_DIR}/.env}"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found at: $ENV_FILE"
    echo ""
    echo "Please create .env file from the example:"
    echo "  cp ${SCRIPT_DIR}/woodpecker.env.example ${SCRIPT_DIR}/.env"
    echo "  vim ${SCRIPT_DIR}/.env"
    echo ""
    return 1 2>/dev/null || exit 1
fi

echo "📦 Loading environment variables from: $ENV_FILE"
echo ""

# Export variables from .env file
# Skip empty lines and comments
while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and empty lines
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
        continue
    fi

    # Skip lines that don't contain '='
    if [[ ! "$line" =~ = ]]; then
        continue
    fi

    # Remove 'export ' prefix if exists
    line="${line#export }"

    # Extract key and value
    key="${line%%=*}"
    value="${line#*=}"

    # Remove quotes from value if present
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"

    # Trim whitespace
    key="$(echo "$key" | xargs)"
    value="$(echo "$value" | xargs)"

    # Export the variable
    if [ -n "$key" ]; then
        export "$key=$value"
        echo "  ✓ $key"
    fi
done < "$ENV_FILE"

echo ""
echo "✅ Environment variables exported successfully!"
echo ""
echo "You can now run:"
echo "  ansible-playbook install-woodpecker.yml"
