# IAM GraphQL API Plan - Roles & Permissions Management

## Overview

GraphQL API for role and permission management in IAM service. Strapi-style approach:
- Resources = API endpoints with operations
- Permissions = resource + actions + effect
- Roles = predefined permission sets (system + custom)

**Key principle:**
- **Project** contains all roles with their permissions (for admins and role editor UI)
- **User** has assigned role in current project
- Frontend computes effective permissions locally from user's role + inheritance

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Admin UI                                                    │
│  ├── Team Members page                                      │
│  ├── Role Editor                                            │
│  └── Permission checks (computed locally from role)         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────────┐
│  project.roles          │     │  user.projectRole           │
│  (all roles + perms)    │     │  (role name)                │
└─────────────────────────┘     └─────────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend computes effective permissions:                    │
│                                                             │
│  const userRole = allRoles.find(r => r.name === roleName);  │
│  const effectivePerms = getPermissionsWithInheritance(      │
│    userRole, allRoles                                       │
│  );                                                         │
└─────────────────────────────────────────────────────────────┘
```

## Permission Model

### Core Concepts

| Concept | Description | Example |
|---------|-------------|---------|
| Resource | API entity | `product`, `order`, `category` |
| Action | Operation on resource | `create`, `read`, `update`, `delete`, `publish` |
| Effect | Allow or deny | `ALLOW`, `DENY` |

### Permission Structure

```typescript
interface RolePermission {
  resource: string;      // "product", "order/*", "*"
  actions: string[];     // ["create", "read", "update", "delete"]
  effect: "ALLOW" | "DENY";
}
```

### Effective Permission Calculation

```
Effective = Role Permissions + Inherited Role Permissions

Priority: DENY always wins over ALLOW
```

```typescript
// Manager inherits from support, support inherits from viewer
// Effective permissions = manager + support + viewer permissions
// Any DENY in the chain blocks access
```

## Casdoor Implementation

### Structure in Casdoor

```
Tenant: org-my-shop
│
├── Roles
│   ├── owner
│   ├── admin
│   ├── manager
│   ├── support
│   ├── viewer
│   └── customer    (for storefront users)
│
├── Permissions (bound to roles)
│   ├── perm-owner-all         → roles: [owner]
│   ├── perm-admin-all         → roles: [admin]
│   ├── perm-manager-products  → roles: [manager]
│   └── ...
│
└── Grouping (user → role)
    ├── g, anna, owner
    ├── g, igor, admin
    └── g, customer1, customer
```

### Casdoor enforce() Flow

```
Request: user-igor, product, update

1. Find user's role via grouping: g, igor, admin
2. Find role's permissions: p, admin, *, * → ALLOW
3. Result: ALLOW
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
  System role (owner, admin, manager, support, viewer, customer) cannot be deleted.
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
Role permission - access to resource with specific actions.
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
  Effect: ALLOW or DENY.
  DENY takes priority over ALLOW.
  """
  effect: PermissionEffect!
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
Project team member with assigned role.
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
  Project team members with roles.
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

type AuthorizePayload {
  """
  Whether access is allowed.
  """
  allowed: Boolean!

  """
  Reason for denial (if denied).
  """
  deniedReason: String
}

# ============================================================================
# QUERIES & MUTATIONS
# ============================================================================

extend type Query {
  """
  Check authorization for current user.
  Used for server-side permission checks.
  For client-side checks, use project.roles + user.projectRole.
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
}
```

## Frontend Permission Computation

Frontend receives roles and computes permissions locally:

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
  effect: "ALLOW" | "DENY";
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

// Get all permissions from role + inherited roles
function getAllPermissions(roleName: string, allRoles: Role[]): Permission[] {
  const roles = getAllRoles(roleName, allRoles);
  return roles.flatMap(r => r.permissions);
}

// Check permission with DENY priority
function hasPermission(
  roleName: string,
  allRoles: Role[],
  resource: string,
  action: string
): boolean {
  const permissions = getAllPermissions(roleName, allRoles);

  // Check for explicit DENY first
  const denied = permissions.some(p =>
    p.effect === "DENY" &&
    matchResource(p.resource, resource) &&
    matchAction(p.actions, action)
  );

  if (denied) return false;

  // Check for ALLOW
  return permissions.some(p =>
    p.effect === "ALLOW" &&
    matchResource(p.resource, resource) &&
    matchAction(p.actions, action)
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
        effect
      }
    }
  }

  # Current user info with role
  userQuery {
    current {
      id
      email
      projectRole  # "admin"
    }
  }
}
```

