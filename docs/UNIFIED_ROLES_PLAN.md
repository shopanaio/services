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
- `Role` — universal roles at the organization level (without `type`)
- `Member` — single type for org-level and domain-level membership
- `domain = organizationId` for org-level
- `domain = storeId` for store-level
- `domain = *` for all stores
- Resources define what is available in each context

### Data Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  role table — roles are DEFINED at the organization level       │
│  (same roles for all domains within org)                        │
├─────────────────────────────────────────────────────────────────┤
│  id   │ organization_id │ name      │ display_name              │
│  r1   │ org-123         │ admin     │ Administrator             │
│  r2   │ org-123         │ manager   │ Manager                   │
│  r3   │ org-123         │ viewer    │ Viewer                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  user_role table — roles are ASSIGNED in domain context         │
├─────────────────────────────────────────────────────────────────┤
│  user_id │ role_id │ domain      │ meaning                      │
│  alice   │ r1      │ org-123     │ org admin (domain = orgId)   │
│  bob     │ r2      │ store-A     │ manager in store A           │
│  bob     │ r3      │ store-B     │ viewer in store B            │
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
  domain: ID!

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
  domain: ID!

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
  domain: ID!

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
  domain: ID!
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

## Phase 2: Update Repository

### 2.1 UserRoleRepository

**File:** `services/iam/src/repositories/authorization/UserRoleRepository.ts`

```typescript
export class UserRoleRepository {
  constructor(private readonly db: Database) {}

  /**
   * Get all roles in organization (for role editor UI)
   */
  async findByOrganization(organizationId: string): Promise<Role[]> {
    return this.db
      .select()
      .from(role)
      .where(eq(role.organizationId, organizationId));
  }

  /**
   * Get org-level members (domain = organizationId)
   */
  async findOrgMembers(organizationId: string): Promise<UserRoleWithRole[]> {
    return this.db
      .select({
        id: userRole.id,
        userId: userRole.userId,
        domain: userRole.domain,
        grantedAt: userRole.grantedAt,
        grantedBy: userRole.grantedBy,
        role: role,
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(
        and(
          eq(userRole.organizationId, organizationId),
          eq(userRole.domain, organizationId) // domain = orgId
        )
      );
  }

  /**
   * Get domain members (domain = storeId OR domain = '*')
   */
  async findDomainMembers(
    organizationId: string,
    domain: string
  ): Promise<UserRoleWithRole[]> {
    return this.db
      .select({
        id: userRole.id,
        userId: userRole.userId,
        domain: userRole.domain,
        grantedAt: userRole.grantedAt,
        grantedBy: userRole.grantedBy,
        role: role,
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(
        and(
          eq(userRole.organizationId, organizationId),
          or(
            eq(userRole.domain, domain), // specific store
            eq(userRole.domain, "*")     // wildcard - all stores
          )
        )
      );
  }

  /**
   * Get all roles for a user in organization
   */
  async findUserRoles(
    organizationId: string,
    userId: string
  ): Promise<Array<{ domain: string; role: Role }>> {
    return this.db
      .select({
        domain: userRole.domain,
        role: role,
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(
        and(
          eq(userRole.organizationId, organizationId),
          eq(userRole.userId, userId)
        )
      );
  }

  /**
   * Assign role to user in domain
   */
  async assignRole(
    organizationId: string,
    userId: string,
    roleId: string,
    domain: string,
    grantedBy?: string
  ): Promise<UserRole> {
    const [result] = await this.db
      .insert(userRole)
      .values({
        organizationId,
        userId,
        roleId,
        domain,
        grantedBy,
        grantedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userRole.organizationId, userRole.userId, userRole.domain],
        set: { roleId, grantedBy, grantedAt: new Date() },
      })
      .returning();

    return result;
  }

  /**
   * Remove role from user in domain
   */
  async removeRole(
    organizationId: string,
    userId: string,
    domain: string
  ): Promise<boolean> {
    const result = await this.db
      .delete(userRole)
      .where(
        and(
          eq(userRole.organizationId, organizationId),
          eq(userRole.userId, userId),
          eq(userRole.domain, domain)
        )
      )
      .returning();

    return result.length > 0;
  }
}
```

---

## Phase 3: Update Casbin

### 3.1 Resource Constants

