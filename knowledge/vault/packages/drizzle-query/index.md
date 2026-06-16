---
tags:
  - package
  - drizzle
  - orm
  - query-builder
  - graphql
related:
  - shared-kernel/transaction-manager
  - type-resolver
---
# @shopana/drizzle-query

Type-safe query builder for Drizzle ORM with GraphQL-style filtering, automatic joins, and cursor pagination.

## Overview

`@shopana/drizzle-query` is an internal package that provides a fluent, immutable API for building complex SQL queries with full TypeScript type inference. It bridges Drizzle ORM with GraphQL-style filtering patterns used in the Shopana platform.

### Key Features

| Feature | Description |
|---------|-------------|
| **Type-safe queries** | Full TypeScript inference for select, where, and order fields |
| **GraphQL-style filters** | Rich operator support (`_eq`, `_gt`, `_contains`, `_in`, etc.) |
| **Automatic joins** | Define relationships once, use nested paths everywhere |
| **Cursor pagination** | Stable keyset pagination with Relay Connection support |
| **Immutable builders** | Each method returns a new instance (functional style) |
| **View support** | Works with Drizzle views, including computed columns |

## Installation

```typescript
import { createQuery, field } from "@shopana/drizzle-query";
import { createRelayBuilder } from "@shopana/drizzle-query/cursor";
```

## Documentation

| Topic | Description |
|-------|-------------|
| [[drizzle-query/query-builder]] | FluentQueryBuilder API, configuration methods, execution |
| [[drizzle-query/filters]] | Filter operators, logical operators, combining conditions |
| [[drizzle-query/joins]] | Automatic joins, join types, nested path queries |
| [[drizzle-query/cursor-pagination]] | Relay-style pagination, cursors, page info |
| [[drizzle-query/views]] | Drizzle views, computed columns, table-view joins |
| [[drizzle-query/types]] | Type inference utilities, GraphQL code generation |

## Quick Example

```typescript
import { createQuery, field } from "@shopana/drizzle-query";

// Define query with automatic column discovery
const usersQuery = createQuery(users)
  .defaultOrder({ field: "createdAt", direction: "desc" })
  .defaultLimit(20)
  .maxLimit(100)
  .exclude(["password"]);

// Execute with filters
const results = await usersQuery.execute(db, {
  where: {
    status: "active",
    name: { _contains: "john" }
  },
  order: [{ field: "name", direction: "asc" }],
  select: ["id", "name", "email"],
  limit: 10,
});
```

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    FluentQueryBuilder                           │
│                                                                 │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│  │  FieldsDef  │   │   Filters   │   │   Ordering  │          │
│  │  (columns)  │   │  (_eq, _gt) │   │  (asc/desc) │          │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘          │
│         │                 │                 │                  │
│         └─────────────────┼─────────────────┘                  │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    QueryBuilder                          │   │
│  │  - Builds SQL from configuration                         │   │
│  │  - Resolves joins from nested paths                      │   │
│  │  - Applies filters and ordering                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                    │
│                           ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Drizzle ORM                           │   │
│  │  - SQL generation                                        │   │
│  │  - Query execution                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Usage in Shopana Services

The package is used across all Shopana services for:

1. **GraphQL resolvers** — Building queries from GraphQL input
2. **List endpoints** — Paginated lists with filtering and sorting
3. **Search** — Full-text search with faceted filtering
4. **Analytics** — Aggregated views with complex joins

## Related

- [[shared-kernel/transaction-manager]] — Transaction management for queries
- [[type-resolver]] — GraphQL resolver framework
