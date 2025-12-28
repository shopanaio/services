# Store Role System (GitHub-like model)

## Comparison with GitHub

| GitHub             | Shopana            |
| ------------------ | ------------------ |
| Organization       | Organization       |
| Repository         | Store              |
| Organization Admin | Organization Admin |
| Repository Admin   | Store Admin        |

## Access Levels

### 1. Organization (domain: `org`)

Organization-wide roles:

| Role     | Description                                                   |
| -------- | ------------------------------------------------------------- |
| `admin`  | Full control: all actions within the organization             |
| `member` | Basic organization access, store access through explicit rights |

**Organization admin has full access to all stores in the organization.**

### 2. Store (domain: `store:{id}`)

Store-level roles:

| Role      | Description                     |
| --------- | ------------------------------- |
| `viewer`  | View store profile              |
| `editor`  | View and edit profile           |
| `manager` | Same as editor (extensible)     |
| `admin`   | Full store management           |

## Domains

```
domain: "org"        → organization level
domain: "store:{id}" → specific store (UUID)
```

Store domain format: `store:<uuid>` (example: `store:550e8400-e29b-41d4-a716-446655440000`)

## Resources and Actions

### Organization Resources (prefix: `org.`)

| Resource      | Actions                            | Description                 |
| ------------- | ---------------------------------- | --------------------------- |
| `org.profile` | read, update, delete               | Organization profile        |
| `org.members` | read, invite, update, remove       | Organization members        |
| `org.roles`   | read, create, update, delete       | Role management             |
| `org.stores`  | create, read, list, update, delete | Store management            |
| `org.access`  | read, grant, revoke                | Member access to stores     |

### Store Resources (prefix: `store.`)

| Resource        | Actions                      | Description                 |
| --------------- | ---------------------------- | --------------------------- |
| `store.profile` | read, update, delete         | Store profile               |
| `store.members` | read, invite, update, remove | Store members               |
| `store.roles`   | read, create, update, delete | Role management in store    |
| `store.access`  | read, grant, revoke          | Member permissions in store |

## @shopana/rbac Package

### Package Structure

```
packages/rbac/
├── src/
│   ├── index.ts        # Public API exports
│   ├── definitions.ts  # Resources и Roles определения
│   ├── types.ts        # TypeScript типы
│   └── validators.ts   # Zod валидация
└── package.json
```

### Public API

```typescript
// packages/rbac/src/index.ts

// === Definitions ===
export { Resources, Roles, RBAC } from "./definitions.js";

// === Validation ===
export { validateDomainPermissions } from "./validators.js";

// === Types ===
export type {
  Domain,
  OrgDomain,
  StoreDomain,
  OrgRoleName,
  StoreRoleName,
  Permission
} from "./types.js";

export type {
  DomainPermissions,
  ValidationResult
} from "./validators.js";
```

### Resource Definitions

```typescript
// packages/rbac/src/definitions.ts

export const Resources = {
  org: {
    "org.profile": {
      actions: ["read", "update", "delete"],
      description: "Organization profile",
    },
    "org.members": {
      actions: ["read", "invite", "update", "remove"],
      description: "Organization members",
    },
    "org.roles": {
      actions: ["read", "create", "update", "delete"],
      description: "Role management",
    },
    "org.stores": {
      actions: ["create", "read", "list", "update", "delete"],
      description: "Store management",
    },
    "org.access": {
      actions: ["read", "grant", "revoke"],
      description: "Member access to stores",
    },
  },
  store: {
    "store.profile": {
      actions: ["read", "update", "delete"],
      description: "Store profile",
    },
    "store.members": {
      actions: ["read", "invite", "update", "remove"],
      description: "Store members",
    },
    "store.roles": {
      actions: ["read", "create", "update", "delete"],
      description: "Role management",
    },
    "store.access": {
      actions: ["read", "grant", "revoke"],
      description: "Member permissions in store",
    },
  },
} as const;
```

### Role Definitions