**File:** `services/iam/src/constants/rbac.ts`

```typescript
/**
 * Organization-level resources (accessible when domain = orgId)
 */
export const ORG_RESOURCES = [
  "organization",
  "organization/settings",
  "organization/billing",
  "member",
  "member/invite",
  "member/remove",
  "role",
] as const;

/**
 * Store-level resources (accessible when domain = storeId)
 */
export const STORE_RESOURCES = [
  "product",
  "product/variant",
  "order",
  "order/fulfill",
  "inventory",
  "customer",
  "media",
  "category",
] as const;

/**
 * Predefined role permissions
 * These apply regardless of domain - domain determines which resources exist
 */
export const ROLE_PERMISSIONS: Record<string, RolePermissionDef> = {
  owner: {
    allow: [{ resource: "*", actions: ["*"] }],
  },

  admin: {
    allow: [
      { resource: "*", actions: ["*"] },
    ],
    deny: [
      { resource: "organization", actions: ["delete"] },
      { resource: "organization/billing", actions: ["*"] },
    ],
  },

  manager: {
    allow: [
      { resource: "*", actions: ["read"] },
      { resource: "product/*", actions: ["*"] },
      { resource: "category/*", actions: ["*"] },
      { resource: "order/*", actions: ["*"] },
      { resource: "media/*", actions: ["*"] },
    ],
  },

  support: {
    allow: [
      { resource: "*", actions: ["read"] },
      { resource: "order/*", actions: ["update"] },
      { resource: "customer/*", actions: ["read", "update"] },
    ],
  },

  viewer: {
    allow: [{ resource: "*", actions: ["read"] }],
  },
};
```

### 3.2 CasbinService Methods

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

## Phase 4: Update Resolvers

### 4.1 Organization Resolver

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

### 4.2 Store Resolver (in Project Service)

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

### 4.3 Membership Resolver

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

### 4.4 Member Resolver

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

### 4.5 Mutation Resolvers

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

## Phase 5: Data Migration

### 5.1 Create System Roles for Each Organization

```typescript
// scripts/create-system-roles.ts
async function createSystemRoles(organizationId: string) {
  const systemRoles = [
    { name: "owner", displayName: "Owner", isSystem: true },
    { name: "admin", displayName: "Administrator", isSystem: true },
    { name: "manager", displayName: "Manager", isSystem: true },
    { name: "support", displayName: "Support", isSystem: true },
    { name: "viewer", displayName: "Viewer", isSystem: true },
  ];

  for (const roleData of systemRoles) {
    // Create role
    const role = await roleRepo.create({ organizationId, ...roleData });

    // Add Casbin policies
    const permissions = ROLE_PERMISSIONS[roleData.name];
    if (permissions) {
      for (const perm of permissions.allow) {
        for (const action of perm.actions) {
          await casbin.addPolicy(
            organizationId,
            roleData.name,
            "*", // applies to all domains
            perm.resource,
            action,
            "allow"
          );
        }
      }
    }
  }
}
```

### 5.2 Migrate Existing organization_member

```typescript
// scripts/migrate-org-members.ts
async function migrateOrgMembers(organizationId: string) {
  const members = await orgRepo.getMembersForOrg(organizationId);

  for (const member of members) {
    // Find role by name
    const role = await roleRepo.findByName(organizationId, member.orgRole);

    if (role) {
      // Create user_role entry with domain = orgId
      await userRoleRepo.assignRole(
        organizationId,
        member.userId,
        role.id,
        organizationId, // domain = orgId for org-level
        member.invitedBy
      );

      // Add Casbin grouping
      await casbin.assignRole(
        organizationId,
        member.userId,
        member.orgRole,
        organizationId
      );
    }
  }
}
```

### 5.3 SQL Migration

