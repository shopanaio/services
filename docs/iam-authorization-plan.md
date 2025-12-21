# IAM Authorization Plan

## Overview

Implementation of AWS IAM-style authorization model where:
- Users register in the main organization
- Child organization is created when project is created (stored as `tenantId` in project integrations)
- Each service registers its resources and privileges in IAM
- **Casdoor is the SINGLE SOURCE OF TRUTH** for all authorization data
- Access checks happen via Casdoor `enforce` API
- **Calling services pass `tenantId` (from integrations) instead of computing it**

## Key Principle: Casdoor as Source of Truth

> **IMPORTANT**: All roles, permissions, user-role assignments, and access checks are stored and managed **ONLY in Casdoor**.
> The IAM service is a **thin wrapper** that calls Casdoor REST API.
> IAM service does NOT duplicate authorization data in its own database.

**What lives in Casdoor:**
- Organizations (projects = child organizations)
- Users (synced from main organization)
- Roles (owner, admin, manager, support, viewer, custom roles)
- Permissions (Casbin policies: `p, role, project, resource, action`)
- Grouping policies (`g, userId, roleName, projectId`)
- Access enforcement via `enforce` API

**IAM service has NO database tables.** Resource definitions are fetched from services on demand.

## Tenant Isolation Model

### Physical Isolation via Casdoor Organizations

Each project/tenant gets its own **isolated Casdoor Organization** with dedicated Model, Enforcer, Roles, and Permissions. This provides **physical isolation** at the Casdoor level, not just logical filtering.

```
Casdoor (admin org: shopana)
│
├── Tenant Organization: org-shop-a        ← Project A's isolated org
│   ├── Model: model-rbac                  owner: org-shop-a
│   ├── Enforcer: enforcer-main            owner: org-shop-a
│   ├── Role: owner                        owner: org-shop-a
│   ├── Role: admin                        owner: org-shop-a
│   ├── Role: manager                      owner: org-shop-a
│   ├── Role: support                      owner: org-shop-a
│   ├── Role: viewer                       owner: org-shop-a
│   └── Permissions...                     owner: org-shop-a
│
├── Tenant Organization: org-shop-b        ← Project B's isolated org
│   ├── Model: model-rbac                  owner: org-shop-b
│   ├── Enforcer: enforcer-main            owner: org-shop-b
│   ├── Role: owner                        owner: org-shop-b  ← same name, different org!
│   └── ...
│
└── ...
```

### How Isolation Works

1. **Each entity has `owner`** — when a role `owner` is created for `org-shop-a`, its `owner = "org-shop-a"`
2. **Casdoor filters by owner** — when querying roles for `org-shop-a`, Casdoor returns only roles with `owner = "org-shop-a"`
3. **Enforcer is per-org** — enforce requests go through `org-shop-a/enforcer-main`, which sees only policies of its organization
4. **Simple role names** — roles are named `owner`, `admin`, etc. (not `shop-a-owner`) because isolation is via `owner` field

### Benefits of Physical Isolation

| Aspect | Old (Logical) | New (Physical) |
|--------|---------------|----------------|
| Isolation | Filter by `domains` field | Separate Casdoor org per tenant |
| Role names | `{projectId}-owner` | `owner` (simple) |
| Risk of data leak | Higher (code error) | Lower (Casdoor enforces) |
| Scalability | All in one org | Independent orgs |

### tenantId Storage

The `tenantId` (Casdoor organization name, e.g., `org-shop-a`) is:
1. **Generated** during `ProvisionTenant` using `getTenantOrg(slug)`
2. **Stored** in `project_integration` table:
   ```typescript
   {
     projectId: "uuid-...",
     type: "iam",
     provider: "casdoor",
     config: { tenantId: "org-shop-a" }
   }
   ```
3. **Passed** by calling services to all IAM operations

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CASDOOR (Source of Truth)                        │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Organizations (one per tenant, e.g., org-shop-a, org-shop-b)    │  │
│  │  Each org contains:                                               │  │
│  │    • Model: model-rbac (owner = org-xxx)                         │  │
│  │    • Enforcer: enforcer-main (owner = org-xxx)                   │  │
│  │    • Roles: owner, admin, manager, support, viewer (owner=org-xxx)│  │
│  │    • Permissions (Casbin policies, owner = org-xxx)              │  │
│  │    • Grouping policies (user → role)                             │  │
│  │  enforce() API for access checks                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ REST API calls (with tenantId)
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                     IAM Service (Thin Wrapper)                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  • Receives tenantId from calling service                         │  │
│  │  • Calls Casdoor API with tenantId as org name                   │  │
│  │  • Caches enforce() results (L1 in-memory)                       │  │
│  │  • Fetches resource definitions from services on demand           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │                    │                    │
   ListResources        Authorize          AttachUserRole
   (calls services)   (tenantId from      (tenantId from
                       integrations)        integrations)
         │                    │                    │
┌────────┴────────┐  ┌───────┴───────┐  ┌────────┴────────┐
│ Project Service │  │ Order Service │  │ Media Service   │
│ (stores tenantId│  │ (reads tenantId│ │ (reads tenantId│
│  in integration)│  │  from ctx)     │ │  from ctx)     │
└─────────────────┘  └───────────────┘  └─────────────────┘
```

## What Each Operation Does

| IAM Service Action | What it does |
|--------------------|--------------|
| `Authorize` | Calls Casdoor `enforce(tenantId, userId, resource, action)` API |
| `BatchAuthorize` | Calls Casdoor `batchEnforce()` API |
| `CreateRole` | Calls Casdoor API to create Role + Permission policies |
| `UpdateRole` | Calls Casdoor API to update Permission policies |
| `DeleteRole` | Calls Casdoor API to delete Role + policies |
| `AttachUserRole` | Calls Casdoor API to add grouping policy `g, userId, role, tenantId` |
| `DetachUserRole` | Calls Casdoor API to remove grouping policy |
| `GetUserRole` | Calls Casdoor API to get user's roles in tenant |
| `ListRoles` | Calls Casdoor API to list roles for organization |
| `ProvisionTenant` | Calls Casdoor API to create Organization + default Roles + policies, returns `tenantId` |

## Tenant ID Flow

> **IMPORTANT**: `tenantId` is the Casdoor organization name (e.g., `org-my-shop`). It is:
> 1. **Generated** during `ProvisionTenant` using `getTenantOrg(slug)` → `org-{slug}`
> 2. **Stored** in `project_integration.config.tenantId` (type: `iam`, provider: `casdoor`)
> 3. **Passed** by calling services to all IAM operations (not computed by IAM)

```
┌─────────────────────────────────────────────────────────────┐
│  Project Creation                                            │
│                                                             │
│  1. ProjectCreateWorkflow calls iam.provisionTenant         │
│  2. IAM generates tenantId = getTenantOrg(slug) = "org-xxx" │
│  3. IAM creates Casdoor org, returns tenantId               │
│  4. Project saves tenantId in project_integration           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Authorization Check                                         │
│                                                             │
│  1. Service reads tenantId from project_integration         │
│  2. Service calls iam.authorize({ tenantId, userId, ... })  │
│  3. IAM uses tenantId directly (no computation)             │
└─────────────────────────────────────────────────────────────┘
```

### Why not compute `tenantId` in IAM?

1. **Decoupling** — IAM doesn't know how tenantId was generated
2. **Flexibility** — tenantId format can change without updating IAM
3. **Slug changes** — if project slug changes, tenantId in integrations stays the same
4. **Single source** — tenantId is stored once, not computed multiple times

## Casbin Access Model

### Model Choice: RBAC with domains/tenants

Casbin supports multiple access control models. For SaaS multi-tenant applications, **RBAC with domains/tenants** is chosen.

### Casbin Models Comparison

| Model | Description | When to use | Suitable for Shopana? |
|-------|-------------|-------------|----------------------|
| **ACL** | User → Resource directly | Simple systems, few users | No (too simple) |
| **RBAC** | User → Role → Permissions | Organizations with fixed roles | Partially |
| **RBAC with domains** | Different roles in different tenants | **SaaS multi-tenant** | **Yes** ✅ |
| **ABAC** | Attribute checking (owner, time, location) | Dynamic rules | Possibly in future |
| **PBAC** | Policies with conditions | Complex authorization logic | No (overkill) |

### Why RBAC with domains?

1. **Multi-tenant isolation**: User can have different roles in different projects
   - User A: `admin` in Project-1, `viewer` in Project-2
2. **Easy to understand**: Roles are intuitive (owner, admin, manager)
3. **Scalability**: Works efficiently with large numbers of users and projects
4. **Industry standard**: Used in AWS, GCP, Azure and other SaaS platforms

### Casbin Model Definition

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act, eft

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub) && keyMatch(r.obj, p.obj) && keyMatch(r.act, p.act)
```

