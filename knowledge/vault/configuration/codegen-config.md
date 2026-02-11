---
tags:
  - architecture
  - configuration
  - graphql
related:
  - architecture/overview
  - architecture/graphql-federation
  - configuration/bootstrap-config
---

# GraphQL Codegen Configuration

## Purpose

`codegen.ts` configures GraphQL Code Generator for TypeScript type generation from GraphQL schemas. Each service with GraphQL API has its own config.

## Structure

```typescript
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  overwrite: true,
  schema: [...],
  generates: {
    "src/resolvers/admin/generated/types.ts": {...},
    "src/resolvers/admin/generated/schemas.ts": {...},
  },
};
```

## Schema Sources

```typescript
schema: [
  "../../packages/shared-references/graphql/*.graphql",
  "src/api/graphql-admin/schema/*.graphql",
  "src/api/graphql-admin/schema/__generated__/*.graphql",
]
```

- **shared-references** — Common types (scalars, directives, federation)
- **schema/*.graphql** — Service-specific types and mutations
- **__generated__/*.graphql** — Auto-generated entity types

## Generated Files

### types.ts

TypeScript types and resolver signatures:

```typescript
plugins: ["typescript", "typescript-resolvers"]
config: {
  federation: true,
  contextType: "../../../context/types.js#ServiceContext",
  scalars: {
    DateTime: "string",
    Email: "string",
    JSON: "Record<string, unknown>",
    BigInt: "string",
  },
}
```

- **federation** — Enables Apollo Federation types
- **contextType** — Service context type for resolvers
- **scalars** — Maps GraphQL scalars to TypeScript types

### schemas.ts

Zod validation schemas for inputs:

```typescript
plugins: ["graphql-codegen-typescript-validation-schema"]
config: {
  schema: "zod",
  directives: {
    constraint: {
      minLength: "min",
      maxLength: "max",
      pattern: "regex",
    },
  },
}
```

Converts `@constraint` directives to Zod validators.

## How It Works

1. Developer modifies `.graphql` files
2. Runs `shopana codegen --service <name>`
3. Codegen reads all schema files
4. Generates `types.ts` with TypeScript types
5. Generates `schemas.ts` with Zod schemas
6. Resolvers import generated types for type safety

## Config Options

- **overwrite** — Replace existing generated files
- **avoidOptionals.field** — Make resolver fields required
- **useIndexSignature** — Add index signature to resolver maps

## Why Needed

- Type safety between GraphQL and TypeScript
- Auto-generated validation from schema directives
- Resolver type checking with proper context
- Consistent scalar handling across services

## Where Used

**At development** — Regenerate types after schema changes.

**At build** — Types must be generated before TypeScript compilation.

**At runtime** — Zod schemas validate mutation inputs.

## See Also

- [[configuration/bootstrap-config]] — Service configuration
- [[architecture/graphql-federation]] — Federation architecture
- [[architecture/overview]] — Technology stack overview