```sql
-- migrations/XXXX_unified_roles.sql

-- 1. Ensure role table has id as primary key (already exists)

-- 2. Create system roles for each organization (if not exist)
INSERT INTO iam.role (organization_id, name, display_name, is_system, created_at, updated_at)
SELECT o.id, 'owner', 'Owner', true, NOW(), NOW()
FROM iam.organization o
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role r WHERE r.organization_id = o.id AND r.name = 'owner'
);

INSERT INTO iam.role (organization_id, name, display_name, is_system, created_at, updated_at)
SELECT o.id, 'admin', 'Administrator', true, NOW(), NOW()
FROM iam.organization o
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role r WHERE r.organization_id = o.id AND r.name = 'admin'
);

INSERT INTO iam.role (organization_id, name, display_name, is_system, created_at, updated_at)
SELECT o.id, 'manager', 'Manager', true, NOW(), NOW()
FROM iam.organization o
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role r WHERE r.organization_id = o.id AND r.name = 'manager'
);

INSERT INTO iam.role (organization_id, name, display_name, is_system, created_at, updated_at)
SELECT o.id, 'support', 'Support', true, NOW(), NOW()
FROM iam.organization o
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role r WHERE r.organization_id = o.id AND r.name = 'support'
);

INSERT INTO iam.role (organization_id, name, display_name, is_system, created_at, updated_at)
SELECT o.id, 'viewer', 'Viewer', true, NOW(), NOW()
FROM iam.organization o
WHERE NOT EXISTS (
  SELECT 1 FROM iam.role r WHERE r.organization_id = o.id AND r.name = 'viewer'
);

-- 3. Migrate existing org members to user_role table (orgId as domain for org-level)
INSERT INTO iam.user_role (organization_id, user_id, role_id, domain, granted_by, granted_at)
SELECT
  om.organization_id,
  om.user_id,
  r.id,
  om.organization_id, -- domain = orgId for org-level access
  om.invited_by,
  om.created_at
FROM iam.organization_member om
JOIN iam.role r ON r.organization_id = om.organization_id AND r.name = om.org_role
ON CONFLICT (organization_id, user_id, domain) DO NOTHING;
```

---

## Phase 6: Testing

### 6.1 Unit Tests

```typescript
describe("Unified Roles", () => {
  describe("Role assignment", () => {
    it("should assign same role at org and store level", async () => {
      // Assign admin at org level
      await casbin.assignRole(orgId, userId, "admin", orgId);

      // Assign admin at store level
      await casbin.assignRole(orgId, userId, "admin", storeId);

      // Both should work
      const orgRoles = await casbin.getRolesForUserInDomain(orgId, userId, orgId);
      const storeRoles = await casbin.getRolesForUserInDomain(orgId, userId, storeId);

      expect(orgRoles).toContain("admin");
      expect(storeRoles).toContain("admin");
    });

    it("should enforce permissions based on domain context", async () => {
      await casbin.assignRole(orgId, userId, "admin", orgId);

      // Org-level: can manage members
      const canInvite = await casbin.enforce(orgId, userId, orgId, "member", "invite");
      expect(canInvite).toBe(true);

      // Store-level: no access (not assigned)
      const canProduct = await casbin.enforce(orgId, userId, storeId, "product", "update");
      expect(canProduct).toBe(false);
    });
  });

  describe("Member queries", () => {
    it("should return org members with domain = orgId", async () => {
      await userRoleRepo.assignRole(orgId, userId, roleId, orgId);

      const members = await userRoleRepo.findOrgMembers(orgId);
      expect(members).toHaveLength(1);
      expect(members[0].domain).toBe(orgId);
    });

    it("should return store members including wildcard", async () => {
      await userRoleRepo.assignRole(orgId, "alice", roleId, storeId);
      await userRoleRepo.assignRole(orgId, "bob", roleId, "*");

      const members = await userRoleRepo.findDomainMembers(orgId, storeId);
      expect(members).toHaveLength(2);
    });
  });
});
```

### 6.2 Integration Tests

