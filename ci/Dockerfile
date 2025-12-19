# Build context must be the monorepo root: /Users/phl/Projects/shopana-io/services/
# Run: docker build --platform linux/amd64 -t woodpecker-workflows:local -f workflows/Dockerfile .
#
# Builder stage
FROM node:22 AS builder

WORKDIR /app

# Enable corepack for Yarn 4
RUN corepack enable

# Copy Yarn configuration and releases
COPY .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases

# Copy root manifests for workspaces
COPY package.json yarn.lock ./

# Pre-copy only package manifests to enable efficient install caching
COPY packages/woodpecker-ci-config-service/package.json packages/woodpecker-ci-config-service/package.json
COPY workflows/package.json workflows/package.json

# Install all dependencies via Yarn workspaces
RUN yarn install

# Copy package sources
COPY packages/woodpecker-ci-config-service packages/woodpecker-ci-config-service
COPY workflows workflows

# Build the service (bundles deps)
RUN yarn workspace @shopana/woodpecker-ci-config-service build \
  && yarn workspace @shopana/woodpecker-workflows build

# Runner stage
FROM node:22 AS runner

WORKDIR /app

# Enable corepack for Yarn 4
RUN corepack enable

# Copy Yarn configuration and releases
COPY .yarnrc.yml ./
COPY .yarn/releases ./.yarn/releases

# Copy root manifests for production dependencies install
COPY --from=builder /app/package.json /app/yarn.lock ./
COPY --from=builder /app/.yarnrc.yml ./
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/packages/woodpecker-ci-config-service/package.json ./packages/woodpecker-ci-config-service/
COPY --from=builder /app/workflows/package.json ./workflows/

# Copy workflows and hooks to the expected location
COPY --from=builder /app/workflows/dist/workflows ./workflows/workflows
COPY --from=builder /app/workflows/dist/hooks ./workflows/hooks

# Install only production dependencies
RUN yarn workspaces focus --all --production && \
    yarn cache clean --all

# Copy compiled output from the builder stage
COPY --from=builder /app/workflows/dist ./workflows/dist
COPY --from=builder /app/packages/woodpecker-ci-config-service/dist ./packages/woodpecker-ci-config-service/dist

# Copy public key for signature verification
COPY --from=builder /app/workflows/public-key.pem ./workflows/public-key.pem

# Set production environment
ENV NODE_ENV=production

WORKDIR /app/workflows

# Expose application port
EXPOSE 3000

# Launch the application
CMD ["node", "dist/index.js"]
