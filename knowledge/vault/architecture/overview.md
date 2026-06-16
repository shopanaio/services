---
tags:
  - architecture
  - overview
related:
  - architecture/decisions
  - architecture/request-flow
  - architecture/service-boundaries
---

# Shopana Overview

## What is Shopana?

Shopana — headless e-commerce platform. Provides GraphQL API for store management (admin) and customers (storefront). Supports multi-tenancy: single installation serves multiple stores.

## System Users

### Admin Panel

Store managers manage products, orders, settings. Works with Admin API (port 4001).

**Typical operations:**
- Product catalog management (CRUD)
- Order processing and fulfillment
- Store settings and configuration
- User and role management

### Storefront

Customers browse catalog, place orders. Works with Storefront API (port 4000).

**Typical operations:**
- Product browsing and search
- Shopping cart management
- Checkout and payment
- Order tracking

### External Systems

- **Payment providers** — callbacks for payment status updates
- **Delivery services** — Nova Poshta, Meest integration
- **Webhooks** — event notifications to external systems

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│    │  Admin App   │    │  Storefront  │    │   External   │     │
│    └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
└───────────┼───────────────────┼───────────────────┼─────────────┘
            │                   │                   │
            ▼                   ▼                   ▼
┌───────────────────────────────────────────────────────────────────┐
│                      GraphQL Gateway                               │
│    ┌───────────────────┐    ┌───────────────────┐                 │
│    │  Admin Gateway    │    │ Storefront Gateway │                │
│    │     (4001)        │    │      (4000)        │                │
│    └─────────┬─────────┘    └─────────┬─────────┘                 │
└──────────────┼────────────────────────┼───────────────────────────┘
               │                        │
               ▼                        ▼
┌───────────────────────────────────────────────────────────────────┐
│                        Services Layer                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │  IAM   │ │Catalog │ │Checkout│ │ Orders │ │Payments│ ...      │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘          │
└───────────────────────────────────────────────────────────────────┘
               │
               ▼
┌───────────────────────────────────────────────────────────────────┐
│                        Data Layer                                  │
│    ┌───────────────┐    ┌───────────────┐    ┌───────────────┐   │
│    │  PostgreSQL   │    │     MinIO     │    │     Redis     │   │
│    └───────────────┘    └───────────────┘    └───────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | NestJS + Fastify |
| **API** | GraphQL Federation (Apollo Server + Hive Gateway) |
| **Database** | PostgreSQL + Drizzle ORM |
| **Workflows** | DBOS SDK (durable execution) |
| **Storage** | MinIO (S3-compatible) |
| **Cache** | Redis (Upstash), cache-manager + Keyv |
| **Auth** | better-auth |
| **RBAC** | Casbin |
| **Validation** | Zod |
| **Logging** | Pino |
| **Data Loading** | DataLoader |

## See Also

- [[architecture/decisions]] — Key architectural decisions
- [[architecture/request-flow]] — Request handling flow
- [[architecture/service-boundaries]] — Service boundaries
- [[architecture/multi-tenancy]] — Multi-tenancy and data isolation
- [[architecture/scalability]] — Scaling and fault tolerance