```typescript
// packages/rbac/src/definitions.ts

export const Roles = {
  organization: {
    admin: [
      // Org resources
      { resource: "org.profile", actions: ["read", "update", "delete"] },
      { resource: "org.members", actions: ["read", "invite", "update", "remove"] },
      { resource: "org.roles", actions: ["read", "create", "update", "delete"] },
      { resource: "org.stores", actions: ["create", "read", "list", "update", "delete"] },
      { resource: "org.access", actions: ["read", "grant", "revoke"] },
      // Store resources (full access to all stores)
      { resource: "store.profile", actions: ["read", "update", "delete"] },
      { resource: "store.members", actions: ["read", "invite", "update", "remove"] },
      { resource: "store.roles", actions: ["read", "create", "update", "delete"] },
      { resource: "store.access", actions: ["read", "grant", "revoke"] },
    ],
    member: [
      { resource: "org.profile", actions: ["read"] },
      { resource: "org.members", actions: ["read"] },
    ],
  },
  store: {
    viewer: [
      { resource: "store.profile", actions: ["read"] },
    ],
    editor: [
      { resource: "store.profile", actions: ["read", "update"] },
    ],
    manager: [
      { resource: "store.profile", actions: ["read", "update"] },
    ],
    admin: [
      { resource: "store.profile", actions: ["read", "update"] },
      { resource: "store.members", actions: ["read", "invite", "update", "remove"] },
      { resource: "store.roles", actions: ["read", "create", "update", "delete"] },
      { resource: "store.access", actions: ["read", "grant", "revoke"] },
    ],
  },
} as const;
```

### Types

```typescript
// packages/rbac/src/types.ts

// Domain types
export type OrgDomain = "org";
export type StoreDomain = `store:${string}`;
export type Domain = OrgDomain | StoreDomain;

// Role names
export type OrgRoleName = "admin" | "member";
export type StoreRoleName = "viewer" | "editor" | "manager" | "admin";

// Generic permission (for runtime)
export type Permission = {
  resource: string;
  actions: string[];
};

// Policy for access check
export type Policy = {
  subject: string;
  domain: Domain;
  resource: string;
  action: string;
};
```

### Zod Validation

```typescript
// packages/rbac/src/validators.ts

import { z } from "zod";
import { Resources } from "./definitions.js";

// Build permission schemas dynamically from Resources
const buildPermissionSchemas = <T extends Record<string, { actions: readonly string[] }>>(
  resources: T
) => {
  return Object.entries(resources).map(([resource, { actions }]) =>
    z.object({
      resource: z.literal(resource),
      actions: z.array(z.enum(actions as [string, ...string[]])).min(1),
    })
  );
};

const orgSchemas = buildPermissionSchemas(Resources.org);
const storeSchemas = buildPermissionSchemas(Resources.store);

const OrgPermissionSchema = z.discriminatedUnion("resource", orgSchemas as any);
const StorePermissionSchema = z.discriminatedUnion("resource", storeSchemas as any);

// Store domain format: store:<uuid>
const StoreDomainSchema = z.string().regex(
  /^store:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  { message: "Store domain must be in format 'store:<uuid>'" }
);

// Domain permissions schemas
const OrgDomainPermissionsSchema = z.object({
  domain: z.literal("org"),
  permissions: z.array(OrgPermissionSchema).min(1),
});

const StoreDomainPermissionsSchema = z.object({
  domain: StoreDomainSchema,
  permissions: z.array(StorePermissionSchema).min(1),
});

const DomainPermissionsSchema = z.union([
  OrgDomainPermissionsSchema,
  StoreDomainPermissionsSchema,
]);

export type DomainPermissions = z.infer<typeof DomainPermissionsSchema>;

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };

export function validateDomainPermissions(input: unknown): ValidationResult<DomainPermissions> {
  const result = DomainPermissionsSchema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}
```

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
| org.roles (\*)         | ✓     | -      |
| org.stores (\*)        | ✓     | -      |
| org.access (\*)        | ✓     | -      |

