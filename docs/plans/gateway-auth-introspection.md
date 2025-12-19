# Plan: Token Introspection in Gateway

## Overview

Move authorization checking from individual services to a centralized Gateway. Gateway makes a request to Users Service to validate the token and get user data.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client                             │
│            Authorization: Bearer <JWT>                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Hive Gateway (port 4001)                   │
│                                                         │
│  1. Extracts token from Authorization header            │
│  2. POST /auth/introspect → Users Service               │
│  3. Caches result for 60 sec                            │
│  4. Adds X-User-* headers for subgraphs                 │
└──────────────┬──────────────────────────────────────────┘
               │
      ┌────────┴────────────────────────┐
      │                                 │
      ▼                                 ▼
┌───────────┐                    ┌─────────────┐
│  Users    │ ◄── introspect ──  │  Other      │
│  Service  │                    │  Subgraphs  │
│           │                    │             │
│ JWT       │                    │ Read        │
│ Validation│                    │ X-User-*    │
└───────────┘                    └─────────────┘
```

## Tasks

### Phase 1: Users Service — Introspection Endpoint

#### 1.1 Add REST endpoint `/auth/introspect`

**File:** `services/users/src/api/graphql-admin/server.ts`

**Task:**
- Add POST `/auth/introspect` endpoint
- Accepts `{ token: string }`
- Returns `{ valid: boolean, user?: UserInfo, error?: string }`

**Response format:**
```typescript
// Success
{
  valid: true,
  user: {
    id: "user-uuid",
    email: "user@example.com",
    roles: ["admin", "user"],
    isAdmin: true,
    organization: "shopana"
  }
}

// Error
{
  valid: false,
  error: "Token expired"
}
```

#### 1.2 Add `introspectToken` method to UserRepository

**File:** `services/users/src/repositories/user/UserRepository.ts`

**Task:**
- Implement method `introspectToken(token: string): Promise<IntrospectResult>`
- JWT signature verification via Casdoor SDK
- Expiration check
- Load current user data from Casdoor
- Check `isForbidden` / `isDeleted`

**Logic:**
```
1. parseJwtToken(token) → decoded payload
2. Check exp < now → "Token expired"
3. getUser(decoded.name) → user data
4. Check user.isForbidden → "User is disabled"
5. Return { valid: true, user }
```

#### 1.3 Add types

**File:** `services/users/src/repositories/user/types.ts`

```typescript
export interface IntrospectResult {
  valid: boolean;
  user?: IntrospectUser;
  error?: string;
}

export interface IntrospectUser {
  id: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
  organization: string;
}
```

---

### Phase 2: Gateway — Auth Plugin

#### 2.1 Create gateway configuration

**File:** `infra/federation/gateway-admin.config.ts`

**Task:**
- Create `defineConfig` with auth plugin
- Plugin `onContextBuilding`:
  - Extract Bearer token
  - Call `/auth/introspect`
  - Put `currentUser` in context
- Plugin `onSubgraphExecute`:
  - Add `X-User-*` headers

#### 2.2 Add introspection caching

**File:** `infra/federation/lib/token-cache.ts`

**Task:**
- In-memory cache with 60 second TTL
- Key: token hash (not the token itself!)
- Auto-cleanup of expired entries

```typescript
interface CacheEntry {
  user: IntrospectUser;
  expires: number;
}

class TokenCache {
  private cache = new Map<string, CacheEntry>();

  get(tokenHash: string): IntrospectUser | null;
  set(tokenHash: string, user: IntrospectUser, ttlMs: number): void;
  cleanup(): void;
}
```

#### 2.3 Create configuration for storefront

**File:** `infra/federation/gateway-storefront.config.ts`

**Task:**
- Similar configuration for storefront gateway
- Possibly different rules (e.g., all requests are public)

#### 2.4 Update gateway launch script

**File:** `packages/cli/src/scripts/gateway.ts`

**Task:**
- Add `--config gateway-{type}.config.ts` to launch command
- Pass environment variables (`USERS_SERVICE_URL`)

---

### Phase 3: Subgraphs — Reading Headers

#### 3.1 Simplify contextMiddleware in Users Service

**File:** `services/users/src/api/graphql-admin/contextMiddleware.ts`

**Task:**
- Remove JWT parsing
- Read `X-User-*` headers from Gateway
- Fallback: if no headers, try old method (for direct requests)

```typescript
// New logic
const userId = request.headers["x-user-id"];
const userEmail = request.headers["x-user-email"];
const userRoles = request.headers["x-user-roles"];