Where:
- `sub` — subject (user ID)
- `obj` — object (resource: product, order, etc.)
- `act` — action (read, write, delete, etc.)
- `eft` — effect (allow or deny)

**Key Features:**
- **No domains** — tenant isolation via separate Casdoor organizations
- **keyMatch** — wildcard support for resources and actions
- **Deny override** — deny rules take precedence over allow
- **Role hierarchy** — via `g = _, _` (up to 10 levels)

### Policy Examples

```csv
# User-role assignments (in tenant org-my-shop)
g, user-alice, owner
g, user-bob, admin
g, user-charlie, viewer

# Role hierarchy (owner includes admin, admin includes manager, etc.)
# Stored in role.roles[] field in Casdoor
owner.roles = [admin]
admin.roles = [manager]
manager.roles = [support]
support.roles = [viewer]

# Permission policies with keyMatch wildcards
p, viewer, *, read, allow           # read everything
p, support, order/*, write, allow   # write orders
p, support, customer/*, write, allow
p, manager, product/*, write, allow # write products
p, manager, product/*, publish, allow
p, manager, category/*, write, allow
p, manager, media/*, upload, allow
p, manager, order/*, fulfill, allow
p, admin, *, *, allow               # full access
p, admin, project, delete, deny     # except project delete
p, admin, project/billing, *, deny  # except billing
p, owner, *, *, allow               # full access (no deny)
```

### Wildcard Patterns (keyMatch)

| Pattern | Request | Match |
|---------|---------|-------|
| `*` | `product` | ✓ |
| `*` | `order` | ✓ |
| `product/*` | `product` | ✓ |
| `product/*` | `product/123` | ✓ |
| `product/*` | `product/123/variant` | ✓ |
| `order/*` | `product` | ✗ |

### Extension to ABAC (future)

If dynamic rules are needed, the model can be extended to ABAC:

```ini
[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act \
    && (p.eft == "allow" || r.sub == r.obj.owner)
```

Example ABAC use cases:
- "Manager can only edit their own orders" (`order.assignee == user.id`)
- "Access only during business hours" (time check)
- "Access only from corporate IPs" (IP check)

---

## Permission Inheritance and Wildcards

### keyMatch Wildcard Resolution

The system uses Casbin's `keyMatch` function for pattern matching:

| Pattern | Matches | Does NOT Match |
|---------|---------|----------------|
| `*` | `product`, `order`, anything | - |
| `product/*` | `product`, `product/123`, `product/123/variant` | `order` |
| `order/*` | `order`, `order/456` | `product` |

**Note**: `keyMatch` matches path-style patterns. Use `/` as separator, not `.`

### Resource Naming Convention

Resources use slash notation for hierarchy:

```
project
project/settings
project/billing
project/team
order
order/comment
order/tag
product
product/variant
```

**Inheritance via hierarchy:**
- `product/*` grants access to `product`, `product/123`, `product/variant`
- Each level can have separate permissions

### Policy Evaluation Order

1. Check for explicit DENY with `eft=deny` → if matches, deny immediately
2. Check for explicit ALLOW with `eft=allow` → if matches, allow
3. Check role hierarchy (via `g(r.sub, p.sub)`) for inherited permissions
4. If no match → implicit deny

**Policy effect rule:**
```
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))
```

### Wildcard Examples

```csv
# Viewer: read-only on everything
p, viewer, *, read, allow

# Support: inherits viewer, adds order/customer write
p, support, order/*, write, allow
p, support, customer/*, write, allow

# Manager: inherits support, adds product management
p, manager, product/*, write, allow
p, manager, product/*, publish, allow
p, manager, category/*, write, allow
p, manager, media/*, upload, allow
p, manager, order/*, fulfill, allow

# Admin: full access with restrictions
p, admin, *, *, allow
p, admin, project, delete, deny           # cannot delete project
p, admin, project/billing, *, deny        # no billing access

# Owner: unrestricted full access
p, owner, *, *, allow
```

### Role Hierarchy in Action

When user has role `manager`:
1. Casbin checks `g(user, manager)` → true
2. Casbin checks policies for `manager` directly
3. Casbin follows `manager.roles = [support]` → checks `support` policies
4. Casbin follows `support.roles = [viewer]` → checks `viewer` policies
5. Combined permissions = manager + support + viewer

---

## Scope Modifiers (own vs all)

### Resource Scopes

Some resources support scope modifiers that restrict access to owned items:

```typescript
interface ResourceType {
  name: string;
  actions: string[];
  scopes?: ("own" | "all")[];  // scope modifiers
}
```

### Scope Examples

```yaml
service: orders
resources:
  - name: order
    actions: [read, write, cancel, refund, fulfill]
    scopes: [own, all]  # can be scoped to own orders or all orders
```

### Policy with Scopes

```csv
# Support can only see/edit their assigned orders
p, support, proj-123, order:own, read
p, support, proj-123, order:own, write

# Manager can see all orders
p, manager, proj-123, order:all, read
p, manager, proj-123, order:own, write   # but only edit assigned
```

### Scope Resolution in Authorize

```typescript
broker.register("Authorize", async (params: {
  userId: string;
  projectId: string;
  resource: string;
  action: string;
  resourceId?: string;
  resourceOwnerId?: string;  // for scope checking
}) => {
  // If policy has :own scope, verify resourceOwnerId === userId
  // If policy has :all scope, allow regardless of owner
})
```

---

## Service-to-Service Authentication

### Service Identity

Each service has a service identity for inter-service communication:

```typescript
interface ServiceIdentity {
  serviceId: string;      // "inventory", "orders", etc.
  serviceName: string;
  permissions: string[];  // allowed actions
}
```

### Service Accounts

```yaml
service_accounts:
  - serviceId: inventory
    permissions:
      - iam:GetUserRole
      - iam:Authorize

  - serviceId: orders
    permissions:
      - iam:GetUserRole
      - iam:Authorize
      - inventory:product:read  # can read products

  - serviceId: checkout
    permissions:
      - iam:Authorize
      - inventory:product:read
      - inventory:stock:read
      - pricing:priceList:read
      - pricing:discount:read
```

### Service Token

Services authenticate using signed JWT tokens:

```typescript
interface ServiceToken {
  iss: "shopana-iam";
  sub: string;           // service ID
  type: "service";
  permissions: string[];
  iat: number;
  exp: number;
}
```

### Service Authorization Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Orders Service needs to read products from Inventory       │
│                                                             │
│  const products = await broker.call("inventory.GetProducts",│
│    { ids: productIds },                                     │
│    {                                                        │
│      meta: {                                                │
│        serviceToken: this.serviceToken,                     │
│        projectId: ctx.project.id                            │
│      }                                                      │
│    }                                                        │
│  );                                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Inventory Service                                          │
│                                                             │
│  1. Verify service token signature                          │
│  2. Check service has permission: inventory:product:read    │
│  3. Execute query                                           │
│  4. Return products                                         │
└─────────────────────────────────────────────────────────────┘
```

### IAM Service API for Services

```typescript
/**
 * AuthorizeService - Check if a service can perform action
 * Used for service-to-service authorization
 */
