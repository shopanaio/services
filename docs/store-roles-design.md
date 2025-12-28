# RBAC System Specification

## Overview

Shopana uses a Role-Based Access Control (RBAC) system built on [Casbin](https://casbin.org/) with multi-tenancy and domain-based isolation. The system provides granular access control at organization and store levels.

---

## Functional Requirements

### FR-1: Multi-Organization Isolation
- Each organization must have an isolated set of policies and roles
- Policies from one organization must not affect other organizations
- Enforcer instances are cached per-organization for performance

### FR-2: Domain-Based Access Control
- System must support two domain levels:
  - `org` — organization level
  - `store:{uuid}` — specific store level
- Users can have different roles in different stores

### FR-3: Resource-Action Model
- Resources are grouped by domain (org.*, store.*)
- Each resource has a set of allowed actions
- Resource-action validation at type level and runtime

### FR-4: Role Hierarchy
- Organization roles: `admin`, `member`
- Store roles: `viewer`, `manager`, `admin`
- Organization Admin has full access to all stores in the organization

### FR-5: Site Admin Bypass
- Site administrators bypass all RBAC checks
- Site admin check occurs before Casbin policy evaluation

### FR-6: Wildcard Matching
- Support wildcards in resources via keyMatch

### FR-7: System Role Protection
- System roles (e.g., `owner`, `admin`, `member`) cannot be deleted
- Users with the `owner` role cannot have their role changed to another role
- Only custom roles created by users can be modified or deleted

### FR-8: Self-Role Modification Restriction
- Users cannot modify their own roles
- Users cannot revoke their own access
- Role changes must be performed by another user with appropriate permissions

---

## Non-Functional Requirements

### NFR-1: Performance
- Enforcer instance caching per-organization
- Batch enforce for checking multiple permissions in one call
- Minimize DB queries through lazy loading

### NFR-2: Type Safety
- Compile-time validation of resource-action combinations
- Zod-based runtime validation
- TypeScript types for all public APIs

### NFR-3: Extensibility
- Easy addition of new resources and actions
- Ability to add new roles without code changes

---

## Architecture

### Comparison with GitHub Model

| GitHub             | Shopana            |
| ------------------ | ------------------ |
| Organization       | Organization       |
| Repository         | Store              |
| Organization Admin | Organization Admin |
| Repository Admin   | Store Admin        |

---

## Domains

```
domain: "org"        → organization level
domain: "store:{id}" → specific store (UUID)
```

Store domain format: `store:<uuid>` (example: `store:550e8400-e29b-41d4-a716-446655440000`)

---

## Access Levels

### Organization (domain: `org`)

| Role     | Description                                                     |
| -------- | --------------------------------------------------------------- |
| `admin`  | Full control: all actions within the organization               |
| `member` | Basic organization access, store access through explicit grants |

**Organization admin has full access to all stores in the organization.**

### Store (domain: `store:{id}`)

| Role      | Description             |
| --------- | ----------------------- |
| `viewer`  | View store profile      |
| `manager` | View and edit profile   |
| `admin`   | Full store management   |

---

## Resources and Actions

### Organization Resources (prefix: `org.`)

| Resource      | Actions                            | Description             |
| ------------- | ---------------------------------- | ----------------------- |
| `org.profile` | read, update, delete               | Organization profile    |
| `org.members` | read, invite, update, remove       | Organization members    |
| `org.roles`   | read, create, update, delete       | Role management         |
| `org.stores`  | create, read, list, update, delete | Store management        |
| `org.access`  | read, grant, revoke                | Member access to stores |

### Store Resources (prefix: `store.`)

| Resource        | Actions                      | Description                 |
| --------------- | ---------------------------- | --------------------------- |
| `store.profile` | read, update, delete         | Store profile               |
| `store.members` | read, invite, update, remove | Store members               |
| `store.roles`   | read, create, update, delete | Role management in store    |
| `store.access`  | read, grant, revoke          | Member permissions in store |

---

## Permission Matrix

### Organization Level (domain: `org`)

| Resource               | admin | member |
| ---------------------- | ----- | ------ |
| org.profile (read)     | ✓     | ✓      |
| org.profile (update)   | ✓     | -      |
| org.profile (delete)   | ✓     | -      |
| org.members (read)     | ✓     | ✓      |
| org.members (invite)   | ✓     | -      |
| org.members (update)   | ✓     | -      |
| org.members (remove)   | ✓     | -      |
| org.roles (*)          | ✓     | -      |
| org.stores (*)         | ✓     | -      |
| org.access (*)         | ✓     | -      |

### Store Level (domain: `store:{id}`)

| Resource                | viewer | manager | admin |
| ----------------------- | ------ | ------- | ----- |
| store.profile (read)    | ✓      | ✓       | ✓     |
| store.profile (update)  | -      | ✓       | ✓     |
| store.members (*)       | -      | -       | ✓     |
| store.roles (*)         | -      | -       | ✓     |
| store.access (*)        | -      | -       | ✓     |

### Org Admin Store Access

Org Admin has full access to **all** store resources in **all** stores:

| Resource        | org.admin |
| --------------- | --------- |
| store.profile   | ✓ (all)   |
| store.members   | ✓ (all)   |
| store.roles     | ✓ (all)   |
| store.access    | ✓ (all)   |

