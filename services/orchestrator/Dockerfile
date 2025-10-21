FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root package files for workspace
COPY package.json yarn.lock* .yarnrc.yml ./
COPY .yarn ./.yarn

# Copy orchestrator package files
COPY services/orchestrator/package.json ./services/orchestrator/

# Install dependencies
RUN yarn install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/yarn.lock ./yarn.lock
COPY --from=deps /app/.yarnrc.yml ./.yarnrc.yml

# Copy config.yml from root
COPY config.yml ./config.yml

# Copy orchestrator source
COPY services/orchestrator ./services/orchestrator

# Copy other services dist folders (must be pre-built)
COPY services/apps/dist ./services/apps/dist
COPY services/apps/package.json ./services/apps/package.json
COPY services/delivery/dist ./services/delivery/dist
COPY services/delivery/package.json ./services/delivery/package.json
COPY services/inventory/dist ./services/inventory/dist
COPY services/inventory/package.json ./services/inventory/package.json
COPY services/payments/dist ./services/payments/dist
COPY services/payments/package.json ./services/payments/package.json
COPY services/pricing/dist ./services/pricing/dist
COPY services/pricing/package.json ./services/pricing/package.json

# Build orchestrator
WORKDIR /app/services/orchestrator
RUN yarn build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 orchestrator

# Copy workspace structure
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/config.yml ./config.yml

# Copy orchestrator
COPY --from=builder /app/services/orchestrator/dist ./services/orchestrator/dist
COPY --from=builder /app/services/orchestrator/package.json ./services/orchestrator/package.json
COPY --from=builder /app/services/orchestrator/loader.js ./services/orchestrator/loader.js

# Copy other services
COPY --from=builder /app/services/apps/dist ./services/apps/dist
COPY --from=builder /app/services/apps/package.json ./services/apps/package.json
COPY --from=builder /app/services/delivery/dist ./services/delivery/dist
COPY --from=builder /app/services/delivery/package.json ./services/delivery/package.json
COPY --from=builder /app/services/inventory/dist ./services/inventory/dist
COPY --from=builder /app/services/inventory/package.json ./services/inventory/package.json
COPY --from=builder /app/services/payments/dist ./services/payments/dist
COPY --from=builder /app/services/payments/package.json ./services/payments/package.json
COPY --from=builder /app/services/pricing/dist ./services/pricing/dist
COPY --from=builder /app/services/pricing/package.json ./services/pricing/package.json

USER orchestrator

EXPOSE 3030

CMD ["node", "services/orchestrator/dist/src/index.js"]
