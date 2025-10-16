# Build context: services/
# docker build -t woodpecker-workflows -f ci/woodpecker-workflows/Dockerfile .

FROM node:22 AS build
WORKDIR /app

# Copy full repo to satisfy yarn workspaces (simpler and reliable)
COPY . .

# Build workflows
WORKDIR /app/ci/woodpecker-workflows
RUN yarn install --frozen-lockfile
RUN yarn build

FROM alpine:3.20 AS runtime
WORKDIR /workflows
COPY --from=build /app/ci/woodpecker-workflows/dist/workflows /workflows
CMD ["sh", "-c", "ls -la /workflows && sleep infinity"]
