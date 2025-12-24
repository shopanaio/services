# Plan: Unified Custom Roles for Organization and Domain

## Overview

Implementation of a unified custom role system that can be used at both the organization level and the domain (store) level. Roles are universal — the context (domain) determines where they are applied.

### Current State

**Organization Member:**
- `org_role: varchar` — hardcoded values: `owner`, `admin`, `member`
- No relation to the `role` table
- No custom permissions

**Domain Role:**
- `role` table with custom roles
- `user_role` table with `domain` field
- Casbin for permissions

### Target State

**Unified System:**
- `Role` — roles with optional domain scope (global or domain-specific)
- `Member` — single type for org-level and domain-level membership
- `domain = organizationId` for org-level
- `domain = storeId` for store-level
- `domain = *` for all domains (global roles)
- Resources define what is available in each context

**Role Scoping:**
- Roles can be **global** (`domain = "*"`) — available in all domains
- Roles can be **domain-specific** (`domain = storeId`) — only in that store
- System roles are always global
- Custom roles can be either global or domain-specific

### Data Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│  role table — roles DEFINED with optional domain scope                   │
│  unique constraint: (organization_id, domain, name)                      │
├──────────────────────────────────────────────────────────────────────────┤
│  id   │ organization_id │ domain    │ name      │ display_name           │
│  r1   │ org-123         │ *         │ admin     │ Administrator (global) │
│  r2   │ org-123         │ *         │ viewer    │ Viewer (global)        │
│  r3   │ org-123         │ store-A   │ editor    │ Editor (store-A only)  │
│  r4   │ org-123         │ store-B   │ editor    │ Editor (store-B only)  │
│  r5   │ org-123         │ store-A   │ manager   │ Manager (store-A only) │
└──────────────────────────────────────────────────────────────────────────┘

Note: "editor" can exist in both store-A and store-B as separate roles
      because unique constraint is (org_id, domain, name)

