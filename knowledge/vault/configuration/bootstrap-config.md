---
tags:
  - architecture
  - configuration
  - devops
related:
  - architecture/overview
  - architecture/service-boundaries
---

# Project Configuration

## Bootstrap

Bootstrap is the orchestrator that runs all services in a single process. Reads full config via `getConfig()` and:

1. Gets service list from `config.services` keys
2. Takes db config from the first service that has one
3. Creates shared database connection pool (DatabaseModule)
4. Initializes DBOS workflows if `config.workflows` is specified
5. Loads all service modules

Each service then reads its own config section via `getServiceConfig(name)` for ports, S3, and custom settings.

## Structure

File `config.yml` at workspace root. Three sections:

- **global** — environment (development/staging/production), log level
- **shared** — YAML anchors for reuse (db, s3)
- **services** — settings for each service

## Service Resources

- **ports** — GraphQL endpoints and metrics
- **db** — PostgreSQL (host, port, user, password, database, schema)
- **s3** — MinIO (endpoint, credentials, bucket)
- **workflows** — DBOS (database_url, app_name)
- custom fields via passthrough

## Loading

Package `@shopana/shared-service-config`:

1. Finds workspace root by `workspaces` in package.json
2. Reads YAML
3. Substitutes `${ENV_VAR}` from process.env
4. Validates with Zod schema
5. Caches result

## Override

`CONFIG_FILE` env var specifies alternative file (e.g., `config.local.yml`).

## Validation

Zod schemas check structure at startup. Invalid config causes startup failure.

## Why Needed

Services need external parameters:
- Which port to listen for GraphQL
- Where to connect to PostgreSQL
- Where to store files (MinIO)
- What log level to use

These differ in dev/staging/prod. Config allows changing them without rebuild.

## Where Used

**At service startup** — NestService reads port and starts GraphQL server on it. Reads S3 credentials and creates storage client.

**At DB init** — database.ts builds connection string from db section and creates connection pool.

**At logger setup** — GraphQL server checks environment and enables pino-pretty in development.

## See Also

- [[architecture/overview]] — Technology stack overview
- [[architecture/service-boundaries]] — Service ownership
