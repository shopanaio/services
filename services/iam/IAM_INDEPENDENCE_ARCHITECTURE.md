# IAM Independence from Project Service

## Current Problem

```
Project ← IAM (reverse dependency)
   ↑
   └── IAM calls project.getCurrentProject
   └── IAM extends type Project
```

IAM depends on Project to resolve `projectSlug` → `tenantId` on every request.

---

## Target Architecture

```
IAM (Organization Management) ← Project (uses IAM)
         ↑
         └── Project stores organizationId
         └── Project references Organization via federation
```

### Domain Model

```
Organization (1) ──▶ Projects (many)
     │
     ├── Members (team)
     ├── Roles (permissions)
     └── Policies (RBAC)
```

**Terminology:**
- `Organization` - user-friendly name (like GitHub/Stripe)
- `organizationId` - internal identifier for multi-tenancy isolation

---

## Solution: OrganizationId in JWT Token

### JWT Structure

```json
{
  "sub": "user-123",
  "org": "org-abc",
  "roles": ["admin"],
  "exp": 1234567890
}
```

### Context Middleware Change

```typescript
// Before (src/api/graphql-admin/contextMiddleware.ts:63)
const projectSlug = req.headers["x-project-name"];
const { tenantId } = await broker.call("project.getCurrentProject", { slug: projectSlug });

// After
const organizationId = ctx.jwt.org; // Already in token, no lookup needed
```

---

## Federation Inversion

### Before (in IAM)

```graphql
# iam/role.graphql
extend type Project @key(fields: "id") {
  id: ID! @external
  roles: [Role!]!
  members: [ProjectMember!]!
  availableResources: [ResourceDefinition!]!
}
```

### After

```graphql
# iam/schema.graphql - IAM owns Organization
type Organization @key(fields: "id") {
  id: ID!
  name: String!
  slug: String!
  roles: [Role!]!
  members: [Member!]!
  projects: [Project!]!  # resolved via federation from Project service
  availableResources: [ResourceDefinition!]!
}

type Role @key(fields: "id") {
  id: ID!
  name: String!
  permissions: [Permission!]!
}

type Member @key(fields: "id") {
  id: ID!
  user: User!
  roles: [Role!]!
}
```

```graphql
# project/project.graphql - Project references Organization
type Project @key(fields: "id") {
  id: ID!
  name: String!
  slug: String!
  organization: Organization!  # federation reference to IAM
  members: [ProjectMember!]!   # only members with access to THIS project
}

type ProjectMember {
  user: User!
  role: ProjectRole!           # role in this project (admin, editor, viewer)
}

enum ProjectRole {
  ADMIN
  EDITOR
  VIEWER
}
```

### Project Resolvers

```typescript
// project/resolvers/project.ts
const ProjectResolvers = {
  Project: {
    organization(project) {
      // Federation reference - IAM resolves the rest
      return { __typename: "Organization", id: project.organizationId };
    },

    async members(project, _, ctx) {
      // Get members with access to THIS project (filter by domain)
      const roles = await ctx.broker.call("iam.getMembersForDomain", {
        organizationId: project.organizationId,
        domain: [["project", project.id]]
      });

      return roles.map(r => ({
        user: { __typename: "User", id: r.userId },
        role: r.role
      }));
    }
  }
};
```

### Client Query Example

```graphql
query {
  project(slug: "my-store") {
    name

    # Only members with access to THIS project
    members {
      user { email }
      role  # ADMIN, EDITOR, VIEWER
    }

    # All organization members (for admin UI)
    organization {
      name
      members { user { email } }  # everyone in org
      roles { name permissions }
    }
  }
}

query {
  myOrganizations {
    id
    name
    projects { id name slug }
    members { user { email } }  # all org members
  }
}
```

**Difference:**

| Field | Returns |
|-------|---------|
| `project.members` | Only users with role in this project |
| `organization.members` | All members of organization |

---

## New IAM Broker Actions

IAM exports (does not call Project):