┌─────────────────────────────────────────────────────────────────┐
│  user_role table — roles are ASSIGNED in domain context         │
├─────────────────────────────────────────────────────────────────┤
│  user_id │ role_id │ domain      │ meaning                      │
│  alice   │ r1      │ org-123     │ org admin (domain = orgId)   │
│  bob     │ r3      │ store-A     │ editor in store A            │
│  bob     │ r4      │ store-B     │ editor in store B            │
│  charlie │ r1      │ *           │ admin in ALL stores          │
└─────────────────────────────────────────────────────────────────┘
```

### Domain Convention

| Domain Value | Meaning | Resources |
|--------------|---------|-----------|
| `organizationId` | Org-level access | `member`, `billing`, `organization/*`, `role` |
| `storeId` | Store-level access | `product`, `order`, `inventory`, `customer` |
| `*` | All stores | Store resources in all stores |

---

## Phase 1: Update GraphQL Schema

### 1.1 Update Role Type

**File:** `services/iam/src/api/graphql-admin/schema/role.graphql`

```graphql
"""
Role with permissions - universal, can be assigned at any level.
"""
type Role @key(fields: "id") {
  """Unique identifier."""
  id: ID!

  """Unique role name within organization (e.g.: admin, manager, viewer)."""
  name: String!

  """Human-readable display name."""
  displayName: String!

  """Role description."""
  description: String

  """System role cannot be deleted or modified."""
  isSystem: Boolean!

  """Role permissions."""
  permissions: [RolePermission!]!

  """Role creation date."""
  createdAt: DateTime
}
```

### 1.2 Unified Member Type

**File:** `services/iam/src/api/graphql-admin/schema/member.graphql`

```graphql
"""
Member with role assignment.
Used for both org-level (domain = orgId) and domain-level (domain = storeId).
"""
type Member @key(fields: "id") {
  """Unique identifier."""
  id: ID!

  """User reference."""
  user: User!

  """Role name."""
  role: String!

  """When access was granted."""
  grantedAt: DateTime!

  """User who granted access."""
  grantedBy: User
}
```

> **Note:** `role` is `String!` (role name). The full `Role` object is available via `Organization.roles` or `Membership.roles`.

### 1.3 Unified Membership

**File:** `services/iam/src/api/graphql-admin/schema/membership.graphql`

```graphql
"""
Membership — universal container for members and roles.
Used for both Organization and Store.
Domain determines context: orgId for org-level, storeId for store-level.
"""
type Membership @key(fields: "domain") {
  """Domain identifier (orgId or storeId)."""
  domain: String!

  """All roles available in this organization."""
  roles: [Role!]!

  """All members with access to this domain."""
  members: [Member!]!

  """Available resources for role editor (org-level only)."""
  availableResources: [ResourceDefinition!]
}
```

### 1.4 Update Organization

**File:** `services/iam/src/api/graphql-admin/schema/organization.graphql`

```graphql
type Organization @key(fields: "id") {
  """Unique identifier."""
  id: ID!

  """Organization name."""
  name: String!

  """URL-friendly unique identifier."""
  slug: String!

  """Membership info (members + roles). Domain = orgId."""
  membership: Membership!

  """Timestamp when the organization was created."""
  createdAt: DateTime!

  """Timestamp when the organization was last updated."""
  updatedAt: DateTime
}
```

### 1.5 Store Uses the Same Membership

**File:** `services/project/src/api/graphql-admin/schema/project.graphql`

```graphql
type Store @key(fields: "id") {
  # ... existing fields ...

  """Membership info (members + roles). Domain = storeId."""
  membership: Membership!
}
```

> **Note:** `Membership` is a unified type. `Organization.membership` uses `domain = orgId`, `Store.membership` uses `domain = storeId`.

### 1.6 Update Mutations

```graphql
"""
Role assignment - assigns role to user in specific domain.
"""
input RoleAssignment {
  """Domain ID (orgId, storeId, or '*' for all stores)."""
  domain: String!

  """Role name."""
  role: String!
}

"""
Input for inviting a member to organization.
"""
input InviteMemberInput {
  """Email address of the user to invite."""
  email: Email!

  """Role assignments (at least one required)."""
  roles: [RoleAssignment!]!
}

"""
Input for changing member's role.
"""
input ChangeRoleInput {
  """User ID."""
  userId: ID!

  """Domain (orgId, storeId, or '*' for all)."""
  domain: String!

  """New role name."""
  role: String!
}

type ChangeRolePayload {
  member: Member
  userErrors: [GenericUserError!]!
}

"""
Input for removing member's access.
"""
input RemoveAccessInput {
  """User ID."""
  userId: ID!

  """Domain to remove access from."""
  domain: String!
}

type RemoveAccessPayload {
  success: Boolean!
  userErrors: [GenericUserError!]!
}

extend type Mutation {
  """
  Invite member to organization with role assignments.
  """
  inviteMember(input: InviteMemberInput!): InviteMemberPayload!

  """
  Change role for a member in specific domain.
  """
  changeRole(input: ChangeRoleInput!): ChangeRolePayload!

  """
  Remove member's access from domain.
  """
  removeAccess(input: RemoveAccessInput!): RemoveAccessPayload!
}
```

> **Note:** All mutations are universal — `domain` determines context (orgId for org-level, storeId for store-level).

---

## Phase 2: Update Casbin & IAM Resources

### 2.1 IAM getResources (org-level resources)

**File:** `services/iam/src/scripts/resources/getResources.ts`

The IAM service declares its resources via `getResources` — just like other services.
These are organization-level resources, they work with `domain = organizationId`.

```typescript
import type { GetResourcesResult } from "@shopana/shared-kernel";

/**
 * Returns the list of resources and actions exposed by the IAM service.
 * These are organization-level resources (domain = organizationId).
 */
