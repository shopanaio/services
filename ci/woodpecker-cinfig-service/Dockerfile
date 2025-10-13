# 1) Build stage (monorepo-aware)
FROM node:22 AS builder

WORKDIR /app

# Copy root manifests for workspaces
COPY package.json yarn.lock ./

# Pre-copy only package manifests to enable efficient install caching
COPY packages/ci-woodpecker-config-service/package.json packages/ci-woodpecker-config-service/package.json
COPY ci/woodpecker-cinfig-service/package.json ci/woodpecker-cinfig-service/package.json

# Install all dependencies via Yarn workspaces
RUN yarn install --frozen-lockfile

# Copy package sources
COPY packages/ci-woodpecker-config-service packages/ci-woodpecker-config-service
COPY ci/woodpecker-cinfig-service ci/woodpecker-cinfig-service

# Build the service (bundles deps)
RUN yarn workspace @shopana/ci-woodpecker-config-service build \
  && yarn workspace drone-convert-extension build

# 2) Production stage
FROM node:22

WORKDIR /app

# Copy compiled output from the builder stage
COPY --from=builder /app/ci/woodpecker-cinfig-service/dist ./dist

# Set production environment
ENV NODE_ENV=production

# Expose application port
EXPOSE 3000

# Launch the application
CMD ["node", "dist/index.js"]
