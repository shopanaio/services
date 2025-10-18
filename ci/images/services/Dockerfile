# Optimized Dockerfile for individual services
# Uses pre-built base image with all shared packages
#
# Usage:
#   docker buildx build --build-arg SERVICE_NAME=checkout \
#     --cache-from type=registry,ref=ghcr.io/OWNER/checkout-service:cache \
#     -t ghcr.io/OWNER/checkout-service:latest \
#     -f ci/images/services/Dockerfile .

ARG BASE_IMAGE=ghcr.io/shopanaio/services-base:latest
ARG NODE_VERSION=20

# ============================================================================
# Stage 1: Build specific service only
# ============================================================================
FROM ${BASE_IMAGE} AS service-builder

ARG SERVICE_NAME
RUN test -n "$SERVICE_NAME" || (echo "ERROR: SERVICE_NAME build argument is required" && exit 1)

USER root

# Base image already has:
# - All packages built
# - All node_modules installed
# - Yarn configured
# We just need to copy service source and build it

# Copy service source
COPY --chown=nodejs:nodejs services/${SERVICE_NAME} ./services/${SERVICE_NAME}/

USER nodejs

# Build ONLY this service (packages already built in base image)
# All dependencies are already available from base image
RUN yarn workspace @shopana/${SERVICE_NAME}-service run build

# Verify the service was built
RUN test -d "services/${SERVICE_NAME}/dist" || \
    (echo "ERROR: Service ${SERVICE_NAME} build failed - dist directory not found" && exit 1)

# ============================================================================
# Stage 2: Final runtime image - Minimal production image
# ============================================================================
FROM ${BASE_IMAGE} AS runtime

ARG SERVICE_NAME
ARG VERSION=dev
ARG BUILD_DATE
ARG VCS_REF

RUN test -n "$SERVICE_NAME" || (echo "ERROR: SERVICE_NAME build argument is required" && exit 1)

USER root

# Base image already contains:
# - All packages with production dependencies
# - All necessary node_modules
# We reuse them directly without reinstalling

# Copy service package.json
COPY --from=service-builder /app/services/${SERVICE_NAME}/package.json ./services/${SERVICE_NAME}/

# Copy built service
COPY --from=service-builder /app/services/${SERVICE_NAME}/dist ./services/${SERVICE_NAME}/dist

# Copy source files needed at runtime (e.g., GraphQL schemas)
COPY --from=service-builder /app/services/${SERVICE_NAME}/src ./services/${SERVICE_NAME}/src

# Update environment for specific service
ENV SERVICE_NAME=${SERVICE_NAME}

# Update labels
LABEL org.opencontainers.image.title="${SERVICE_NAME}-service" \
      org.opencontainers.image.description="Shopana ${SERVICE_NAME} microservice" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      service.name="${SERVICE_NAME}"

RUN chown -R nodejs:nodejs /app

USER nodejs

# Set working directory to service directory so process.cwd() returns correct path
WORKDIR /app/services/${SERVICE_NAME}

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

ENTRYPOINT ["/sbin/tini", "--"]

CMD node --enable-source-maps dist/src/index.js