broker.register("AuthorizeService", async (params: {
  serviceId: string;
  targetService: string;
  resource: string;
  action: string;
}) => {
  allowed: boolean;
})

/**
 * GetServiceToken - Get/refresh service token
 * Called on service startup
 */
broker.register("GetServiceToken", async (params: {
  serviceId: string;
  serviceSecret: string;
}) => {
  token: string;
  expiresAt: Date;
})
```

---

## Casdoor SDK Integration

### Architecture: Casdoor is Source of Truth

> **Casdoor stores ALL authorization data**. IAM service is a thin wrapper that uses Casdoor Node.js SDK.
> **Casdoor SDK is already configured in IAM service** — no need to write a custom client.

```
┌─────────────┐         ┌─────────────┐
│  IAM Svc    │ ──────► │  Casdoor    │
│  (wrapper)  │  SDK    │  (source    │
│             │         │   of truth) │
└─────────────┘         └─────────────┘
       │
       ▼
┌─────────────┐
│  Redis      │
│  (cache)    │
└─────────────┘
```

### Casdoor SDK Methods

> **NOTE**: Casdoor Node.js SDK (`casdoor-nodejs-sdk`) is already installed and configured in IAM service.
> Use the existing SDK instance, do not create a new HTTP client.

| IAM Action | Casdoor SDK Method | Description |
|------------|-------------------|-------------|
| `Authorize` | `sdk.enforce()` | Check access with Casbin |
| `BatchAuthorize` | `sdk.batchEnforce()` | Batch check access |
| `CreateRole` | `sdk.addRole()` + `sdk.addPermission()` | Create role and its policies |
| `UpdateRole` | `sdk.updatePermission()` | Update permission policies |
| `DeleteRole` | `sdk.deleteRole()` | Remove role and policies |
| `AttachUserRole` | `sdk.addPolicy()` | Add `g, userId, role, projectId` |
| `DetachUserRole` | `sdk.removePolicy()` | Remove grouping policy |
| `GetUserRole` | `sdk.getRolesForUser()` | Get user's roles for org |
| `ListRoles` | `sdk.getRoles()` | List all roles in org |
| `ProvisionProject` | `sdk.addOrganization()` + roles + policies | Create org with defaults |

### Health Check

```typescript
/**
 * HealthCheck - Verify Casdoor connectivity
 */
broker.register("HealthCheck", async () => {
  casdoorConnected: boolean;
  modelValid: boolean;
})
```

### Failure Handling

> **If Casdoor is down, authorization doesn't work. Period.**
> No fallbacks, no queues, no degraded mode.

When Casdoor is unavailable:
- All `Authorize` calls fail → requests denied
- All role management operations fail
- Service is effectively down for authorization

This is intentional — Casdoor is critical infrastructure, like the database.

---

## @Authorize Decorator Implementation

### Decorator Definition

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

interface AuthorizeOptions {
  resource: string;
  action: string;
  resourceId?: string | ((args: any) => string);
  resourceOwnerId?: string | ((args: any, ctx: any) => string);
}

export function Authorize(options: AuthorizeOptions | AuthorizeOptions[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [parent, resolverArgs, ctx, info] = args;

      // Ensure context has required data
      // tenantId is loaded from project_integration during context setup
      if (!ctx.user?.id || !ctx.project?.tenantId) {
        throw new UnauthorizedError('Authentication required');
      }

      const checks = Array.isArray(options) ? options : [options];

      // Use BatchAuthorize for multiple checks
      if (checks.length > 1) {
        const result = await ctx.broker.call('iam.BatchAuthorize', {
          userId: ctx.user.id,
          tenantId: ctx.project.tenantId,  // from project_integration
          requests: checks.map(opt => ({
            resource: opt.resource,
            action: opt.action,
            resourceId: resolveValue(opt.resourceId, resolverArgs),
            resourceOwnerId: resolveValue(opt.resourceOwnerId, resolverArgs, ctx),
          })),
        });

        const denied = result.results.find(r => !r.allowed);
        if (denied) {
          throw new ForbiddenError(denied.deniedReason || 'Access denied');
        }
      } else {
        const opt = checks[0];
        const result = await ctx.broker.call('iam.Authorize', {
          userId: ctx.user.id,
          tenantId: ctx.project.tenantId,  // from project_integration
          resource: opt.resource,
          action: opt.action,
          resourceId: resolveValue(opt.resourceId, resolverArgs),
          resourceOwnerId: resolveValue(opt.resourceOwnerId, resolverArgs, ctx),
        });

        if (!result.allowed) {
          throw new ForbiddenError(result.deniedReason || 'Access denied');
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

function resolveValue(
  value: string | ((args: any, ctx?: any) => string) | undefined,
  args: any,
  ctx?: any
): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'function') return value(args, ctx);
  return value;
}
```

### AuthorizeAny (OR logic)

```typescript
export function AuthorizeAny(options: AuthorizeOptions[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const [parent, resolverArgs, ctx, info] = args;

      if (!ctx.user?.id || !ctx.project?.tenantId) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = await ctx.broker.call('iam.BatchAuthorize', {
        userId: ctx.user.id,
        tenantId: ctx.project.tenantId,  // from project_integration
        requests: options.map(opt => ({
          resource: opt.resource,
          action: opt.action,
          resourceId: resolveValue(opt.resourceId, resolverArgs),
        })),
      });

      // At least one must be allowed
      const allowed = result.results.some(r => r.allowed);
      if (!allowed) {
        throw new ForbiddenError('Access denied');
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
```

### Context Middleware Integration

```typescript
// packages/service-broker/src/context/contextMiddleware.ts

export async function contextMiddleware(ctx: Context, next: () => Promise<void>) {
  // ... existing auth code ...

  // Get tenantId from project integration
  // ctx.project.tenantId is loaded from project_integration.config.tenantId
  // during project resolution in the middleware

  // Add authorization helper to context
  ctx.authorize = async (resource: string, action: string, opts?: {
    resourceId?: string;
    resourceOwnerId?: string;
  }) => {
    const result = await ctx.broker.call('iam.Authorize', {
      userId: ctx.user.id,
      tenantId: ctx.project.tenantId,  // from project_integration
      resource,
      action,
      ...opts,
    });

    if (!result.allowed) {
      throw new ForbiddenError(result.deniedReason || 'Access denied');
    }
  };

  ctx.checkPermission = async (resource: string, action: string): Promise<boolean> => {
    const result = await ctx.broker.call('iam.Authorize', {
      userId: ctx.user.id,
      tenantId: ctx.project.tenantId,  // from project_integration
      resource,
      action,
    });
    return result.allowed;
  };

  await next();
}
```

---

## Service Resource Model

### Service Resource Definition

Each service exposes its resources via `GetResources` broker action. IAM fetches on demand.

```typescript
// Each service implements this action
broker.register("GetResources", async () => {
  return {
    service: "inventory",
    resources: [
      { name: "product", actions: ["read", "write", "delete", "publish"] },
      { name: "category", actions: ["read", "write", "delete"] },
      { name: "stock", actions: ["read", "write", "adjust"] }
    ]
  };
});

interface ServiceResourceDefinition {
  service: string;           // "project" | "inventory" | "orders" | ...
  resources: ResourceType[];
}

interface ResourceType {
  name: string;              // "product" | "order" | "category"
  actions: string[];         // ["read", "write", "delete"]
  scopes?: string[];         // ["own", "all"] - optional scope modifiers
}
```

### Resources by Service