if (userId) {
  request.currentUser = {
    id: userId,
    email: userEmail,
    roles: JSON.parse(userRoles || "[]"),
  };
}
```

#### 3.2 Create shared package for auth middleware

**File:** `packages/common/src/auth/gateway-auth-middleware.ts`

**Task:**
- Create reusable middleware for all services
- Reads `X-User-*` headers
- Typed `currentUser`

#### 3.3 Update other services

**Services:**
- `services/project`
- `services/orders`
- `services/checkout`
- ... (all with authentication)

**Task:**
- Use shared middleware from `packages/common`
- Remove direct Casdoor interaction (except users service)

---

### Phase 4: Security and Resilience

#### 4.1 Request source validation

**Task:**
- Subgraphs should only accept `X-User-*` from Gateway
- Options:
  - IP check (internal network)
  - Shared secret header (`X-Gateway-Secret`)
  - mTLS between services

#### 4.2 Circuit breaker for introspection

**File:** `infra/federation/lib/introspection-client.ts`

**Task:**
- If Users Service is unavailable, fallback:
  - Option A: Reject all requests with token
  - Option B: Parse JWT locally (degraded mode)
- Error logging
- Metrics (introspection request count, latency)

#### 4.3 Rate limiting

**Task:**
- Limit number of introspection requests
- Caching reduces load, but fallback needed

---

### Phase 5: Testing

#### 5.1 Unit tests for introspectToken

**File:** `services/users/src/repositories/user/__tests__/introspect.test.ts`

**Cases:**
- Valid token → returns user
- Expired token → `{ valid: false, error: "Token expired" }`
- Invalid signature → `{ valid: false, error: "Invalid signature" }`
- Blocked user → `{ valid: false, error: "User is disabled" }`
- Non-existent user → `{ valid: false, error: "User not found" }`

#### 5.2 Integration tests for Gateway

**File:** `infra/federation/__tests__/auth.test.ts`

**Cases:**
- Request without token → passes as anonymous
- Request with valid token → `X-User-*` headers in subgraph
- Request with invalid token → error (or anonymous, depending on policy)

#### 5.3 E2E tests

**Cases:**
- Full flow: login → get token → request to gateway → data

---

## Configuration

### Environment Variables

```bash
# Gateway
USERS_SERVICE_URL=http://localhost:10010
INTROSPECT_CACHE_TTL=60000
GATEWAY_SECRET=<shared-secret>

# Users Service
CASDOOR_ENDPOINT=http://localhost:9011
CASDOOR_CLIENT_ID=app-shopana-client-id
CASDOOR_CLIENT_SECRET=app-shopana-client-secret
CASDOOR_CERTIFICATE=cert-shopana
```

### config.yml additions

```yaml
gateway:
  admin:
    port: 4001
    auth:
      introspect_url: http://localhost:10010/auth/introspect
      cache_ttl: 60000
  storefront:
    port: 4000
    auth:
      introspect_url: http://localhost:10010/auth/introspect
      cache_ttl: 60000
```

---

## Execution Order

```
Phase 1 (Users Service)
  │
  ├── 1.1 Endpoint /auth/introspect
  ├── 1.2 UserRepository.introspectToken
  └── 1.3 Types
  │
  ▼
Phase 2 (Gateway)
  │
  ├── 2.1 gateway-admin.config.ts
  ├── 2.2 Token cache
  ├── 2.3 gateway-storefront.config.ts
  └── 2.4 Update CLI
  │
  ▼
Phase 3 (Subgraphs)
  │
  ├── 3.1 Simplify Users middleware
  ├── 3.2 Shared auth package
  └── 3.3 Update other services
  │
  ▼
Phase 4 (Security)
  │
  ├── 4.1 Source validation
  ├── 4.2 Circuit breaker
  └── 4.3 Rate limiting
  │
  ▼
Phase 5 (Testing)
  │
  ├── 5.1 Unit tests
  ├── 5.2 Integration tests
  └── 5.3 E2E tests
```

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Users Service unavailable | Medium | High | Circuit breaker + fallback to JWT parsing |
| High introspection latency | Low | Medium | 60 sec caching |
| Cache desynchronized (user blocked) | Low | Medium | Short TTL, webhook from Casdoor |
| Gateway becomes bottleneck | Low | High | Horizontal scaling |

---

## Metrics for Monitoring

- `gateway_introspect_requests_total` — number of introspection requests
- `gateway_introspect_cache_hits` — cache hits
- `gateway_introspect_latency_ms` — Users Service response time
- `gateway_introspect_errors_total` — introspection errors
- `gateway_requests_authenticated` — requests with valid token
- `gateway_requests_anonymous` — anonymous requests