```typescript
// Shared type - with or without ID
type ScopePart =
  | [type: string]              // type only: ["product"] - for create/list
  | [type: string, id: string]; // type + id: ["product", "123"] - for read/update/delete

// Organization Management
"iam.createOrganization"      // { name, slug } → { organizationId }
"iam.deleteOrganization"      // { organizationId } → void

// Members
"iam.getMembersForOrg"        // { organizationId } → Member[]
"iam.addMemberToOrg"          // { organizationId, userId } → Member
"iam.removeMemberFromOrg"     // { organizationId, userId } → void

// Roles (domain-based, type-safe)
"iam.assignRole"              // { organizationId, userId, domain: ScopePart[], role } → void
"iam.removeRole"              // { organizationId, userId, domain: ScopePart[] } → void
"iam.getRolesForUser"         // { organizationId, userId } → { domain: ScopePart[], role }[]
"iam.getMembersForDomain"     // { organizationId, domain: ScopePart[] } → { userId, role }[]

// Permissions (type-safe)
"iam.checkPermission"         // { organizationId, domain: ScopePart[], resource: ScopePart[], userId, action } → boolean

// Resources
"iam.registerResources"       // { service, resources } → void
"iam.getRegisteredResources"  // { organizationId } → ResourceDefinition[]
```

### Examples

```typescript
// Can user CREATE products in project? (resource without ID)
await broker.call("iam.checkPermission", {
  organizationId: "org-1",
  domain: [["project", "abc-123"]],
  resource: [["product"]],           // no ID - checking type-level permission
  userId: "user-1",
  action: "create"
});

// Can user UPDATE specific product? (resource with ID)
await broker.call("iam.checkPermission", {
  organizationId: "org-1",
  domain: [["project", "abc-123"]],
  resource: [["product", "456"]],    // with ID - checking instance-level permission
  userId: "user-1",
  action: "update"
});

// Can user read products in specific warehouse?
await broker.call("iam.checkPermission", {
  organizationId: "org-1",
  domain: [["project", "abc-123"]],
  resource: [["warehouse", "W1"], ["product"]],  // warehouse with ID, product without
  userId: "user-1",
  action: "read"
});

// Assign admin role for all domains
await broker.call("iam.assignRole", {
  organizationId: "org-1",
  domain: [],  // empty = all (*)
  userId: "user-1",
  role: "admin"
});

// Assign editor role for specific project
await broker.call("iam.assignRole", {
  organizationId: "org-1",
  domain: [["project", "abc-123"]],
  userId: "user-1",
  role: "editor"
});
```

---

## Resource Discovery Change

### Before

IAM polls services:

```typescript
// iam/ListResourcesScript.ts
await broker.call("inventory.getResources");
await broker.call("media.getResources");
await broker.call("project.getResources");
```

### After

Services register resources at startup:

```typescript
// inventory/inventory.service.ts - on service start
await broker.call("iam.registerResources", {
  service: "inventory",
  resources: [
    { name: "product", actions: ["read", "write", "delete"] },
    { name: "category", actions: ["read", "write"] }
  ]
});
```

---

## New IAM GraphQL API

```graphql
type Query {
  # Get organization by id (if user has access)
  organization(id: ID!): Organization

  # Get current organization (from JWT)
  currentOrganization: Organization
}

type Mutation {
  # Create new organization
  createOrganization(input: CreateOrganizationInput!): Organization!

  # Invite member to organization
  inviteMember(organizationId: ID!, email: String!, roleIds: [ID!]!): Member!

  # Assign domain role to member
  assignDomainRole(memberId: ID!, domain: String!, role: String!): Member!
}
```

---

## Final Architecture

