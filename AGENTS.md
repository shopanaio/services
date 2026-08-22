# Shopana Services

Modular e-commerce platform built with NestJS microservices and GraphQL Federation.

Project is at 25% readiness. No stage/production data or users does exist. 
Backward compatibility and backfilling are strictly forbidden.

## Knowledge Base

@knowledge/AGENTS.md

Project READ ONLY rules and architecture patterns are stored in the knowledge base vault under `@knowledge/vault/`.
Before creating implementation plans or making code/documentation changes, review and align the work with the relevant documents from the knowledge base.

## Documentation and Plans

- Add and store all new working documentation and implementation plans only in the `services-docs/` submodule.
- The canonical `knowledge/` knowledge base is the only exception to this storage rule.
- Before a document is promoted to the canonical `knowledge/` knowledge base, it must first be added to and maintained in `services-docs/`.
- Store documentation and plans related to the Admin UI in the dedicated `services-docs/admin-web/` directory.

## Architecture

- **Framework:** NestJS + Fastify
- **API:** GraphQL Federation (Apollo Server + Hive Gateway + Mesh Compose)
- **Database:** PostgreSQL + Drizzle ORM + Knex (orders, checkout, delivery, pricing, apps)
- **Workflows:** DBOS SDK
- **Storage:** MinIO
- **Cache:** Upstash Redis, cache-manager + Keyv
- **Auth:** better-auth
- **RBAC:** Casbin
- **Validation:** Zod
- **Logging:** Pino
- **Data Loading:** DataLoader

## Services

| Service   | Description                                             |
| --------- | ------------------------------------------------------- |
| apps      | Application management and configuration                |
| bootstrap | Service orchestrator and entrypoint                     |
| catalog   | Products, variants, categories, tags, options, features, stock, warehouses |
| checkout  | Shopping cart, checkout flow, line items                |
| delivery  | Shipping providers (Nova Poshta, Meest)                 |
| events    | Event persistence and dispatch                          |
| iam       | Identity and access management                          |
| loyalty   | Loyalty programs, points ledger, tiers, and redemption  |
| media     | File storage and media assets                           |
| orders    | Order processing and fulfillment                        |
| payments  | Payment providers integration                           |
| pricing   | Price calculations and promotions                       |
| project   | Project settings, locales, currencies                   |

## Development

Use `shopana-cli` MCP tools for all development tasks (dev, build, migrate, codegen, schema, test, e2e, playwright).

## Admin Frontend

The Admin frontend lives in `admin/`.

## Testing

Playwright e2e tests. See @e2e/AGENTS.md