### Store Level (domain: `store:{id}`)

| Resource                | viewer | editor | manager | admin |
| ----------------------- | ------ | ------ | ------- | ----- |
| store.profile (read)    | ✓      | ✓      | ✓       | ✓     |
| store.profile (update)  | -      | ✓      | ✓       | ✓     |
| store.members (\*)      | -      | -      | -       | ✓     |
| store.roles (\*)        | -      | -      | -       | ✓     |
| store.access (\*)       | -      | -      | -       | ✓     |

### Org Admin and Store Resources

Org Admin has full access to **all** store resources in **all** stores of the organization:

| Resource        | org.admin |
| --------------- | --------- |
| store.profile   | ✓ (all)   |
| store.members   | ✓ (all)   |
| store.roles     | ✓ (all)   |
| store.access    | ✓ (all)   |

## Usage Examples

### Permission Validation

```typescript
import { validateDomainPermissions } from "@shopana/rbac";

// ✓ Valid org permissions
validateDomainPermissions({
  domain: "org",
  permissions: [
    { resource: "org.profile", actions: ["read", "update"] },
    { resource: "org.members", actions: ["read", "invite"] },
  ],
});

// ✓ Valid store permissions
validateDomainPermissions({
  domain: "store:550e8400-e29b-41d4-a716-446655440000",
  permissions: [
    { resource: "store.profile", actions: ["read", "update"] },
  ],
});

// ✗ Error: invalid action
validateDomainPermissions({
  domain: "org",
  permissions: [
    { resource: "org.profile", actions: ["fly"] }, // Error: Invalid action
  ],
});

// ✗ Error: invalid store domain format
validateDomainPermissions({
  domain: "store:invalid",  // Error: must be UUID
  permissions: [
    { resource: "store.profile", actions: ["read"] },
  ],
});
```

### Using Roles

```typescript
import { Roles, Resources } from "@shopana/rbac";

// Get permissions for a role
const adminPermissions = Roles.organization.admin;
const viewerPermissions = Roles.store.viewer;

// Get actions for a resource
const profileActions = Resources.org["org.profile"].actions;
// → ["read", "update", "delete"]
```

### Type-safe Access Check

```typescript
import type { Domain, OrgRoleName, StoreRoleName } from "@shopana/rbac";

function checkAccess(params: {
  userId: string;
  domain: Domain;
  resource: string;
  action: string;
}): Promise<boolean> {
  // ... implementation
}

// Usage
await checkAccess({
  userId: "user-123",
  domain: "org",
  resource: "org.members",
  action: "invite",
});

await checkAccess({
  userId: "user-123",
  domain: "store:550e8400-e29b-41d4-a716-446655440000",
  resource: "store.profile",
  action: "update",
});
```

## Access Scenarios

### Scenario 1: Admin Invites a Member

```
1. Admin (org) invites user to organization
2. User receives "member" role (org)
3. Admin or Store Admin grants role in store
4. User receives "editor" role (store:123)
```

### Scenario 2: Checking Store Access

```typescript
// Query: can user edit store profile?
await checkAccess({
  userId: "user-456",
  domain: "store:550e8400-e29b-41d4-a716-446655440000",
  resource: "store.profile",
  action: "update",
});

// Verification:
// 1. Does user have a role in domain "store:{id}"?
// 2. Does that role have "store.profile:update" permission?
// OR
// 3. Does user have org.admin role?
```

### Scenario 3: Org Admin Access to Stores

```
Org Admin automatically has full access to all stores in the organization.
No need to explicitly assign roles in each store.
```

## Casbin Model

> **Simplification:** `policy_effect` removed — only `allow` is used by default.

```conf
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
```

### Policy Examples

```
# Organization role
p, user:123, org, org.profile, read
p, user:123, org, org.members, read
p, user:123, org, org.members, invite

# Store role
p, user:456, store:abc-uuid, store.profile, read
p, user:456, store:abc-uuid, store.profile, update
```
