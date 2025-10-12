# Multi-stage Dockerfile for building any service in the monorepo
# Usage: docker build --build-arg SERVICE_NAME=checkout -t checkout-service -f services/Dockerfile .
# Build from workspace root directory

ARG NODE_VERSION=20

# Stage 1: Dependencies and Build
FROM node:${NODE_VERSION}-alpine AS builder

ARG SERVICE_NAME
RUN test -n "$SERVICE_NAME" || (echo "SERVICE_NAME build argument is required" && exit 1)

WORKDIR /app

# Copy workspace files
COPY package.json yarn.lock ./
COPY packages ./packages
COPY services ./services

# Install dependencies
RUN yarn install --frozen-lockfile

# Build all shared packages first (in dependency order)
RUN cd packages/shared-kernel && yarn build 2>/dev/null || true
RUN cd packages/shared-money && yarn build 2>/dev/null || true
RUN cd packages/shared-async-context && yarn build 2>/dev/null || true
RUN cd packages/shared-graphql-guid && yarn build 2>/dev/null || true
RUN cd packages/shared-service-config && yarn build 2>/dev/null || true
RUN cd packages/shared-service-api && yarn build 2>/dev/null || true
RUN cd packages/platform-api && yarn build 2>/dev/null || true
RUN cd packages/plugin-sdk && yarn build 2>/dev/null || true
RUN cd packages/checkout-sdk && yarn build 2>/dev/null || true
RUN cd packages/inventory-plugin-shopana && yarn build 2>/dev/null || true
RUN cd packages/payment-plugin-bank-transfer && yarn build 2>/dev/null || true
RUN cd packages/pricing-plugin-simple-promo && yarn build 2>/dev/null || true
RUN cd packages/shipping-plugin-meest-express && yarn build 2>/dev/null || true
RUN cd packages/shipping-plugin-novaposhta && yarn build 2>/dev/null || true

# Build the target service
RUN cd services/${SERVICE_NAME} && yarn build

# Stage 2: Production
FROM node:${NODE_VERSION}-alpine AS production

ARG SERVICE_NAME
RUN test -n "$SERVICE_NAME" || (echo "SERVICE_NAME build argument is required" && exit 1)

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy workspace configuration
COPY package.json yarn.lock ./

# Copy package.json files for all packages
COPY --from=builder /app/packages/shared-kernel/package.json ./packages/shared-kernel/
COPY --from=builder /app/packages/shared-money/package.json ./packages/shared-money/
COPY --from=builder /app/packages/shared-async-context/package.json ./packages/shared-async-context/
COPY --from=builder /app/packages/shared-graphql-guid/package.json ./packages/shared-graphql-guid/
COPY --from=builder /app/packages/shared-service-config/package.json ./packages/shared-service-config/
COPY --from=builder /app/packages/shared-service-api/package.json ./packages/shared-service-api/
COPY --from=builder /app/packages/platform-api/package.json ./packages/platform-api/
COPY --from=builder /app/packages/plugin-sdk/package.json ./packages/plugin-sdk/
COPY --from=builder /app/packages/checkout-sdk/package.json ./packages/checkout-sdk/
COPY --from=builder /app/packages/inventory-plugin-shopana/package.json ./packages/inventory-plugin-shopana/
COPY --from=builder /app/packages/payment-plugin-bank-transfer/package.json ./packages/payment-plugin-bank-transfer/
COPY --from=builder /app/packages/pricing-plugin-simple-promo/package.json ./packages/pricing-plugin-simple-promo/
COPY --from=builder /app/packages/shipping-plugin-meest-express/package.json ./packages/shipping-plugin-meest-express/
COPY --from=builder /app/packages/shipping-plugin-novaposhta/package.json ./packages/shipping-plugin-novaposhta/

# Copy built packages
COPY --from=builder /app/packages/shared-kernel/dist ./packages/shared-kernel/dist
COPY --from=builder /app/packages/shared-money/dist ./packages/shared-money/dist
COPY --from=builder /app/packages/shared-async-context/dist ./packages/shared-async-context/dist
COPY --from=builder /app/packages/shared-graphql-guid/dist ./packages/shared-graphql-guid/dist
COPY --from=builder /app/packages/shared-service-config/dist ./packages/shared-service-config/dist
COPY --from=builder /app/packages/shared-service-api/dist ./packages/shared-service-api/dist
COPY --from=builder /app/packages/platform-api/dist ./packages/platform-api/dist
COPY --from=builder /app/packages/plugin-sdk/dist ./packages/plugin-sdk/dist
COPY --from=builder /app/packages/checkout-sdk/dist ./packages/checkout-sdk/dist
COPY --from=builder /app/packages/inventory-plugin-shopana/dist ./packages/inventory-plugin-shopana/dist
COPY --from=builder /app/packages/payment-plugin-bank-transfer/dist ./packages/payment-plugin-bank-transfer/dist
COPY --from=builder /app/packages/pricing-plugin-simple-promo/dist ./packages/pricing-plugin-simple-promo/dist
COPY --from=builder /app/packages/shipping-plugin-meest-express/dist ./packages/shipping-plugin-meest-express/dist
COPY --from=builder /app/packages/shipping-plugin-novaposhta/dist ./packages/shipping-plugin-novaposhta/dist

# Copy built service
COPY --from=builder /app/services/${SERVICE_NAME}/dist ./services/${SERVICE_NAME}/dist
COPY --from=builder /app/services/${SERVICE_NAME}/package.json ./services/${SERVICE_NAME}/

# Install production dependencies only
RUN yarn install --frozen-lockfile --production=true && \
    yarn cache clean

# Set environment
ENV NODE_ENV=production \
    SERVICE_NAME=${SERVICE_NAME}

# Use non-root user for security
USER node

# Expose default port (can be overridden)
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run the service
CMD ["sh", "-c", "node services/${SERVICE_NAME}/dist/src/index.js"]
