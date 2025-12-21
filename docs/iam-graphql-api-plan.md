# IAM GraphQL API Plan - Roles & Permissions Management

## Overview

GraphQL API for role and permission management in IAM service. Hybrid approach (like AWS IAM, GCP, Stripe):
- Resources = API endpoints with operations
- Permissions = resource + actions + scope (own/all)
- Roles = predefined permission sets
- **Permission Overrides = per-user permission adjustments**

**Key principle:**
- **Project** contains all roles with their permissions (for admins and role editor UI)
- **User** has role + personal permission overrides
- Frontend computes effective permissions locally from roles + overrides

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Admin UI                                                    │
│  ├── Team Members page                                      │
│  ├── Role Editor                                            │
│  ├── Member Permission Overrides                            │
│  └── Permission checks (computed locally)                   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│  project.roles          │     │  project.members            │
│  (all roles + perms)    │     │  ├── role                   │
│                         │     │  └── permissionOverrides    │
└─────────────────────────┘     └─────────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend computes effective permissions:                    │
│                                                             │
│  effectivePerms = computePermissions(                       │
│    member.role,                    // base role             │
│    project.roles,                  // for inheritance       │
│    member.permissionOverrides      // personal overrides    │
│  );                                                         │
└─────────────────────────────────────────────────────────────┘
```

## Permission Model

### Core Concepts

| Concept | Description | Example |
|---------|-------------|---------|
| Resource | API entity | `product`, `order`, `category` |
| Action | Operation on resource | `create`, `read`, `update`, `delete`, `publish` |
| Scope | Access scope | `OWN` (only owned), `ALL` (all resources) |
| Effect | Allow or deny | `ALLOW`, `DENY` |
| Override | Per-user permission adjustment | Deny payments for specific admin |

### Permission Structure

```typescript
interface RolePermission {
  resource: string;      // "product", "order/*", "*"
  actions: string[];     // ["create", "read", "update", "delete"]
  scope: "OWN" | "ALL";  // access scope
  effect: "ALLOW" | "DENY";
}
```

### Permission Override (per-user)

Like AWS IAM User Policies or Stripe permission overrides:

```typescript
// Member with role + personal overrides
{
  user: "igor",
  role: "admin",
  permissionOverrides: [
    // Deny payments access specifically for Igor
    { resource: "payments", actions: ["*"], scope: "ALL", effect: "DENY" },
    // Deny billing access
    { resource: "project/billing", actions: ["*"], scope: "ALL", effect: "DENY" }
  ]
}
```

### Effective Permission Calculation

```
Effective = Role Permissions + Inherited Permissions + Personal Overrides

Priority: DENY always wins over ALLOW
Order: Overrides are applied last
```

```typescript
// Igor is admin but has payment restrictions
role: admin → { resource: "*", actions: ["*"], effect: "ALLOW" }
override:    → { resource: "payments", actions: ["*"], effect: "DENY" }

// Check: can Igor access payments?
// 1. Role says ALLOW (admin has *)
// 2. Override says DENY
// 3. Result: DENY (override wins, DENY priority)
```

## Casdoor Implementation

### How Overrides Work in Casdoor

Casdoor supports policies on both roles and users:

```
Tenant: org-my-shop
│
├── Roles
│   ├── admin
│   └── manager
│
├── Permissions (on roles)
│   ├── perm-admin-all         → roles: [admin]
│   └── perm-manager-products  → roles: [manager]
│
├── Permissions (on users = overrides)
│   ├── user-igor-payments-deny   → users: [igor], roles: []
│   └── user-igor-billing-deny    → users: [igor], roles: []
│
└── Grouping
    └── g, igor, admin
```

### Casdoor enforce() Flow

```
Request: user-igor, payments, read

