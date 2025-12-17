# Federation

GraphQL Federation gateway using [Hive Gateway](https://the-guild.dev/graphql/hive/docs/gateway).

## Structure

```
federation/
├── schema/              # Exported subgraph schemas
├── scripts/
│   └── export-schemas.ts
├── supergraph.yaml      # Hive composition config
├── supergraph.graphql   # Composed supergraph (generated)
├── Dockerfile           # Hive Gateway container
└── docker-compose.yml
```

## Commands

```bash
# Export subgraph schemas from services
yarn schema:export

# Compose supergraph from subgraphs
yarn schema:compose

# Full build (export + compose)
yarn schema:build

# Start gateway (dev)
yarn gateway:dev

# Start everything
yarn dev
```

## Adding a new subgraph

1. Add config to `scripts/export-schemas.ts`:
```typescript
{
  name: "my-service-admin",
  service: "my-service",
  schemaPath: ["src", "api", "graphql"],
  filePattern: "**/*.graphql",
}
```

2. Add to `supergraph.yaml`:
```yaml
- name: my-service-admin
  routing_url: http://localhost:10010/graphql
  schema:
    file: ./schema/my-service-admin.graphql
```

3. Run `yarn schema:build`

## Production

For production, use Cosmo Router (Rust) instead of Hive Gateway:

```yaml
# docker-compose.prod.yml
gateway:
  image: ghcr.io/wundergraph/cosmo/router:latest
  volumes:
    - ./supergraph.graphql:/app/supergraph.graphql
```

Same `supergraph.graphql` works with both gateways.