```
┌──────────────────────────────────────────────────────┐
│                      Client                           │
│  - Stores JWT with organizationId                    │
│  - Sends Authorization header                        │
└──────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────┐
│                      Gateway                          │
│  - Routes requests                                   │
│  - No org resolution (already in JWT)                │
└──────────────────────────────────────────────────────┘
              │                    │
              ▼                    ▼
┌─────────────────────┐   ┌─────────────────────┐
│        IAM          │   │      Project        │
│                     │   │                     │
│  - Organization     │◀──│  - Stores orgId     │
│  - Roles            │   │  - References Org   │
│  - Members          │   │    via federation   │
│  - Policies         │   │                     │
│  - Permissions      │   │                     │
│                     │   │                     │
│  NO dependency on   │   │  DEPENDS on IAM     │
│  Project            │   │                     │
└─────────────────────┘   └─────────────────────┘
         ▲
         │ registerResources
┌────────┴────────────────────────────────────┐
│     Inventory, Media, Orders, etc.          │
└─────────────────────────────────────────────┘
```

### Key Relationships

```
Organization (IAM)
     │
     ├── has many ──▶ Members
     ├── has many ──▶ Roles
     ├── has many ──▶ Policies
     │
     └── has many ──▶ Projects (via federation from Project service)
                          │
                          └── ecommerce data (products, orders, etc.)
```

---

## Casbin Model: Domain = Project

### Why Domain?

Organization can have multiple Projects. Members need different access levels per project:
- John: admin in all projects
- Jane: editor only in "My Store"
- Bob: viewer in "My Store" and "Test Store"

### Current Model (no domain)

```conf
r = sub, obj, act
p = sub, obj, act, eft
g = _, _
```

Problem: No way to scope roles to specific projects.

### New Model (with domain)

```conf
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act, eft

[role_definition]
g = _, _, _   # user, role, domain(project)

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub, r.dom) && (p.dom == "*" || p.dom == r.dom) && keyMatch(r.obj, p.obj) && keyMatch(r.act, p.act)
```

### How It Works

```
# Role definitions (policies) - what each role can do
p(admin, *, *, *, allow)                    # admin can do anything
p(editor, *, product/*, write, allow)       # editor can write products
p(editor, *, order/*, read, allow)          # editor can read orders
p(viewer, *, *, read, allow)                # viewer can only read

# Role assignments (groupings) - who has what role where
g(user:john, admin, *)                      # john = admin in ALL projects
g(user:jane, editor, project:123)           # jane = editor in project:123 only
g(user:bob, viewer, project:123)            # bob = viewer in project:123
g(user:bob, viewer, project:456)            # bob = viewer in project:456
```

### Authorization Request

```typescript
// Check: can jane write product/789 in project:123?
enforce("user:jane", "project:123", "product/789", "write")
// → true (jane is editor in project:123, editors can write products)

// Check: can jane write product/789 in project:999?
enforce("user:jane", "project:999", "product/789", "write")
// → false (jane has no role in project:999)

// Check: can john write anything anywhere?
enforce("user:john", "project:999", "anything", "write")
// → true (john is admin in *, matches all projects)
```

### Database Schema

```sql
-- casbin_rule table
-- Policies (ptype='p'): v0=role, v1=domain, v2=resource, v3=action, v4=effect, v5=orgId
-- Groupings (ptype='g'): v0=user, v1=role, v2=domain, v3=orgId

-- Examples:
INSERT INTO casbin_rule VALUES
  ('p', 'admin', '*', '*', '*', 'allow', 'org:abc'),
  ('p', 'editor', '*', 'product/*', 'write', 'allow', 'org:abc'),
  ('p', 'viewer', '*', '*', 'read', 'allow', 'org:abc'),
  ('g', 'user:john', 'admin', '*', 'org:abc', NULL, NULL),
  ('g', 'user:jane', 'editor', 'project:123', 'org:abc', NULL, NULL);
```

### Type-Safe API

IAM receives typed arrays, builds strings internally:

```typescript
// Shared type - with or without ID
type ScopePart =
  | [type: string]              // type only: ["product"]
  | [type: string, id: string]; // type + id: ["product", "123"]

interface CheckPermissionInput {
  organizationId: string;
  domain: ScopePart[];      // [["project", "abc-123"]] - always with ID
  resource: ScopePart[];    // [["product"]] or [["product", "456"]]
  userId: string;
  action: string;
}

interface AssignRoleInput {
  organizationId: string;
  domain: ScopePart[];      // [["project", "abc-123"]] or [] for all
  userId: string;
  role: string;
}
```