### Query: Get Team Members

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
          grantedAt
        }
      }
    }
  }
}
```

### Mutation: Change Member Role

```graphql
mutation ChangeUserRole($userId: ID!) {
  roleMutation {
    memberRoleChange(input: {
      userId: $userId
      newRole: "manager"
    }) {
      member {
        user {
          email
        }
        role {
          name
          displayName
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
          effect: ALLOW
        }
        {
          resource: "category"
          actions: ["create", "update"]
          effect: ALLOW
        }
        {
          resource: "media"
          actions: ["upload", "delete"]
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

## System Roles

Default roles created during project provisioning:

| Role | Inherits | Type | Description |
|------|----------|------|-------------|
| `owner` | `admin` | Team | Full access, cannot be removed |
| `admin` | `manager` | Team | Full access except project delete/billing |
| `manager` | `support` | Team | Product/category/media management |
| `support` | `viewer` | Team | Order/customer management |
| `viewer` | - | Team | Read-only access to admin |
| `customer` | - | Storefront | Read public data, manage own profile |

### Default Permissions

```yaml
viewer:
  - resource: "*"
    actions: [read]
    effect: ALLOW

support:
  # inherits viewer
  - resource: order
    actions: [update]
    effect: ALLOW
  - resource: customer
    actions: [read, update]
    effect: ALLOW

manager:
  # inherits support
  - resource: product
    actions: [create, update, delete, publish]
    effect: ALLOW
  - resource: category
    actions: [create, update, delete]
    effect: ALLOW
  - resource: media
    actions: [upload, delete]
    effect: ALLOW
  - resource: order
    actions: [update, fulfill]
    effect: ALLOW

admin:
  # inherits manager
  - resource: "*"
    actions: ["*"]
    effect: ALLOW
  - resource: project
    actions: [delete]
    effect: DENY
  - resource: project/billing
    actions: ["*"]
    effect: DENY

owner:
  # inherits admin, removes DENY restrictions
  - resource: "*"
    actions: ["*"]
    effect: ALLOW

customer:
  # Storefront role - no inheritance
  - resource: "storefront/product"
    actions: [read]
    effect: ALLOW
  - resource: "storefront/collection"
    actions: [read]
    effect: ALLOW
  - resource: "storefront/customer"
    actions: [read, update]
    effect: ALLOW
  - resource: "storefront/order"
    actions: [read]
    effect: ALLOW
  - resource: "storefront/address"
    actions: [read, create, update, delete]
    effect: ALLOW
  - resource: "storefront/cart"
    actions: [read, create, update, delete]
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

## Customer Registration

When a customer registers, they automatically get the `customer` role:

```typescript
// RegisterCustomerScript
async execute(params: RegisterCustomerParams) {
  // 1. Create user in Casdoor
  const user = await this.casdoor.createUser({
    owner: params.tenantId,
    name: params.email,
    email: params.email,
    password: params.password,
  });

  // 2. Assign customer role
  await this.casdoor.addUserToRole({
    owner: params.tenantId,
    userId: user.id,
    roleName: "customer",
  });

  return { user };
}
```

## Implementation Plan

### Step 1: Update DTO Types
1. Ensure `RolePermission` has `effect` field (already exists)
2. Add `inherits` field to role DTOs

### Step 2: Update GraphQL Schema
1. Create `schema/role.graphql`
2. Extend Project and User types
3. Run codegen

### Step 3: Implement Resolvers
1. `Project.roles` resolver
2. `Project.members` resolver
3. `Project.availableResources` resolver
4. `User.projectRole` resolver
5. `authorize` query resolver
6. All `roleMutation` resolvers

### Step 4: Update Context
1. Load project and tenantId in context middleware
2. Add authorize helper to context

### Step 5: Create System Roles on Project Provisioning
1. Create all system roles (owner, admin, manager, support, viewer, customer)
2. Assign owner role to project creator

## Script Mapping

| GraphQL Operation | Script | Notes |
|-------------------|--------|-------|
| `Project.roles` | `ListRolesScript` | Returns full role details |
| `Project.members` | `ListTenantMembersScript` | With pagination |
| `Project.availableResources` | `ListResourcesScript` | Calls services |
| `User.projectRole` | `GetUserRoleScript` | Returns role name |
| `authorize` | `AuthorizeScript` | Permission check |
| `roleCreate` | `CreateRoleScript` | - |
| `roleUpdate` | `UpdateRoleScript` | - |
| `roleDelete` | `DeleteRoleScript` | - |
| `memberRoleChange` | `DetachUserRoleScript` + `AttachUserRoleScript` | - |
| `memberRemove` | `DetachUserRoleScript` | - |

## Comparison with Other Systems

| Feature | Shopana | AWS IAM | GitHub | Stripe | Strapi |
|---------|---------|---------|--------|--------|--------|
| Roles | ✅ | ✅ | ✅ Org roles | ✅ | ✅ |
| Role Inheritance | ✅ | ❌ | ❌ | ❌ | ❌ |
| Custom Roles | ✅ | ✅ | ❌ | ❌ | ✅ |
| DENY Effect | ✅ | ✅ | ❌ | ✅ | ❌ |
| User Policies | ❌ | ✅ | ✅ | ✅ | ❌ |
| Resource Policies | ❌ | ✅ | ✅ | ❌ | ❌ |
