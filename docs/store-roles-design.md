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
- Support wildcards in domains (`store:*` for all stores)
- Support wildcards in resources via keyMatch

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

---

## System Components

### 1. @shopana/rbac Package

Central package with RBAC definitions:

```
packages/rbac/src/
├── index.ts        # Public API exports
├── definitions.ts  # Resources and Roles definitions
├── types.ts        # TypeScript types (Domain, Policy, etc.)
├── auth.ts         # Authorization interfaces
└── validators.ts   # Zod validation
```

**Exports:**
- `Resources` — resource definitions with actions
- `Roles` — role definitions with permissions
- `RolesMeta` — role metadata (displayName, description)
- `validateDomainPermissions()` — Zod validation
- `validateAuthorizeInput()` — authorize params validation
- Types: `Domain`, `OrgDomain`, `StoreDomain`, `Permission`, `Policy`

### 2. CasbinService

Casbin enforcer management service:

**Location:** `services/iam/src/casbin/CasbinService.ts`

**Key methods:**

| Method | Description |
|--------|-------------|
| `initialize()` | Initialize Drizzle adapter |
| `getEnforcer(orgId)` | Get/create enforcer for organization |
| `enforce(params)` | Check permission |
| `batchEnforce(params)` | Batch permission check |
| `assignRole(params)` | Assign role to user |
| `removeRole(params)` | Remove role from user |
| `addPolicy(params)` | Add policy rule |
| `removePolicy(params)` | Remove policy rule |
| `getMembers(params)` | Get domain members |

### 3. AuthProvider

Authorization interface for services:

```typescript
interface AuthProvider {
  subject: string | null;  // Current user ID
  authorize(params: AuthorizeParams): Promise<boolean>;
}

interface AuthorizeParams {
  resource: string;
  action: string;
  organizationId?: string;
  organizationName?: string;
  domain?: string;
  subject?: string;
}
```

### 4. Policy Decorators

**@Policy** — for Scripts:

```typescript
@Policy<ScriptParams>({
  resource: "org.profile",
  action: "read",
  organizationId: (_, params) => params.organizationId,
  domain?: Domain | ((target, params) => Domain),
})
```

**@TypePolicy** — for Type Resolvers:

```typescript
@TypePolicy<StoreResolver>({
  organizationId: (resolver) => resolver.value.organizationId,
  domain: (resolver) => `store:${resolver.value.id}`,
  resource: "store.profile",
  action: "read",
  onDeny: "null"  // Return null instead of throwing
})
```

---

## Authorization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Request                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   GraphQL Resolver / Script                     │
│  @Policy decorator wraps execute()                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AuthProvider.authorize()                      │
│  1. Check if subject is authenticated                           │
│  2. Check if subject is site admin (bypass)                     │
│  3. Resolve organizationId from name if needed                  │
│  4. Validate input against @shopana/rbac                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   IAM Service (via Broker)                      │
│  broker.call("iam.authorize", {...})                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CasbinService.enforce()                       │
│  1. Get/create enforcer for organization                        │
│  2. Evaluate matcher                                            │
│  3. Return boolean                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Result: allowed/denied                      │
└─────────────────────────────────────────────────────────────────┘
```

### Domain Resolution Priority

```typescript
1. Explicit domain in params
2. store:{storeId} if storeId available
3. "org" as default
```

---

## Casbin Model

```conf
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _

[matchers]
m = g(r.sub, p.sub, r.dom) && keyMatch(r.dom, p.dom) && keyMatch(r.obj, p.obj) && keyMatch(r.act, p.act)
```

### Policy Examples

```
# Organization role policies
p, admin, org, org.profile, read
p, admin, org, org.members, invite
p, member, org, org.profile, read

# Store role policies
p, viewer, store:*, store.profile, read
p, manager, store:*, store.profile, update
p, admin, store:*, store.members, invite

# Role assignments (groupings)
g, user:123, admin, org
g, user:456, viewer, store:abc-uuid
```

---

## Database Schema

### casbin_rule Table

```sql
CREATE TABLE iam.casbin_rule (
  id SERIAL PRIMARY KEY,
  ptype VARCHAR(10),           -- 'p' for policies, 'g' for groupings
  v0 VARCHAR(255),             -- role (policies) / user (groupings)
  v1 VARCHAR(255),             -- domain
  v2 VARCHAR(255),             -- resource (policies) / role (groupings)
  v3 VARCHAR(255),             -- action (policies) / domain (groupings)
  v4 VARCHAR(255),             -- organization_id
  v5 VARCHAR(255),             -- unused
  organization_id UUID         -- for filtering by organization
);

