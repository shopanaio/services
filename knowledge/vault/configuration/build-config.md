---
tags:
  - architecture
  - configuration
  - build
related:
  - architecture/overview
  - configuration/bootstrap-config
  - configuration/drizzle-config
---

# Build Configuration

## Purpose

`build.config.json` defines service build parameters for the Shopana build system. Each service has its own config specifying entry point, migrations, GraphQL schemas, and assets.

## Structure

```json
{
  "entryPoint": "src/catalog.module.ts",
  "migrations": { "path": "dist/migrations", "type": "drizzle" },
  "graphql": {
    "admin": [
      "src/api/graphql-admin/schema/**/*.graphql",
      "../../packages/shared-references/graphql/**/*.graphql"
    ]
  },
  "assets": [...]
}
```

## Fields

### entryPoint

```json
"entryPoint": "src/catalog.module.ts"
```

Main NestJS module file. Used by bootstrap to load service.

### migrations

```json
"migrations": { "path": "dist/migrations", "type": "drizzle" }
```

- **path** — Where compiled migrations are located
- **type** — Migration runner type (`drizzle` or `knex`)

### graphql

```json
"graphql": {
  "admin": ["src/api/graphql-admin/schema/**/*.graphql", ...],
  "client": ["src/api/graphql-client/schema/**/*.graphql", ...]
}
```

GraphQL schema file patterns for each API type:
- **admin** — Internal operations API
- **client** — Public storefront API

Used by `shopana schema export` for federation composition.

### assets

```json
"assets": [
  { "include": "src/api/graphql-admin/schema/**/*.graphql", "outDir": "dist/schema" },
  { "include": "migrations/**/*", "outDir": "dist/migrations" }
]
```

Files to copy to dist during build:
- **include** — Glob pattern for source files
- **outDir** — Destination directory

## How It Works

1. `shopana build` reads `build.config.json`
2. Compiles TypeScript to dist
3. Copies all assets to specified outDirs
4. Result is deployable service in `dist/`

## Asset Types

| Asset | Purpose |
|-------|---------|
| GraphQL schemas | Runtime schema loading for Apollo Server |
| Migrations | Database migrations for runtime execution |
| Shared references | Common GraphQL types (scalars, directives) |

## Why Needed

- Defines what constitutes a complete service build
- Separates TypeScript compilation from asset copying
- Enables federation schema export from source files
- Ensures migrations are available at runtime

## Where Used

**At build** — `shopana build` uses this to compile and package service.

**At schema export** — `shopana schema export` reads graphql paths.

**At bootstrap** — `entryPoint` tells bootstrap which module to load.

**At migration** — `migrations` config tells runner where to find SQL files.

## See Also

- [[configuration/bootstrap-config]] — Runtime configuration
- [[configuration/drizzle-config]] — Migration generation
- [[architecture/overview]] — Technology stack overview
