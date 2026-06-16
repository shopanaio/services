---
tags:
  - architecture
  - index
related:
  - patterns/script
  - patterns/resolver
  - patterns/repository
---

# Shopana Architecture

Architecture documentation for the Shopana e-commerce platform.

## Quick Links

| Document | Description |
|----------|-------------|
| [[architecture/overview]] | Platform introduction, system users, technology stack |
| [[architecture/decisions]] | Architectural Decision Records (ADRs) |
| [[architecture/request-flow]] | Request handling, inter-service communication |
| [[architecture/service-boundaries]] | Service ownership, bounded contexts |
| [[architecture/multi-tenancy]] | Data isolation, store resolution |
| [[architecture/configuration]] | Centralized YAML config, ENV substitution |
| [[architecture/scalability]] | Scaling strategies, fault tolerance |

## Architecture Overview

Shopana is a **headless e-commerce platform** built with:
- **Microservices** — domain-driven bounded contexts
- **GraphQL Federation** — unified API from distributed services
- **DBOS** — durable workflows for complex operations
- **Event Sourcing** — audit trail for orders and checkout

## Document Structure

### Start Here

1. **[[architecture/overview]]** — What is Shopana, who uses it, high-level diagram
2. **[[architecture/decisions]]** — Why microservices? Why federation? Key ADRs

### Deep Dives

3. **[[architecture/request-flow]]** — How requests flow through the system
4. **[[architecture/service-boundaries]]** — What each service owns and provides
5. **[[architecture/multi-tenancy]]** — How data isolation works
6. **[[architecture/configuration]]** — Centralized config system
7. **[[architecture/scalability]]** — How to scale, handle failures

### Patterns

- [[patterns/script]] — Business logic encapsulation
- [[patterns/resolver]] — GraphQL resolver structure
- [[patterns/repository]] — Data access layer
- [[patterns/dataloader]] — N+1 query prevention
- [[patterns/federation]] — GraphQL Federation setup

### Packages

- [[packages/shared-kernel/index]] — Core shared library
- [[packages/dbos/index]] — Durable workflow execution
- [[packages/drizzle-query/index]] — Query builder utilities
- [[packages/type-resolver/index]] — Type resolution system