#### Project Service
```yaml
service: project
resources:
  - name: project
    actions: [read, write, delete]
  - name: project.settings
    actions: [read, write]
  - name: project.billing
    actions: [read, write]
  - name: project.team
    actions: [read, write, invite, remove]
  - name: project.apiKey
    actions: [read, create, revoke]
```

#### Inventory Service
```yaml
service: inventory
resources:
  - name: product
    actions: [read, write, delete, publish, unpublish]
  - name: category
    actions: [read, write, delete]
  - name: variant
    actions: [read, write, delete]
  - name: stock
    actions: [read, write, adjust]
  - name: import
    actions: [execute]
  - name: export
    actions: [execute]
```

#### Orders Service
```yaml
service: orders
resources:
  - name: order
    actions: [read, write, cancel, refund, fulfill]
  - name: order.comment
    actions: [read, write, delete]
  - name: order.tag
    actions: [read, write]
  - name: fulfillment
    actions: [read, write, ship, deliver]
```

#### Media Service
```yaml
service: media
resources:
  - name: file
    actions: [read, upload, delete]
  - name: folder
    actions: [read, create, delete]
```

#### Checkout Service
```yaml
service: checkout
resources:
  - name: checkout
    actions: [read, write]
  - name: checkout.discount
    actions: [apply, remove]
```

#### Pricing Service
```yaml
service: pricing
resources:
  - name: priceList
    actions: [read, write, delete]
  - name: discount
    actions: [read, write, delete, activate, deactivate]
  - name: promotion
    actions: [read, write, delete]
```

#### Delivery Service
```yaml
service: delivery
resources:
  - name: deliveryMethod
    actions: [read, write, delete, activate, deactivate]
  - name: zone
    actions: [read, write, delete]
  - name: rate
    actions: [read, write]
```

#### Payments Service
```yaml
service: payments
resources:
  - name: paymentMethod
    actions: [read, write, delete, activate, deactivate]
  - name: transaction
    actions: [read, refund]
```

#### Apps Service
```yaml
service: apps
resources:
  - name: app
    actions: [read, install, uninstall, configure]
  - name: webhook
    actions: [read, create, delete]
```

## Resource ARN Format

Following AWS ARN (Amazon Resource Name) pattern:

```
arn:shopana:{service}:{project-id}:{resource-type}/{resource-id}
```

Examples:
```
arn:shopana:project:proj-123:project/proj-123
arn:shopana:inventory:proj-123:product/prod-456
arn:shopana:inventory:proj-123:product/*           # all products
arn:shopana:orders:proj-123:order/ord-789
arn:shopana:media:proj-123:file/*
```

## Predefined Roles

### Role Hierarchy

Roles inherit permissions from sub-roles via Casdoor's `role.roles[]` field:

```
owner ─► admin ─► manager ─► support ─► viewer
  │        │         │          │          │
  │        │         │          │          └─ read: *
  │        │         │          └─ + order/*, customer/* write
  │        │         └─ + product/*, category/*, media/*, order/* fulfill
  │        └─ + *:* (with deny on project delete/billing)
  └─ + *:* (no deny restrictions)
```

### Project-level Roles

```yaml
roles:
  # Base role: read-only access
  - name: viewer
    displayName: "Viewer"
    description: "Read-only access"
    inherits: []  # no parent
    permissions:
      - resource: "*"
        actions: ["read"]

  # Inherits from viewer, adds order management
  - name: support
    displayName: "Customer Support"
    description: "Handle orders and customer inquiries"
    inherits: [viewer]
    permissions:
      - resource: "order/*"
        actions: ["write"]
      - resource: "customer/*"
        actions: ["read", "write"]

  # Inherits from support, adds product/category/media management
  - name: manager
    displayName: "Manager"
    description: "Manage products, orders, and content"
    inherits: [support]
    permissions:
      - resource: "product/*"
        actions: ["write", "publish"]
      - resource: "category/*"
        actions: ["write"]
      - resource: "media/*"
        actions: ["upload", "delete"]
      - resource: "order/*"
        actions: ["fulfill"]

  # Inherits from manager, adds full access with restrictions
  - name: admin
    displayName: "Administrator"
    description: "Full access except project deletion and billing"
    inherits: [manager]
    permissions:
      - resource: "*"
        actions: ["*"]
    deny:
      - resource: "project"
        actions: ["delete"]
      - resource: "project/billing"
        actions: ["*"]

  # Inherits from admin, removes deny restrictions
  - name: owner
    displayName: "Owner"
    description: "Full access to all resources"
    inherits: [admin]
    permissions:
      - resource: "*"
        actions: ["*"]
```

### How Hierarchy Works in Casdoor

Role inheritance is stored in `role.roles[]` array:

```typescript
// owner role object
{
  owner: "org-my-shop",
  name: "owner",
  roles: ["org-my-shop/admin"],  // owner includes admin
  // ...
}

// admin role object
{
  owner: "org-my-shop",
  name: "admin",
  roles: ["org-my-shop/manager"],  // admin includes manager
  // ...
}
```

When checking permissions for `owner`:
1. Check owner's direct permissions
2. Check admin's permissions (via roles[])
3. Check manager's permissions (via admin.roles[])
4. Check support's permissions (via manager.roles[])
5. Check viewer's permissions (via support.roles[])

This is handled automatically by Casbin's `g(r.sub, p.sub)` matcher.

## IAM Service API

### Broker Actions (AWS-style naming)

> **All role/permission operations call Casdoor REST API.**
> IAM service is a thin wrapper with caching.