### Examples

```typescript
// Type-level: can user create products?
await broker.call("iam.checkPermission", {
  organizationId: "org-1",
  domain: [["project", "abc-123"]],
  resource: [["product"]],              // no ID
  userId: "user-1",
  action: "create"
});

// Instance-level: can user update this product?
await broker.call("iam.checkPermission", {
  organizationId: "org-1",
  domain: [["project", "abc-123"]],
  resource: [["product", "456"]],       // with ID
  userId: "user-1",
  action: "update"
});

// Nested: products in specific warehouse
await broker.call("iam.checkPermission", {
  organizationId: "org-1",
  domain: [["project", "abc-123"]],
  resource: [["warehouse", "W1"], ["product"]],  // warehouse with ID, product without
  userId: "user-1",
  action: "read"
});

// Future: store domain
await broker.call("iam.checkPermission", {
  organizationId: "org-1",
  domain: [["store", "xyz-789"]],
  resource: [["inventory"]],
  userId: "user-1",
  action: "read"
});
```

### Authorization Service

```typescript
class AuthorizationService {
  // Build path from typed parts (with or without ID)
  private buildPath(parts: ScopePart[]): string {
    if (parts.length === 0) return "*";

    return parts.map(part =>
      part.length === 1
        ? part[0]                    // "product"
        : `${part[0]}:${part[1]}`    // "product:456"
    ).join("/");
  }

  // Examples:
  // [["product"]] → "product"
  // [["product", "456"]] → "product:456"
  // [["warehouse", "W1"], ["product"]] → "warehouse:W1/product"
  // [["warehouse", "W1"], ["product", "456"]] → "warehouse:W1/product:456"
  // [] → "*"

  async checkPermission(input: CheckPermissionInput): Promise<boolean> {
    const enforcer = await this.getEnforcer(input.organizationId);

    const domain = this.buildPath(input.domain);
    const resource = this.buildPath(input.resource);

    return enforcer.enforce(
      `user:${input.userId}`,
      domain,
      resource,
      input.action
    );
  }

  async assignRole(input: AssignRoleInput): Promise<void> {
    const enforcer = await this.getEnforcer(input.organizationId);

    const domain = this.buildPath(input.domain);

    await enforcer.addGroupingPolicy(
      `user:${input.userId}`,
      input.role,
      domain
    );

    await this.saveAndInvalidateCache(input.organizationId);
  }

  async removeRole(
    organizationId: string,
    userId: string,
    domain: ScopePart[]
  ): Promise<void> {
    const enforcer = await this.getEnforcer(organizationId);

    await enforcer.removeFilteredGroupingPolicy(
      0,
      `user:${userId}`,
      "",
      this.buildPath(domain)
    );

    await this.saveAndInvalidateCache(organizationId);
  }
}
```

### Performance: Org + Domain Caching

IAM caches enforcers by `org:domain` without knowing what domain represents:

```typescript
class AuthorizationService {
  // Cache: "orgId:domain" → Enforcer
  // IAM doesn't know domain is "project" - just a string
  private enforcers = new LRUCache<string, Enforcer>({ max: 100 });

  async checkPermission(input: CheckPermissionInput): Promise<boolean> {
    const domain = this.buildPath(input.domain);
    const cacheKey = `${input.organizationId}:${domain}`;

    let enforcer = this.enforcers.get(cacheKey);

    if (!enforcer) {
      enforcer = await this.loadFilteredEnforcer(
        input.organizationId,
        domain
      );
      this.enforcers.set(cacheKey, enforcer);
    }

    return enforcer.enforce(
      `user:${input.userId}`,
      domain,
      this.buildPath(input.resource),
      input.action
    );
  }

  private async loadFilteredEnforcer(
    orgId: string,
    domain: string
  ): Promise<Enforcer> {
    const enforcer = await newEnforcer(this.model);

    // Load only policies for this org + domain (or wildcard)
    const policies = await this.db.query(`
      SELECT * FROM casbin_rule
      WHERE org_id = $1
        AND (domain = $2 OR domain = '*')
    `, [orgId, domain]);

    for (const p of policies) {
      await enforcer.addPolicy(p.role, p.domain, p.resource, p.action, p.effect);
    }

    return enforcer;
  }
}
```

