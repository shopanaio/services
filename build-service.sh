#!/bin/bash

# Script to build a specific service
# Usage: ./build-service.sh <service-name> [tag]

set -e

# Check if service name is provided
if [ -z "$1" ]; then
  echo "Error: Service name is required"
  echo "Usage: ./build-service.sh <service-name> [tag]"
  echo ""
  echo "Available services:"
  echo "  - orchestrator"
  echo "  - checkout"
  echo "  - orders"
  echo "  - payments"
  echo "  - delivery"
  echo "  - inventory"
  echo "  - pricing"
  echo "  - platform"
  echo "  - apps"
  exit 1
fi

SERVICE_NAME=$1
TAG=${2:-latest}
IMAGE_NAME="shopana/${SERVICE_NAME}-service:${TAG}"

# Check if service directory exists
if [ ! -d "services/${SERVICE_NAME}" ]; then
  echo "Error: Service '${SERVICE_NAME}' not found in services/ directory"
  exit 1
fi

echo "Building ${SERVICE_NAME} service..."
echo "Image name: ${IMAGE_NAME}"
echo ""

# Build the Docker image
docker build \
  --build-arg SERVICE_NAME="${SERVICE_NAME}" \
  --build-arg NODE_VERSION=20 \
  -t "${IMAGE_NAME}" \
  -f services/Dockerfile \
  .

echo ""
echo "✓ Successfully built ${IMAGE_NAME}"
echo ""
echo "To run the service:"
echo "  docker run -p 3000:3000 ${IMAGE_NAME}"
echo ""
echo "To push the image:"
echo "  docker push ${IMAGE_NAME}"
