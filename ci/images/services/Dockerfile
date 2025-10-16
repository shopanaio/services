# Multi-stage Dockerfile for building services in the monorepo
#
# Usage:
#   docker build --build-arg SERVICE_NAME=checkout -t checkout-service -f ci/images/services/Dockerfile .
#   docker build --build-arg SERVICE_NAME=orders --build-arg VERSION=1.0.0 -t orders-service .
#
# Build from workspace root directory

ARG NODE_VERSION=20

# ============================================================================
# Stage 1: Dependencies - Cached layer for node_modules
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS dependencies

ARG SERVICE_NAME
RUN test -n "$SERVICE_NAME" || (echo "ERROR: SERVICE_NAME build argument is required" && exit 1)

# Enable corepack for Yarn
RUN corepack enable

WORKDIR /app

# Copy Yarn configuration and releases
COPY .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases

# Copy only package.json files first for better cache utilization
COPY package.json yarn.lock ./
COPY packages/*/package.json ./packages/
COPY services/*/package.json ./services/

# Install all dependencies (including devDependencies for build)
# Note: Not using --immutable because we're migrating from Yarn 1.x lockfile
RUN yarn install --network-timeout 100000

# ============================================================================
# Stage 2: Builder - Build all packages and target service
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS builder

ARG SERVICE_NAME

# Enable corepack for Yarn
RUN corepack enable

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./package.json
COPY --from=dependencies /app/yarn.lock ./yarn.lock
COPY --from=dependencies /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=dependencies /app/.yarn ./.yarn

# Copy all source code
COPY packages ./packages
COPY services ./services

# Refresh workspace dependencies (lockfile was updated by Yarn 3)
RUN yarn install

# Build all packages first (dependencies of services)
RUN yarn workspaces foreach \
    --all \
    --include "packages/*" \
    --topological-dev \
    --verbose \
    run build

# Build target service
RUN yarn workspace @shopana/${SERVICE_NAME}-service run build

# Verify the target service was built
RUN test -d "services/${SERVICE_NAME}/dist" || \
    (echo "ERROR: Service ${SERVICE_NAME} build failed - dist directory not found" && exit 1)

# ============================================================================
# Stage 3: Production dependencies - Only production node_modules
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS prod-dependencies

ARG SERVICE_NAME

# Enable corepack for Yarn
RUN corepack enable

WORKDIR /app

# Copy Yarn configuration and releases
COPY .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases

# Copy package files
COPY package.json yarn.lock ./
COPY packages/*/package.json ./packages/
COPY services/*/package.json ./services/

# Install only production dependencies
RUN NODE_ENV=production yarn workspaces focus --all && \
    yarn cache clean --all

# ============================================================================
# Stage 4: Runtime - Final minimal production image
# ============================================================================
FROM node:${NODE_VERSION}-alpine AS runtime

ARG SERVICE_NAME
ARG VERSION=dev
ARG BUILD_DATE
ARG VCS_REF

# Validate required build argument
RUN test -n "$SERVICE_NAME" || (echo "ERROR: SERVICE_NAME build argument is required" && exit 1)

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    tini \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy workspace configuration
COPY package.json yarn.lock ./

# Copy production dependencies
COPY --from=prod-dependencies /app/node_modules ./node_modules

# Copy all package.json files
COPY --from=builder /app/packages/*/package.json ./packages/
COPY --from=builder /app/services/${SERVICE_NAME}/package.json ./services/${SERVICE_NAME}/

# Copy only built artifacts (dist folders) for all packages
COPY --from=builder /app/packages/*/dist ./packages/

# Copy built service
COPY --from=builder /app/services/${SERVICE_NAME}/dist ./services/${SERVICE_NAME}/dist

# Set environment variables
ENV NODE_ENV=production \
    SERVICE_NAME=${SERVICE_NAME} \
    NODE_OPTIONS="--enable-source-maps --max-old-space-size=2048" \
    TZ=UTC

# Add OCI labels for metadata
LABEL org.opencontainers.image.title="${SERVICE_NAME}-service" \
      org.opencontainers.image.description="Shopana ${SERVICE_NAME} microservice" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.vendor="Shopana" \
      org.opencontainers.image.base.name="node:${NODE_VERSION}-alpine" \
      service.name="${SERVICE_NAME}"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose default port (can be overridden via environment)
EXPOSE 3000

# Health check - adjust URL based on your service's health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Use tini as PID 1 for proper signal handling and zombie reaping
ENTRYPOINT ["/sbin/tini", "--"]

# Run the service
CMD ["node", "--enable-source-maps", "services/${SERVICE_NAME}/dist/src/index.js"]