**Cache structure:**

```
LRU Cache (max: 100 enforcers)
│
├── "org:abc:project:123" → Enforcer (50 policies)
├── "org:abc:project:456" → Enforcer (50 policies)
├── "org:abc:*"           → Enforcer (all org policies)
├── "org:xyz:store:789"   → Enforcer (future - same code)
└── ...
```

**Why this works:**

| Aspect | Benefit |
|--------|---------|
| Per-domain loading | ~50 policies instead of 1000s |
| LRU eviction | Memory bounded |
| Domain-agnostic | IAM doesn't know "project" vs "store" |
| O(1) cache lookup | Fast repeated checks |

**Cache invalidation:**

```typescript
// On role/policy change
async invalidateCache(orgId: string, domain?: string) {
  if (domain) {
    this.enforcers.delete(`${orgId}:${domain}`);
  } else {
    // Invalidate all for org
    for (const key of this.enforcers.keys()) {
      if (key.startsWith(`${orgId}:`)) {
        this.enforcers.delete(key);
      }
    }
  }

  // Notify other instances via Redis pub/sub
  await this.redis.publish("iam:cache:invalidate", { orgId, domain });
}
```

---

### Forward Compatibility

Domain is fixed to project level. Resource path can evolve without code changes:

```
# Today: simple resources
product/123
order/456

# Tomorrow: add warehouse scope (just new policies)
warehouse:W1/product/123
warehouse:W2/order/456

# Later: add category scope
warehouse:W1/category:electronics/product/123
```

```typescript
// Code stays the same!
enforce("user:jane", "project:123", "warehouse:W1/product/456", "write")
```

### GraphQL API for Project Access

```graphql
type Member {
  id: ID!
  user: User!
  orgRole: OrgRole!                     # owner, admin, member (org-level)
  projectAccess: [ProjectAccess!]!      # project-specific roles
}

type ProjectAccess {
  project: Project                      # null if "*" (all projects)
  role: ProjectRole!                    # admin, editor, viewer
  allProjects: Boolean!                 # true if "*"
}

enum OrgRole {
  OWNER     # Full org control
  ADMIN     # Manage org settings, members
  MEMBER    # Basic org access, needs project roles
}

enum ProjectRole {
  ADMIN     # Full project control
  EDITOR    # Create/edit content
  VIEWER    # Read-only access
}

type Mutation {
  # Assign role for specific project
  assignProjectRole(
    memberId: ID!
    projectId: ID!          # or "all" for all projects
    role: ProjectRole!
  ): Member!

  # Remove project access
  removeProjectAccess(
    memberId: ID!
    projectId: ID!
  ): Member!
}
```

### Examples

```graphql
# John = admin in all projects
mutation {
  assignProjectRole(memberId: "john", projectId: "all", role: ADMIN)
}

# Jane = editor only in "My Store"
mutation {
  assignProjectRole(memberId: "jane", projectId: "project:123", role: EDITOR)
}

# Bob = viewer in two specific projects
mutation {
  assignProjectRole(memberId: "bob", projectId: "project:123", role: VIEWER)
}
mutation {
  assignProjectRole(memberId: "bob", projectId: "project:456", role: VIEWER)
}

# Query member's access
query {
  member(id: "jane") {
    user { email }
    orgRole
    projectAccess {
      allProjects
      project { name }
      role
    }
  }
}
# Returns:
# {
#   user: { email: "jane@example.com" },
#   orgRole: "MEMBER",
#   projectAccess: [
#     { allProjects: false, project: { name: "My Store" }, role: "EDITOR" }
#   ]
# }
```