export async function getResources(): Promise<GetResourcesResult> {
  return {
    service: "iam",
    displayName: "Organization",
    resources: [
      {
        name: "organization",
        displayName: "Organization",
        description: "Organization settings and management",
        actions: [
          { name: "read", displayName: "View", description: "View organization details" },
          { name: "update", displayName: "Edit", description: "Edit organization settings" },
          { name: "delete", displayName: "Delete", description: "Delete organization" },
        ],
      },
      {
        name: "organization/billing",
        displayName: "Billing",
        description: "Billing and subscription management",
        actions: [
          { name: "read", displayName: "View", description: "View billing information" },
          { name: "update", displayName: "Manage", description: "Manage billing settings" },
        ],
      },
      {
        name: "member",
        displayName: "Members",
        description: "Organization member management",
        actions: [
          { name: "read", displayName: "View", description: "View members list" },
          { name: "invite", displayName: "Invite", description: "Invite new members" },
          { name: "remove", displayName: "Remove", description: "Remove members" },
          { name: "update", displayName: "Change Role", description: "Change member roles" },
        ],
      },
      {
        name: "role",
        displayName: "Roles",
        description: "Role and permission management",
        actions: [
          { name: "read", displayName: "View", description: "View roles" },
          { name: "create", displayName: "Create", description: "Create custom roles" },
          { name: "update", displayName: "Edit", description: "Edit role permissions" },
          { name: "delete", displayName: "Delete", description: "Delete custom roles" },
        ],
      },
    ],
  };
}
```

### 2.2 Predefined Role Permissions (org-level only)

**File:** `services/iam/src/constants/rbac.ts`

Predefined roles work with `domain = organizationId` and have access only to IAM resources.
For store-level resources, custom roles with `domain = storeId` are used.

```typescript
/**
 * Predefined role permissions for organization-level resources.
 * These roles manage the organization itself (members, billing, stores).
 * Store-level permissions are assigned via custom roles with domain = storeId.
 */
export const ROLE_PERMISSIONS: Record<string, RolePermissionDef> = {
  owner: {
    allow: [{ resource: "*", actions: ["*"] }],
  },

  admin: {
    allow: [{ resource: "*", actions: ["*"] }],
    deny: [
      { resource: "organization", actions: ["delete"] },
      { resource: "organization/billing", actions: ["*"] },
    ],
  },

  member: {
    allow: [
      { resource: "organization", actions: ["read"] },
    ],
  },
};
```

### 2.2 CasbinService Methods

**File:** `services/iam/src/casbin/CasbinService.ts`

```typescript
/**
 * Assign role to user in specific domain.
 *
 * @param organizationId - Organization ID
 * @param userId - User ID
 * @param role - Role name
 * @param domain - Domain: orgId for org-level, storeId for store-level, "*" for all
 */
async assignRole(
  organizationId: string,
  userId: string,
  role: string,
  domain: string
): Promise<boolean> {
  if (!this.adapter) {
    throw new Error("Adapter not initialized");
  }

  try {
    await this.adapter.addPolicy("g", "g", [
      `user:${userId}`,
      role,
      domain,
      organizationId,
    ]);
  } catch (error: any) {
    if (error?.code !== "23505") throw error;
    return false;
  }

  await this.invalidateEnforcer(organizationId);
  return true;
}

/**
 * Check permission in specific domain context.
 */
async enforce(
  organizationId: string,
  userId: string,
  domain: string,
  resource: string,
  action: string
): Promise<boolean> {
  const enforcer = await this.getEnforcer(organizationId);
  return enforcer.enforce(`user:${userId}`, domain, resource, action);
}

/**
 * Get members for specific domain.
 * Returns users with direct domain assignment + wildcard (*) assignment.
 */
async getMembersForDomain(
  organizationId: string,
  domain: string
): Promise<Array<{ userId: string; role: string }>> {
  const enforcer = await this.getEnforcer(organizationId);
  const groupings = await enforcer.getGroupingPolicy();

  const members: Array<{ userId: string; role: string }> = [];

  for (const grouping of groupings) {
    // grouping: [user, role, domain]
    if (grouping[2] === domain || grouping[2] === "*") {
      const userId = grouping[0].startsWith("user:")
        ? grouping[0].substring(5)
        : grouping[0];
      members.push({ userId, role: grouping[1] });
    }
  }

  return members;
}

/**
 * Get org-level members (domain = organizationId).
 */
