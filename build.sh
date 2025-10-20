#!/bin/bash

# Build script for service Docker images
# Usage: ./build.sh <service-name> [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
REGISTRY="${DOCKER_REGISTRY:-}"
VERSION="${VERSION:-dev}"
NODE_VERSION="${NODE_VERSION:-20}"
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
PUSH=false
CACHE_FROM=""

# Print usage
usage() {
    cat << EOF
Usage: $0 <service-name> [options]

Arguments:
    service-name        Name of the service to build (e.g., checkout, orders, inventory)

Options:
    -r, --registry      Docker registry URL (default: none)
    -v, --version       Version tag (default: dev)
    -n, --node-version  Node.js version (default: 20)
    -p, --push          Push image to registry after build
    -c, --cache-from    Cache from image (e.g., registry/service:latest)
    -h, --help          Show this help message

Examples:
    # Build checkout service locally
    $0 checkout

    # Build and push to registry
    $0 orders -r ghcr.io/myorg -v 1.0.0 -p

    # Build with cache
    $0 inventory -c ghcr.io/myorg/inventory-service:latest

Environment variables:
    DOCKER_REGISTRY     Default registry URL
    VERSION             Default version tag
    NODE_VERSION        Default Node.js version

EOF
    exit 0
}

# Print error and exit
error() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Print info
info() {
    echo -e "${GREEN}INFO: $1${NC}"
}

# Print warning
warn() {
    echo -e "${YELLOW}WARNING: $1${NC}"
}

# Parse arguments
if [ $# -eq 0 ]; then
    usage
fi

SERVICE_NAME="$1"
shift

while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -n|--node-version)
            NODE_VERSION="$2"
            shift 2
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        -c|--cache-from)
            CACHE_FROM="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# Validate service exists
if [ ! -d "services/${SERVICE_NAME}" ]; then
    error "Service '${SERVICE_NAME}' not found in services/ directory"
fi

# Build image name
if [ -n "$REGISTRY" ]; then
    IMAGE_NAME="${REGISTRY}/${SERVICE_NAME}-service"
else
    IMAGE_NAME="${SERVICE_NAME}-service"
fi

IMAGE_TAG="${IMAGE_NAME}:${VERSION}"
IMAGE_LATEST="${IMAGE_NAME}:latest"

# Prepare build arguments
BUILD_ARGS=(
    --build-arg "SERVICE_NAME=${SERVICE_NAME}"
    --build-arg "VERSION=${VERSION}"
    --build-arg "BUILD_DATE=${BUILD_DATE}"
    --build-arg "VCS_REF=${VCS_REF}"
    --build-arg "NODE_VERSION=${NODE_VERSION}"
    --file "Dockerfile"
    --tag "${IMAGE_TAG}"
    --tag "${IMAGE_LATEST}"
)

# Add cache-from if specified
if [ -n "$CACHE_FROM" ]; then
    BUILD_ARGS+=(--cache-from "${CACHE_FROM}")
fi

# Print build info
info "Building Docker image for service: ${SERVICE_NAME}"
echo "  Image:       ${IMAGE_TAG}"
echo "  Latest:      ${IMAGE_LATEST}"
echo "  Version:     ${VERSION}"
echo "  Node:        ${NODE_VERSION}"
echo "  VCS Ref:     ${VCS_REF}"
echo "  Build Date:  ${BUILD_DATE}"
echo ""

# Build image
info "Starting Docker build..."
if docker build "${BUILD_ARGS[@]}" .; then
    info "Build successful! ✓"
    echo ""
    info "Image tags:"
    echo "  - ${IMAGE_TAG}"
    echo "  - ${IMAGE_LATEST}"
else
    error "Build failed!"
fi

# Push if requested
if [ "$PUSH" = true ]; then
    if [ -z "$REGISTRY" ]; then
        error "Cannot push: no registry specified (use -r or set DOCKER_REGISTRY)"
    fi

    info "Pushing images to registry..."
    docker push "${IMAGE_TAG}" || error "Failed to push ${IMAGE_TAG}"
    docker push "${IMAGE_LATEST}" || error "Failed to push ${IMAGE_LATEST}"
    info "Push successful! ✓"
fi

# Show image size
IMAGE_SIZE=$(docker images "${IMAGE_TAG}" --format "{{.Size}}")
echo ""
info "Final image size: ${IMAGE_SIZE}"

# Show build summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Build Summary"
echo "═══════════════════════════════════════════════════════════════"
echo "  Service:     ${SERVICE_NAME}"
echo "  Image:       ${IMAGE_TAG}"
echo "  Size:        ${IMAGE_SIZE}"
echo "  Node:        ${NODE_VERSION}"
echo "  Version:     ${VERSION}"
if [ "$PUSH" = true ]; then
echo "  Pushed:      Yes"
else
echo "  Pushed:      No"
fi
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Show run command
info "To run the container:"
echo "  docker run -p 3000:3000 ${IMAGE_TAG}"
echo ""