1. Check user policies: p, user-igor, payments, * → DENY
2. Check role policies via grouping: p, admin, *, * → ALLOW
3. Apply DENY priority → Result: DENY
```

**Key:** Casdoor `enforce()` automatically considers both role and user policies. No changes needed in AuthorizeScript!

### API Implementation

```typescript
// Add permission override to user
async addPermissionOverride(params: {
  tenantId: string;
  userId: string;
  permission: RolePermission;
}) {
  await this.casdoor.addPermission({
    owner: params.tenantId,
    name: `override-${params.userId}-${params.permission.resource}`,

    resources: [params.permission.resource],
    actions: params.permission.actions,
    effect: params.permission.effect.toLowerCase(),

    // Key: bind to user, not role
    users: [params.userId],
    roles: [],  // empty = direct user policy
  });
}

// Remove permission override
async removePermissionOverride(params: {
  tenantId: string;
  userId: string;
  permissionName: string;
}) {
  await this.casdoor.deletePermission({
    owner: params.tenantId,
    name: params.permissionName,
  });
}

// Get member with overrides
async getMemberWithOverrides(tenantId: string, userId: string) {
  const roles = await this.casdoor.getRolesForUser(userId, tenantId);
  const allPermissions = await this.casdoor.getPermissions(tenantId);

  // Filter: permissions bound to user (not via role)
  const overrides = allPermissions.filter(p =>
    p.users?.includes(userId) &&
    (p.roles?.length === 0 || !p.roles)
  );

  return {
    userId,
    role: roles[0],
    permissionOverrides: overrides.map(mapToPermission),
  };
}
```

## GraphQL Schema

### File: `schema/role.graphql`

```graphql
# ============================================================================
# TYPES
# ============================================================================

"""
Project role with permissions.
"""
type ProjectRole {
  """
  Unique role name (e.g.: owner, admin, content-editor).
  """
  name: String!

  """
  Human-readable display name.
  """
  displayName: String!

  """
  Role description.
  """
  description: String

  """
  System role (owner, admin, manager, support, viewer) cannot be deleted.
  """
  isSystem: Boolean!

  """
  Roles this role inherits from (for hierarchy).
  E.g., manager inherits from support.
  """
  inherits: [String!]!

  """
  Role permissions.
  """
  permissions: [RolePermission!]!

  """
  Number of users with this role.
  """
  memberCount: Int!

  """
  Role creation date.
  """
  createdAt: DateTime
}

"""
Role permission - access to resource with specific actions and scope.
"""
type RolePermission {
  """
  Resource name (e.g.: product, order, project/settings).
  Supports wildcards: *, product/*, order/*.
  """
  resource: String!

  """
  Allowed actions (e.g.: create, read, update, delete).
  Supports wildcard: *.
  """
  actions: [String!]!

  """
  Access scope: OWN (only owned resources) or ALL (all resources).
  """
  scope: PermissionScope!

  """
  Effect: ALLOW or DENY.
  DENY takes priority over ALLOW.
  """
  effect: PermissionEffect!
}

"""
Permission scope.
"""
enum PermissionScope {
  """
  Access only to resources owned by the user.
  """
  OWN

  """
  Access to all resources regardless of owner.
  """
  ALL
}

"""
Permission effect.
"""
enum PermissionEffect {
  """
  Allow the action.
  """
  ALLOW

  """
  Deny the action (takes priority over ALLOW).
  """
  DENY
}

"""
Project team member with role and personal overrides.
"""
type ProjectMember {
  """
  User ID.
  """
  id: ID!

  """
  User.
  """
  user: User!

  """
  Assigned role.
  """
  role: ProjectRole!

  """
  Personal permission overrides.
  Applied after role permissions, DENY takes priority.
  Used to restrict or extend specific user's access.
  """
  permissionOverrides: [RolePermission!]!

  """
  Date when role was assigned.
  """
  grantedAt: DateTime!

  """
  Who assigned the role.
  """
  grantedBy: User
}

"""
Resource definition for role editor UI.
"""
type ResourceDefinition {
  """
  Service name (inventory, orders, etc.).
  """
  service: String!

  """
  Resource name (product, order, etc.).
  """
  name: String!

  """
  Available actions for resource.
  """
  actions: [String!]!

  """
  Whether resource supports OWN scope.
  """
  supportsOwnScope: Boolean!

  """
  Display name.
  """
  displayName: String

  """
  Description.
  """
  description: String
}

