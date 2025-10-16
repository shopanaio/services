## Split server and workflows and deploy via Docker Compose

This guide shows how to split the build and deployment of the server (`woodpecker-config-service`) and the set of workflows into two separate Docker images and run them together using Docker Compose with a shared volume.

### Goals

- Separate image for the server: minimal runtime that starts `node dist/index.js`.
- Separate artifact image for `workflows`: contains only the compiled workflow files.
- Deliver `workflows` into the server container via a shared volume (no Kubernetes required).

### Outcome (what you get after following this plan)

- Two images:
  - server: minimal Node.js runtime that runs `dist/index.js`.
  - workflows: contains only compiled workflow artifacts, no runtime.
- Docker Compose stack:
  - `workflows-loader` copies artifacts into a named volume once.
  - `config-service` mounts that volume at `/app/ci/woodpecker-config-service/workflows` and serves them.
- Update process:
  - Changing workflows only ⇒ rebuild/pull the workflows image and re-run the loader; no server rebuild.
  - Changing server code ⇒ rebuild the server image; the workflows volume can remain unchanged.
- Benefits:
  - Faster iteration for workflow changes, smaller runtime surface, clear separation of concerns, no Kubernetes required.
- Local development:
  - Bind-mount `ci/woodpecker-config-service/dist/workflows` into the server container for hot reload.
- Verification:
  - Use the provided compose commands to list files in the volume and view server logs.

### Prerequisites

- Docker and Docker Compose are installed.
- Builds are run from the monorepo root: `services/`.
- Images can be pushed to your registry (optional); examples use local tags.

---

## 1) Update build (esbuild) to support targets

Add target builds: `server` and `workflows`. Below is an example `ci/woodpecker-config-service/esbuild.js` with target support. If the file already exists, replace its contents with this:

```javascript
import { build } from "esbuild";
import { readdirSync } from "fs";

const target = process.env.BUILD_TARGET || process.argv[2] || "all";

const externalDeps = [
  "express",
  "pino",
  "pino-http",
  "js-yaml",
  "@noble/ed25519",
  "dotenv",
  "dotenv/config",
  "http-message-signatures",
];

const builds = [];

if (target === "server" || target === "all") {
  builds.push(
    build({
      entryPoints: ["src/index.ts"],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile: "dist/index.js",
      external: externalDeps,
    }).then(() => console.log("Server build succeeded"))
  );
}

if (target === "workflows" || target === "all") {
  const workflowFiles = readdirSync("workflows")
    .filter((file) => file.endsWith(".ts"))
    .map((file) => `workflows/${file}`);

  builds.push(
    build({
      entryPoints: workflowFiles,
      bundle: true,
      platform: "node",
      format: "esm",
      outdir: "dist/workflows",
      outbase: "workflows",
      external: externalDeps,
    }).then(() => console.log("Workflows build succeeded"))
  );
}

try {
  await Promise.all(builds);
  console.log("Build completed successfully");
} catch (error) {
  console.error("Build failed");
  console.error(error);
  process.exitCode = 1;
}
```

Update scripts in `ci/woodpecker-config-service/package.json`:

```json
{
  "scripts": {
    "build": "node esbuild.js all",
    "build:server": "node esbuild.js server",
    "build:workflows": "node esbuild.js workflows",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts"
  }
}
```

---

## 2) Multi-target Dockerfile (two images: server and workflows)

Replace `ci/woodpecker-config-service/Dockerfile` with a multi-stage file that exposes two targets. Build from the `services/` root.

```dockerfile
# Build context: services/
# Build examples:
#   docker build --platform linux/amd64 -t config-service:server -f ci/woodpecker-config-service/Dockerfile --target server .
#   docker build --platform linux/amd64 -t config-service:workflows -f ci/woodpecker-config-service/Dockerfile --target workflows .

# ---- deps (shared cache) ----
FROM node:22 AS deps
WORKDIR /app

# Root manifests (workspaces)
COPY package.json yarn.lock ./

# Only manifests to warm the cache
COPY packages/woodpecker-ci-config-service/package.json packages/woodpecker-ci-config-service/package.json
COPY ci/woodpecker-config-service/package.json ci/woodpecker-config-service/package.json

RUN yarn install --frozen-lockfile

# Sources
COPY packages/woodpecker-ci-config-service packages/woodpecker-ci-config-service
COPY ci/woodpecker-config-service ci/woodpecker-config-service

# ---- build:server ----
FROM deps AS build-server
WORKDIR /app/ci/woodpecker-config-service
ENV BUILD_TARGET=server
RUN yarn workspace @shopana/woodpecker-ci-config-service build \
  && yarn workspace @shopana/woodpecker-config-service build

# ---- build:workflows ----
FROM deps AS build-workflows
WORKDIR /app/ci/woodpecker-config-service
ENV BUILD_TARGET=workflows
RUN yarn workspace @shopana/woodpecker-ci-config-service build \
  && yarn workspace @shopana/woodpecker-config-service build:workflows

# ---- runtime:server ----
FROM node:22 AS server
WORKDIR /app

# Production manifests
COPY --from=deps /app/package.json /app/yarn.lock ./
COPY --from=deps /app/packages/woodpecker-ci-config-service/package.json ./packages/woodpecker-ci-config-service/
COPY --from=deps /app/ci/woodpecker-config-service/package.json ./ci/woodpecker-config-service/

RUN yarn install --frozen-lockfile --production

# Runtime dist
COPY --from=build-server /app/ci/woodpecker-config-service/dist ./ci/woodpecker-config-service/dist
COPY --from=build-server /app/packages/woodpecker-ci-config-service/dist ./packages/woodpecker-ci-config-service/dist

# Public key
COPY --from=deps /app/ci/woodpecker-config-service/public-key.pem ./ci/woodpecker-config-service/public-key.pem

ENV NODE_ENV=production
WORKDIR /app/ci/woodpecker-config-service
EXPOSE 3000
CMD ["node", "dist/index.js"]

# ---- artifact:workflows ----
FROM alpine:3.20 AS workflows
WORKDIR /workflows
COPY --from=build-workflows /app/ci/woodpecker-config-service/dist/workflows /workflows
CMD ["sh", "-c", "ls -la /workflows && sleep infinity"]
```

