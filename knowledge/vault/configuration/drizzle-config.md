---
tags:
  - architecture
  - configuration
  - database
related:
  - architecture/overview
  - configuration/bootstrap-config
---

# Drizzle Configuration

## Purpose

`drizzle.config.ts` configures Drizzle Kit for database migration generation. Each service with a database has its own config file.

## Structure

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/repositories/models/index.ts",
  out: "./migrations",
  dialect: "postgresql",
});
```

## Fields

- **schema** — Path to Drizzle ORM schema definitions (models)
- **out** — Output directory for generated migrations
- **dialect** — Database type (always `postgresql` in Shopana)

## How It Works

1. Developer modifies models in `src/repositories/models/`
2. Runs `shopana db:generate --service <name>`
3. Drizzle Kit compares current schema with migrations
4. Generates SQL migration file in `./migrations`
5. Migrations are copied to `dist/migrations` during build

## Migration Files

Generated migrations are SQL files with timestamps:

```
migrations/
├── 0000_initial.sql
├── 0001_add_variants.sql
└── 0002_add_features.sql
```

## Applying Migrations

Migrations run at service startup via `shopana migrate --service <name>`. Uses connection from `config.yml` database section.

## Why Needed

- Tracks database schema changes over time
- Enables reproducible database state across environments
- Separates schema definition (TypeScript) from migration execution (SQL)

## Where Used

**At development** — Generate migrations after model changes.

**At deployment** — Apply pending migrations before service startup.

**At build** — Copy migrations to dist via `build.config.json` assets.

## See Also

- [[configuration/bootstrap-config]] — Service configuration
- [[architecture/overview]] — Technology stack overview