---

## Migration Plan

### Phase 1: Fix Casbin Adapter
1. Install `drizzle-adapter` for Casbin https://github.com/node-casbin/drizzle-adapter
2. Update CasbinService to use DrizzleAdapter with `iam.casbin_rule` table
3. Migrate data from `public.casbin` (JSONB) to `iam.casbin_rule` (v0-v5)
4. Remove `casbin-pg-adapter` dependency

### Phase 2: Add Organization Entity
5. Create `Organization` type in IAM schema
6. Add `organizationId` claim support in JWT
7. Add `myOrganizations` query
8. Add `switchOrganization` mutation
9. Keep existing `X-Project-Name` flow working (parallel)

### Phase 3: Update Casbin Model (Domain)
10. Update `model.conf` to add domain parameter
11. Add domain column to `iam.casbin_rule` (v6 or separate column)
12. Update CasbinService to use 4-param enforce
13. Add `assignRole` / `removeRole` mutations with domain
14. Migrate existing policies: set domain = "*" (all projects)

### Phase 4: Update Project Service
15. Add `organizationId` column to Project table
16. Add `organization` field resolver (federation reference)
17. Migrate existing projects to organizations

### Phase 5: Cleanup IAM
18. Remove `extend type Project` from IAM
19. Remove `project.getCurrentProject` broker call
20. Remove `X-Project-Name` header support
21. Read `organizationId` from JWT only

### Phase 6: Resource Registration
22. Add `iam.registerResources` action
23. Update services to register on startup
24. Remove polling from IAM

---

## Files to Modify

### IAM Service

| File | Change |
|------|--------|
| `package.json` | Add `drizzle-adapter https://github.com/node-casbin/drizzle-adapter`, remove `casbin-pg-adapter` |
| `src/casbin/CasbinService.ts` | Use DrizzleAdapter with `iam.casbin_rule` |
| `src/casbin/model.conf` | Add domain parameter (sub, dom, obj, act) |
| `src/api/graphql-admin/contextMiddleware.ts` | Read organizationId from JWT |
| `src/api/graphql-admin/schema/role.graphql` | Remove `extend type Project` |
| `src/api/graphql-admin/schema/organization.graphql` | NEW: Organization type, ProjectAccess |
| `src/api/graphql-admin/resolvers/role.ts` | Remove Project resolvers |
| `src/api/graphql-admin/resolvers/organization.ts` | NEW: Organization resolvers |
| `src/api/graphql-admin/resolvers/projectAccess.ts` | NEW: assignProjectRole, removeProjectAccess |
| `src/scripts/authorization/AuthorizeScript.ts` | Add projectId to authorize() |
| `src/scripts/resources/ListResourcesScript.ts` | Replace with registration storage |
| `src/iam.nest-service.ts` | Add new broker actions |
| `src/repositories/models/authorization.ts` | Update casbin_rule schema for domain |

### Project Service

| File | Change |
|------|--------|
| `schema/project.graphql` | Add `organization: Organization` field |
| `resolvers/project.ts` | Add federation reference resolver |
| `db/schema.ts` | Add `organizationId` column |

### Other Services

| Service | Change |
|---------|--------|
| inventory, media, etc. | Register resources on startup |
| All services | Pass projectId to authorize() calls |

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Casbin adapter | `casbin-pg-adapter` (public.casbin, JSONB) | `drizzle-adapter` (iam.casbin_rule, v0-v5) |
| Org resolution | IAM calls Project | JWT contains organizationId |
| Federation | IAM extends Project | IAM owns Organization, Project references it |
| Resource discovery | IAM polls services | Services register to IAM |
| Dependency direction | IAM → Project | Project → IAM |
| Team management | Tied to Project | Organization level (shared across projects) |
| Project access | 1:1 organization=project | Domain in Casbin, per-project roles |
| Casbin model | 3 params (sub, obj, act) | 4 params (sub, dom, obj, act) |
| Future resources | Code changes needed | Just add policies (forward-compatible) |