async getOrgMembers(
  organizationId: string
): Promise<Array<{ userId: string; role: string }>> {
  return this.getMembersForDomain(organizationId, organizationId);
}
```

---

## Phase 3: Update Resolvers

### 3.1 Organization Resolver

**File:** `services/iam/src/api/graphql-admin/resolvers/organization.ts`

```typescript
export const OrganizationResolver = {
  Organization: {
    // Return Federation reference - IAM resolves via Membership.__resolveReference
    membership: (org) => {
      return { domain: org.id };  // domain = orgId
    },
  },
};
```

### 3.2 Store Resolver (in Project Service)

**File:** `services/project/src/api/graphql-admin/resolvers/store.ts`

```typescript
export const StoreResolver = {
  Store: {
    // Return Federation reference - IAM resolves via Membership.__resolveReference
    membership: (store) => {
      return { domain: store.id };  // domain = storeId
    },
  },
};
```

### 3.3 Membership Resolver

**File:** `services/iam/src/api/graphql-admin/resolvers/membership.ts`

```typescript
export const MembershipResolver = {
  Membership: {
    __resolveReference: async (ref, ctx) => {
      const domain = ref.domain; // orgId or storeId

      const [roles, userRoles, resources] = await Promise.all([
        ctx.repos.role.findByOrganization(ctx.organizationId),
        ctx.repos.userRole.findDomainMembers(ctx.organizationId, domain),
        ctx.repos.resource.findAll(),
      ]);

      // Check if this is org-level (domain === organizationId)
      const isOrgLevel = domain === ctx.organizationId;

      return {
        domain,
        roles,
        members: userRoles.map((ur) => ({
          id: ur.id,
          user: { id: ur.userId },
          role: ur.role.name,
          grantedAt: ur.grantedAt,
          grantedBy: ur.grantedBy ? { id: ur.grantedBy } : null,
        })),
        // availableResources only for org-level
        availableResources: isOrgLevel ? resources : null,
      };
    },
  },
};
```

### 3.4 Member Resolver

**File:** `services/iam/src/api/graphql-admin/resolvers/member.ts`

```typescript
export const MemberResolver = {
  Member: {
    __resolveReference: async (ref, ctx) => {
      // Lookup by id in user_role table
      return ctx.repos.userRole.findById(ref.id);
    },

    user: (member) => ({ id: member.userId }),
    grantedBy: (member) => member.grantedBy ? { id: member.grantedBy } : null,
  },
};
```

### 3.5 Mutation Resolvers

```typescript
export const MutationResolver = {
  Mutation: {
    // Invite member with role assignments
    inviteMember: async (_, { input }, ctx) => {
      const { email, roles } = input;

      // 1. Find or create user by email
      const user = await ctx.repos.user.findOrCreateByEmail(email);

      // 2. Add to organization_member table (for quick lookup)
      await ctx.repos.organization.addMember({
        organizationId: ctx.organizationId,
        userId: user.id,
        invitedBy: ctx.userId,
      });

      // 3. Assign all roles
      for (const assignment of roles) {
        const role = await ctx.repos.role.findByName(ctx.organizationId, assignment.role);
        if (!role) {
          return { member: null, userErrors: [{ message: `Role not found: ${assignment.role}` }] };
        }

        // Save to user_role table
        await ctx.repos.userRole.assignRole(
          ctx.organizationId,
          user.id,
          role.id,
          assignment.domain,
          ctx.userId
        );

        // Save to Casbin
        await ctx.casbin.assignRole(
          ctx.organizationId,
          user.id,
          assignment.role,
          assignment.domain
        );
      }

      return {
        member: { id: user.id, user: { id: user.id }, role: roles[0].role },
        userErrors: [],
      };
    },

    // Change role in any domain
    changeRole: async (_, { input }, ctx) => {
      const { userId, domain, role: roleName } = input;

      // Validate role exists
      const role = await ctx.repos.role.findByName(ctx.organizationId, roleName);
      if (!role) {
        return { member: null, userErrors: [{ message: "Role not found" }] };
      }

      // Update in user_role table
      const userRole = await ctx.repos.userRole.assignRole(
        ctx.organizationId,
        userId,
        role.id,
        domain,
        ctx.userId
      );

      // Update in Casbin
      await ctx.casbin.assignRole(ctx.organizationId, userId, roleName, domain);

      return {
        member: { id: userRole.id, user: { id: userId }, role: roleName },
        userErrors: [],
      };
    },

    // Remove access from domain
    removeAccess: async (_, { input }, ctx) => {
      const { userId, domain } = input;

      // Remove from user_role table
      await ctx.repos.userRole.removeRole(ctx.organizationId, userId, domain);

      // Remove from Casbin
      await ctx.casbin.removeRole(ctx.organizationId, userId, domain);

      return { success: true, userErrors: [] };
    },
  },
};
```

---

## Checklist

### Phase 1: GraphQL Schema
- [ ] Add `id` to `Role` type, make `@key(fields: "id")`
- [ ] Create unified `Member @key(fields: "id")` type
- [ ] Remove `OrganizationMember` and `DomainMember`
- [ ] Update `Membership` — unified container for org and store
- [ ] Update `Organization.membership` → `Membership!`
- [ ] Update `Store.membership` → `Membership!`
- [ ] Add `RoleAssignment` input
- [ ] Add `ChangeRoleInput` and `RemoveAccessInput`
- [ ] Update `InviteMemberInput` (uses `[RoleAssignment!]!`)
- [ ] Run codegen

### Phase 2: Casbin & IAM Resources
- [ ] Add `getResources` script to IAM service (org-level resources)
- [ ] Update `ROLE_PERMISSIONS` — only org-level, predefined roles: owner, admin, member
- [ ] Update `assignRole()` for simple domain string
- [ ] Update `enforce()` for simple domain string
- [ ] Add `getOrgMembers()`
- [ ] Add `getMembersForDomain()`

### Phase 3: Resolvers
- [ ] `OrganizationResolver.membership` → return `{ domain: orgId }`
- [ ] `StoreResolver.membership` → return `{ domain: storeId }`
- [ ] `MembershipResolver.__resolveReference` — unified resolver
- [ ] `MemberResolver.__resolveReference`
- [ ] Add `inviteMember` mutation
- [ ] Add `changeRole` mutation
- [ ] Add `removeAccess` mutation

---

## Notes

1. **Resource Discovery via getResources:**
   - Each service exposes resources via `getResources` broker action
   - IAM service exposes org-level resources: `organization`, `organization/billing`, `member`, `role`
   - Project service exposes: `store`, `store/settings`
   - Other services expose store-level resources: `product`, `order`, `inventory`, etc.
   - IAM aggregates all resources for role editor UI

2. **Predefined Roles (org-level only):**
   - `owner` — full access to all org-level resources
   - `admin` — full access except org deletion and billing
   - `member` — read-only access to organization
   - These roles do NOT include store-level permissions
   - Store-level access is granted via custom roles with `domain = storeId`

3. **Domain Convention:**
   - `domain = organizationId` → org-level (member, billing, settings)
   - `domain = storeId` → store-level (product, order, etc.)
   - `domain = *` → all stores

4. **Role Scoping:**
   - Roles can be **global** (`domain = "*"`) — available everywhere
   - Roles can be **domain-specific** (`domain = storeId`) — only in that store
   - Same role name can exist in different domains (e.g., "editor" in store-A and store-B)
   - Unique constraint: `(organization_id, domain, name)`

5. **Federation:**
   - `Role @key(fields: "id")` — reference from other services
   - `Member @key(fields: "id")` — unified type for all memberships
   - `Membership @key(fields: "domain")` — unified container for org and store

6. **Visualization:**
```
Organization: "Acme Corp" (org-123)
│
├── Predefined roles (domain = org-123):
│   └── owner, admin, member (system)
│
├── membership: Membership (domain = org-123)
│   ├── roles: [predefined roles]
│   ├── members: [Member!]!
│   │   ├── { user: alice, role: "owner" }
│   │   └── { user: bob, role: "admin" }
│   └── availableResources: [IAM resources via getResources]
│
├── Store "US" (store-A)
│   ├── Custom roles (domain = "store-A"):
│   │   └── manager, content-editor, warehouse-manager
│   └── membership: Membership (domain = store-A)
│       ├── roles: [store-A custom roles]
│       ├── members: [Member!]!
│       │   ├── { user: charlie, role: "manager" }
│       │   └── { user: dave, role: "content-editor" }
│       └── availableResources: [inventory, media, orders via getResources]
│
└── Store "EU" (store-B)
    ├── Custom roles (domain = "store-B"):
    │   └── manager, translator   ← different permissions than store-A!
    └── membership: Membership (domain = store-B)
        ├── roles: [store-B custom roles]
        └── members: [Member!]!
            └── { user: eve, role: "manager" }
```

7. **Unification:**
   - `Membership` — unified container for org and store
   - `Member` — unified type for all memberships
   - Domain determines context (orgId vs storeId)
   - Federation: `Membership @key(fields: "domain")`, `Member @key(fields: "id")`
