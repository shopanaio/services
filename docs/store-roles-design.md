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
- Roles do NOT inherit permissions — each role has explicit permission set

### FR-4.1: Owner (Creator) Concept
- Owner is NOT a role, but an attribute (creator) of organization
- Each organization has exactly one owner (the user who created it)
- Owner always has `admin` role and cannot be demoted
- Owner can transfer ownership to another `admin`
- Owner has exclusive rights: delete organization, transfer ownership

### FR-5: Site Admin Bypass
- Site administrators bypass all RBAC checks
- Site admin check occurs before Casbin policy evaluation

### FR-6: Wildcard Matching
- Support wildcards in resources via keyMatch

### FR-7: System Role Protection
- System roles (`admin`, `member`, `viewer`, `manager`) cannot be deleted
- Organization owner (creator) cannot have their `admin` role revoked
- Only custom roles created by users can be modified or deleted

### FR-8: Self-Role Modification Restriction
- Users cannot modify their own roles
- Users cannot revoke their own access
- Role changes must be performed by another user with appropriate permissions

### FR-9: Custom Roles
- Users with `admin` role can create custom roles within their domain
- Custom roles are marked with `isSystem: false` flag
- Custom role permissions cannot exceed creator's permissions
- Custom roles can be modified or deleted (unlike system roles)
- Limit: maximum 20 custom roles per domain

### FR-10: Invitation Workflow
- Invitations have states: `pending`, `accepted`, `expired`, `revoked`
- Invitation expiration: 7 days by default
- One active invitation per email per domain
- Accepting invitation automatically assigns specified role

### FR-11: Audit Logging
- All role assignments and revocations must be logged
- Log entries include: actor, target user, role, domain, timestamp, action
- Audit logs are immutable and retained for compliance

### FR-12: Last Admin Protection (Organization Only)
- Cannot remove the last `admin` from organization
- Cannot demote the last organization `admin` to a lower role
- Store admins can all be removed (organization owner/admin always has full store access)

### FR-13: Soft Delete
- Organizations and stores are never hard deleted
- Soft delete (archive) preserves all data and role assignments
- Archived organizations can be restored by organization owner
- Archived stores can be restored by store `admin` or organization `admin`
- Users lose access to archived stores but roles are preserved

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

### NFR-4: Cache Invalidation
- Policy cache invalidates on role assignment/revocation
- Cache invalidates on policy addition/removal
- Cross-instance invalidation via pub/sub mechanism
- Maximum cache staleness: 5 seconds

### NFR-5: Security
- Rate limiting on permission checks to prevent enumeration attacks
- All authorization decisions logged for security audit
- Principle of least privilege: deny by default

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

**Note:** Organization admin has full access to all stores in the organization.

**Owner:** The user who created the organization. Owner always has `admin` role and has exclusive rights to delete the organization and transfer ownership.

### Store (domain: `store:{id}`)

| Role      | Description             |
| --------- | ----------------------- |
| `viewer`  | View store profile      |
| `manager` | View and edit profile   |
| `admin`   | Full store management   |

---

## Resources and Actions

### Organization Resources (prefix: `org.`)

| Resource      | Actions                            | Description              |
| ------------- | ---------------------------------- | ------------------------ |
| `org.profile` | read, update, delete               | Organization profile     |
| `org.members` | read, invite, update, remove       | Organization members     |
| `org.roles`   | read, create, update, delete       | Role management          |
| `org.stores`  | create, read, list, update, delete | Store management         |
| `org.access`  | read, grant, revoke                | Member access to stores  |

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
| org.profile (delete)   | ✓*    | -      |
| org.members (read)     | ✓     | ✓      |
| org.members (invite)   | ✓     | -      |
| org.members (update)   | ✓     | -      |
| org.members (remove)   | ✓     | -      |
| org.roles (*)          | ✓     | -      |
| org.stores (*)         | ✓     | -      |
| org.access (*)         | ✓     | -      |

*Owner-only actions: Only the organization owner (creator) can  transfer ownership.

### Store Level (domain: `store:{id}`)

| Resource                | viewer | manager | admin |
| ----------------------- | ------ | ------- | ----- |
| store.profile (read)    | ✓      | ✓       | ✓     |
| store.profile (update)  | -      | ✓       | ✓     |
| store.profile (delete)  | -      | -       | ✓     |
| store.members (*)       | -      | -       | ✓     |
| store.roles (*)         | -      | -       | ✓     |
| store.access (*)        | -      | -       | ✓     |

**Note:** Store deletion also requires `org.stores (delete)` permission at organization level.

### Org Admin Store Access

Organization `admin` has full access to **all** store resources in **all** stores:

| Resource        | org.admin |
| --------------- | --------- |
| store.profile   | ✓ (all)   |
| store.members   | ✓ (all)   |
| store.roles     | ✓ (all)   |
| store.access    | ✓ (all)   |

---

## Default Role Assignment

### On Store Creation

| Creator's Org Role | Assigned Store Role |
| ------------------ | ------------------- |
| `admin`            | `admin`             |
| `member`           | `admin`             |

- Store creator automatically receives store `admin` role

### On Organization Creation

- Creator receives `admin` role and is marked as organization **owner**
- Only one owner per organization (stored as `owner_id` or `created_by`)
- Ownership can be transferred to another user with `admin` role

### On Invitation Accept

- User receives the role specified in the invitation
- Default invitation role: `member` (org) or `viewer` (store)

---

## Invitation Lifecycle

### States

```
┌─────────┐    accept    ┌──────────┐
│ pending │─────────────▶│ accepted │
└─────────┘              └──────────┘
     │
     │ revoke / expire
     ▼
┌─────────┐
│ expired │
└─────────┘
```

| State      | Description                                    |
| ---------- | ---------------------------------------------- |
| `pending`  | Invitation sent, waiting for user action       |
| `accepted` | User accepted, role assigned                   |
| `expired`  | TTL exceeded (7 days) or manually revoked      |

### Constraints

- One active (pending) invitation per email per domain
- Re-inviting expired invitation creates new invitation
- Cannot invite existing organization/store member

---

## Role Transition Rules

### Organization Level

| From       | To         | Allowed By   |
| ---------- | ---------- | ------------ |
| `member`   | `admin`    | `admin`      |
| `admin`    | `member`   | `admin`*     |

### Store Level

| From       | To         | Allowed By     |
| ---------- | ---------- | -------------- |
| `viewer`   | `manager`  | store `admin`  |
| `viewer`   | `admin`    | store `admin`  |
| `manager`  | `viewer`   | store `admin`  |
| `manager`  | `admin`    | store `admin`  |
| `admin`    | `manager`  | store `admin`  |
| `admin`    | `viewer`   | store `admin`  |

### Forbidden Transitions

| Transition                              | Reason                              |
| --------------------------------------- | ----------------------------------- |
| org owner's `admin` → any               | Organization owner cannot be demoted |
| self → any                              | Cannot modify own role              |
| last org `admin` → lower                | Organization must have at least one admin |

**Note:** Store has no "last admin" protection — organization owner/admin always has full access to all stores.

### Ownership Transfer (Organization Only)

- Only current organization owner can transfer ownership
- Target user must have `admin` role in organization
- After transfer, previous owner retains `admin` role