---

## 3) Docker Compose

Below is an example `docker-compose.yml` that uses the two images above and a shared named volume to deliver `workflows` to the server.

```yaml
services:
  # One-off loader that copies workflow artifacts into the named volume
  workflows-loader:
    image: config-service:workflows
    command: sh -c "rm -rf /mounted/* && cp -r /workflows/* /mounted/ || true"
    volumes:
      - workflows-data:/mounted
    restart: "no"

  # The server, which sees workflows from the volume
  config-service:
    image: config-service:server
    depends_on:
      - workflows-loader
    environment:
      - CONFIG_SERVICE_PUBLIC_KEY_FILE=./public-key.pem
      - PORT=3000
    volumes:
      - workflows-data:/app/ci/woodpecker-config-service/workflows
    ports:
      - "3000:3000"

volumes:
  workflows-data: {}
```

> Note: `depends_on` does not guarantee copying has finished; it's more reliable to run `workflows-loader` using `docker compose run --rm` before starting `config-service` (see deployment commands below).

---

## 4) Image build commands

Run from the `services/` root.

```bash
# Build the server image
docker build -t config-service:server -f ci/woodpecker-config-service/Dockerfile --target server .

# Build the workflows image
docker build -t config-service:workflows -f ci/woodpecker-config-service/Dockerfile --target workflows .
```

If you publish to a registry, replace tags with `REGISTRY/PROJECT/config-service:server` and `...:workflows`, then run `docker push`.

---

## 5) Deploy via Docker Compose

Recommended sequence:

```bash
# 1) Populate the volume with fresh workflows (one-off)
docker compose -f ci/woodpecker-config-service/docker-compose.yml run --rm workflows-loader

# 2) Start/restart the server
docker compose -f ci/woodpecker-config-service/docker-compose.yml up -d config-service
```

Alternative (single `up`) if race conditions are acceptable: `docker compose up -d` — does not guarantee copying finishes before the server starts.

---

## 6) Updating workflows without rebuilding the server

When only `workflows` change:

```bash
# Rebuild (or pull) the workflows image
docker build -t config-service:workflows -f ci/woodpecker-config-service/Dockerfile --target workflows .
# or: docker pull <registry>/config-service:workflows

# Overwrite the volume contents
docker compose -f ci/woodpecker-config-service/docker-compose.yml run --rm workflows-loader

# Restart the server only if it caches contents
docker compose -f ci/woodpecker-config-service/docker-compose.yml restart config-service
```

---

## 7) Local development

For hot changes, bind-mount the local `dist/workflows` into the server container:

```bash
# Build workflows locally
yarn workspace @shopana/woodpecker-config-service build:workflows

# Start the server with local dist/workflows bind-mounted
docker run -d --name config-service \
  -e CONFIG_SERVICE_PUBLIC_KEY_FILE=./public-key.pem \
  -e PORT=3000 \
  -p 3000:3000 \
  -v $(pwd)/ci/woodpecker-config-service/dist/workflows:/app/ci/woodpecker-config-service/workflows \
  config-service:server
```

---

## 8) Verification and troubleshooting

- Verify files were copied into the volume:
  ```bash
  docker compose -f ci/woodpecker-config-service/docker-compose.yml run --rm workflows-loader sh -lc "ls -la /mounted"
  ```
- Check what the server sees:
  ```bash
  docker compose -f ci/woodpecker-config-service/docker-compose.yml exec config-service sh -lc "ls -la /app/ci/woodpecker-config-service/workflows"
  ```
- Server logs:
  ```bash
  docker compose -f ci/woodpecker-config-service/docker-compose.yml logs -f config-service
  ```

Common issues:

- File permissions in the volume. The Alpine image writes as root:root — the server usually only needs read access.
- Copy timing. Use a separate `run --rm` before starting the server.
- Server caches contents. Use `restart` after updating the volume.

---

## 9) Environment variables

- `CONFIG_SERVICE_PUBLIC_KEY_FILE` — path to the public key in the server container, defaults to `./public-key.pem` (copied into the image at runtime build stage).
- `PORT` — server port, defaults to `3000`.

---

## 10) Cleanup

```bash
docker compose -f ci/woodpecker-config-service/docker-compose.yml down
docker volume rm $(docker volume ls -q | grep workflows-data) || true
```
