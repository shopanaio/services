# Workspace Domain API Layer - Implementation Plan

> **Author**: Senior Staff Web Engineer
> **Domain**: `/admin-next/src/domains/workspace` > **Status**: Planning

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Gap Analysis](#3-gap-analysis)
4. [Architecture & Patterns](#4-architecture--patterns)
5. [Implementation Plan](#5-implementation-plan)
6. [File Structure](#6-file-structure)
7. [API Reference](#7-api-reference)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. Executive Summary

This document outlines the plan to build a comprehensive, production-ready API layer for the workspace domain. The workspace domain manages:

- **Organizations** - Multi-tenant workspaces
- **Stores** - Individual storefronts within organizations
- **Members** - Users with access to organizations/stores
- **Roles** - Permission sets for access control
- **Invitations** - Pending member invites

### Design Principles

1. **Consistency** - Follow established patterns from existing hooks
2. **Type Safety** - Full TypeScript with generated GraphQL types
3. **Performance** - Smart caching, optimistic updates, parallel fetching
4. **Developer Experience** - Clear APIs, comprehensive documentation
5. **Separation of Concerns** - GraphQL operations, hooks, and context are distinct layers

---

## 2. Current State Analysis

### 2.1 Existing GraphQL Operations

**Fragments** (`graphql/fragments.ts`):

- `USER_FRAGMENT` / `USER_BASIC_FRAGMENT`
- `ROLE_FRAGMENT` / `ROLE_BASIC_FRAGMENT`
- `MEMBER_FRAGMENT`
- `MEMBERSHIP_FRAGMENT`
- `ORGANIZATION_FRAGMENT` / `ORGANIZATION_BASIC_FRAGMENT`
- `AUTH_TOKEN_FRAGMENT`
- `USER_ERROR_FRAGMENT`

**Queries** (`graphql/queries.ts`):

- `CURRENT_USER_QUERY`
- `AUTHORIZE_QUERY`
- `ORGANIZATION_QUERY`
- `ORGANIZATION_BASIC_QUERY`

**Mutations** (`graphql/mutations.ts`):

- Organization: Create, Update, Delete, TransferOwnership
- Member: Invite, Remove, ChangeRole, RemoveAccess
- Role: Create, Update, Delete
- User: UpdateProfile, UpdateEmail, UpdatePassword

### 2.2 Existing Hooks (22 total)

| Category                | Hooks                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Organization**        | `useOrganization`, `useCreateOrganization`, `useUpdateOrganization`, `useDeleteOrganization`, `useTransferOwnership` |
| **Member**              | `useInviteMember`, `useRemoveMember`, `useChangeMemberRole`, `useRemoveMemberAccess`                                 |
| **Role**                | `useCreateRole`, `useUpdateRole`, `useDeleteRole`                                                                    |
| **Authorization**       | `useAuthorize`, `useAuthorizeCheck`                                                                                  |
| **User**                | `useCurrentUser`, `useUpdateProfile`, `useUpdateEmail`, `useUpdatePassword`                                          |
| **Auth** _(deprecated)_ | `useSignIn`, `useSignUp`, `useSignOut`, `useTokenRefresh`                                                            |

### 2.3 Backend Schema Overview

**IAM Service** (`services/iam`):

- Organization, User, Member, Role, Membership entities
- Authorization checking via Casbin policies
- Domain-scoped access: `"org"` or `"store:{uuid}"`

**Project Service** (`services/project`):

- Store entity with full settings (locales, currencies, timezone)
- Store CRUD operations
- Currency and Locale management per store

---

## 3. Gap Analysis

### 3.1 Missing GraphQL Operations

| Category             | Missing Operations          | Priority |
| -------------------- | --------------------------- | -------- |
| **Store**            | Full CRUD + list queries    | P0       |
| **Organization**     | List organizations query    | P0       |
| **Invitations**      | List/cancel pending invites | P1       |
| **Store Membership** | Store-level member queries  | P1       |
| **Batch Operations** | Bulk member invite/remove   | P2       |

### 3.2 Missing Hooks

| Hook                  | Purpose                         | Priority |
| --------------------- | ------------------------------- | -------- |
| `useOrganizations`    | List all user's organizations   | P0       |
| `useStores`           | List stores in organization     | P0       |
| `useStore`            | Fetch single store with details | P0       |
| `useCreateStore`      | Create new store                | P0       |
| `useUpdateStore`      | Update store settings           | P0       |
| `useDeleteStore`      | Delete store                    | P0       |
| `useStoreMembership`  | Fetch store-level members       | P1       |
| `useInvitations`      | List pending invitations        | P1       |
| `useCancelInvitation` | Cancel pending invite           | P1       |
| `useResendInvitation` | Resend invitation email         | P2       |

### 3.3 Missing Context/State

| Context             | Purpose                     | Priority |
| ------------------- | --------------------------- | -------- |
| `WorkspaceContext`  | Current org/store selection | P0       |
| `MembershipContext` | Current user's permissions  | P1       |

---

## 4. Architecture & Patterns

### 4.1 Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Components                           │
│         (consume hooks, render UI, handle events)           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    Context Providers                         │
│     (WorkspaceProvider, provide derived state/actions)       │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                         Hooks                                │
│   (useOrganization, useStore, useCreateStore, etc.)          │
│   - Query hooks: wrap useQuery with typed return             │
│   - Mutation hooks: wrap useMutation with callback           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   GraphQL Operations                         │
│         (fragments, queries, mutations)                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                     Apollo Client                            │
│      (caching, error handling, token refresh)                │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Query Hook Pattern

```typescript
"use client";

import { useQuery } from "@apollo/client/react";
import { STORES_QUERY } from "../graphql";
import type { ApiStore } from "@/graphql/types";

interface UseStoresOptions {
  organizationId: string;
  skip?: boolean;
}

interface UseStoresReturn {
  stores: ApiStore[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useStores(options: UseStoresOptions): UseStoresReturn {
  const { organizationId, skip = false } = options;

  const { data, loading, error, refetch } = useQuery<{
    storeQuery: { stores: ApiStore[] };
  }>(STORES_QUERY, {
    variables: { organizationId },
    skip: skip || !organizationId,
    fetchPolicy: "cache-and-network",
  });

  return {
    stores: data?.storeQuery.stores ?? [],
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
  };
}
```

### 4.3 Mutation Hook Pattern

```typescript
"use client";

import { useMutation } from "@apollo/client/react";
import { useCallback } from "react";
import { CREATE_STORE_MUTATION, STORES_QUERY } from "../graphql";
import type {
  ApiStoreCreateInput,
  ApiStore,
  ApiGenericUserError,
} from "@/graphql/types";

interface CreateStoreResult {
  store: ApiStore | null;
  userErrors: ApiGenericUserError[];
}

interface UseCreateStoreReturn {
  createStore: (input: ApiStoreCreateInput) => Promise<CreateStoreResult>;
  loading: boolean;
  error: Error | null;
}

export function useCreateStore(): UseCreateStoreReturn {
  const [mutate, { loading, error }] = useMutation<
    {
      storeMutation: {
        storeCreate: {
          store: ApiStore | null;
          userErrors: ApiGenericUserError[];
        };
      };
    },
    { input: ApiStoreCreateInput }
  >(CREATE_STORE_MUTATION, {
    // Refetch stores list after creation
    refetchQueries: [STORES_QUERY],
  });

  const createStore = useCallback(
    async (input: ApiStoreCreateInput): Promise<CreateStoreResult> => {
      const result = await mutate({ variables: { input } });
      const payload = result.data?.storeMutation.storeCreate;

      return {
        store: payload?.store ?? null,
        userErrors: payload?.userErrors ?? [],
      };
    },
    [mutate]
  );

  return {
    createStore,
    loading,
    error: error ?? null,
  };
}
```

### 4.4 Fragment Composition Pattern

```typescript
// Base fragments for reuse
export const STORE_BASIC_FRAGMENT = gql`
  fragment StoreBasicFields on Store {
    id
    name
    displayName
    status
    createdAt
  }
`;

// Full fragment includes basic + extended fields
export const STORE_FRAGMENT = gql`
  fragment StoreFields on Store {
    ...StoreBasicFields
    timezone
    email
    locales
    currencies
    baseCurrency
    defaultLocale
    defaultCurrency
    defaultWeightUnit
    defaultDimensionUnit
    updatedAt
    membership {
      ...MembershipFields
    }
  }
  ${STORE_BASIC_FRAGMENT}
  ${MEMBERSHIP_FRAGMENT}
`;
```

### 4.5 Cache Strategy

| Query               | Fetch Policy        | Rationale                             |
| ------------------- | ------------------- | ------------------------------------- |
| Organizations list  | `cache-and-network` | Show cached, update in background     |
| Single organization | `cache-and-network` | Membership may change                 |
| Stores list         | `cache-and-network` | Show cached, update in background     |
| Single store        | `cache-and-network` | Settings may change                   |
| Authorization check | `cache-first`       | Permissions rarely change mid-session |
| Current user        | `cache-first`       | User data is stable                   |

### 4.6 Error Handling Pattern

```typescript
interface HookResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null; // Apollo/network errors
  userErrors: ApiGenericUserError[]; // Business logic errors
}

// In components:
const { store, loading, error, userErrors } = useCreateStore();

if (error) {
  // Network/GraphQL error - show generic error
  showErrorNotification("An error occurred");
}

if (userErrors.length > 0) {
  // Business error - show specific message
  userErrors.forEach((e) => showFieldError(e.field, e.message));
}
```

---

## 5. Implementation Plan

### Phase 1: Store Operations (P0)

#### 5.1.1 Add Store Fragments

**File**: `graphql/fragments.ts`

```typescript
// Store fragment - minimal info for lists
export const STORE_BASIC_FRAGMENT = gql`
  fragment StoreBasicFields on Store {
    id
    name
    displayName
    status
    createdAt
  }
`;

// Store fragment - full settings
export const STORE_FRAGMENT = gql`
  fragment StoreFields on Store {
    id
    name
    displayName
    status
    timezone
    email
    locales
    currencies
    baseCurrency
    defaultLocale
    defaultCurrency
    defaultWeightUnit
    defaultDimensionUnit
    createdAt
    updatedAt
    organization {
      id
      name
      displayName
    }
    membership {
      ...MembershipFields
    }
  }
  ${MEMBERSHIP_FRAGMENT}
`;
```

#### 5.1.2 Add Store Queries

**File**: `graphql/queries.ts`

```typescript
// List stores in organization
export const STORES_QUERY = gql`
  query Stores($organizationId: ID!) {
    storeQuery {
      stores(organizationId: $organizationId) {
        ...StoreBasicFields
      }
    }
  }
  ${STORE_BASIC_FRAGMENT}
`;

// Get current store from context
export const CURRENT_STORE_QUERY = gql`
  query CurrentStore {
    storeQuery {
      currentStore {
        ...StoreFields
      }
    }
  }
  ${STORE_FRAGMENT}
`;
```

#### 5.1.3 Add Store Mutations

**File**: `graphql/mutations.ts`

```typescript
export const CREATE_STORE_MUTATION = gql`
  mutation CreateStore($input: StoreCreateInput!) {
    storeMutation {
      storeCreate(input: $input) {
        store {
          ...StoreFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${STORE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const UPDATE_STORE_MUTATION = gql`
  mutation UpdateStore($input: StoreUpdateInput!) {
    storeMutation {
      storeUpdate(input: $input) {
        store {
          ...StoreFields
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${STORE_FRAGMENT}
  ${USER_ERROR_FRAGMENT}
`;

export const DELETE_STORE_MUTATION = gql`
  mutation DeleteStore($input: StoreDeleteInput!) {
    storeMutation {
      storeDelete(input: $input) {
        deletedStoreId
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;
```

#### 5.1.4 Implement Store Hooks

| Hook              | File                         | Description                    |
| ----------------- | ---------------------------- | ------------------------------ |
| `useStores`       | `hooks/use-stores.ts`        | List stores in organization    |
| `useCurrentStore` | `hooks/use-current-store.ts` | Get current store from context |
| `useCreateStore`  | `hooks/use-create-store.ts`  | Create new store               |
| `useUpdateStore`  | `hooks/use-update-store.ts`  | Update store settings          |
| `useDeleteStore`  | `hooks/use-delete-store.ts`  | Delete store                   |

---

### Phase 2: Organizations List (P0)

#### 5.2.1 Add Organizations Query

**File**: `graphql/queries.ts`

```typescript
// List all organizations for current user
export const ORGANIZATIONS_QUERY = gql`
  query Organizations {
    organizationQuery {
      organizations {
        ...OrganizationBasicFields
      }
    }
  }
  ${ORGANIZATION_BASIC_FRAGMENT}
`;
```

#### 5.2.2 Implement Organizations Hook

**File**: `hooks/use-organizations.ts`

```typescript
export function useOrganizations(
  options?: UseOrganizationsOptions
): UseOrganizationsReturn {
  const { skip = false } = options ?? {};

  const { data, loading, error, refetch } = useQuery<{
    organizationQuery: { organizations: ApiOrganization[] };
  }>(ORGANIZATIONS_QUERY, {
    skip,
    fetchPolicy: "cache-and-network",
  });

  return {
    organizations: data?.organizationQuery.organizations ?? [],
    loading,
    error: error ?? null,
    refetch: () => void refetch(),
  };
}
```

---

### Phase 3: Workspace Context (P0)

#### 5.3.1 Create Workspace Context

**File**: `context/workspace-context.tsx`

```typescript
"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { ApiOrganization, ApiStore } from "@/graphql/types";
import { useOrganization } from "../hooks/use-organization";
import { useCurrentStore } from "../hooks/use-current-store";

interface WorkspaceContextValue {
  // Current selections
  currentOrganization: ApiOrganization | null;
  currentStore: ApiStore | null;

  // Loading states
  organizationLoading: boolean;
  storeLoading: boolean;

  // Actions
  selectOrganization: (id: string) => void;
  selectStore: (id: string) => void;

  // Derived state
  isOwner: boolean;
  currentMember: ApiMember | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  children,
  initialOrganizationId,
  initialStoreId,
}: {
  children: ReactNode;
  initialOrganizationId?: string;
  initialStoreId?: string;
}) {
  const [organizationId, setOrganizationId] = useState(initialOrganizationId);
  const [storeId, setStoreId] = useState(initialStoreId);

  const { organization, loading: orgLoading } = useOrganization(organizationId ?? "", {
    skip: !organizationId,
  });

  const { store, loading: storeLoading } = useCurrentStore({
    skip: !storeId,
  });

  const value = useMemo(() => ({
    currentOrganization: organization,
    currentStore: store,
    organizationLoading: orgLoading,
    storeLoading: storeLoading,
    selectOrganization: setOrganizationId,
    selectStore: setStoreId,
    isOwner: organization?.membership.members.some(m => m.isOwner && m.user.id === /* currentUserId */) ?? false,
    currentMember: /* derive from membership */,
  }), [organization, store, orgLoading, storeLoading]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}
```

---

### Phase 4: Store Membership (P1)

#### 5.4.1 Add Store Membership Query

```typescript
// Get membership for specific store
export const STORE_MEMBERSHIP_QUERY = gql`
  query StoreMembership($storeId: ID!, $organizationId: ID!) {
    membershipQuery {
      membership(domain: $storeId, organizationId: $organizationId) {
        ...MembershipFields
      }
    }
  }
  ${MEMBERSHIP_FRAGMENT}
`;
```

#### 5.4.2 Store Member Hooks

| Hook                       | Purpose                             |
| -------------------------- | ----------------------------------- |
| `useStoreMembership`       | Fetch store-level members and roles |
| `useInviteStoreMember`     | Invite member to store              |
| `useRemoveStoreMember`     | Remove member from store            |
| `useChangeStoreMemberRole` | Change member's store role          |

---

### Phase 5: Invitations Management (P1)

#### 5.5.1 Add Invitation Queries/Mutations

```typescript
// List pending invitations
export const INVITATIONS_QUERY = gql`
  query Invitations($organizationId: ID!) {
    invitationQuery {
      invitations(organizationId: $organizationId) {
        id
        email
        roles {
          domain
          role
        }
        status
        expiresAt
        createdAt
        invitedBy {
          ...UserBasicFields
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const CANCEL_INVITATION_MUTATION = gql`
  mutation CancelInvitation($id: ID!) {
    invitationMutation {
      invitationCancel(id: $id) {
        deletedInvitationId
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;

export const RESEND_INVITATION_MUTATION = gql`
  mutation ResendInvitation($id: ID!) {
    invitationMutation {
      invitationResend(id: $id) {
        invitation {
          id
          status
        }
        userErrors {
          ...UserErrorFields
        }
      }
    }
  }
  ${USER_ERROR_FRAGMENT}
`;
```

#### 5.5.2 Invitation Hooks

| Hook                  | Purpose                     |
| --------------------- | --------------------------- |
| `useInvitations`      | List pending invitations    |
| `useCancelInvitation` | Cancel a pending invitation |
| `useResendInvitation` | Resend invitation email     |

---

### Phase 6: Optimistic Updates & Cache (P2)

#### 5.6.1 Optimistic Updates for Mutations

```typescript
export function useCreateStore(): UseCreateStoreReturn {
  const [mutate, { loading, error }] = useMutation(CREATE_STORE_MUTATION, {
    // Optimistic response for instant UI feedback
    optimisticResponse: ({ input }) => ({
      storeMutation: {
        storeCreate: {
          store: {
            __typename: "Store",
            id: `temp-${Date.now()}`,
            name: input.name,
            displayName: input.displayName,
            status: input.status ?? "ACTIVE",
            // ... other fields with defaults
          },
          userErrors: [],
        },
      },
    }),
    // Update cache manually
    update: (cache, { data }) => {
      const store = data?.storeMutation.storeCreate.store;
      if (!store) return;

      // Add to stores list
      cache.modify({
        fields: {
          stores(existingStores = []) {
            const newStoreRef = cache.writeFragment({
              data: store,
              fragment: STORE_BASIC_FRAGMENT,
            });
            return [...existingStores, newStoreRef];
          },
        },
      });
    },
  });

  // ... rest of hook
}
```

#### 5.6.2 Cache Normalization

```typescript
// In Apollo client setup
const cache = new InMemoryCache({
  typePolicies: {
    Organization: {
      keyFields: ["id"],
    },
    Store: {
      keyFields: ["id"],
    },
    Member: {
      keyFields: ["id"],
    },
    Role: {
      keyFields: ["id"],
    },
    Membership: {
      keyFields: ["domain", "organizationId"],
    },
  },
});
```

---

## 6. File Structure

```
workspace/
├── graphql/
│   ├── index.ts                    # Public exports
│   ├── fragments.ts                # All fragments (existing + new)
│   ├── queries.ts                  # All queries (existing + new)
│   └── mutations.ts                # All mutations (existing + new)
│
├── hooks/
│   ├── index.ts                    # Public exports
│   │
│   │ # Organization hooks
│   ├── use-organizations.ts        # NEW: List organizations
│   ├── use-organization.ts         # Existing
│   ├── use-create-organization.ts  # Existing
│   ├── use-update-organization.ts  # Existing
│   ├── use-delete-organization.ts  # Existing
│   ├── use-transfer-ownership.ts   # Existing
│   │
│   │ # Store hooks
│   ├── use-stores.ts               # NEW: List stores
│   ├── use-current-store.ts        # NEW: Current store
│   ├── use-create-store.ts         # NEW: Create store
│   ├── use-update-store.ts         # NEW: Update store
│   ├── use-delete-store.ts         # NEW: Delete store
│   │
│   │ # Member hooks
│   ├── use-invite-member.ts        # Existing
│   ├── use-remove-member.ts        # Existing
│   ├── use-change-member-role.ts   # Existing
│   ├── use-remove-member-access.ts # Existing
│   ├── use-store-membership.ts     # NEW: Store membership
│   │
│   │ # Role hooks
│   ├── use-create-role.ts          # Existing
│   ├── use-update-role.ts          # Existing
│   ├── use-delete-role.ts          # Existing
│   │
│   │ # Invitation hooks
│   ├── use-invitations.ts          # NEW: List invitations
│   ├── use-cancel-invitation.ts    # NEW: Cancel invitation
│   ├── use-resend-invitation.ts    # NEW: Resend invitation
│   │
│   │ # Authorization hooks
│   ├── use-authorize.ts            # Existing
│   │
│   │ # User hooks
│   ├── use-current-user.ts         # Existing (deprecated)
│   ├── use-update-profile.ts       # Existing
│   ├── use-update-email.ts         # Existing
│   └── use-update-password.ts      # Existing
│
├── context/
│   ├── index.ts                    # Public exports
│   ├── workspace-context.tsx       # NEW: Workspace state
│   └── workspace-provider.tsx      # NEW: Provider component
│
├── types/
│   └── index.ts                    # Domain-specific types
│
└── utils/
    ├── index.ts                    # Public exports
    ├── cache-helpers.ts            # Cache update utilities
    └── permission-helpers.ts       # Permission checking utilities
```

---

## 7. API Reference

### 7.1 Query Hooks

| Hook                          | Parameters                                    | Returns                                      | Description               |
| ----------------------------- | --------------------------------------------- | -------------------------------------------- | ------------------------- |
| `useOrganizations()`          | `options?: { skip?: boolean }`                | `{ organizations, loading, error, refetch }` | List user's organizations |
| `useOrganization(id)`         | `id: string, options?: { skip?: boolean }`    | `{ organization, loading, error, refetch }`  | Get single organization   |
| `useStores(options)`          | `{ organizationId: string, skip?: boolean }`  | `{ stores, loading, error, refetch }`        | List stores in org        |
| `useCurrentStore()`           | `options?: { skip?: boolean }`                | `{ store, loading, error, refetch }`         | Get current store         |
| `useStoreMembership(options)` | `{ storeId: string, organizationId: string }` | `{ membership, loading, error, refetch }`    | Get store membership      |
| `useInvitations(options)`     | `{ organizationId: string }`                  | `{ invitations, loading, error, refetch }`   | List pending invites      |
| `useAuthorize(input)`         | `ApiAuthorizeInput, options?`                 | `{ allowed, deniedReason, loading, error }`  | Check permission          |
| `useAuthorizeCheck()`         | -                                             | `{ checkAuthorization, loading, error }`     | Lazy permission check     |

### 7.2 Mutation Hooks

| Hook                      | Action Signature            | Result                         | Description            |
| ------------------------- | --------------------------- | ------------------------------ | ---------------------- |
| `useCreateOrganization()` | `createOrganization(input)` | `{ organization, userErrors }` | Create organization    |
| `useUpdateOrganization()` | `updateOrganization(input)` | `{ organization, userErrors }` | Update organization    |
| `useDeleteOrganization()` | `deleteOrganization(id)`    | `{ deletedId, userErrors }`    | Delete organization    |
| `useTransferOwnership()`  | `transferOwnership(input)`  | `{ organization, userErrors }` | Transfer org ownership |
| `useCreateStore()`        | `createStore(input)`        | `{ store, userErrors }`        | Create store           |
| `useUpdateStore()`        | `updateStore(input)`        | `{ store, userErrors }`        | Update store           |
| `useDeleteStore()`        | `deleteStore(input)`        | `{ deletedId, userErrors }`    | Delete store           |
| `useInviteMember()`       | `inviteMember(input)`       | `{ member, userErrors }`       | Invite member          |
| `useRemoveMember()`       | `removeMember(input)`       | `{ deletedId, userErrors }`    | Remove member          |
| `useChangeMemberRole()`   | `changeMemberRole(input)`   | `{ member, userErrors }`       | Change role            |
| `useCreateRole()`         | `createRole(input)`         | `{ role, userErrors }`         | Create role            |
| `useUpdateRole()`         | `updateRole(input)`         | `{ role, userErrors }`         | Update role            |
| `useDeleteRole()`         | `deleteRole(input)`         | `{ deletedId, userErrors }`    | Delete role            |
| `useCancelInvitation()`   | `cancelInvitation(id)`      | `{ deletedId, userErrors }`    | Cancel invitation      |
| `useResendInvitation()`   | `resendInvitation(id)`      | `{ invitation, userErrors }`   | Resend invitation      |

### 7.3 Context Hooks

| Hook             | Returns                 | Description             |
| ---------------- | ----------------------- | ----------------------- |
| `useWorkspace()` | `WorkspaceContextValue` | Current workspace state |

---

## 8. Testing Strategy

### 8.1 Unit Tests for Hooks

```typescript
// hooks/__tests__/use-stores.test.tsx
import { renderHook, waitFor } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing";
import { useStores } from "../use-stores";
import { STORES_QUERY } from "../../graphql";

const mockStores = [
  { id: "1", name: "store-1", displayName: "Store 1", status: "ACTIVE" },
  { id: "2", name: "store-2", displayName: "Store 2", status: "ACTIVE" },
];

const mocks = [
  {
    request: {
      query: STORES_QUERY,
      variables: { organizationId: "org-1" },
    },
    result: {
      data: {
        storeQuery: { stores: mockStores },
      },
    },
  },
];

describe("useStores", () => {
  it("fetches stores for organization", async () => {
    const { result } = renderHook(
      () => useStores({ organizationId: "org-1" }),
      {
        wrapper: ({ children }) => (
          <MockedProvider mocks={mocks}>{children}</MockedProvider>
        ),
      }
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stores).toEqual(mockStores);
    expect(result.current.error).toBeNull();
  });

  it("skips query when skip option is true", () => {
    const { result } = renderHook(
      () => useStores({ organizationId: "org-1", skip: true }),
      {
        wrapper: ({ children }) => (
          <MockedProvider mocks={mocks}>{children}</MockedProvider>
        ),
      }
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.stores).toEqual([]);
  });
});
```

### 8.2 Integration Tests

```typescript
// e2e/tests/workspace-api/stores.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Store API", () => {
  test("should create a new store", async ({ request }) => {
    const response = await request.post("/graphql", {
      data: {
        query: `
          mutation CreateStore($input: StoreCreateInput!) {
            storeMutation {
              storeCreate(input: $input) {
                store { id name displayName }
                userErrors { code message }
              }
            }
          }
        `,
        variables: {
          input: {
            organizationId: "test-org",
            name: "test-store",
            displayName: "Test Store",
            locales: ["en"],
            currencies: ["USD"],
            defaultCurrency: "USD",
          },
        },
      },
    });

    const json = await response.json();
    expect(json.data.storeMutation.storeCreate.store).toBeTruthy();
    expect(json.data.storeMutation.storeCreate.userErrors).toHaveLength(0);
  });
});
```

### 8.3 Test Coverage Goals

| Category          | Target    |
| ----------------- | --------- |
| Query hooks       | 90%       |
| Mutation hooks    | 90%       |
| Context providers | 85%       |
| Utility functions | 95%       |
| Integration tests | Key flows |

---

## Implementation Checklist

### Phase 1: Store Operations (P0)

- [ ] Add `STORE_BASIC_FRAGMENT` and `STORE_FRAGMENT` to fragments.ts
- [ ] Add `STORES_QUERY` and `CURRENT_STORE_QUERY` to queries.ts
- [ ] Add `CREATE_STORE_MUTATION`, `UPDATE_STORE_MUTATION`, `DELETE_STORE_MUTATION` to mutations.ts
- [ ] Implement `useStores` hook
- [ ] Implement `useCurrentStore` hook
- [ ] Implement `useCreateStore` hook
- [ ] Implement `useUpdateStore` hook
- [ ] Implement `useDeleteStore` hook
- [ ] Export new hooks from index.ts
- [ ] Run codegen to update types

### Phase 2: Organizations List (P0)

- [ ] Add `ORGANIZATIONS_QUERY` to queries.ts
- [ ] Implement `useOrganizations` hook
- [ ] Export from index.ts

### Phase 3: Workspace Context (P0)

- [ ] Create `context/workspace-context.tsx`
- [ ] Create `context/workspace-provider.tsx`
- [ ] Implement `useWorkspace` hook
- [ ] Export from context/index.ts

### Phase 4: Store Membership (P1)

- [ ] Add `STORE_MEMBERSHIP_QUERY` to queries.ts
- [ ] Implement `useStoreMembership` hook
- [ ] Implement store-level member management hooks

### Phase 5: Invitations (P1)

- [ ] Verify invitation schema exists in IAM service
- [ ] Add invitation queries and mutations
- [ ] Implement invitation hooks

### Phase 6: Optimistic Updates (P2)

- [ ] Add optimistic responses to mutation hooks
- [ ] Implement cache update functions
- [ ] Add cache type policies to Apollo client

---

## Appendix: Backend Schema Reference

### Store Type (Project Service)

```graphql
type Store {
  id: ID!
  organization: Organization
  name: String!
  displayName: String!
  status: StoreStatus!
  timezone: String!
  email: String
  locales: [LocaleCode!]!
  currencies: [CurrencyCode!]!
  baseCurrency: CurrencyCode!
  defaultLocale: LocaleCode!
  defaultCurrency: CurrencyCode!
  defaultWeightUnit: WeightUnit!
  defaultDimensionUnit: DimensionUnit!
  membership: Membership!
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum StoreStatus {
  ACTIVE
  INACTIVE
}
```

### Organization Type (IAM Service)

```graphql
type Organization {
  id: ID!
  name: String!
  displayName: String!
  membership: Membership!
  createdAt: DateTime!
  updatedAt: DateTime
}
```

### Membership Type (IAM Service)

```graphql
type Membership {
  domain: String!
  organizationId: ID!
  members: [Member!]!
  roles: [Role!]!
  availableResources: [ResourceDefinition!]
}
```
