# Orchestrator Dockerfile
# Orchestrator runs all services in a single process
# Requires pre-built service dist folders

ARG NODE_VERSION=20
ARG BASE_IMAGE

# ============================================================================
# Stage 1: Use base image with all dependencies
# ============================================================================
FROM ${BASE_IMAGE} AS deps

# Base image already contains:
# - All packages built
# - All node_modules installed
# - Yarn configured
# We just use it as-is

# ============================================================================
# Stage 2: Build all required services
# ============================================================================
FROM ${BASE_IMAGE} AS services-builder

USER root

WORKDIR /app

# Base image already has node_modules, packages, and workspace setup
# Just copy config and service sources

# Copy config.yml from root
COPY --chown=nodejs:nodejs config.yml ./config.yml

# Copy all service sources that orchestrator depends on
COPY --chown=nodejs:nodejs services/apps ./services/apps
COPY --chown=nodejs:nodejs services/payments ./services/payments
COPY --chown=nodejs:nodejs services/inventory ./services/inventory
COPY --chown=nodejs:nodejs services/pricing ./services/pricing
COPY --chown=nodejs:nodejs services/delivery ./services/delivery

USER nodejs

# Build all services required by orchestrator
RUN yarn workspace @shopana/apps-service build && \
    yarn workspace @shopana/payments-service build && \
    yarn workspace @shopana/inventory-service build && \
    yarn workspace @shopana/pricing-service build && \
    yarn workspace @shopana/delivery-service build

# Verify all services were built
RUN test -d "services/apps/dist" || (echo "ERROR: apps service build failed" && exit 1) && \
    test -d "services/payments/dist" || (echo "ERROR: payments service build failed" && exit 1) && \
    test -d "services/inventory/dist" || (echo "ERROR: inventory service build failed" && exit 1) && \
    test -d "services/pricing/dist" || (echo "ERROR: pricing service build failed" && exit 1) && \
    test -d "services/delivery/dist" || (echo "ERROR: delivery service build failed" && exit 1)

# ============================================================================
# Stage 3: Build orchestrator
# ============================================================================
FROM ${BASE_IMAGE} AS orchestrator-builder

USER root

WORKDIR /app

# Copy config.yml from root
COPY --from=services-builder /app/config.yml ./config.yml

# Copy orchestrator source
COPY --chown=nodejs:nodejs services/orchestrator ./services/orchestrator

# Copy built services from services-builder stage
COPY --chown=nodejs:nodejs --from=services-builder /app/services/apps/dist ./services/apps/dist
COPY --chown=nodejs:nodejs --from=services-builder /app/services/apps/package.json ./services/apps/package.json
COPY --chown=nodejs:nodejs --from=services-builder /app/services/payments/dist ./services/payments/dist
COPY --chown=nodejs:nodejs --from=services-builder /app/services/payments/package.json ./services/payments/package.json
COPY --chown=nodejs:nodejs --from=services-builder /app/services/inventory/dist ./services/inventory/dist
COPY --chown=nodejs:nodejs --from=services-builder /app/services/inventory/package.json ./services/inventory/package.json
COPY --chown=nodejs:nodejs --from=services-builder /app/services/pricing/dist ./services/pricing/dist
COPY --chown=nodejs:nodejs --from=services-builder /app/services/pricing/package.json ./services/pricing/package.json
COPY --chown=nodejs:nodejs --from=services-builder /app/services/delivery/dist ./services/delivery/dist
COPY --chown=nodejs:nodejs --from=services-builder /app/services/delivery/package.json ./services/delivery/package.json

USER nodejs

# Build orchestrator
WORKDIR /app/services/orchestrator
RUN yarn build

# Verify build succeeded
RUN test -d "dist" || \
    (echo "ERROR: Orchestrator build failed - dist directory not found" && exit 1)

# ============================================================================
# Stage 4: Production dependencies (use base image)
# ============================================================================
FROM ${BASE_IMAGE} AS prod-deps

# Base image already has production node_modules
# We reuse them directly

# ============================================================================
# Stage 5: Final runtime image
# ============================================================================
FROM ${BASE_IMAGE} AS runtime
ARG VERSION=dev
ARG BUILD_DATE
ARG VCS_REF

WORKDIR /app

ENV NODE_ENV=production

USER root

# Base image already has workspace structure and node_modules
# Just copy config and built artifacts
COPY --chown=nodejs:nodejs --from=orchestrator-builder /app/config.yml ./config.yml

# Copy built orchestrator
COPY --chown=nodejs:nodejs --from=orchestrator-builder /app/services/orchestrator/dist ./services/orchestrator/dist

# Copy all built services from orchestrator-builder
COPY --chown=nodejs:nodejs --from=orchestrator-builder /app/services/apps/dist ./services/apps/dist
COPY --chown=nodejs:nodejs --from=orchestrator-builder /app/services/payments/dist ./services/payments/dist
COPY --chown=nodejs:nodejs --from=orchestrator-builder /app/services/inventory/dist ./services/inventory/dist
COPY --chown=nodejs:nodejs --from=orchestrator-builder /app/services/pricing/dist ./services/pricing/dist
COPY --chown=nodejs:nodejs --from=orchestrator-builder /app/services/delivery/dist ./services/delivery/dist

# Add OCI labels
LABEL org.opencontainers.image.title="orchestrator" \
      org.opencontainers.image.description="Shopana services orchestrator - runs all microservices in single process" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      service.name="orchestrator" \
      service.type="orchestrator"

USER nodejs

EXPOSE 3030

# Health check for orchestrator (uses metrics port)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3030/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

ENTRYPOINT ["/sbin/tini", "--"]

# Enable source maps for better debugging
CMD ["node", "--enable-source-maps", "services/orchestrator/dist/src/index.js"]
