# 1) Build stage
FROM node:22 AS builder

WORKDIR /app

# Copy dependency manifests including yarn.lock
COPY package.json yarn.lock ./

# Install all dependencies via Yarn
RUN yarn install --frozen-lockfile

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript to JavaScript (output → dist/)
RUN yarn build

# 2) Production stage
FROM node:22

WORKDIR /app

# Copy only production dependency manifests including yarn.lock
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --production --frozen-lockfile

# Copy compiled output from the builder stage
COPY --from=builder /app/dist ./dist

# Set production environment
ENV NODE_ENV=production

# Expose application port
EXPOSE 3000

# Launch the application
CMD ["node", "dist/index.js"]
