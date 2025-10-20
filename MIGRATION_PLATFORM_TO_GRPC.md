# Migration: Platform Service GraphQL → gRPC

**Status:** ✅ Completed
**Date:** October 20, 2025

## Overview

Successfully migrated from GraphQL-based `services/platform` service to gRPC client that connects to platform's gRPC apps API. The `@shopana/platform-api` package maintains its contract but now works via gRPC instead of GraphQL.

## Implementation Summary

### ✅ Step 1: Created `@shopana/platform-proto` Package

**Location:** `/packages/platform-proto/`

**Files Created:**
- `package.json` - Package definition with proto files export
- `proto/context.proto` - Context Service definitions (Project, User, Customer, Context)
- `proto/common.proto` - Common types and enums (Currency, Locale, StockStatus, etc.)
- `proto/inventory.proto` - Inventory Service definitions (Product, Variant)

**Purpose:** Centralized proto definitions shared between services.

---

### ✅ Step 2: Refactored `@shopana/platform-api` to use gRPC

**Package:** `/packages/platform-api/`

#### Updated Files

**`package.json`:**
- ❌ Removed: `graphql-request`, `@graphql-codegen/*`
- ✅ Added: `@grpc/grpc-js`, `@grpc/proto-loader`, `@shopana/platform-proto`
- ✅ Kept: `graphql-request` for backward compatibility with plugins

**`src/port.ts`:**
- ❌ Removed: `GraphqlRequester`, `CoreConfigPort` interfaces
- ✅ Added: `GrpcConfigPort` interface with `getGrpcHost()` method
- ✅ Kept: `ForwardHeaders`, `CoreContextClientPort` interfaces

**`src/contextClient.ts`:**
- ✅ Replaced GraphQL client with gRPC ContextService client
- ✅ Added proto loading via `@grpc/proto-loader`
- ✅ Added gRPC response to TypeScript types mapping
- ✅ Preserved `FetchContextHeaders` type
- ✅ Preserved `createBrokerContextClient()` for moleculer compatibility
- ✅ Added `createCoreContextClient()` with gRPC implementation

**`src/graphqlRequest.ts`:** (new)
- ✅ Created for backward compatibility with plugins
- ✅ Simple GraphQL request helper for direct Core Apps GraphQL API access

**`src/index.ts`:**
- ✅ Updated exports to include `graphqlRequest`
- ✅ Removed exports of deleted modules

**`src/types.ts`:**
- ✅ **Unchanged** - all TypeScript types preserved for API contract

#### Deleted Files
- ❌ `src/request.ts` - GraphQL requester
- ❌ `src/graphqlClient.ts` - GraphQL client
- ❌ `src/schema.graphql` - GraphQL schema file
- ❌ `src/schema.ts` - GraphQL schema string export
- ❌ `codegen.ts` - GraphQL codegen configuration

---

### ✅ Step 3: Updated Dependent Services

#### 3.1 `services/apps`

**`src/config.ts`:**
```typescript
platformGrpcHost: process.env.PLATFORM_GRPC_HOST || "localhost:50051"
```

**`src/api/contextMiddleware.ts`:**
- Changed from `ServiceBroker` parameter to `GrpcConfigPort`
- Replaced `broker.call('platform.context')` with gRPC client call
- Updated error logging to mention gRPC

**`src/api/server.ts`:**
```typescript
const grpcConfig = {
  getGrpcHost: () => config.platformGrpcHost,
};
await graphqlInstance.addHook("preHandler", buildCoreContextMiddleware(grpcConfig));
```

#### 3.2 `services/checkout`

**`src/config.ts`:**
```typescript
platformGrpcHost: process.env.PLATFORM_GRPC_HOST || "localhost:50051"
```

**`src/interfaces/server/contextMiddleware.ts`:**
- Same changes as apps service
- Preserved async local storage context setting

**`src/interfaces/server/server.ts`:**
- Updated middleware initialization with gRPC config

#### 3.3 `services/orders`

**`src/config.ts`:**
```typescript
platformGrpcHost: process.env.PLATFORM_GRPC_HOST || "localhost:50051"
```

**`src/interfaces/server/contextMiddleware.ts`:**
- Same changes as other services

**`src/interfaces/server/server.ts`:**
- Updated **both** admin and storefront GraphQL routes with gRPC config

#### 3.4 `packages/inventory-plugin-shopana`

- ✅ No changes required
- Uses `gqlRequest()` for direct Core Apps GraphQL API access
- Backward compatibility maintained via new `graphqlRequest.ts`

---

### ✅ Step 4: Removed `services/platform` Service

#### Deleted
- ❌ Entire `/services/platform/` directory

#### Updated Configuration Files

**`docker-compose.services.yml`:**
- ❌ Removed `platform-service` container definition (lines 112-128)

**`Makefile`:**
- ❌ Removed `dev:platform` target
- ❌ Removed `docker:build-platform` target
- ✅ Updated `.PHONY` declarations

