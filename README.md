# Shopana Services

A modular e-commerce platform built with NestJS microservices architecture and GraphQL Federation.

## Overview

Shopana is a headless commerce backend providing a unified GraphQL API through federated subgraphs. Each service owns its domain and exposes a GraphQL subgraph that gets composed into a supergraph.

### Services

| Service      | Description                                        |
| ------------ | -------------------------------------------------- |
| `apps`       | Application management and configuration           |
| `bootstrap`  | Service orchestrator and entrypoint                |
| `catalog`    | Products, variants, collections, stock, and warehouses |
| `checkout`   | Shopping cart, checkout flow, and line items       |
| `delivery`   | Shipping providers integration (Nova Poshta, Meest)|
| `events`     | Event persistence and dispatch                     |
| `iam`        | Identity and access management                     |
| `media`      | File storage and media assets management           |
| `orders`     | Order processing and fulfillment                   |
| `payments`   | Payment providers integration                      |
| `pricing`    | Price calculations and promotions                  |
| `project`    | Project settings, locales, and currencies          |
| `reviews`    | Product reviews                                    |
| `search`     | Search functionality                               |

### Packages

Shared libraries used across services:

- `@shopana/cli` — Development CLI tooling
- `@shopana/build-tools` — ESBuild configuration
- `@shopana/plugin-sdk` — Plugin development SDK
- `@shopana/drizzle-query` — Drizzle ORM query helpers with Relay pagination
- `@shopana/shared-kernel` — Domain primitives and utilities
- `@shopana/platform-api` — Platform API client

## Get Started

### Prerequisites

- Node.js 20+
- Yarn 4.x (via Corepack)
- PostgreSQL 15+
- RabbitMQ 3.x
- Docker (optional, for infrastructure)

### Installation

```bash
# Enable Corepack for Yarn
corepack enable

# Install dependencies
yarn install

# Build packages
yarn build --packages
```

### Running locally

```bash
# Start infrastructure (PostgreSQL, RabbitMQ, etc.)
docker-compose up -d

# Run database migrations
yarn migrate

# Start development server
yarn dev
```

Services will be available at:
- Apps API: http://localhost:10001/graphql
- Checkout API: http://localhost:10002/graphql
- Orders API: http://localhost:10003/graphql
- Metrics: http://localhost:3030/metrics

## Shopana CLI

The project includes a development CLI (`shopana`) to streamline common tasks.

### Usage

```bash
yarn shopana <command> [options]
```

### Commands

#### `dev`

Start the development environment with hot-reload.

```bash
yarn shopana dev                  # Start all services (orchestrator)
yarn shopana dev -s catalog       # Start specific service only
```

**Options:**
- `-s, --service <service>` — Run a specific service only

---

#### `build`

Build packages and services for production.

```bash
yarn shopana build                # Build packages + all services
yarn shopana build --packages     # Build packages only
yarn shopana build -s checkout    # Build specific service(s)
yarn shopana build --parallel     # Build services in parallel
```

**Options:**
- `-s, --service <services...>` — Build specific service(s)
- `-p, --packages` — Build only packages
- `--parallel` — Build services in parallel

---

#### `migrate`

Run Drizzle database migrations.

```bash
yarn shopana migrate              # Migrate all services
yarn shopana migrate -s catalog   # Migrate specific service
```

**Options:**
- `-s, --service <service>` — Migrate specific service only

---

#### `codegen`

Generate TypeScript types from GraphQL schemas (using GraphQL Code Generator).

```bash
yarn shopana codegen              # Generate for all services
yarn shopana codegen -s checkout  # Generate for specific service
```

**Options:**
- `-s, --service <service>` — Generate for specific service only

---

#### `schema`

Manage GraphQL federation schemas.

```bash
yarn shopana schema export        # Export subgraph schemas from services
yarn shopana schema compose       # Compose supergraph from subgraphs (Hive CLI)
yarn shopana schema build         # Export + compose (full schema build)
```

**Subcommands:**
- `export` — Export subgraph schemas from each service
- `compose` — Compose supergraph schema using Hive CLI
- `build` — Run export + compose in sequence

**Options (compose/build):**
- `-o, --output <file>` — Output file (default: `apollo/supergraph.graphql`)

## Project Structure

```
services/
├── packages/           # Shared libraries
│   ├── cli/            # Shopana CLI
│   ├── plugin-sdk/     # Plugin development SDK
│   ├── drizzle-query/  # Query builder with Relay
│   └── shared-*/       # Shared utilities
├── services/           # Microservices
│   ├── apps/
│   ├── bootstrap/
│   ├── catalog/
│   ├── checkout/
│   ├── orders/
│   └── ...
├── federation/         # GraphQL federation config
├── workflows/          # Temporal workflows
└── migrations/         # Go-based migrations (legacy)
```

## License

See [LICENSE](./LICENSE) file.