```typescript
// ============================================================================
// Resource Discovery (fetched from services on demand)
// ============================================================================

/**
 * ListResources - Collect resources from all services
 *
 * Implementation:
 * 1. Call {service}.GetResources for each known service
 * 2. Aggregate results
 * 3. Cache in memory (TTL: 5 min)
 *
 * Used for: UI role editor, validation
 * NOT used for authorization
 */
broker.register("ListResources", async (params: {
  service?: string;  // optional: filter by service
}) => {
  resources: Array<{
    service: string;
    name: string;
    actions: string[];
  }>;
})

// ============================================================================
// Authorization (calls Casdoor API)
// ============================================================================

/**
 * Authorize - Check if user is authorized to perform action on resource
 *
 * Implementation:
 * 1. Use tenantId directly (passed from caller, stored in project_integration)
 * 2. Check Redis cache (L1 in-memory → L2 Redis)
 * 3. If miss → POST /api/enforce to Casdoor
 * 4. Cache result, return
 *
 * Casdoor API: POST /api/enforce
 */
broker.register("Authorize", async (params: {
  userId: string;
  tenantId: string;      // Casdoor organization name from project_integration.config.tenantId
  resource: string;      // "product", "order", etc.
  action: string;        // "read", "write", etc.
  resourceId?: string;   // optional: specific resource ID (ARN)
}) => {
  allowed: boolean;
  deniedReason?: string;
  implicitDeny?: boolean;  // true if no matching policy found
})

/**
 * BatchAuthorize - Check multiple authorizations in one call
 *
 * Casdoor API: POST /api/batch-enforce
 */
broker.register("BatchAuthorize", async (params: {
  userId: string;
  tenantId: string;      // Casdoor organization name from project_integration.config.tenantId
  requests: Array<{
    resource: string;
    action: string;
    resourceId?: string;
  }>;
}) => {
  results: Array<{
    allowed: boolean;
    deniedReason?: string;
  }>;
})

// ============================================================================
// Role Management (all operations via Casdoor API)
// ============================================================================

/**
 * CreateRole - Create a new custom role for a tenant
 *
 * Casdoor API calls:
 * 1. POST /api/add-role - create role in org
 * 2. POST /api/add-permission - create Casbin policies for role
 *
 * Invalidates: role version in Redis cache
 */
broker.register("CreateRole", async (params: {
  tenantId: string;        // Casdoor organization name from project_integration.config.tenantId
  name: string;
  displayName: string;
  description?: string;
  permissions: Array<{
    resource: string;
    actions: string[];
    effect: "Allow" | "Deny";
  }>;
}) => {
  role: Role;
  userErrors: UserError[];
})

/**
 * GetRole - Get role details
 *
 * Casdoor API: GET /api/get-role
 */
broker.register("GetRole", async (params: {
  tenantId: string;        // Casdoor organization name from project_integration.config.tenantId
  roleName: string;
}) => {
  role: Role | null;
})

/**
 * UpdateRole - Update role permissions
 *
 * Casdoor API:
 * 1. DELETE /api/delete-permission - remove old policies
 * 2. POST /api/add-permission - add new policies
 *
 * Invalidates: role version in Redis cache
 */
broker.register("UpdateRole", async (params: {
  tenantId: string;        // Casdoor organization name from project_integration.config.tenantId
  roleName: string;
  permissions?: Array<{
    resource: string;
    actions: string[];
    effect: "Allow" | "Deny";
  }>;
  displayName?: string;
  description?: string;
}) => {
  role: Role;
  userErrors: UserError[];
})

/**
 * DeleteRole - Delete a custom role
 *
 * Casdoor API:
 * 1. DELETE /api/delete-permission - remove policies
 * 2. DELETE /api/delete-role - remove role
 *
 * Invalidates: role version in Redis cache
 */
broker.register("DeleteRole", async (params: {
  tenantId: string;        // Casdoor organization name from project_integration.config.tenantId
  roleName: string;
}) => {
  deleted: boolean;
  userErrors: UserError[];
})

/**
 * ListRoles - List all roles in a tenant
 *
 * Casdoor API: GET /api/get-roles?owner={orgName}
 */
broker.register("ListRoles", async (params: {
  tenantId: string;        // Casdoor organization name from project_integration.config.tenantId
}) => {
  roles: Role[];
  userErrors: UserError[];
})

// ============================================================================
// User-Role Assignment (all operations via Casdoor API)
// ============================================================================

/**
 * AttachUserRole - Assign a role to a user for a tenant
 *
 * Casdoor API: POST /api/add-policy
 * Adds grouping policy: g, userId, roleName, tenantId
 *
 * Invalidates: user version in Redis cache
 */
broker.register("AttachUserRole", async (params: {
  userId: string;
  tenantId: string;    // Casdoor organization name from project_integration.config.tenantId
  roleName: string;
  grantedBy: string;
}) => {
  attached: boolean;
  userErrors: UserError[];
})

/**
 * DetachUserRole - Remove a role from a user
 *
 * Casdoor API: POST /api/remove-policy
 * Removes grouping policy: g, userId, roleName, tenantId
 *
 * Invalidates: user version in Redis cache
 */
broker.register("DetachUserRole", async (params: {
  userId: string;
  tenantId: string;    // Casdoor organization name from project_integration.config.tenantId
  revokedBy: string;
}) => {
  detached: boolean;
  userErrors: UserError[];
})

/**
 * GetUserRole - Get user's role in a tenant
 *
 * Casdoor API: GET /api/get-roles-for-user
 */
broker.register("GetUserRole", async (params: {
  userId: string;
  tenantId: string;    // Casdoor organization name from project_integration.config.tenantId
}) => {
  role: string | null;
  permissions: string[];
  userErrors: UserError[];
})

/**
 * ListTenantMembers - List all users with roles in a tenant
 *
 * Casdoor API: GET /api/get-users?owner={orgName}
 * + GET /api/get-roles-for-user for each user
 */
broker.register("ListTenantMembers", async (params: {
  tenantId: string;    // Casdoor organization name from project_integration.config.tenantId
}) => {
  members: Array<{
    userId: string;
    userName: string;
    email: string;
    role: string;
    grantedAt?: Date;
    grantedBy?: string;
  }>;
  userErrors: UserError[];
})

// ============================================================================
// Project Provisioning (all operations via Casdoor API)
// ============================================================================

/**
 * ProvisionTenant - Setup IAM resources for a new project/tenant
 *
 * Generates tenantId = getTenantOrg(slug) = "org-{slug}"
 *
 * Casdoor API calls:
 * 1. POST /api/add-organization - create child org with name = tenantId
 * 2. Ensure Model exists for this org
 * 3. Ensure Enforcer exists for this org
 * 4. POST /api/add-role (x5) - create predefined roles (owner, admin, manager, support, viewer)
 * 5. POST /api/add-permission (for each role) - create Casbin policies
 * 6. Setup role hierarchy via role.roles[] field:
 *    - owner.roles = [admin]
 *    - admin.roles = [manager]
 *    - manager.roles = [support]
 *    - support.roles = [viewer]
 * 7. POST /api/add-policy - assign owner role to creator
 *
 * All data stored in Casdoor, not in IAM DB.
 * The returned tenantId should be stored in project_integration.config.tenantId
 */
broker.register("ProvisionTenant", async (params: {
  slug: string;         // project slug, used to generate tenantId
  displayName: string;  // project name for display
  ownerId: string;      // user ID of project creator, will get owner role
}) => {
  tenantId: string;     // Casdoor organization name, e.g., "org-my-shop"
  roles: string[];      // ["owner", "admin", "manager", "support", "viewer"]
  userErrors: UserError[];
})

/**
 * DeprovisionTenant - Remove all IAM resources for a tenant
 *
 * Casdoor API calls:
 * 1. DELETE /api/delete-permission - remove all policies
 * 2. DELETE /api/delete-role - remove all roles
 * 3. DELETE /api/delete-organization - remove org
 */
broker.register("DeprovisionTenant", async (params: {
  tenantId: string;     // Casdoor organization name from project_integration.config.tenantId
}) => {
  deprovisioned: boolean;
  userErrors: UserError[];
})
```

## Flow: Resource Discovery

