---
tags:
  - architecture
  - configuration
  - database
related:
  - architecture/overview
  - configuration/bootstrap-config
  - configuration/build-config
  - patterns/repository
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
- **casing** — Column naming convention (`snake_case` recommended for PostgreSQL)

## Extended Configuration

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/repositories/models/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  casing: "snake_case",
});
```

## Postgres Driver Type Serialization

The postgres.js driver is configured in [[DatabaseModule]] (`packages/shared-kernel/src/database/DatabaseModule.ts`) with custom type handling. This is part of the shared [[architecture/overview|infrastructure layer]]:

```typescript
const client = postgres(connectionString, {
  types: {
    date: {
      to: 1184,                        // OID: timestamptz (for sending)
      from: [1082, 1114, 1184],        // OIDs: date, timestamp, timestamptz
      serialize: (x: unknown) =>
        x instanceof Date ? x.toISOString() : String(x),
      parse: (x: string) => x,         // Return string, not Date
    },
  },
});
```

### PostgreSQL Type OIDs

| OID | PostgreSQL Type | Description |
|-----|-----------------|-------------|
| 1082 | `date` | Date without time |
| 1114 | `timestamp` | Timestamp without timezone |
| 1184 | `timestamptz` | Timestamp with timezone |

### How It Works

1. **parse** — When reading from PostgreSQL, returns raw string instead of JavaScript `Date`
2. **serialize** — When writing to PostgreSQL, converts `Date` to ISO string

### Why Configured at Driver Level

- Single configuration point for all services
- Consistent behavior regardless of Drizzle schema `mode` settings
- Avoids timezone bugs at the lowest level
- No per-model configuration needed

### Result

```typescript
// PostgreSQL returns: "2024-01-15 10:30:00+00"
// Without config: Date("2024-01-15T10:30:00.000Z") — JS Date object
// With config: "2024-01-15 10:30:00+00" — raw string
```

All date/timestamp values come as strings — predictable, no timezone shifts.

## Drizzle Model Type Modes

Additionally, Drizzle ORM supports `mode` option in schema definitions. With driver-level serialization above, these modes mainly affect TypeScript types:

### Date Mode (date without time)

```typescript
date("birth_date", { mode: "string" })
```

| Mode | TypeScript Type | Description |
|------|-----------------|-------------|
| `"date"` | `Date` | JavaScript Date object (default) |
| `"string"` | `string` | ISO date string (`2024-01-15`) |

**Why use `mode: "string"`:**
- PostgreSQL `date` has no timezone — `Date` object adds local timezone on parse
- String preserves exact date as stored (`2024-01-15` stays `2024-01-15`)
- Avoids off-by-one-day bugs when server timezone differs from user timezone
- Direct use in GraphQL without conversion

**Problem with `mode: "date"`:**
```typescript
// PostgreSQL stores: 2024-01-15
// Server in UTC+0 parses as: Date("2024-01-15T00:00:00.000Z")
// Client in UTC-5 displays as: "January 14, 2024" ❌
```

### Timestamp Mode

```typescript
timestamp("created_at", { withTimezone: true, mode: "string" })
```

| Mode | TypeScript Type | Description |
|------|-----------------|-------------|
| `"date"` | `Date` | JavaScript Date object (default) |
| `"string"` | `string` | ISO 8601 string (`2024-01-15T10:30:00.000Z`) |

**Why use `mode: "string"`:**
- Avoids timezone conversion issues
- Direct compatibility with [[configuration/codegen-config|GraphQL DateTime scalar]]
- No serialization overhead in JSON responses
- Consistent behavior across environments

### BigInt Mode

```typescript
bigint("size_bytes", { mode: "number" })
bigint("exchange_rate", { mode: "bigint" })
```

| Mode | TypeScript Type | Description |
|------|-----------------|-------------|
| `"number"` | `number` | JavaScript number (safe up to 2^53-1) |
| `"bigint"` | `bigint` | Native BigInt (for values > Number.MAX_SAFE_INTEGER) |

**When to use each:**
- `mode: "number"` — File sizes, counts, IDs (most cases)
- `mode: "bigint"` — Currency amounts, precise calculations

### Numeric/Decimal Mode

```typescript
numeric("price", { precision: 10, scale: 2, mode: "string" })
```

| Mode | TypeScript Type | Description |
|------|-----------------|-------------|
| `"number"` | `number` | Loses precision for large values |
| `"string"` | `string` | Preserves exact decimal representation |

**Always use `mode: "string"` for money** to avoid floating-point errors.

## How It Works

1. Developer modifies models in `src/repositories/models/` (see [[patterns/repository|Repository Pattern]])
2. Runs `shopana db:generate --service <name>`
3. Drizzle Kit compares current schema with migrations
4. Generates SQL migration file in `./migrations`
5. Migrations are copied to `dist/migrations` during build (see [[configuration/build-config|Build Configuration]])

## Migration Files

Generated migrations are SQL files with timestamps:

```
migrations/
├── 0000_initial.sql
├── 0001_add_variants.sql
└── 0002_add_features.sql
```

## Applying Migrations

Migrations run at service startup via `shopana migrate --service <name>`. Uses connection from [[configuration/bootstrap-config|config.yml]] database section.

## Why Needed

- Tracks database schema changes over time
- Enables reproducible database state across environments
- Separates schema definition (TypeScript) from migration execution (SQL)
- Type serialization modes ensure predictable data handling in JavaScript

## Where Used

**At development** — Generate migrations after model changes.

**At deployment** — Apply pending migrations before service startup.

**At build** — Copy migrations to dist via [[configuration/build-config|build.config.json]] assets.

## See Also

- [[configuration/bootstrap-config]] — Service configuration
- [[configuration/build-config]] — Build assets configuration
- [[configuration/codegen-config]] — GraphQL type generation
- [[patterns/repository]] — Repository pattern with Drizzle models
- [[architecture/overview]] — Technology stack overview
