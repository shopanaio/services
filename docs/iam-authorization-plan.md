# IAM Authorization Plan

## Overview

Implementation of AWS IAM-style authorization model where:
- Users register in the main organization
- Child organization is created when project is created
- Each service registers its resources and privileges in IAM
- Casdoor manages access rights through Permissions
- Access checks happen via Casdoor `enforce` API

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              IAM Service                                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Resource Registry                               │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │  │
│  │  │   project   │ │  inventory  │ │   orders    │ │   media     │  │  │
│  │  │  resources  │ │  resources  │ │  resources  │ │  resources  │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Casdoor + Casbin                                │  │
│  │  ├── Organizations                                                 │  │
│  │  ├── Users                                                         │  │
│  │  ├── Roles                                                         │  │
│  │  ├── Permissions                                                   │  │
│  │  ├── Model: RBAC with domains/tenants                             │  │
│  │  └── Policies (Enforce)                                            │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
         ▲                    ▲                    ▲
         │                    │                    │
   RegisterResources      Authorize          AttachUserRole
         │                    │                    │
┌────────┴────────┐  ┌───────┴───────┐  ┌────────┴────────┐
│ Project Service │  │ Order Service │  │ Media Service   │
└─────────────────┘  └───────────────┘  └─────────────────┘
```

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
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
```

Where:
- `sub` — subject (user ID)
- `dom` — domain (project ID)
- `obj` — object (resource: product, order, etc.)
- `act` — action (read, write, delete, etc.)

### Policy Examples

```csv
# Roles in project proj-123
g, user-alice, owner, proj-123
g, user-bob, admin, proj-123
g, user-charlie, viewer, proj-123

# Policies for roles
p, owner, proj-123, *, *
p, admin, proj-123, product, read
p, admin, proj-123, product, write
p, admin, proj-123, order, read
p, admin, proj-123, order, write
p, viewer, proj-123, *, read
```

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

### Wildcard Resolution

The system supports wildcards (`*`) for resources and actions. Resolution follows these rules:

1. **Exact match first**: `product:read` takes priority over `*:read` or `product:*`
2. **Resource wildcard**: `*:read` grants read access to all resources
3. **Action wildcard**: `product:*` grants all actions on product
4. **Full wildcard**: `*:*` grants all access (owner role)

### Hierarchical Resources

Resources can have hierarchies using dot notation:

```
project
project.settings
project.billing
project.team
order
order.comment
order.tag
```

**Inheritance rules:**
- Permission on parent does NOT automatically grant access to children
- Each sub-resource requires explicit permission
- Example: `project:write` does NOT grant `project.billing:write`

**Rationale**: Explicit > implicit. Billing and team management are sensitive operations that should require explicit grants, even for admins.

### Wildcard Examples

```csv
# Owner: full access to everything
p, owner, proj-123, *, *

# Admin: full access except specific denies
p, admin, proj-123, *, *
p, admin, proj-123, project, !delete        # deny delete
p, admin, proj-123, project.billing, !*     # deny all billing

# Manager: specific resources only
p, manager, proj-123, product, *            # all product actions
p, manager, proj-123, order, read
p, manager, proj-123, order, write
p, manager, proj-123, order, fulfill

# Viewer: read-only on everything
p, viewer, proj-123, *, read
```

### Policy Evaluation Order

1. Check for explicit DENY → if found, deny immediately
2. Check for explicit ALLOW → if found, allow
3. Check wildcard policies (from most specific to least specific)
4. If no match → implicit deny

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

## Team Invitations

### Invitation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Owner/Admin invites user@example.com to project            │
│                                                             │
│  1. Check inviter has permission: project.team:invite       │
│  2. Create invitation record                                │
│  3. Send invitation email                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Invitation States                                          │
│                                                             │
│  pending   → User hasn't responded yet                      │
│  accepted  → User accepted, role assigned                   │
│  declined  → User declined invitation                       │
│  expired   → TTL exceeded (7 days default)                  │
│  revoked   → Admin cancelled invitation                     │
└─────────────────────────────────────────────────────────────┘
```

### Invitation for Non-Registered Users

When inviting a user who doesn't have a Shopana account:

```
1. Create invitation with email (no userId yet)
2. Send invitation email with signup link
3. User clicks link → redirects to signup with invitation token
4. After signup, token is validated and role is assigned
5. User gains access to project
```

### Data Model

```
┌─────────────────────────────────────────────────────────────┐
│  project_invitations                                        │
│  ├── id                                                     │
│  ├── project_id                                             │
│  ├── email                                                  │
│  ├── user_id (null until accepted by existing user)        │
│  ├── role_name                                              │
│  ├── status (pending | accepted | declined | expired | revoked)│
│  ├── token (unique, for email link)                        │
│  ├── invited_by (user_id)                                  │
│  ├── invited_at                                             │
│  ├── expires_at                                             │
│  ├── accepted_at                                            │
│  └── revoked_at                                             │
└─────────────────────────────────────────────────────────────┘
```

### IAM Service API for Invitations

```typescript
/**
 * CreateInvitation - Invite user to project
 */