```graphql
# Create custom role
mutation {
  roleMutation {
    roleCreate(input: {
      name: "content-editor"
      displayName: "Content Editor"
      permissions: [
        { resource: "product", actions: ["read", "update"], effect: ALLOW }
        { resource: "category", actions: ["read"], effect: ALLOW }
      ]
    }) {
      role { id name }
      userErrors { message }
    }
  }
}

# Invite member with roles
mutation {
  inviteMember(input: {
    email: "user@example.com"
    roles: [
      { domain: "org-uuid", role: "admin" }      # org level
      { domain: "store-uuid", role: "manager" }  # store level
    ]
  }) {
    member { id user { email } }
    userErrors { message }
  }
}

# Change role (works for any domain)
mutation {
  changeRole(input: {
    userId: "user-123"
    domain: "org-uuid"  # or store-uuid
    role: "admin"
  }) {
    member { id role }
    userErrors { message }
  }
}

# Remove access from domain
mutation {
  removeAccess(input: {
    userId: "user-123"
    domain: "store-uuid"
  }) {
    success
    userErrors { message }
  }
}

# Query org membership
query {
  organization(id: "org-uuid") {
    membership {
      domain
      members {
        id
        user { id email }
        role  # String! - role name
        grantedAt
      }
      roles { id name displayName isSystem }
      availableResources { name actions }  # only for org-level
    }
  }
}

# Query store membership (same Membership type)
query {
  store(id: "store-uuid") {
    membership {
      domain
      members {
        id
        user { id email }
        role
      }
      roles { id name displayName }
      # availableResources: null for store-level
    }
  }
}
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

### Phase 2: Repository
- [ ] Add `findOrgMembers()` to UserRoleRepository
- [ ] Add `findDomainMembers()` to UserRoleRepository
- [ ] Add `findUserRoles()` to UserRoleRepository
- [ ] Add `assignRole()` with upsert
- [ ] Add `removeRole()`

### Phase 3: Casbin
- [ ] Add `ORG_RESOURCES` constants
- [ ] Update `assignRole()` for simple domain string
- [ ] Update `enforce()` for simple domain string
- [ ] Add `getOrgMembers()`
- [ ] Add `getMembersForDomain()`

### Phase 4: Resolvers
- [ ] `OrganizationResolver.membership` → return `{ domain: orgId }`
- [ ] `StoreResolver.membership` → return `{ domain: storeId }`
- [ ] `MembershipResolver.__resolveReference` — unified resolver
- [ ] `MemberResolver.__resolveReference`
- [ ] Add `inviteMember` mutation
- [ ] Add `changeRole` mutation
- [ ] Add `removeAccess` mutation

### Phase 5: Migration
- [ ] SQL: create system roles
- [ ] SQL: migrate organization_member → user_role
- [ ] Script: create Casbin policies for roles
- [ ] Script: create Casbin groupings for members

### Phase 6: Testing
- [ ] Unit tests for role assignment
- [ ] Unit tests for member queries
- [ ] GraphQL integration tests
- [ ] E2E tests

---

## Notes

1. **Backward Compatibility:**
   - `organization_member.orgRole` remains for quick lookup
   - Source of truth for permissions — `user_role` + Casbin

2. **Domain Convention:**
   - `domain = organizationId` → org-level (member, billing, settings)
   - `domain = storeId` → store-level (product, order, etc.)
   - `domain = *` → all stores

3. **Role Universality:**
   - The same role "admin" can be assigned at any level
   - Permissions are the same, but resources differ in different contexts

4. **Federation:**
   - `Role @key(fields: "id")` — reference from other services
   - `Member @key(fields: "id")` — unified type for all memberships
   - `Membership @key(fields: "domain")` — unified container for org and store

5. **Visualization:**
```
Organization: "Acme Corp" (org-123)
│
├── membership: Membership (domain = org-123)
│   ├── roles: [Role!]!
│   │   ├── owner, admin, manager, support, viewer (system)
│   │   └── content-editor, finance-admin (custom)
│   ├── members: [Member!]!
│   │   ├── { id: m1, user: alice, role: "owner" }
│   │   └── { id: m2, user: bob, role: "admin" }
│   └── availableResources: [ResourceDefinition!]  ← only org-level
│
├── Store "US"
│   └── membership: Membership (domain = store-A)
│       ├── roles: [Role!]!  ← same roles
│       └── members: [Member!]!
│           ├── { id: m3, user: charlie, role: "manager" }
│           └── { id: m4, user: alice, role: "admin" }  (via domain=*)
│
└── Store "EU"
    └── membership: Membership (domain = store-B)
        ├── roles: [Role!]!  ← same roles
        └── members: [Member!]!
            ├── { id: m5, user: dave, role: "viewer" }
            └── { id: m4, user: alice, role: "admin" }  (via domain=*)
```

6. **Unification:**
   - `Membership` — unified container for org and store
   - `Member` — unified type for all memberships
   - Domain determines context (orgId vs storeId)
   - Federation: `Membership @key(fields: "domain")`, `Member @key(fields: "id")`
