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
2. [ ] Create tables in IAM service (service_resources, project_roles, project_members)
3. [ ] Implement `RegisterResources` action
4. [ ] Implement `Authorize` action (uses Casdoor enforce API)
5. [ ] Implement `GetUserRole` action
6. [ ] Update `ProvisionTenant` → `ProvisionProject` with role creation

### Phase 2: Service Integration
1. [ ] Update Project Service for resource registration
2. [ ] Update contextMiddleware to call Authorize
3. [ ] Add resource registration to Inventory Service
4. [ ] Add resource registration to Orders Service
5. [ ] Create @Authorize decorator

### Phase 3: Team Management
1. [ ] GraphQL mutations: AttachUserRole, DetachUserRole, UpdateRole
2. [ ] UI: Team page in admin panel
3. [ ] Email notifications on invite

### Phase 4: Custom Roles
1. [ ] CRUD for custom roles (CreateRole, UpdateRole, DeleteRole)
2. [ ] UI for creating custom roles
3. [ ] Granular permission editor

### Phase 5: ABAC (optional)
1. [ ] Extend Casbin model for attribute support
2. [ ] Add ownership check (order.assignee == user.id)
3. [ ] Add time restrictions (business hours)

## Security

1. **Caching**: Redis cache for Authorize results (TTL: 60 sec)
2. **Audit log**: All role changes are logged
3. **Rate limiting**: Limit on Authorize calls
4. **Fail-closed**: Deny access when IAM is unavailable
5. **Principle of least privilege**: New users get minimal role (viewer)

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