broker.register("CreateInvitation", async (params: {
  projectId: string;
  email: string;
  roleName: string;
  invitedBy: string;
  expiresInDays?: number;  // default: 7
}) => {
  invitation: Invitation;
  token: string;
})

/**
 * AcceptInvitation - Accept invitation and join project
 */
broker.register("AcceptInvitation", async (params: {
  token: string;
  userId: string;
}) => {
  success: boolean;
  projectId: string;
  role: string;
})

/**
 * DeclineInvitation - Decline invitation
 */
broker.register("DeclineInvitation", async (params: {
  token: string;
}) => {
  success: boolean;
})

/**
 * RevokeInvitation - Cancel pending invitation
 */
broker.register("RevokeInvitation", async (params: {
  invitationId: string;
  revokedBy: string;
}) => {
  success: boolean;
})

/**
 * ListInvitations - List pending invitations for a project
 */
broker.register("ListInvitations", async (params: {
  projectId: string;
  status?: "pending" | "all";
}) => {
  invitations: Invitation[];
})

/**
 * GetUserInvitations - Get invitations for a user by email
 */
broker.register("GetUserInvitations", async (params: {
  email: string;
}) => {
  invitations: Invitation[];
})
```

---

## Casdoor Synchronization and Reconciliation

### Sync Strategy

IAM service maintains its own database as source of truth, with Casdoor as the enforcement engine. Data flows:

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  IAM DB     │ ──────► │  IAM Svc    │ ──────► │  Casdoor    │
│  (source)   │         │  (sync)     │         │  (enforce)  │
└─────────────┘         └─────────────┘         └─────────────┘
```

### Sync Operations

| Operation | IAM DB | Casdoor |
|-----------|--------|---------|
| CreateRole | Insert role | Create Casdoor role + policies |
| UpdateRole | Update role | Update Casdoor policies |
| DeleteRole | Delete role | Delete Casdoor role + policies |
| AttachUserRole | Insert member | Add grouping policy (g) |
| DetachUserRole | Update member | Remove grouping policy |

### Reconciliation

Periodic job to ensure consistency:

```typescript
/**
 * ReconcileProject - Sync IAM DB state to Casdoor for a project
 * Run on demand or scheduled
 */
broker.register("ReconcileProject", async (params: {
  projectId: string;
}) => {
  rolesFixed: number;
  membersFixed: number;
  policiesFixed: number;
})

/**
 * ReconcileAll - Full reconciliation across all projects
 * Run during maintenance window
 */
broker.register("ReconcileAll", async () => {
  projectsProcessed: number;
  errorsCount: number;
})
```

### Health Check

```typescript
/**
 * HealthCheck - Verify Casdoor connectivity and model
 */
broker.register("HealthCheck", async () => {
  casdoorConnected: boolean;
  modelValid: boolean;
  lastSyncAt: Date;
  pendingSyncs: number;
})
```

### Failure Handling

When Casdoor is unavailable:

1. **Writes**: Queue in Redis, retry with exponential backoff
2. **Reads (Authorize)**: Fail-closed (deny access)
3. **Recovery**: Process queue when Casdoor returns, then reconcile

