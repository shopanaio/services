# Permission Management Implementation Plan

## Senior Staff Engineer Architecture Design

This document outlines the plan for implementing **permission checks** and **role-based access control (RBAC)** in the admin application, building on top of the authentication foundation.

> **Prerequisites**: Auth domain implementation (sign-in, sign-up, session management) must be completed first.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Target Architecture](#target-architecture)
3. [Directory Structure](#directory-structure)
4. [Core Patterns](#core-patterns)
5. [Implementation Phases](#implementation-phases)
6. [Component Specifications](#component-specifications)
7. [Testing Strategy](#testing-strategy)

---

## Current State Analysis

### Existing Infrastructure

**GraphQL API** (IAM Service):
- `userQuery.authorize(input: AuthorizeInput!)` - Server-side permission check
- `Role` type with permissions array
- `Member` type with role assignment
- RBAC package at `packages/rbac`

**Authorization Model**:
- Domain-scoped: `"org"` (organization) or `"store:{uuid}"` (store-specific)
- Resource-based: `"org.profile"`, `"store.members"`, etc.
- Action levels: `read`, `write`, `admin` (hierarchical)

### Current Limitations
- No client-side permission hooks
- No declarative permission-based rendering
- No permission caching strategy
- No UI for displaying access denied states

---

## Target Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Permission Layer                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Declarative Components                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ Permission  │  │  Protected  │  │   AccessDenied  │  │   │
│  │  │   Gate      │  │   Route     │  │     Fallback    │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │   │
│  └─────────┼────────────────┼──────────────────┼───────────┘   │
│            │                │                  │                │
│            └────────────────┼──────────────────┘                │
│                             │                                   │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │                  Permission Hooks                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │usePermission│  │ useAuthorize│  │usePermissionCache│ │   │
│  │  │   (sync)    │  │  (async)    │  │                  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                   │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │                  GraphQL Layer                           │   │
│  │                                                          │   │
│  │  query Authorize($input: AuthorizeInput!) {              │   │
│  │    userQuery { authorize(input: $input) { allowed } }    │   │
│  │  }                                                       │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Fail Secure**: Default to denied if permission check fails
2. **Optimistic UI**: Cache permissions for instant feedback
3. **Server Authority**: Server is the source of truth for permissions
4. **Declarative**: Prefer declarative components over imperative checks
5. **Composable**: Hooks can be used independently or combined

---

## Directory Structure

```
auth/
├── ...existing auth files...
│
├── permissions/
│   ├── index.ts                    # Public exports
│   │
│   ├── components/
│   │   ├── index.ts
│   │   ├── permission-gate.tsx     # Conditional rendering based on permission
│   │   ├── protected-route.tsx     # Route-level protection
│   │   └── access-denied.tsx       # Access denied fallback UI
│   │
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── use-authorize.ts        # Async server-side check
│   │   ├── use-permission.ts       # Sync cached permission check
│   │   └── use-permission-cache.ts # Permission cache management
│   │
│   ├── context/
│   │   ├── index.ts
│   │   ├── permission-context.tsx  # Permission context definition
│   │   └── permission-provider.tsx # Provider with caching
│   │
│   ├── graphql/
│   │   ├── index.ts
│   │   └── queries.ts              # Authorization queries
│   │
│   ├── types/
│   │   ├── index.ts
│   │   └── permission.types.ts     # Permission-related types
│   │
│   └── utils/
│       ├── index.ts
│       └── permission-utils.ts     # Helper functions
```

---

## Core Patterns

### Pattern 1: Permission Types

```typescript
// permissions/types/permission.types.ts

/**
 * Domain scope for permission checks.
 * - "org" = organization-level
 * - "store:{uuid}" = store-specific
 */
export type PermissionDomain = 'org' | `store:${string}`;

/**
 * Action levels (hierarchical: admin > write > read)
 */
export type PermissionAction = 'read' | 'write' | 'admin';

/**
 * Resource identifiers
 */
export type PermissionResource =
  | 'org.profile'
  | 'org.members'
  | 'org.billing'
  | 'store.settings'
  | 'store.products'
  | 'store.orders'
  | 'store.customers'
  | string; // Allow custom resources

/**
 * Permission check input
 */
export interface PermissionCheck {
  organizationId: string;
  domain: PermissionDomain;
  resource: PermissionResource;
  action: PermissionAction;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  allowed: boolean;
  deniedReason?: string;
  loading: boolean;
  error?: Error;
}

/**
 * Cache key format: "org:{orgId}:domain:{domain}:resource:{resource}:action:{action}"
 */
export type PermissionCacheKey = string;
```

### Pattern 2: Authorization Hook (Async Server Check)

```typescript
// permissions/hooks/use-authorize.ts
'use client';

import { useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { AUTHORIZE_QUERY } from '../graphql';
import type { PermissionCheck, PermissionResult } from '../types';

interface UseAuthorizeOptions {
  /** Skip the query (useful for conditional checks) */
  skip?: boolean;
  /** Poll interval in ms (0 = no polling) */
  pollInterval?: number;
}

/**
 * Async hook for server-side permission verification.
 * Use this for critical permission checks that require server validation.
 */
export function useAuthorize(
  check: PermissionCheck,
  options: UseAuthorizeOptions = {}
): PermissionResult {
  const { skip = false, pollInterval = 0 } = options;

  const { data, loading, error } = useQuery(AUTHORIZE_QUERY, {
    variables: {
      input: {
        organizationId: check.organizationId,
        domain: check.domain,
        resource: check.resource,
        action: check.action,
      },
    },
    skip,
    pollInterval,
    fetchPolicy: 'cache-and-network',
  });

  return useMemo(() => ({
    allowed: data?.userQuery?.authorize?.allowed ?? false,
    deniedReason: data?.userQuery?.authorize?.deniedReason ?? undefined,
    loading,
    error: error ?? undefined,
  }), [data, loading, error]);
}
```

### Pattern 3: Permission Hook (Sync Cached Check)

```typescript
// permissions/hooks/use-permission.ts
'use client';

import { useCallback, useEffect } from 'react';
import { usePermissionCache } from './use-permission-cache';
import { useAuthorize } from './use-authorize';
import type { PermissionCheck } from '../types';

interface UsePermissionOptions {
  /** Fallback value while loading */
  fallback?: boolean;
  /** Force refresh from server */
  refresh?: boolean;
}

/**
 * Sync hook for permission checks with caching.
 * Returns cached result immediately, refreshes in background.
 */
export function usePermission(
  check: PermissionCheck,
  options: UsePermissionOptions = {}
): boolean {
  const { fallback = false, refresh = false } = options;
  const { getPermission, setPermission, invalidate } = usePermissionCache();

  // Check cache first
  const cached = getPermission(check);

  // Fetch from server (skip if cached and not refreshing)
  const { allowed, loading } = useAuthorize(check, {
    skip: cached !== undefined && !refresh,
  });

  // Update cache when server responds
  useEffect(() => {
    if (!loading && allowed !== undefined) {
      setPermission(check, allowed);
    }
  }, [loading, allowed, check, setPermission]);

  // Invalidate on refresh request
  useEffect(() => {
    if (refresh) {
      invalidate(check);
    }
  }, [refresh, check, invalidate]);

  // Return cached value or fallback
  return cached ?? (loading ? fallback : allowed);
}

/**
 * Hook for checking multiple permissions at once.
 */
export function usePermissions(
  checks: PermissionCheck[]
): Record<string, boolean> {
  const results: Record<string, boolean> = {};

  for (const check of checks) {
    const key = `${check.resource}:${check.action}`;
    results[key] = usePermission(check);
  }

  return results;
}
```

### Pattern 4: Permission Gate Component

```typescript
// permissions/components/permission-gate.tsx
'use client';

import type { ReactNode } from 'react';
import { usePermission } from '../hooks';
import type { PermissionCheck } from '../types';

interface PermissionGateProps {
  /** Permission check to perform */
  check: PermissionCheck;
  /** Content to render if allowed */
  children: ReactNode;
  /** Content to render if denied (optional) */
  fallback?: ReactNode;
  /** Show nothing while loading (default: true) */
  hideWhileLoading?: boolean;
}

/**
 * Declarative component for permission-based rendering.
 *
 * @example
 * <PermissionGate
 *   check={{ organizationId, domain: 'org', resource: 'org.members', action: 'write' }}
 *   fallback={<span>View only</span>}
 * >
 *   <Button>Invite Member</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  check,
  children,
  fallback = null,
  hideWhileLoading = true,
}: PermissionGateProps) {
  const allowed = usePermission(check, { fallback: hideWhileLoading ? false : true });

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Shorthand for common permission checks
 */
export function CanWrite({
  organizationId,
  domain,
  resource,
  children,
  fallback,
}: {
  organizationId: string;
  domain: string;
  resource: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGate
      check={{ organizationId, domain: domain as any, resource, action: 'write' }}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}

export function CanAdmin({
  organizationId,
  domain,
  resource,
  children,
  fallback,
}: {
  organizationId: string;
  domain: string;
  resource: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <PermissionGate
      check={{ organizationId, domain: domain as any, resource, action: 'admin' }}
      fallback={fallback}
    >
      {children}
    </PermissionGate>
  );
}
```

### Pattern 5: Protected Route Component

```typescript
// permissions/components/protected-route.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin, Flex } from 'antd';
import { useAuthorize } from '../hooks';
import { AccessDenied } from './access-denied';
import type { PermissionCheck } from '../types';

interface ProtectedRouteProps {
  /** Permission required to access this route */
  check: PermissionCheck;
  /** Content to render if allowed */
  children: React.ReactNode;
  /** Redirect to this path if denied (optional) */
  redirectTo?: string;
  /** Custom access denied component (optional) */
  accessDeniedComponent?: React.ReactNode;
}

/**
 * Route-level permission protection.
 * Use this for entire pages that require specific permissions.
 *
 * @example
 * <ProtectedRoute
 *   check={{ organizationId, domain: 'org', resource: 'org.members', action: 'admin' }}
 *   redirectTo="/workspace"
 * >
 *   <MemberManagementPage />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  check,
  children,
  redirectTo,
  accessDeniedComponent,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { allowed, loading, deniedReason } = useAuthorize(check);

  useEffect(() => {
    if (!loading && !allowed && redirectTo) {
      router.replace(redirectTo);
    }
  }, [loading, allowed, redirectTo, router]);

  // Show loading state
  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 200 }}>
        <Spin size="large" />
      </Flex>
    );
  }

  // Show access denied or redirect
  if (!allowed) {
    if (redirectTo) {
      return null; // Will redirect via useEffect
    }
    return accessDeniedComponent ?? <AccessDenied reason={deniedReason} />;
  }

  return <>{children}</>;
}
```

### Pattern 6: Access Denied Component

```typescript
// permissions/components/access-denied.tsx
'use client';

import { Result, Button } from 'antd';
import { useRouter } from 'next/navigation';
import { LockOutlined } from '@ant-design/icons';

interface AccessDeniedProps {
  /** Reason for denial (from server) */
  reason?: string;
  /** Custom title */
  title?: string;
  /** Show back button */
  showBackButton?: boolean;
}

/**
 * Access denied fallback UI.
 */
export function AccessDenied({
  reason,
  title = 'Access Denied',
  showBackButton = true,
}: AccessDeniedProps) {
  const router = useRouter();

  return (
    <Result
      status="403"
      icon={<LockOutlined />}
      title={title}
      subTitle={reason || "You don't have permission to access this resource."}
      extra={
        showBackButton && (
          <Button type="primary" onClick={() => router.back()}>
            Go Back
          </Button>
        )
      }
    />
  );
}
```

---

## GraphQL API Reference

### Authorization Query

```graphql
query Authorize($input: AuthorizeInput!) {
  userQuery {
    authorize(input: $input) {
      allowed
      deniedReason
    }
  }
}
```

### Input Type

```graphql
input AuthorizeInput {
  organizationId: ID!
  domain: String!      # "org" or "store:{uuid}"
  resource: String!    # e.g., "org.profile", "store.members"
  action: String!      # "read", "write", "admin"
}
```

### Response Type

```graphql
type AuthorizePayload {
  allowed: Boolean!
  deniedReason: String
}
```

### Action Hierarchy

```
admin > write > read

- admin: Full control (includes write + read)
- write: Create, update, delete (includes read)
- read:  View only
```

---

## Implementation Phases

### Phase 1: Core Infrastructure

**Objective**: Set up permission hooks and context

**Tasks**:
1. Create permission types
2. Implement `useAuthorize` hook (async)
3. Implement permission cache context
4. Implement `usePermission` hook (sync with cache)
5. Add GraphQL query for authorization

**Deliverables**:
- `permissions/types/`
- `permissions/hooks/use-authorize.ts`
- `permissions/hooks/use-permission.ts`
- `permissions/context/`
- `permissions/graphql/`

### Phase 2: Declarative Components

**Objective**: Create reusable permission components

**Tasks**:
1. Implement `PermissionGate` component
2. Implement `ProtectedRoute` component
3. Implement `AccessDenied` component
4. Create shorthand components (`CanWrite`, `CanAdmin`)

**Deliverables**:
- `permissions/components/permission-gate.tsx`
- `permissions/components/protected-route.tsx`
- `permissions/components/access-denied.tsx`

### Phase 3: Integration

**Objective**: Integrate with existing pages

**Tasks**:
1. Add permission checks to member management
2. Add permission checks to organization settings
3. Add permission checks to store settings
4. Update navigation to hide unauthorized items

**Deliverables**:
- Updated domain pages with permission gates
- Conditional sidebar items

---

## Usage Examples

### Example 1: Hide Button Based on Permission

```tsx
function MemberList({ organizationId }: { organizationId: string }) {
  return (
    <div>
      <h2>Members</h2>

      <PermissionGate
        check={{
          organizationId,
          domain: 'org',
          resource: 'org.members',
          action: 'write',
        }}
      >
        <Button type="primary">Invite Member</Button>
      </PermissionGate>

      {/* Member list... */}
    </div>
  );
}
```

### Example 2: Protect Entire Route

```tsx
// In page component
export default function MemberManagementPage() {
  const { organizationId } = useOrganization();

  return (
    <ProtectedRoute
      check={{
        organizationId,
        domain: 'org',
        resource: 'org.members',
        action: 'admin',
      }}
      accessDeniedComponent={
        <AccessDenied
          title="Admin Access Required"
          reason="Only organization admins can manage members."
        />
      }
    >
      <MemberManagement />
    </ProtectedRoute>
  );
}
```

### Example 3: Imperative Permission Check

```tsx
function ProductActions({ organizationId, storeId }: Props) {
  const canDelete = usePermission({
    organizationId,
    domain: `store:${storeId}`,
    resource: 'store.products',
    action: 'admin',
  });

  const handleDelete = async () => {
    if (!canDelete) {
      message.error('You do not have permission to delete products');
      return;
    }
    // Proceed with delete...
  };

  return (
    <Button danger disabled={!canDelete} onClick={handleDelete}>
      Delete Product
    </Button>
  );
}
```

### Example 4: Conditional Sidebar Items

```tsx
function Sidebar({ organizationId }: { organizationId: string }) {
  const canManageMembers = usePermission({
    organizationId,
    domain: 'org',
    resource: 'org.members',
    action: 'read',
  });

  const canManageBilling = usePermission({
    organizationId,
    domain: 'org',
    resource: 'org.billing',
    action: 'read',
  });

  return (
    <Menu>
      <Menu.Item>Dashboard</Menu.Item>
      {canManageMembers && <Menu.Item>Members</Menu.Item>}
      {canManageBilling && <Menu.Item>Billing</Menu.Item>}
    </Menu>
  );
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/hooks/use-authorize.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useAuthorize } from '../hooks/use-authorize';
import { AUTHORIZE_QUERY } from '../graphql';

const allowedMock = {
  request: {
    query: AUTHORIZE_QUERY,
    variables: {
      input: {
        organizationId: 'org-1',
        domain: 'org',
        resource: 'org.members',
        action: 'write',
      },
    },
  },
  result: {
    data: {
      userQuery: {
        authorize: { allowed: true, deniedReason: null },
      },
    },
  },
};

describe('useAuthorize', () => {
  it('should return allowed: true for authorized user', async () => {
    const { result } = renderHook(
      () => useAuthorize({
        organizationId: 'org-1',
        domain: 'org',
        resource: 'org.members',
        action: 'write',
      }),
      {
        wrapper: ({ children }) => (
          <MockedProvider mocks={[allowedMock]}>{children}</MockedProvider>
        ),
      }
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allowed).toBe(true);
  });
});
```

### Component Tests

```typescript
// __tests__/components/permission-gate.test.tsx
import { render, screen } from '@testing-library/react';
import { PermissionGate } from '../components/permission-gate';

// Mock usePermission hook
jest.mock('../hooks', () => ({
  usePermission: jest.fn(),
}));

import { usePermission } from '../hooks';

describe('PermissionGate', () => {
  it('should render children when allowed', () => {
    (usePermission as jest.Mock).mockReturnValue(true);

    render(
      <PermissionGate
        check={{ organizationId: '1', domain: 'org', resource: 'org.members', action: 'write' }}
      >
        <button>Invite</button>
      </PermissionGate>
    );

    expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
  });

  it('should render fallback when denied', () => {
    (usePermission as jest.Mock).mockReturnValue(false);

    render(
      <PermissionGate
        check={{ organizationId: '1', domain: 'org', resource: 'org.members', action: 'write' }}
        fallback={<span>No access</span>}
      >
        <button>Invite</button>
      </PermissionGate>
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('No access')).toBeInTheDocument();
  });
});
```

---

## Security Considerations

1. **Server Authority**: Always verify permissions server-side for mutations
2. **Cache Invalidation**: Invalidate cache on role changes, logout
3. **Fail Secure**: Default to `false` if check fails or errors
4. **No Client Trust**: UI permission checks are for UX only, not security
5. **Audit Trail**: Server logs all authorization checks

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Scope: Permission Management & RBAC*
*Author: Senior Staff Engineer*
