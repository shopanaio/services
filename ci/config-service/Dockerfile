# Build context must be the monorepo root: /Users/phl/Projects/shopana-io/services/
# Run: docker build --platform linux/amd64 -t config-service:local -f ci/config-service/Dockerfile .
#
# 1) Build stage (monorepo-aware)
FROM node:22 AS builder

WORKDIR /app

# Copy root manifests for workspaces
COPY package.json yarn.lock ./

# Pre-copy only package manifests to enable efficient install caching
COPY packages/woodpecker-ci-config-service/package.json packages/woodpecker-ci-config-service/package.json
COPY ci/config-service/package.json ci/config-service/package.json

# Install all dependencies via Yarn workspaces
RUN yarn install --frozen-lockfile

# Copy package sources
COPY packages/woodpecker-ci-config-service packages/woodpecker-ci-config-service
COPY ci/config-service ci/config-service

# Build the service (bundles deps)
RUN yarn workspace @shopana/woodpecker-ci-config-service build \
  && yarn workspace @shopana/config-service build

# 2) Production stage
FROM node:22

WORKDIR /app

# Copy root manifests for production dependencies install
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/packages/woodpecker-ci-config-service/package.json ./packages/woodpecker-ci-config-service/
COPY --from=builder /app/ci/config-service/package.json ./ci/config-service/

# Install only production dependencies
RUN yarn install --frozen-lockfile --production

# Copy compiled output from the builder stage
COPY --from=builder /app/ci/config-service/dist ./ci/config-service/dist
COPY --from=builder /app/packages/woodpecker-ci-config-service/dist ./packages/woodpecker-ci-config-service/dist

# Copy workflows to the expected location
COPY --from=builder /app/ci/config-service/dist/workflows ./ci/config-service/workflows

# Set production environment
ENV NODE_ENV=production

WORKDIR /app/ci/config-service

# Expose application port
EXPOSE 3000

# Launch the application
CMD ["node", "dist/index.js"]