```typescript
interface SyncQueueItem {
  id: string;
  operation: "createRole" | "updateRole" | "deleteRole" | "attachUser" | "detachUser";
  payload: unknown;
  projectId: string;
  attempts: number;
  createdAt: Date;
  lastAttemptAt: Date;
  error?: string;
}
```

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
      if (!ctx.user?.id || !ctx.project?.id) {
        throw new UnauthorizedError('Authentication required');
      }

      const checks = Array.isArray(options) ? options : [options];

      // Use BatchAuthorize for multiple checks
      if (checks.length > 1) {
        const result = await ctx.broker.call('iam.BatchAuthorize', {
          userId: ctx.user.id,
          projectId: ctx.project.id,
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
          projectId: ctx.project.id,
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

      if (!ctx.user?.id || !ctx.project?.id) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = await ctx.broker.call('iam.BatchAuthorize', {
        userId: ctx.user.id,
        projectId: ctx.project.id,
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

  // Add authorization helper to context
  ctx.authorize = async (resource: string, action: string, opts?: {
    resourceId?: string;
    resourceOwnerId?: string;
  }) => {
    const result = await ctx.broker.call('iam.Authorize', {
      userId: ctx.user.id,
      projectId: ctx.project.id,
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
      projectId: ctx.project.id,
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

Each service registers its resources in IAM on startup:

```typescript
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

### Project-level Roles

```yaml
roles:
  - name: owner
    displayName: "Owner"
    description: "Full access to all resources"
    permissions:
      - resource: "*"
        actions: ["*"]

  - name: admin
    displayName: "Administrator"
    description: "Full access except project deletion and billing"
    permissions:
      - resource: "*"
        actions: ["*"]
    deny:
      - resource: "project"
        actions: ["delete"]
      - resource: "project.billing"
        actions: ["*"]

  - name: manager
    displayName: "Manager"
    description: "Manage products, orders, and content"
    permissions:
      - resource: "product"
        actions: ["read", "write", "publish"]
      - resource: "category"
        actions: ["read", "write"]
      - resource: "order"
        actions: ["read", "write", "fulfill"]
      - resource: "media"
        actions: ["read", "upload"]

  - name: support
    displayName: "Customer Support"
    description: "Handle orders and customer inquiries"
    permissions:
      - resource: "order"
        actions: ["read", "write"]
      - resource: "order.comment"
        actions: ["read", "write"]
      - resource: "product"
        actions: ["read"]

  - name: viewer
    displayName: "Viewer"
    description: "Read-only access"
    permissions:
      - resource: "*"
        actions: ["read"]
```

## IAM Service API

### Broker Actions (AWS-style naming)

```typescript
// ============================================================================
// Resource Management
// ============================================================================

/**
 * RegisterResources - Register service resources in IAM registry
 * Called by each service on startup
 * Similar to: AWS IAM resource registration
 */
broker.register("RegisterResources", async (params: {
  service: string;
  resources: ResourceType[];
}) => {
  registered: boolean;
})

/**
 * ListResources - List all registered resources
 * Similar to: AWS IAM ListPolicies
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
// Authorization
// ============================================================================

/**
 * Authorize - Check if user is authorized to perform action on resource
 * Similar to: AWS IAM IsAuthorized / STS GetCallerIdentity + policy check
 * Uses: Casdoor enforce API with RBAC domains model
 */
broker.register("Authorize", async (params: {
  userId: string;
  projectId: string;     // domain in RBAC
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
 * Similar to: AWS IAM BatchGetPolicy evaluation
 */
broker.register("BatchAuthorize", async (params: {
  userId: string;
  projectId: string;
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
// Role Management
// ============================================================================

/**
 * CreateRole - Create a new custom role for a project
 * Similar to: AWS IAM CreateRole
 */
broker.register("CreateRole", async (params: {
  projectId: string;
  roleName: string;
  displayName: string;
  description?: string;
  permissions: Array<{
    resource: string;
    actions: string[];
    effect: "allow" | "deny";
  }>;
  createdBy: string;
}) => {
  role: Role;
})

/**
 * GetRole - Get role details
 * Similar to: AWS IAM GetRole
 */
broker.register("GetRole", async (params: {
  projectId: string;
  roleName: string;
}) => {
  role: Role | null;
})

/**
 * UpdateRole - Update role permissions
 * Similar to: AWS IAM UpdateRole + PutRolePolicy
 */
broker.register("UpdateRole", async (params: {
  projectId: string;
  roleName: string;
  permissions?: Array<{
    resource: string;
    actions: string[];
    effect: "allow" | "deny";
  }>;
  displayName?: string;
  description?: string;
}) => {
  role: Role;
})

/**
 * DeleteRole - Delete a custom role
 * Similar to: AWS IAM DeleteRole
 */
broker.register("DeleteRole", async (params: {
  projectId: string;
  roleName: string;
}) => {
  deleted: boolean;
})

/**
 * ListRoles - List all roles in a project
 * Similar to: AWS IAM ListRoles
 */
broker.register("ListRoles", async (params: {
  projectId: string;
  includeSystem?: boolean;  // include owner, admin, etc.
}) => {
  roles: Role[];
})

// ============================================================================
// User-Role Assignment
// ============================================================================

/**
 * AttachUserRole - Assign a role to a user for a project
 * Similar to: AWS IAM AttachUserPolicy / AddUserToGroup
 * Creates: g, userId, roleName, projectId (Casbin grouping policy)
 */
broker.register("AttachUserRole", async (params: {
  userId: string;
  projectId: string;
  roleName: string;
  grantedBy: string;
}) => {
  attached: boolean;
})

/**
 * DetachUserRole - Remove a role from a user
 * Similar to: AWS IAM DetachUserPolicy / RemoveUserFromGroup
 */
broker.register("DetachUserRole", async (params: {
  userId: string;
  projectId: string;
  revokedBy: string;
}) => {
  detached: boolean;
})

/**
 * GetUserRole - Get user's role in a project
 * Similar to: AWS IAM ListAttachedUserPolicies
 */
broker.register("GetUserRole", async (params: {
  userId: string;
  projectId: string;
}) => {
  role: string | null;
  permissions: string[];
  grantedAt?: Date;
  grantedBy?: string;
})

/**
 * ListProjectMembers - List all users with roles in a project
 * Similar to: AWS IAM GetGroup (list group members)
 */
broker.register("ListProjectMembers", async (params: {
  projectId: string;
}) => {
  members: Array<{
    userId: string;
    userName: string;
    email: string;
    role: string;
    grantedAt: Date;
    grantedBy: string;
  }>;
})

// ============================================================================
// Project Provisioning
// ============================================================================

/**
 * ProvisionProject - Setup IAM resources for a new project
 * Creates organization, default roles, and assigns owner
 * Similar to: AWS Organizations CreateAccount + IAM setup
 */
broker.register("ProvisionProject", async (params: {
  projectId: string;
  projectSlug: string;
  projectName: string;
  ownerId: string;
}) => {
  tenantId: string;
  roles: string[];
})

/**
 * DeprovisionProject - Remove all IAM resources for a project
 * Similar to: AWS Organizations CloseAccount
 */
broker.register("DeprovisionProject", async (params: {
  projectId: string;
}) => {
  deprovisioned: boolean;
})
```

## Flow: Service Resource Registration

```
┌─────────────────────────────────────────────────────────────┐
│  Service Startup (e.g., Inventory Service)                  │
│                                                             │
│  onModuleInit() {                                           │
│    await broker.call("iam.RegisterResources", {             │
│      service: "inventory",                                  │
│      resources: [                                           │
│        { name: "product", actions: ["read", "write", ...] },│
│        { name: "category", actions: ["read", "write", ...] }│
│      ]                                                      │
│    });                                                      │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  IAM Service                                                │
│                                                             │
│  1. Save resource definitions in registry                   │
│  2. Update Casdoor model/permissions if needed              │
│  3. Return confirmation                                      │
└─────────────────────────────────────────────────────────────┘
```

## Flow: Access Check

```
User → GET /graphql/inventory (x-project-name: my-store)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Gateway / Context Middleware                               │
│  1. Authentication (iam.GetCurrentUser)                     │
│  2. Get project by slug                                      │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  Inventory Service Resolver                                 │
│                                                             │
│  async products(ctx) {                                      │
│    // Check resource access                                 │
│    const access = await ctx.broker.call("iam.Authorize", { │
│      userId: ctx.user.id,                                   │
│      projectId: ctx.project.id,                             │
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
│  1. Get user's role (GetUserRole)                          │
│  2. Get permissions for that role (GetRole)                │
│  3. Call Casdoor enforce API:                              │
│     enforce(userId, projectId, "product", "read")          │
│  4. Return result                                           │
└─────────────────────────────────────────────────────────────┘
```

## Flow: Project Creation with Owner Assignment

```
User A → projectCreate mutation
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  ProjectCreateWorkflow                                       │
│                                                             │
│  1. Generate project ID                                     │
│  2. Create project record in DB                             │
│  3. Call iam.ProvisionProject                              │
│     │                                                       │
│     ▼                                                       │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  IAM Service: ProvisionProject                        │ │
│  │                                                        │ │
│  │  a) Create organization in Casdoor (for customers)    │ │
│  │  b) Create predefined roles (CreateRole):             │ │
│  │     - {project-id}:owner                              │ │
│  │     - {project-id}:admin                              │ │
│  │     - {project-id}:manager                            │ │
│  │     - {project-id}:support                            │ │
│  │     - {project-id}:viewer                             │ │
│  │  c) Assign User A owner role (AttachUserRole)         │ │
│  │     → Casbin: g, user-a, owner, proj-123              │ │
│  │  d) Create Permission policies in Casdoor             │ │
│  └───────────────────────────────────────────────────────┘ │
│  4. Save integration (tenantId)                            │
└─────────────────────────────────────────────────────────────┘
```

## Data Storage

### IAM Service Database

```
┌─────────────────────────────────────────────────────────────┐
│  service_resources                                          │
│  ├── id                                                     │
│  ├── service_name (project, inventory, orders, ...)        │
│  ├── resource_name (product, order, category, ...)         │
│  ├── actions (jsonb: ["read", "write", "delete"])          │
│  └── registered_at                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  project_roles                                              │
│  ├── id                                                     │
│  ├── project_id                                             │
│  ├── role_name (owner, admin, custom-role-1)               │
│  ├── display_name                                           │
│  ├── description                                            │
│  ├── permissions (jsonb)                                    │
│  ├── is_system (true for owner/admin/manager)              │
│  ├── created_by                                             │
│  └── created_at                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  project_members                                            │
│  ├── id                                                     │
│  ├── project_id                                             │
│  ├── user_id                                                │
│  ├── role_name                                              │
│  ├── granted_by (user_id)                                  │
│  ├── granted_at                                             │
│  └── revoked_at (null if active)                           │
└─────────────────────────────────────────────────────────────┘
```

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

### Phase 1: Basic Infrastructure
1. [ ] Create Casbin model (RBAC with domains) in Casdoor
2. [ ] Create tables in IAM service:
   - [ ] `service_resources`
   - [ ] `project_roles`
   - [ ] `project_members`
   - [ ] `project_invitations`
   - [ ] `service_accounts`
3. [ ] Implement `RegisterResources` action
4. [ ] Implement `Authorize` action (uses Casdoor enforce API)
5. [ ] Implement `BatchAuthorize` action
6. [ ] Implement `GetUserRole` action
7. [ ] Update `ProvisionTenant` → `ProvisionProject` with role creation
8. [ ] Set up Redis cache for authorization results
9. [ ] Implement cache invalidation on role changes

### Phase 2: Service Integration
1. [ ] Update Project Service for resource registration
2. [ ] Update contextMiddleware to call Authorize
3. [ ] Add `ctx.authorize()` and `ctx.checkPermission()` helpers
4. [ ] Add resource registration to Inventory Service
5. [ ] Add resource registration to Orders Service
6. [ ] Create @Authorize decorator
7. [ ] Create @AuthorizeAny decorator

### Phase 3: Team Management & Invitations
1. [ ] GraphQL mutations: AttachUserRole, DetachUserRole
2. [ ] Implement invitation flow:
   - [ ] `CreateInvitation` action
   - [ ] `AcceptInvitation` action
   - [ ] `DeclineInvitation` action
   - [ ] `RevokeInvitation` action
   - [ ] `ListInvitations` action
   - [ ] `GetUserInvitations` action
3. [ ] Email notifications on invite (integration with email service)
4. [ ] Handle invitation for non-registered users (signup with token)
5. [ ] UI: Team page in admin panel
6. [ ] UI: Pending invitations list
7. [ ] Invitation expiration cron job

### Phase 4: Service-to-Service Auth
1. [ ] Create service accounts configuration
2. [ ] Implement `GetServiceToken` action
3. [ ] Implement `AuthorizeService` action
4. [ ] Update broker to pass service tokens in meta
5. [ ] Add service token verification middleware

### Phase 5: Custom Roles
1. [ ] CRUD for custom roles (CreateRole, UpdateRole, DeleteRole)
2. [ ] UI for creating custom roles
3. [ ] Granular permission editor with resource/action matrix
4. [ ] Role cloning from predefined roles

### Phase 6: Casdoor Sync & Resilience
1. [ ] Implement sync queue (Redis)
2. [ ] Implement `ReconcileProject` action
3. [ ] Implement `ReconcileAll` action
4. [ ] Implement `HealthCheck` action
5. [ ] Add retry logic with exponential backoff
6. [ ] Add reconciliation cron job (daily)
7. [ ] Monitoring and alerts for sync failures

### Phase 7: Scopes (own vs all)
1. [ ] Extend Authorize to support scope checking
2. [ ] Update policies to use scope modifiers
3. [ ] Add `resourceOwnerId` parameter to @Authorize decorator
4. [ ] Update resolvers to pass ownership info

### Phase 8: ABAC (optional)
1. [ ] Extend Casbin model for attribute support
2. [ ] Add ownership check (order.assignee == user.id)
3. [ ] Add time restrictions (business hours)
4. [ ] Add IP-based restrictions

## Security

1. **Caching**: Redis cache for Authorize results (TTL: 60 sec)
2. **Audit log**: All role changes are logged
3. **Rate limiting**: Limit on Authorize calls
4. **Fail-closed**: Deny access when IAM is unavailable
5. **Principle of least privilege**: New users get minimal role (viewer)

---

## Audit Logging

### Audit Events

All IAM operations are logged for security and compliance:

```typescript
interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  actorId: string;           // user or service that performed action
  actorType: "user" | "service" | "system";
  projectId: string;
  targetUserId?: string;     // for user-related events
  targetRole?: string;       // for role-related events
  details: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

type AuditEventType =
  // Role events
  | "role.created"
  | "role.updated"
  | "role.deleted"
  // Member events
  | "member.added"
  | "member.removed"
  | "member.role_changed"
  // Invitation events
  | "invitation.created"
  | "invitation.accepted"
  | "invitation.declined"
  | "invitation.revoked"
  | "invitation.expired"
  // Authorization events (optional, high volume)
  | "authorization.denied"
  // Project events
  | "project.provisioned"
  | "project.deprovisioned";
```

### Data Model

```
┌─────────────────────────────────────────────────────────────┐
│  iam_audit_log                                              │
│  ├── id                                                     │
│  ├── timestamp                                              │
│  ├── event_type                                             │
│  ├── actor_id                                               │
│  ├── actor_type                                             │
│  ├── project_id                                             │
│  ├── target_user_id                                         │
│  ├── target_role                                            │
│  ├── details (jsonb)                                        │
│  ├── ip                                                     │
│  └── user_agent                                             │
└─────────────────────────────────────────────────────────────┘

-- Index for common queries
CREATE INDEX idx_audit_project_time ON iam_audit_log(project_id, timestamp DESC);
CREATE INDEX idx_audit_actor ON iam_audit_log(actor_id, timestamp DESC);
CREATE INDEX idx_audit_target_user ON iam_audit_log(target_user_id, timestamp DESC);
```

### IAM Service API for Audit

```typescript
/**
 * ListAuditEvents - Query audit log for a project
 */
broker.register("ListAuditEvents", async (params: {
  projectId: string;
  eventTypes?: AuditEventType[];
  actorId?: string;
  targetUserId?: string;
  from?: Date;
  to?: Date;
  limit?: number;  // default: 50, max: 200
  cursor?: string;
}) => {
  events: AuditEvent[];
  nextCursor?: string;
})
```

### Retention Policy

- **Hot storage** (PostgreSQL): 90 days
- **Cold storage** (S3/archive): 2 years
- **Deletion**: After retention period, unless legal hold

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

type ProjectInvitation {
  id: ID!
  email: String!
  role: ProjectRole!
  status: InvitationStatus!
  invitedBy: User!
  invitedAt: DateTime!
  expiresAt: DateTime!
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
  REVOKED
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

  # List pending invitations (requires project.team:read)
  projectInvitations(
    projectId: ID!
    status: InvitationStatus
  ): [ProjectInvitation!]!

  # List invitations for current user
  myInvitations: [ProjectInvitation!]!

  # Audit log (requires project:admin or owner)
  auditLog(
    projectId: ID!
    eventTypes: [String!]
    from: DateTime
    to: DateTime
    first: Int
    after: String
  ): AuditEventConnection!
}
```

### Mutations

```graphql
type Mutation {
  # Invite user to project (requires project.team:invite)
  inviteToProject(input: InviteToProjectInput!): ProjectInvitation!

  # Accept invitation (authenticated user)
  acceptInvitation(token: String!): AcceptInvitationPayload!

  # Decline invitation (authenticated user)
  declineInvitation(token: String!): Boolean!

  # Revoke invitation (requires project.team:invite)
  revokeInvitation(invitationId: ID!): Boolean!

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

input InviteToProjectInput {
  projectId: ID!
  email: String!
  roleName: String!
  message: String  # optional personal message in email
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

type AcceptInvitationPayload {
  success: Boolean!
  project: Project
  role: ProjectRole
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