**Ansible Playbooks:**
- `ansible/playbooks/services/build_single.yml` - removed `platform` from `valid_services`
- `ansible/playbooks/services/build_all.yml` - removed `platform` from `all_services`
- `ansible/playbooks/services/deploy_single.yml` - removed `platform` from `valid_services`
- `ansible/playbooks/services/deploy_all.yml` - removed `platform` from `all_services`

---

## Technical Details

### gRPC Connection Configuration

**Environment Variable:** `PLATFORM_GRPC_HOST`

**Default Values:**
- Development: `localhost:50051`
- Production: Platform Go gRPC server address

**Headers Mapping:**
```
HTTP Headers → gRPC Metadata
- authorization
- x-api-key
- x-pj-key
- x-trace-id
- x-span-id
- x-correlation-id
- x-causation-id
```

### Type Mapping

**Proto → TypeScript:**
```
apps.v1.Context    → CoreContext
apps.v1.Project    → CoreProject
apps.v1.User       → CoreUser
apps.v1.Customer   → CoreCustomer
apps.v1.Currency   → CoreCurrency
apps.v1.Locale     → CoreLocale
apps.v1.StockStatus → CoreStockStatus
```

**Timestamp Handling:**
```typescript
// Proto timestamp → ISO string
function mapTimestamp(timestamp: any): string {
  const milliseconds = Number(timestamp.seconds) * 1000 + (timestamp.nanos || 0) / 1000000;
  return new Date(milliseconds).toISOString();
}
```

### Backward Compatibility

✅ **Preserved:**
- All exported TypeScript types in `@shopana/platform-api`
- `fetchContext()` function signature
- `FetchContextHeaders` type
- `createBrokerContextClient()` for services still using moleculer
- `gqlRequest()` for plugins accessing Core Apps GraphQL API

❌ **Breaking Changes:**
- Removed `defaultGraphqlRequester` export
- Removed `GraphqlRequester` interface
- Removed `CoreConfigPort` interface (replaced with `GrpcConfigPort`)

---

## Post-Migration Steps

### Required Actions

1. **Install Dependencies:**
   ```bash
   cd /Users/phl/Projects/shopana-io/services
   yarn install
   ```

2. **Build Packages:**
   ```bash
   yarn build:packages
   ```

3. **Configure Environment Variables:**

   Add to each service's environment:
   ```bash
   # Local development
   PLATFORM_GRPC_HOST=localhost:50051

   # Production/Staging
   PLATFORM_GRPC_HOST=platform.internal:50051
   ```

4. **Verify Platform gRPC Server:**

   Ensure platform Go service is running with gRPC apps API on port 50051:
   ```bash
   # Test gRPC connection
   grpcurl -plaintext localhost:50051 list
   # Should show: apps.v1.ContextService, apps.v1.InventoryService
   ```

### Testing Checklist

- [ ] `apps-service` starts without errors
- [ ] `checkout-service` starts without errors
- [ ] `orders-service` starts without errors
- [ ] Context fetching works via gRPC in all services
- [ ] GraphQL introspection requests bypass context middleware
- [ ] Headers are properly forwarded to gRPC metadata
- [ ] Error handling works correctly (401 on auth failure)
- [ ] Async local storage context is set properly (checkout, orders)

---

## Rollback Plan

If rollback is needed:

1. **Restore `services/platform`** from git history
2. **Revert `@shopana/platform-api`** changes
3. **Revert service middleware** changes
4. **Restore configuration files** (Makefile, docker-compose, ansible)
5. **Run `yarn install`** to restore GraphQL dependencies

```bash
git checkout HEAD~1 -- services/platform
git checkout HEAD~1 -- packages/platform-api
git checkout HEAD~1 -- services/apps/src
git checkout HEAD~1 -- services/checkout/src
git checkout HEAD~1 -- services/orders/src
yarn install
```

---

## Benefits of Migration

✅ **Performance:**
- Direct gRPC communication (no GraphQL parsing overhead)
- Binary protocol (smaller payload size)
- HTTP/2 multiplexing support

✅ **Architecture:**
- Removed unnecessary service layer (`services/platform`)
- Direct connection to platform Go service
- Simplified deployment (one less service to maintain)

✅ **Consistency:**
- All services now use same gRPC apps API
- Unified proto definitions via `@shopana/platform-proto`
- Type safety maintained through proto → TypeScript mapping

✅ **Maintainability:**
- Single source of truth for API definitions (proto files)
- No duplicate GraphQL schema maintenance
- Easier to add new gRPC services (inventory, products, etc.)

---

## Related Documentation

- Platform gRPC API: `/platform/project/api/grpcApps/`
- Proto definitions: `/packages/platform-proto/proto/`
- Context middleware implementation: See individual services

---

## Notes

- The `inventory-plugin-shopana` still uses GraphQL for direct Core Apps API access
- This is intentional as it queries inventory data, not just context
- Future migration could move it to gRPC Inventory Service if needed
- Moleculer broker compatibility preserved via `createBrokerContextClient()`

---

**Migration completed successfully on October 20, 2025**