# ============================================================================
# EXTEND PROJECT TYPE
# ============================================================================

extend type Project {
  """
  All project roles with permissions.
  Used by frontend to compute effective permissions.
  """
  roles(
    """
    Include system roles (default: true).
    """
    includeSystem: Boolean = true
  ): [ProjectRole!]!

  """
  Available resources for role editor.
  Requires: project:admin permission.
  """
  availableResources: [ResourceDefinition!]!

  """
  Project team members with roles and overrides.
  Requires: project.team:read permission.
  """
  members(
    first: Int
    after: String
    role: String
  ): ProjectMemberConnection!
}

# ============================================================================
# EXTEND USER TYPE
# ============================================================================

extend type User {
  """
  User's role name in current project context.
  Returns null if no project context.
  """
  projectRole: String

  """
  User's permission overrides in current project.
  Returns null if no project context.
  """
  permissionOverrides: [RolePermission!]
}

# ============================================================================
# CONNECTIONS (Pagination)
# ============================================================================

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type ProjectMemberEdge {
  node: ProjectMember!
  cursor: String!
}

type ProjectMemberConnection {
  edges: [ProjectMemberEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

# ============================================================================
# INPUTS
# ============================================================================

"""
Input for creating a role.
"""
input RoleCreateInput {
  """
  Unique role name (slug).
  """
  name: String!

  """
  Display name.
  """
  displayName: String!

  """
  Description.
  """
  description: String

  """
  Roles to inherit from.
  """
  inherits: [String!]

  """
  Role permissions.
  """
  permissions: [RolePermissionInput!]!
}

"""
Input for role permission.
"""
input RolePermissionInput {
  """
  Resource (product, order, *, product/*).
  """
  resource: String!

  """
  Actions (create, read, update, delete, *).
  """
  actions: [String!]!

  """
  Scope: OWN or ALL.
  """
  scope: PermissionScope!

  """
  Effect: ALLOW or DENY.
  """
  effect: PermissionEffect!
}

"""
Input for updating a role.
"""
input RoleUpdateInput {
  """
  Role name to update.
  """
  name: String!

  """
  New display name.
  """
  displayName: String

  """
  New description.
  """
  description: String

  """
  Roles to inherit from.
  """
  inherits: [String!]

  """
  New permissions (completely replaces existing).
  """
  permissions: [RolePermissionInput!]
}

"""
Input for deleting a role.
"""
input RoleDeleteInput {
  """
  Role name to delete.
  """
  name: String!
}

"""
Input for changing member role.
"""
input MemberRoleChangeInput {
  """
  User ID.
  """
  userId: ID!

  """
  New role name.
  """
  newRole: String!
}

"""
Input for removing a member.
"""
input MemberRemoveInput {
  """
  User ID to remove.
  """
  userId: ID!
}

"""
Input for adding permission override to a member.
"""
input MemberAddOverrideInput {
  """
  User ID.
  """
  userId: ID!

  """
  Permission to add as override.
  """
  permission: RolePermissionInput!
}

"""
Input for removing permission override from a member.
"""
input MemberRemoveOverrideInput {
  """
  User ID.
  """
  userId: ID!

  """
  Resource to remove override for.
  """
  resource: String!

  """
  Actions to remove (if empty, removes all actions for resource).
  """
  actions: [String!]
}

"""
Input for setting all overrides for a member (replaces existing).
"""
input MemberSetOverridesInput {
  """
  User ID.
  """
  userId: ID!

  """
  New overrides (replaces all existing).
  """
  overrides: [RolePermissionInput!]!
}

"""
Input for authorize check.
"""
input AuthorizeInput {
  """
  Resource to check.
  """
  resource: String!

  """
  Action to check.
  """
  action: String!

  """
  Owner ID for scope check.
  Required when checking OWN scope permissions.
  """
  ownerId: ID
}

# ============================================================================
# PAYLOADS
# ============================================================================

type RoleCreatePayload {
  role: ProjectRole
  userErrors: [GenericUserError!]!
}

type RoleUpdatePayload {
  role: ProjectRole
  userErrors: [GenericUserError!]!
}

type RoleDeletePayload {
  deletedRoleName: String
  userErrors: [GenericUserError!]!
}

type MemberRoleChangePayload {
  member: ProjectMember
  userErrors: [GenericUserError!]!
}

type MemberRemovePayload {
  removedUserId: ID
  userErrors: [GenericUserError!]!
}

type MemberOverridePayload {
  member: ProjectMember
  userErrors: [GenericUserError!]!
}

type AuthorizePayload {
  """
  Whether access is allowed.
  """
  allowed: Boolean!

  """
  Reason for denial (if denied).
  """
  deniedReason: String

  """
  Matched scope (OWN or ALL).
  """
  scope: PermissionScope
}

# ============================================================================
# QUERIES & MUTATIONS
# ============================================================================

extend type Query {
  """
  Check authorization for current user.
  Used for server-side permission checks with ownerId.
  For client-side checks, use project.roles + user.projectRole + user.permissionOverrides.
  """
  authorize(input: AuthorizeInput!): AuthorizePayload!
}

extend type Mutation {
  """
  Role management mutations.
  """
  roleMutation: RoleMutation!
}

"""
Role mutations.
"""
type RoleMutation {
  """
  Create custom role.
  Requires: project:admin permission.
  """
  roleCreate(input: RoleCreateInput!): RoleCreatePayload!

  """
  Update role.
  Requires: project:admin permission.
  System roles cannot be modified.
  """
  roleUpdate(input: RoleUpdateInput!): RoleUpdatePayload!

  """
  Delete custom role.
  Requires: project:admin permission.
  System roles cannot be deleted.
  Roles with assigned users cannot be deleted.
  """
  roleDelete(input: RoleDeleteInput!): RoleDeletePayload!

  """
  Change member's role.
  Requires: project.team:write permission.
  Cannot change own role.
  Cannot assign role higher than own.
  """
  memberRoleChange(input: MemberRoleChangeInput!): MemberRoleChangePayload!

  """
  Remove member from team.
  Requires: project.team:remove permission.
  Cannot remove self (use leaveProject).
  Cannot remove project owner.
  """
  memberRemove(input: MemberRemoveInput!): MemberRemovePayload!

  """
  Add permission override for a member.
  Requires: project.team:write permission.
  Cannot add override to self.
  Cannot add override that grants more than own permissions.
  """
  memberAddOverride(input: MemberAddOverrideInput!): MemberOverridePayload!

  """
  Remove permission override from a member.
  Requires: project.team:write permission.
  """
  memberRemoveOverride(input: MemberRemoveOverrideInput!): MemberOverridePayload!

  """
  Set all permission overrides for a member (replaces existing).
  Requires: project.team:write permission.
  """
  memberSetOverrides(input: MemberSetOverridesInput!): MemberOverridePayload!
}
```

## Frontend Permission Computation

Frontend receives roles, overrides and computes permissions locally:

```typescript
// Types
interface Role {
  name: string;
  inherits: string[];
  permissions: Permission[];
}

interface Permission {
  resource: string;
  actions: string[];
  scope: "OWN" | "ALL";
  effect: "ALLOW" | "DENY";
}

interface Member {
  role: string;
  permissionOverrides: Permission[];
}

// Get all inherited roles recursively
function getAllRoles(roleName: string, allRoles: Role[]): Role[] {
  const result: Role[] = [];
  const visited = new Set<string>();

  function visit(name: string) {
    if (visited.has(name)) return;
    visited.add(name);

    const role = allRoles.find(r => r.name === name);
    if (!role) return;

    result.push(role);
    role.inherits.forEach(visit);
  }

  visit(roleName);
  return result;
}

// Get all permissions (role + inherited + overrides)
function getAllPermissions(
  member: Member,
  allRoles: Role[]
): Permission[] {
  const roles = getAllRoles(member.role, allRoles);
  const rolePermissions = roles.flatMap(r => r.permissions);

  // Overrides come last (higher priority for matching)
  return [...rolePermissions, ...member.permissionOverrides];
}

// Check permission with DENY priority
function hasPermission(
  member: Member,
  allRoles: Role[],
  resource: string,
  action: string,
  scope: "OWN" | "ALL" = "ALL"
): boolean {
  const permissions = getAllPermissions(member, allRoles);

  // Check for explicit DENY first (including overrides)
  const denied = permissions.some(p =>
    p.effect === "DENY" &&
    matchResource(p.resource, resource) &&
    matchAction(p.actions, action) &&
    (p.scope === "ALL" || p.scope === scope)
  );

  if (denied) return false;

  // Check for ALLOW
  return permissions.some(p =>
    p.effect === "ALLOW" &&
    matchResource(p.resource, resource) &&
    matchAction(p.actions, action) &&
    (p.scope === "ALL" || scope === "OWN")
  );
}

// Pattern matching
function matchResource(pattern: string, resource: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return resource === prefix || resource.startsWith(prefix + "/");
  }
  return pattern === resource;
}

function matchAction(actions: string[], action: string): boolean {
  return actions.includes("*") || actions.includes(action);
}
```

## Usage Examples

### Query: Get Project Roles and Current User

```graphql
query GetProjectWithRoles($projectId: ID!) {
  project(id: $projectId) {
    id
    name

    # All roles with permissions (for local computation)
    roles {
      name
      displayName
      isSystem
      inherits
      permissions {
        resource
        actions
        scope
        effect
      }
    }
  }

  # Current user info with role and overrides
  userQuery {
    current {
      id
      email
      projectRole          # "admin"
      permissionOverrides {  # personal restrictions
        resource
        actions
        scope
        effect
      }
    }
  }
}
```

### Query: Get Team Members with Overrides

```graphql
query GetTeamMembers($projectId: ID!) {
  project(id: $projectId) {
    members(first: 50) {
      edges {
        node {
          id
          user {
            id
            email
            firstName
            lastName
          }
          role {
            name
            displayName
          }
          permissionOverrides {
            resource
            actions
            scope
            effect
          }
          grantedAt
        }
      }
    }
  }
}
```

### Mutation: Add Permission Override to Member

```graphql
mutation RestrictPaymentsForIgor($userId: ID!) {
  roleMutation {
    memberAddOverride(input: {
      userId: $userId
      permission: {
        resource: "payments"
        actions: ["*"]
        scope: ALL
        effect: DENY
      }
    }) {
      member {
        user {
          email
        }
        role {
          name
        }
        permissionOverrides {
          resource
          actions
          effect
        }
      }
      userErrors {
        code
        message
      }
    }
  }
}
```

### Mutation: Set All Overrides for Member

```graphql
mutation SetMemberRestrictions($userId: ID!) {
  roleMutation {
    memberSetOverrides(input: {
      userId: $userId
      overrides: [
        { resource: "payments", actions: ["*"], scope: ALL, effect: DENY }
        { resource: "project/billing", actions: ["*"], scope: ALL, effect: DENY }
        { resource: "project/team", actions: ["remove"], scope: ALL, effect: DENY }
      ]
    }) {
      member {
        permissionOverrides {
          resource
          actions
          effect
        }
      }
      userErrors {
        code
        message
      }
    }
  }
}
```

### Mutation: Create Custom Role

```graphql
mutation CreateContentEditorRole {
  roleMutation {
    roleCreate(input: {
      name: "content-editor"
      displayName: "Content Editor"
      description: "Can edit products and categories"
      inherits: ["viewer"]
      permissions: [
        {
          resource: "product"
          actions: ["create", "update", "publish"]
          scope: ALL
          effect: ALLOW
        }
        {
          resource: "category"
          actions: ["create", "update"]
          scope: ALL
          effect: ALLOW
        }
        {
          resource: "media"
          actions: ["upload", "delete"]
          scope: OWN
          effect: ALLOW
        }
      ]
    }) {
      role {
        name
        displayName
        permissions {
          resource
          actions
          scope
          effect
        }
      }
      userErrors {
        code
        message
        field
      }
    }
  }
}
```

## Real-World Examples

### Example: Fashion Store Team

```
Team:
├── Anna (owner)     — Full access
├── Igor (admin)     — Admin with payment restrictions
├── Maria (manager)  — Content management
├── Oleg (support)   — Order processing (own orders only)
└── Peter (viewer)   — Read-only
```

#### Igor: Admin with Restrictions

```yaml
member:
  user: igor
  role: admin
  permissionOverrides:
    - resource: payments
      actions: ["*"]
      scope: ALL
      effect: DENY
    - resource: project/billing
      actions: ["*"]
      scope: ALL
      effect: DENY

# Result:
# ✅ Can manage products, orders, team
# ❌ Cannot access payments
# ❌ Cannot access billing
```

#### Oleg: Support with Own Orders

```yaml
member:
  user: oleg
  role: support
  permissionOverrides: []  # no overrides, standard support role

# Role "support" has:
# - order:read (ALL)
# - order:update (OWN) ← only assigned orders

# Result:
# ✅ Can read all orders
# ✅ Can update orders assigned to him
# ❌ Cannot update others' orders
```

### UI: Edit Member Permissions

```
┌─────────────────────────────────────────────────────────────┐
│ Edit Member: Igor                                            │
├─────────────────────────────────────────────────────────────┤
│ Email: igor@company.com                                      │
│                                                             │
│ Role: [Admin ▼]                                              │
│                                                             │
│ Permission Overrides:                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⊖ Payments: All actions             DENY    [Remove]   │ │
│ │ ⊖ Billing: All actions              DENY    [Remove]   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [+ Add Override]                                            │
│                                                             │
│ Effective Permissions:  [View Details]                      │
│ • Products: Full access                                     │
│ • Orders: Full access                                       │
│ • Payments: ❌ No access                                    │
│ • Billing: ❌ No access                                     │
│                                                             │
│                              [Cancel]  [Save Changes]       │
└─────────────────────────────────────────────────────────────┘
```

## System Roles

Default roles created during project provisioning:

| Role | Inherits | Description |
|------|----------|-------------|
| `owner` | `admin` | Full access, cannot be removed |
| `admin` | `manager` | Full access except project delete/billing |
| `manager` | `support` | Product/category/media management |
| `support` | `viewer` | Order/customer management |
| `viewer` | - | Read-only access |

### Default Permissions

```yaml
viewer:
  - resource: "*"
    actions: [read]
    scope: ALL
    effect: ALLOW

support:
  # inherits viewer
  - resource: order
    actions: [update]
    scope: OWN
    effect: ALLOW
  - resource: customer
    actions: [read, update]
    scope: ALL
    effect: ALLOW

manager:
  # inherits support
  - resource: product
    actions: [create, update, delete, publish]
    scope: ALL
    effect: ALLOW
  - resource: category
    actions: [create, update, delete]
    scope: ALL
    effect: ALLOW
  - resource: media
    actions: [upload, delete]
    scope: ALL
    effect: ALLOW
  - resource: order
    actions: [update, fulfill]
    scope: ALL
    effect: ALLOW

admin:
  # inherits manager
  - resource: "*"
    actions: ["*"]
    scope: ALL
    effect: ALLOW
  - resource: project
    actions: [delete]
    scope: ALL
    effect: DENY
  - resource: project/billing
    actions: ["*"]
    scope: ALL
    effect: DENY

owner:
  # inherits admin, removes DENY restrictions
  - resource: "*"
    actions: ["*"]
    scope: ALL
    effect: ALLOW
```

## Business Rules

### Role Management

**Role Creation:**
- Requires `project:admin` permission
- Name must be unique within project
- Name cannot match system roles
- Name must be valid slug (a-z0-9-_)

**Role Update:**
- Requires `project:admin` permission
- System roles cannot be modified
- Can only change displayName, description, inherits, permissions

**Role Deletion:**
- Requires `project:admin` permission
- System roles cannot be deleted
- Roles with assigned users cannot be deleted

### Member Management

**Member Role Change:**
- Requires `project.team:write` permission
- Cannot change own role
- Cannot assign role higher than own (hierarchy: owner > admin > manager > support > viewer)
- Owner can assign any role
- Admin can assign manager, support, viewer, and custom roles

**Member Remove:**
- Requires `project.team:remove` permission
- Cannot remove self (use leaveProject)
- Cannot remove project owner
- Cannot remove user with higher role

### Override Management

**Add Override:**
- Requires `project.team:write` permission
- Cannot add override to self
- Cannot add ALLOW override that grants more than own permissions
- Can add any DENY override (restricting is always allowed)

**Remove Override:**
- Requires `project.team:write` permission
- Cannot modify overrides of user with higher role

## Implementation Plan

### Step 1: Update DTO Types
1. Add `scope` field to `RolePermission` in `RoleDto.ts`
2. Add `permissionOverrides` to member DTOs
3. Update `AuthorizeParams` to include `ownerId`

### Step 2: Add Override Scripts
1. Create `AddPermissionOverrideScript`
2. Create `RemovePermissionOverrideScript`
3. Create `SetPermissionOverridesScript`
4. Update `ListTenantMembersScript` to include overrides

### Step 3: Update GraphQL Schema
1. Create `schema/role.graphql`
2. Extend Project and User types
3. Run codegen

### Step 4: Implement Resolvers
1. `Project.roles` resolver
2. `Project.members` resolver (with overrides)
3. `Project.availableResources` resolver
4. `User.projectRole` resolver
5. `User.permissionOverrides` resolver
6. `authorize` query resolver
7. All `roleMutation` resolvers including override mutations

### Step 5: Update Context
1. Load project and tenantId in context middleware
2. Add authorize helper to context

### Step 6: Update Casbin Model (if needed)
Add scope to policy definition:

```ini
[policy_definition]
p = sub, obj, act, scope, eft

[matchers]
m = (g(r.sub, p.sub) || r.sub == p.sub) && keyMatch(r.obj, p.obj) && keyMatch(r.act, p.act) \
    && (p.scope == "ALL" || (p.scope == "OWN" && r.owner == r.sub))
```

## Script Mapping

| GraphQL Operation | Script | Notes |
|-------------------|--------|-------|
| `Project.roles` | `ListRolesScript` | Returns full role details |
| `Project.members` | `ListTenantMembersScript` | With pagination and overrides |
| `Project.availableResources` | `ListResourcesScript` | Calls services |
| `User.projectRole` | `GetUserRoleScript` | Returns role name |
| `User.permissionOverrides` | `GetUserOverridesScript` | Returns user's overrides |
| `authorize` | `AuthorizeScript` | With ownerId support |
| `roleCreate` | `CreateRoleScript` | With scope support |
| `roleUpdate` | `UpdateRoleScript` | With scope support |
| `roleDelete` | `DeleteRoleScript` | - |
| `memberRoleChange` | `DetachUserRoleScript` + `AttachUserRoleScript` | - |
| `memberRemove` | `DetachUserRoleScript` | - |
| `memberAddOverride` | `AddPermissionOverrideScript` | NEW |
| `memberRemoveOverride` | `RemovePermissionOverrideScript` | NEW |
| `memberSetOverrides` | `SetPermissionOverridesScript` | NEW |

## Comparison with Other Systems

| Feature | Shopana | AWS IAM | GitHub | Stripe |
|---------|---------|---------|--------|--------|
| Roles | ✅ | ✅ | ✅ Org roles | ✅ |
| Role Inheritance | ✅ | ❌ | ❌ | ❌ |
| Groups/Teams | ❌ | ✅ Groups | ✅ Teams | ❌ |
| User Policies | ✅ Overrides | ✅ User Policies | ✅ Collaborators | ✅ Overrides |
| DENY Effect | ✅ | ✅ | ❌ | ✅ |
| Resource Policies | ❌ | ✅ | ✅ | ❌ |
| Scope (OWN/ALL) | ✅ | Via conditions | ❌ | ❌ |
