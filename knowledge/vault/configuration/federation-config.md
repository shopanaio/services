---
tags:
  - architecture
  - configuration
  - graphql
related:
  - architecture/overview
  - configuration/bootstrap-config
---

# Federation Configuration

## Federation

GraphQL Federation gateway using Hive Gateway. Composes subgraph schemas from services into unified supergraph API.

Two gateways:
- **Admin** (port 4001) — internal management APIs
- **Storefront** (port 4000) — public customer APIs

## Service Configuration

Each service declares schemas in `build.config.json`:

```json
{
  "graphql": {
    "admin": "src/api/graphql/**/*.graphql",
    "storefront": "src/api/storefront/**/*.graphql"
  }
}
```

Patterns are globs. Can be string or array of strings. Service can contribute to one or both gateways.

## Port Configuration

Ports defined in `config.yml` under each service:

```yaml
services:
  inventory:
    ports:
      admin_graphql: 10020
      storefront_graphql: 10021
```

Gateway uses these ports to route requests to subgraphs.

## How It Works

**Schema export** (`export-schemas.ts`):
1. Scans `services/` for directories with `build.config.json`
2. Reads `graphql.admin` and `graphql.storefront` patterns
3. Finds all matching `.graphql` files
4. Builds Apollo Federation subgraph schema
5. Writes to `schema/{service}-{admin|storefront}.graphql`

**Schema composition** (`mesh-utils.ts`):
1. Reads `config.yml` to get service port mappings
2. Reads each service's `build.config.json` for graphql config
3. Builds subgraph list with endpoint URLs from ports
4. Mesh Compose merges all subgraphs into supergraph

**Runtime** (`gateway.config.ts`):
Gateway propagates headers from client to subgraphs: authorization, x-store-name, x-organization-id, x-api-key, x-currency.

## Adding New Subgraph

1. Add `graphql` field to service's `build.config.json`
2. Add ports to service config in `config.yml`
3. Run `shopana schema --action build`

## Files

- `schema/` — exported subgraph schemas (generated)
- `supergraph-admin.graphql` — composed admin schema (generated)
- `supergraph-storefront.graphql` — composed storefront schema (generated)
- `mesh-admin.config.ts` — calls `buildSubgraphs("admin")`
- `mesh-storefront.config.ts` — calls `buildSubgraphs("storefront")`

## See Also

- [[configuration/bootstrap-config]] — Service orchestrator
- [[architecture/overview]] — Technology stack
