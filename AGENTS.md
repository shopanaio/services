# Shopana Services

Modular e-commerce platform built with NestJS microservices and GraphQL Federation.

## Knowledge Base

@knowledge/AGENTS.md

Project rules and architecture patterns are stored in the knowledge base vault under `@knowledge/vault/`.
Before creating implementation plans or making code/documentation changes, review and align the work with the relevant documents from the knowledge base.

## Architecture

- **Framework:** NestJS + Fastify
- **API:** GraphQL Federation (Apollo Server + Hive Gateway + Mesh Compose)
- **Database:** PostgreSQL + Drizzle ORM + Knex (orders, checkout, delivery, pricing, apps)
- **Workflows:** DBOS SDK
- **Event Sourcing:** Emmett + Pongo + Dumbo (orders, checkout)
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
| catalog   | Products, variants, categories, tags, options, features |
| checkout  | Shopping cart, checkout flow, line items                |
| delivery  | Shipping providers (Nova Poshta, Meest)                 |
| events    | Event persistence and dispatch                          |
| iam       | Identity and access management                          |
| inventory | Stock levels and inventory management                   |
| media     | File storage and media assets                           |
| orders    | Order processing and fulfillment                        |
| payments  | Payment providers integration                           |
| pricing   | Price calculations and promotions                       |
| project   | Project settings, locales, currencies                   |

## Development

Use `shopana-cli` MCP tools for all development tasks (dev, build, migrate, codegen, schema, test).

## Admin Frontend

The Admin frontend lives in `admin/`.

## Testing

Playwright e2e tests. See @e2e/AGENTS.md