```
┌─────────────────────────────────────────────────────────────┐
│  UI: Admin opens role editor                                 │
│                                                             │
│  → Calls iam.ListResources                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  IAM Service: ListResources                                  │
│                                                             │
│  1. Check in-memory cache (TTL: 5 min)                      │
│  2. If miss → call each service:                            │
│     • inventory.GetResources                                │
│     • orders.GetResources                                   │
│     • media.GetResources                                    │
│     • project.GetResources                                  │
│     • ...                                                   │
│  3. Aggregate and cache results                             │
│  4. Return combined resource list                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Each Service (e.g., Inventory)                             │
│                                                             │
│  broker.register("GetResources", async () => ({             │
│    service: "inventory",                                    │
│    resources: [                                             │
│      { name: "product", actions: ["read", "write", ...] },  │
│      { name: "category", actions: ["read", "write", ...] }, │
│    ]                                                        │
│  }));                                                       │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- No database tables in IAM service
- Single source of truth — resources defined where they're used
- Always up-to-date — no sync issues
- Simpler deployments — no migrations needed

## Flow: Access Check

```
User → GET /graphql/inventory (x-project-name: my-store)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Gateway / Context Middleware                               │
│  1. Authentication (iam.GetCurrentUser)                     │
│  2. Get project by slug                                     │
│  3. Get tenantId from project_integration                   │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Inventory Service Resolver                                 │
│                                                             │
│  async products(ctx) {                                      │
│    // Check resource access using tenantId from context     │
│    const access = await ctx.broker.call("iam.Authorize", { │
│      userId: ctx.user.id,                                   │
│      tenantId: ctx.project.tenantId,  // from integrations │
│      resource: "product",                                   │
│      action: "read"                                         │
│    });                                                      │
│                                                             │
│    if (!access.allowed) {                                   │
│      throw new ForbiddenError(access.deniedReason);        │
│    }                                                        │
│                                                             │
│    return this.productRepository.findAll();                 │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  IAM Service                                                │
│                                                             │
│  1. Use tenantId directly (passed from caller)             │
│  2. Check Redis cache (L1 in-memory → L2 Redis)            │
│  3. If cache miss → call Casdoor REST API:                 │
│     POST /api/enforce                                       │
│     { tenantId, userId, "product", "read" }                │
│  4. Cache result in Redis                                   │
│  5. Return { allowed: true/false }                         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  CASDOOR (Source of Truth)                                  │
│                                                             │
│  Casbin enforce():                                          │
│  1. Look up grouping policy: g, userId, role, tenantId     │
│  2. Look up permission policy: p, role, resource, action   │
│  3. Match against request (product, read)                  │
│  4. Return allow/deny                                       │
└─────────────────────────────────────────────────────────────┘
```

## Flow: Project Creation with Owner Assignment

```
User A → projectCreate mutation (slug: "my-shop")
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  ProjectCreateWorkflow                                       │
│                                                             │
│  1. Generate project ID                                     │
│  2. Create project record in DB                             │
│  3. Call iam.ProvisionTenant({ slug, displayName, ownerId })│
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  IAM Service: ProvisionTenant                               │
│  (All operations via Casdoor REST API)                      │
│                                                             │
│  1. Generate tenantId = getTenantOrg(slug) = "org-my-shop" │
│                                                             │
│  2. POST /api/add-organization                              │
│     → Create org "org-my-shop" in Casdoor                  │
│                                                             │
│  3. Ensure Model/Enforcer exist for this org               │
│                                                             │
│  4. POST /api/add-role (x5)                                 │
│     → Create roles: owner, admin, manager, support, viewer │
│                                                             │
│  5. POST /api/add-permission (for each role)                │
│     → Create Casbin policies with keyMatch wildcards:      │
│        p, viewer, *, read, allow                            │
│        p, support, order/*, write, allow                    │
│        p, manager, product/*, write, allow                  │
│        p, admin, *, *, allow                                │
│        p, admin, project, delete, deny                      │
│        p, owner, *, *, allow                                │
│                                                             │
│  6. Setup role hierarchy via role.roles[]:                  │
│     owner.roles = [admin]                                   │
│     admin.roles = [manager]                                 │
│     manager.roles = [support]                               │
│     support.roles = [viewer]                                │
│                                                             │
│  7. POST /api/add-policy                                    │
│     → Add grouping policy: g, user-a, owner                │
│     → User A is now owner                                   │
│                                                             │
│  8. Return { tenantId: "org-my-shop", roles: [...] }       │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  ProjectCreateWorkflow (continued)                          │
│                                                             │
│  4. Save tenantId in project_integration:                   │
│     {                                                       │
│       projectId: "uuid-...",                                │
│       type: "iam",                                          │
│       provider: "casdoor",                                  │
│       config: { tenantId: "org-my-shop" }                   │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  CASDOOR now has:                                           │
│  • Organization: org-my-shop (owner field = org-my-shop)   │
│  • Model: model-rbac (owner = org-my-shop)                 │
│  • Enforcer: enforcer-main (owner = org-my-shop)           │
│  • Roles: owner, admin, manager, support, viewer           │
│  • Policies: p, owner, *, * (etc.)                         │
│  • Grouping: g, user-a, owner                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Storage

### What is stored WHERE

| Data | Storage | Notes |
|------|---------|-------|
| Tenant Organizations | **Casdoor** | One org per project (e.g., `org-my-shop`) |
| Model & Enforcer | **Casdoor** | Per tenant org (`model-rbac`, `enforcer-main`) |
| Roles | **Casdoor** | Simple names: `owner`, `admin`, etc. (owner = tenant org) |
| Permissions (policies) | **Casdoor** | Casbin policies `p, role, resource, action` (owner = tenant org) |
| User-Role assignments | **Casdoor** | Grouping policies `g, userId, role` (owner = tenant org) |
| tenantId reference | **project_integration** | Links project to Casdoor org |
| Resource definitions | **Each service** | Fetched via `{service}.GetResources` on demand |

### IAM Service Database

> **IAM service has NO database tables.**
> All authorization data is in Casdoor.
> `tenantId` is stored in `project_integration` (project service DB).
> Resource definitions are fetched from services on demand.

### What is stored in Casdoor (Physical Isolation)

```
┌─────────────────────────────────────────────────────────────┐
│  Casdoor Organizations (one per tenant)                      │
│  ├── shopana (admin org for platform)                       │
│  ├── org-my-shop (tenant org for project "my-shop")         │
│  ├── org-acme-store (tenant org for project "acme-store")   │
│  └── ...                                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Tenant: org-my-shop                                         │
│  ├── Model: model-rbac           (owner: org-my-shop)       │
│  ├── Enforcer: enforcer-main     (owner: org-my-shop)       │
│  ├── Role: owner                 (owner: org-my-shop)       │
│  ├── Role: admin                 (owner: org-my-shop)       │
│  ├── Role: manager               (owner: org-my-shop)       │
│  ├── Role: support               (owner: org-my-shop)       │
│  ├── Role: viewer                (owner: org-my-shop)       │
│  ├── Role: custom-role-1         (owner: org-my-shop)       │
│  ├── Permission: perm-owner-*-allow    (owner: org-my-shop) │
│  ├── Permission: perm-admin-product-allow                   │
│  └── Grouping: g, user-alice, owner                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Tenant: org-acme-store (completely isolated!)               │
│  ├── Model: model-rbac           (owner: org-acme-store)    │
│  ├── Role: owner                 (owner: org-acme-store)    │
│  │   ↑ Same name "owner" but different org!                 │
│  └── ...                                                    │
└─────────────────────────────────────────────────────────────┘
```

### What is stored in project_integration

```typescript
// project_integration table
{
  id: "uuid-...",
  projectId: "project-uuid-...",
  type: "iam",
  provider: "casdoor",
  config: {
    tenantId: "org-my-shop"  // ← Casdoor org name
  },
  createdAt: "2024-...",
  updatedAt: "2024-..."
}
```

This `tenantId` is:
- Generated once during `ProvisionTenant`
- Never changes (even if project slug changes)
- Passed to all IAM operations by calling services

## Access Check Decorator

For convenient use in services:

```typescript
// Decorator for GraphQL resolvers
@Authorize({ resource: "product", action: "write" })
async productUpdate(parent, args, ctx) {
  // Access already verified
  return this.productService.update(args.input);
}

// Decorator with dynamic resource ID
@Authorize({
  resource: "product",
  action: "delete",
  resourceId: (args) => args.input.id
})
async productDelete(parent, args, ctx) {
  return this.productService.delete(args.input.id);
}

// Multiple checks (all must pass)
@Authorize([
  { resource: "order", action: "read" },
  { resource: "product", action: "read" }
])
async orderWithProducts(parent, args, ctx) {
  // ...
}

// Check any of permissions (OR logic)
@AuthorizeAny([
  { resource: "order", action: "write" },
  { resource: "order", action: "admin" }
])
async orderUpdate(parent, args, ctx) {
  // ...
}
```

## AWS IAM Comparison

| AWS IAM | Shopana IAM | Description |
|---------|-------------|-------------|
| `CreateRole` | `CreateRole` | Create role |
| `GetRole` | `GetRole` | Get role |
| `UpdateRole` | `UpdateRole` | Update role |
| `DeleteRole` | `DeleteRole` | Delete role |
| `ListRoles` | `ListRoles` | List roles |
| `AttachUserPolicy` | `AttachUserRole` | Assign role to user |
| `DetachUserPolicy` | `DetachUserRole` | Revoke role from user |
| `ListAttachedUserPolicies` | `GetUserRole` | Get user's role |
| `GetGroup` | `ListProjectMembers` | List members |
| `IsAuthorized` (Access Analyzer) | `Authorize` | Check access |
| `BatchGetPolicy` | `BatchAuthorize` | Batch check |
| `CreateAccount` (Organizations) | `ProvisionProject` | Create project |

## Implementation Order

### Phase 1: Casdoor Setup & Basic Infrastructure ✅ DONE
1. [x] Configure Casbin model (RBAC) in Casdoor admin panel
2. [x] Implement `Authorize` action → calls `sdk.enforce()`
3. [x] Implement `BatchAuthorize` action → calls `sdk.batchEnforce()`
4. [x] Implement `GetUserRole` action → calls `sdk.getRolesForUser()`
5. [x] Update `ProvisionTenant`:
   - [x] Create organization in Casdoor
   - [x] Ensure Model/Enforcer exist for tenant org
   - [x] Create predefined roles in Casdoor (owner, admin, manager, support, viewer)
   - [x] Create Casbin policies for each role in Casdoor
   - [x] Assign owner role to creator
   - [x] Return tenantId for storage in project_integration
6. [x] Set up in-memory cache for `enforce` results (L1)
7. [x] Implement cache invalidation (version-based)

### Phase 1.5: Tenant ID Refactoring ✅ DONE
1. [x] Update all IAM scripts to accept `tenantId` instead of computing from `projectId`
2. [x] Remove `getTenantOrg()` calls from authorization scripts (keep only in ProvisionTenant)
3. [x] Update DTOs: `projectId` → `tenantId` in all params
4. [x] Project service stores `tenantId` in `project_integration.config.tenantId`
5. [x] Calling services read `tenantId` from integrations and pass to IAM

### Phase 2: Service Integration
1. [ ] Implement `GetResources` action in each service (project, inventory, orders, media, etc.)
2. [ ] Implement `ListResources` action in IAM (calls services, caches in memory)
3. [ ] Update contextMiddleware to:
   - [ ] Load tenantId from project_integration
   - [ ] Add tenantId to ctx.project
   - [ ] Call `Authorize` with tenantId
4. [ ] Add `ctx.authorize()` and `ctx.checkPermission()` helpers
5. [ ] Create `@Authorize` decorator
6. [ ] Create `@AuthorizeAny` decorator

### Phase 3: Role Management (via Casdoor SDK) ✅ DONE
1. [x] Implement `CreateRole` → `sdk.addRole()` + `sdk.addPermission()`
2. [x] Implement `UpdateRole` → `sdk.updatePermission()`
3. [x] Implement `DeleteRole` → `sdk.deleteRole()`
4. [x] Implement `ListRoles` → `sdk.getRoles()`
5. [x] Implement `AttachUserRole` → `sdk.addPolicy()`
6. [x] Implement `DetachUserRole` → `sdk.removePolicy()`
7. [x] Implement `ListTenantMembers` → `sdk.getUsers()` + `sdk.getRolesForUser()`
8. [ ] GraphQL mutations for role management

### Phase 4: Service-to-Service Auth
1. [ ] Create service accounts configuration
2. [ ] Implement `GetServiceToken` action
3. [ ] Implement `AuthorizeService` action
4. [ ] Update broker to pass service tokens in meta
5. [ ] Add service token verification middleware

### Phase 5: Monitoring
1. [ ] Implement `HealthCheck` action
2. [ ] Add monitoring for Casdoor connectivity
3. [ ] Alerts when Casdoor is unavailable

### Phase 6: L2 Cache (Redis)
1. [ ] Add Redis L2 cache for enforce results
2. [ ] Implement pub/sub for L1 cache invalidation across instances
3. [ ] Add version counters in Redis

### Phase 7: Scopes (own vs all)
1. [ ] Extend `Authorize` to support scope checking
2. [ ] Update Casdoor policies to use scope modifiers
3. [ ] Add `resourceOwnerId` parameter to `@Authorize` decorator
4. [ ] Update resolvers to pass ownership info

### Phase 8: ABAC (optional, future)
1. [ ] Extend Casbin model for attribute support in Casdoor
2. [ ] Add ownership check (order.assignee == user.id)
3. [ ] Add time restrictions (business hours)
4. [ ] Add IP-based restrictions

## Security

1. **Caching**: Redis cache for Authorize results (TTL: 60 sec)
2. **Rate limiting**: Limit on Authorize calls
3. **Fail-closed**: Deny access when IAM is unavailable
4. **Principle of least privilege**: New users get minimal role (viewer)

---

## GraphQL Schema

### Types

```graphql
type ProjectMember {
  id: ID!
  user: User!
  role: ProjectRole!
  grantedAt: DateTime!
  grantedBy: User
}

type ProjectRole {
  name: String!
  displayName: String!
  description: String
  permissions: [Permission!]!
  isSystem: Boolean!
  createdAt: DateTime
}

type Permission {
  resource: String!
  actions: [String!]!
  effect: PermissionEffect!
}

enum PermissionEffect {
  ALLOW
  DENY
}

type UserPermissions {
  role: ProjectRole
  canRead: [String!]!    # list of resources user can read
  canWrite: [String!]!   # list of resources user can write
  canDelete: [String!]!  # list of resources user can delete
}
```

### Queries

```graphql
type Query {
  # Get current user's permissions in project
  myPermissions: UserPermissions!

  # Check specific permission (for UI conditional rendering)
  canI(resource: String!, action: String!): Boolean!

  # List project members (requires project.team:read)
  projectMembers(
    projectId: ID!
    first: Int
    after: String
  ): ProjectMemberConnection!

  # List project roles (requires project.team:read)
  projectRoles(
    projectId: ID!
    includeSystem: Boolean = true
  ): [ProjectRole!]!
}
```

### Mutations

```graphql
type Mutation {
  # Change member role (requires project.team:write)
  changeMemberRole(input: ChangeMemberRoleInput!): ProjectMember!

  # Remove member from project (requires project.team:remove)
  removeMember(memberId: ID!): Boolean!

  # Create custom role (requires project:admin)
  createRole(input: CreateRoleInput!): ProjectRole!

  # Update role (requires project:admin)
  updateRole(input: UpdateRoleInput!): ProjectRole!

  # Delete custom role (requires project:admin)
  deleteRole(roleId: ID!): Boolean!

  # Leave project (self)
  leaveProject(projectId: ID!): Boolean!
}

input ChangeMemberRoleInput {
  memberId: ID!
  newRole: String!
}

input CreateRoleInput {
  projectId: ID!
  name: String!
  displayName: String!
  description: String
  permissions: [PermissionInput!]!
}

input PermissionInput {
  resource: String!
  actions: [String!]!
  effect: PermissionEffect!
}

input UpdateRoleInput {
  roleId: ID!
  displayName: String
  description: String
  permissions: [PermissionInput!]
}
```

## Documentation References

### Casdoor
- [Casdoor Core Concepts](https://casdoor.org/docs/basic/core-concepts/) — Organizations, Users, Applications
- [Casdoor Permission Overview](https://casdoor.org/docs/permission/overview/) — Permissions and Policies
- [Casdoor Permission Configuration](https://casdoor.org/docs/permission/permission-configuration/) — Roles, Domains, Models
- [Casdoor Exposed Casbin APIs](https://casdoor.org/docs/permission/exposed-casbin-apis/) — Enforce, BatchEnforce API
- [Casdoor User Overview](https://casdoor.org/docs/user/overview/) — User management
- [Casdoor Organization Overview](https://casdoor.org/docs/organization/overview/) — Organization management

### Casbin
- [Casbin Supported Models](https://casbin.org/docs/supported-models/) — ACL, RBAC, ABAC and other models
- [Casbin RBAC with Domains](https://casbin.org/docs/rbac-with-domains/) — Multi-tenant RBAC
- [Casbin Online Editor](https://casbin.org/editor/) — Test models and policies
- [Casbin GitHub](https://github.com/casbin/casbin) — Source code and examples

### AWS IAM (for comparison)
- [AWS IAM API Reference](https://docs.aws.amazon.com/IAM/latest/APIReference/) — CreateRole, AttachPolicy and others
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

---

## Cache Strategy with Versioning

### Overview

Cache uses **version-based invalidation** instead of active cache deletion. This approach:
- Avoids O(n) Redis operations when updating roles
- Eliminates expensive `KEYS` pattern matching
- Prevents race conditions during invalidation
- Uses TTL for automatic memory cleanup

### Cache Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Request Flow                                               │
│                                                             │
│  Authorize ──► L1 Cache ──► L2 Cache ──► Casdoor           │
│               (in-memory)   (Redis)      (enforce)          │
│               TTL: 10s      TTL: 5min                       │
└─────────────────────────────────────────────────────────────┘
```

### Cache Keys

```
# Role version (incremented on role changes)
iam:version:role:{projectId}:{roleName} → 42

# User membership version (incremented on attach/detach)
iam:version:user:{projectId}:{userId} → 17

# User role cache (includes version at cache time)
iam:role:{projectId}:{userId} → {
  role,
  permissions,
  grantedAt,
  userVersion: 17,      # version when cached
  roleVersion: 42       # version when cached
}

# Authorization result cache (includes versions)
iam:auth:{projectId}:{userId}:{resource}:{action} → {
  allowed,
  checkedAt,
  userVersion: 17,
  roleVersion: 42
}

# Role definition cache
iam:roledef:{projectId}:{roleName} → {
  permissions,
  isSystem,
  version: 42
}
```

### TTL Configuration

| Cache Type | L1 (in-memory) | L2 (Redis) | Purpose |
|------------|----------------|------------|---------|
| Role version | - | No TTL | Permanent counter |
| User version | - | No TTL | Permanent counter |
| User role | 10s | 5min | Memory cleanup |
| Auth result | 10s | 5min | Memory cleanup |
| Role definition | 30s | 10min | Memory cleanup |

**Note**: TTL is for memory management only. Version comparison handles freshness.

### Version-Based Validation

```typescript
interface CachedAuthResult {
  allowed: boolean;
  checkedAt: Date;
  userVersion: number;
  roleVersion: number;
}

async function checkCache(
  projectId: string,
  userId: string,
  roleName: string,
  resource: string,
  action: string
): Promise<{ hit: boolean; allowed?: boolean }> {
  const cacheKey = `iam:auth:${projectId}:${userId}:${resource}:${action}`;

  // Try L1 cache first
  const l1Result = this.l1Cache.get(cacheKey);
  if (l1Result) {
    const isValid = await this.validateVersions(projectId, userId, roleName, l1Result);
    if (isValid) {
      return { hit: true, allowed: l1Result.allowed };
    }
    // Version mismatch - invalidate L1
    this.l1Cache.delete(cacheKey);
  }

  // Try L2 cache (Redis)
  const l2Result = await this.redis.get(cacheKey);
  if (l2Result) {
    const parsed: CachedAuthResult = JSON.parse(l2Result);
    const isValid = await this.validateVersions(projectId, userId, roleName, parsed);
    if (isValid) {
      // Populate L1
      this.l1Cache.set(cacheKey, parsed, { ttl: 10_000 });
      return { hit: true, allowed: parsed.allowed };
    }
    // Version mismatch - Redis TTL will clean up automatically
  }

  return { hit: false };
}

async function validateVersions(
  projectId: string,
  userId: string,
  roleName: string,
  cached: CachedAuthResult
): Promise<boolean> {
  // Batch fetch current versions (uses Redis MGET - single round trip)
  const [currentUserVersion, currentRoleVersion] = await this.redis.mget([
    `iam:version:user:${projectId}:${userId}`,
    `iam:version:role:${projectId}:${roleName}`
  ]);

  return (
    cached.userVersion === (parseInt(currentUserVersion) || 0) &&
    cached.roleVersion === (parseInt(currentRoleVersion) || 0)
  );
}
```

### Version Increment Operations

| Event | Operation | Redis Commands |
|-------|-----------|----------------|
| AttachUserRole | Increment user version | `INCR iam:version:user:{projectId}:{userId}` |
| DetachUserRole | Increment user version | `INCR iam:version:user:{projectId}:{userId}` |
| UpdateRole | Increment role version | `INCR iam:version:role:{projectId}:{roleName}` |
| DeleteRole | Increment role version | `INCR iam:version:role:{projectId}:{roleName}` |

**Cost**: 1 Redis operation per change (vs O(n) in deletion-based approach).

### Implementation

```typescript
async function onAttachUserRole(projectId: string, userId: string) {
  // Single Redis operation - increment version
  await this.redis.incr(`iam:version:user:${projectId}:${userId}`);

  // Invalidate local L1 cache for this user (optional, TTL will handle it)
  this.l1Cache.delete(`role:${projectId}:${userId}`);

  // Publish event for other instances to clear their L1 cache
  await this.redis.publish('iam:cache:invalidate', JSON.stringify({
    type: 'user',
    projectId,
    userId
  }));
}

async function onDetachUserRole(projectId: string, userId: string) {
  await this.redis.incr(`iam:version:user:${projectId}:${userId}`);
  this.l1Cache.delete(`role:${projectId}:${userId}`);

  await this.redis.publish('iam:cache:invalidate', JSON.stringify({
    type: 'user',
    projectId,
    userId
  }));
}

async function onUpdateRole(projectId: string, roleName: string) {
  // Single Redis operation - no need to find all users with this role!
  await this.redis.incr(`iam:version:role:${projectId}:${roleName}`);

  // Invalidate role definition in L1
  this.l1Cache.delete(`roledef:${projectId}:${roleName}`);

  // Publish for L1 invalidation across instances
  await this.redis.publish('iam:cache:invalidate', JSON.stringify({
    type: 'role',
    projectId,
    roleName
  }));
}

async function onDeleteRole(projectId: string, roleName: string) {
  // Same as update - version increment invalidates all cached results
  await this.redis.incr(`iam:version:role:${projectId}:${roleName}`);

  await this.redis.publish('iam:cache:invalidate', JSON.stringify({
    type: 'role',
    projectId,
    roleName
  }));
}
```

### L1 Cache Pub/Sub Listener

Each service instance subscribes to invalidation events for L1 cache:

```typescript
// On service startup
this.redis.subscribe('iam:cache:invalidate', (message) => {
  const event = JSON.parse(message);

  if (event.type === 'user') {
    // Clear all L1 entries for this user (pattern match in memory is fast)
    this.l1Cache.deleteByPrefix(`${event.projectId}:${event.userId}`);
  } else if (event.type === 'role') {
    // Clear role definition
    this.l1Cache.delete(`roledef:${event.projectId}:${event.roleName}`);
    // Note: Auth results for users with this role will be invalidated
    // on next access via version check
  }
});
```

### Performance Comparison

| Operation | Old (deletion-based) | New (version-based) |
|-----------|---------------------|---------------------|
| AttachUserRole | 2+ Redis ops + KEYS scan | 1 INCR |
| DetachUserRole | 2+ Redis ops + KEYS scan | 1 INCR |
| UpdateRole (1000 users) | 2000+ Redis ops | 1 INCR |
| DeleteRole (1000 users) | 2000+ Redis ops | 1 INCR |
| Cache check | 1 GET | 1 GET + 1 MGET (versions) |

**Trade-off**: Cache check requires additional version fetch, but this is negligible compared to the massive reduction in write operations.

### Memory Management

TTL ensures automatic cleanup:
- Stale cache entries expire naturally (5min for auth results)
- Version counters are small (8 bytes) and don't need TTL
- No manual garbage collection needed
- Redis memory usage is predictable