-- Policies (ptype='p'): v0=role, v1=domain, v2=resource, v3=action
-- Groupings (ptype='g'): v0=user, v1=role, v2=domain
```

### role Table

```sql
CREATE TABLE iam.role (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  domain VARCHAR(255) NOT NULL,  -- 'org' or 'store:{uuid}'
  name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  UNIQUE (organization_id, domain, name)
);
```

### user_role Table

```sql
CREATE TABLE iam.user_role (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  domain VARCHAR(255) NOT NULL,
  created_at TIMESTAMP,

  UNIQUE (organization_id, user_id, domain)
);
```

---

## Store Creation Workflow

```typescript
// StoreCreateWorkflow.ts

1. Create store in DB
2. Call iam.createRoles with store domain roles
3. Assign admin role to creator in store domain

// Example:
await broker.call("iam.createRoles", {
  organizationId: org.id,
  domain: `store:${store.id}`,
  roles: [
    {
      name: "viewer",
      displayName: "Viewer",
      description: "Read-only access",
      permissions: [{ resource: "store.profile", actions: ["read"] }]
    },
    {
      name: "manager",
      displayName: "Manager",
      permissions: [{ resource: "store.profile", actions: ["read", "update"] }]
    },
    {
      name: "admin",
      displayName: "Administrator",
      permissions: [
        { resource: "store.profile", actions: ["read", "update"] },
        { resource: "store.members", actions: ["read", "invite", "update", "remove"] },
        { resource: "store.roles", actions: ["read", "create", "update", "delete"] },
        { resource: "store.access", actions: ["read", "grant", "revoke"] }
      ]
    }
  ]
});

await broker.call("iam.assignRole", {
  organizationId: org.id,
  userId: creator.id,
  role: "admin",
  domain: `store:${store.id}`
});
```

---

## Error Handling

### AuthorizationError

```typescript
class AuthorizationError extends Error {
  errors: Array<{ message: string; code: string }>;
  resource: string;
  action: string;
  // Message: "Access denied: {resource}:{action}"
}
```

### Script Error Handling

```typescript
protected handleError(error: unknown): TResult {
  if (error instanceof AuthorizationError) {
    return {
      data: null,
      userErrors: error.errors
    };
  }
  throw error;
}
```

---

## Validation

### Zod Validators

```typescript
// validateDomainPermissions
validateDomainPermissions({
  domain: "store:550e8400-e29b-41d4-a716-446655440000",
  permissions: [
    { resource: "store.profile", actions: ["read", "update"] }
  ]
});
// ✓ Valid

validateDomainPermissions({
  domain: "org",
  permissions: [
    { resource: "store.profile", actions: ["read"] }  // ✗ Error
  ]
});
// Error: store.* resources not allowed in org domain
```

### Type-Level Validation

```typescript
// Types automatically validate resource-action combinations
@Policy({
  resource: "org.profile",
  action: "fly"  // ✗ TypeScript Error: invalid action for org.profile
})
```

---

## Extending the System

### Adding a New Resource

1. Add to `Resources` in `definitions.ts`:
```typescript
export const Resources = {
  store: {
    // ...existing
    "store.products": {
      actions: ["read", "create", "update", "delete"],
      description: "Store products",
    },
  },
};
```

2. Update roles in `Roles` if needed:
```typescript
export const Roles = {
  store: {
    manager: [
      // ...existing
      { resource: "store.products", actions: ["read", "create", "update"] },
    ],
  },
};
```

3. Types update automatically through inference.

### Adding a New Role

1. Add to `Roles` and `RolesMeta`:
```typescript
export const Roles = {
  store: {
    // ...existing
    product_manager: [
      { resource: "store.products", actions: ["read", "create", "update", "delete"] },
    ],
  },
};

export const RolesMeta = {
  store: {
    product_manager: {
      displayName: "Product Manager",
      description: "Can manage store products",
    },
  },
};
```

2. Update `StoreRoleName` type in `types.ts`:
```typescript
export type StoreRoleName = "viewer" | "manager" | "admin" | "product_manager";
```

---

## Key Files Reference

| Component | Path |
|-----------|------|
| RBAC Package | `packages/rbac/src/` |
| CasbinService | `services/iam/src/casbin/CasbinService.ts` |
| AuthProvider (IAM) | `services/iam/src/kernel/Authorizable.ts` |
| AuthProvider (Project) | `services/project/src/kernel/Authorizable.ts` |
| @Policy Decorator | `packages/shared-kernel/src/decorators/Authorize.ts` |
| @TypePolicy Decorator | `packages/type-resolver/src/middleware/authorization/` |
| Authorization Scripts | `services/iam/src/scripts/organization/` |
| DB Models | `services/iam/src/repositories/models/authorization.ts` |
