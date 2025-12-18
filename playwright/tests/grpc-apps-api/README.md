# gRPC Apps API Tests

End-to-end tests for Platform gRPC Apps API using Playwright.

## Overview

These tests validate the gRPC Apps API, specifically the Context Service which provides project, tenant, and customer context data to microservices.

## Test Structure

### Context Service Tests

#### `context-get-context.spec.ts`
- Basic GetContext functionality
- Tenant and customer authentication
- Error handling for invalid credentials
- Data completeness (locales, currencies, stock statuses)
- Timestamp validation

#### `context-project-data.spec.ts`
- Project metadata validation
- Locale and currency configuration
- Data consistency across multiple calls
- Email and timezone validation

#### `context-tenant-customer.spec.ts`
- Tenant scope validation
- Customer scope validation
- User verification flags
- Optional fields handling

#### `context-authentication.spec.ts`
- Authentication header validation
- x-pj-key authentication (tenant)
- x-api-key authentication (customer)
- Bearer token validation
- Tracing headers

#### `context-performance.spec.ts`
- Response time validation
- Concurrent request handling
- Sequential request efficiency
- Data consistency under load

#### `context-schema-validation.spec.ts`
- Yup schema validation
- Project, User, Customer schemas
- Array structure validation
- Type checking

## Running Tests

### Run all gRPC tests:
```bash
npx playwright test tests/grpc-apps-api
```

### Run specific test file:
```bash
npx playwright test tests/grpc-apps-api/context-get-context.spec.ts
```

### Run with UI mode:
```bash
npx playwright test tests/grpc-apps-api --ui
```

### Run in debug mode:
```bash
npx playwright test tests/grpc-apps-api --debug
```

## Configuration

### Environment Variables

- `PLATFORM_GRPC_HOST` - gRPC server host (default: `localhost:50051`)

Example:
```bash
PLATFORM_GRPC_HOST=platform.internal:50051 npx playwright test tests/grpc-apps-api
```

## Fixtures

### GrpcApps Fixture
Located in `fixtures/grpc/GrpcApps.ts`

**Methods:**
- `getContext()` - Fetch context via gRPC GetContext
- `assertContext(context)` - Assert context structure
- `assertProject(project)` - Assert project data
- `assertUser(tenant)` - Assert tenant data
- `assertCustomer(customer)` - Assert customer data
- `getGrpcHost()` - Get configured gRPC host

**Usage:**
```typescript
import { test } from '@fixtures/grpc/api';

test('should fetch context', async ({ api, grpc }) => {
  await api.session.setupUserAndProject();
  const context = await grpc.apps.getContext();
  await grpc.apps.assertContext(context);
});
```

## Test Scenarios

### Tenant Scope
- Setup: `api.session.setupUserAndProject()`
- Auth: x-pj-key + Bearer token
- Returns: project + tenant (customer = null)

### Customer Scope
- Setup: `api.session.setupClientAndCustomer()`
- Auth: x-api-key + Bearer token
- Returns: project + customer (tenant = null)

### Unauthenticated
- Setup: none
- Auth: none
- Returns: null (UNAUTHENTICATED error)

## Proto Definitions

Proto files are located in `packages/platform-proto/proto/`:
- `context.proto` - Context Service definitions
- `common.proto` - Common types (Currency, Locale, etc.)

## Type Definitions

TypeScript types for gRPC responses are defined in `fixtures/grpc/GrpcApps.ts`:
- `GrpcContext`
- `GrpcProject`
- `GrpcUser` (Tenant)
- `GrpcCustomer`
- `GrpcLocale`
- `GrpcCurrency`
- `GrpcStockStatus`

## Schema Validation

Yup schemas for validation are in `schema/grpcSchema.ts`:
- `grpcContextSchema` - Full context validation
- `grpcProjectSchema` - Project validation
- `grpcUserSchema` - Tenant validation
- `grpcCustomerSchema` - Customer validation

## CI/CD Integration

These tests run as part of the e2e test suite in CI/CD pipelines. Make sure the Platform gRPC server is running and accessible before running tests.

## Troubleshooting

### Connection Refused
- Ensure Platform gRPC server is running
- Check `PLATFORM_GRPC_HOST` environment variable
- Verify network connectivity to gRPC host

### UNAUTHENTICATED Errors
- Check that session is properly set up
- Verify x-pj-key or x-api-key headers
- Ensure access token is valid

### Timeout Errors
- Check server logs for errors
- Verify gRPC server is responding
- Increase timeout if network is slow

## Related Documentation

- [Migration: Platform Service GraphQL → gRPC](../../../MIGRATION_PLATFORM_TO_GRPC.md)
- [Platform API Package](../../../packages/platform-api/)
- [Platform Proto Definitions](../../../packages/platform-proto/)
