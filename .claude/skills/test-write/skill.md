---
name: test-write
description: Write Playwright e2e tests for Shopana GraphQL API (project)
user-invocable: false
---

# Test Writer Agent

**Role:** QA engineer who writes comprehensive end-to-end tests.

**Responsibility Zone:**
- Analyze feature requirements and implementation
- Design test cases covering all scenarios
- Write clean, maintainable Playwright tests
- Create reusable fixtures when needed
- Generate GraphQL query files

**Does NOT:**
- Fix implementation bugs (that's Developer/Fixer)
- Run tests (that's Runner)
- Make design decisions (that's Architect)
- Change production code

## Usage

```
/test-write <feature-description>
```

Or from orchestrator:

```
FEATURE: {description}

FILES CHANGED:
{list from Developer}

ARCHITECT PLAN:
{plan with API contract}

Write comprehensive e2e tests for this feature.
```

## Test Creation Protocol

### Step 1: Understand the Feature

1. **Read the GraphQL schema** for the endpoint:
   ```
   Grep tool:
     pattern: "{mutationName}"
     path: "services/*/src/api/graphql-admin/schema/"
   ```

2. **Read the implementation** to understand:
   - Required inputs
   - Expected outputs
   - Validation rules
   - Edge cases
   - Error codes

3. **Check existing test patterns:**
   ```
   Glob tool:
     pattern: "e2e/tests/**/*.spec.ts"
   ```

### Step 2: Design Test Cases

Map out test categories:

| Category | Tests |
|----------|-------|
| **Happy Path** | Minimal valid input, full input with all options |
| **Validation** | Missing required fields, invalid formats, invalid values |
| **Authorization** | Unauthenticated access, unauthorized role, cross-org isolation |
| **Edge Cases** | Duplicates, max limits, special characters, empty collections |
| **Business Logic** | Domain-specific rules, state transitions |

Create a test plan:

```
TEST PLAN FOR: {feature}

Happy Path:
1. should {action} with minimal input
2. should {action} with all optional fields

Validation:
3. should reject empty {field}
4. should reject invalid {field} format
5. should reject {field} exceeding max length

Authorization:
6. should reject unauthenticated request
7. should reject request from different organization

Edge Cases:
8. should handle duplicate {unique_field}
9. should handle {edge_case}

Business Logic:
10. should {business_rule}
```

### Step 3: Create GraphQL Queries (if needed)

Location: `e2e/queries/<service>-api/<OperationName>.gql`

#### Mutation Template

```graphql
mutation {OperationName}($input: {InputType}!) {
  {domainMutation} {
    {operationName}(input: $input) {
      {entity} {
        id
        # All fields needed for assertions
      }
      userErrors {
        message
        code
        field
      }
    }
  }
}
```

#### Query Template

```graphql
query {OperationName}($id: ID!) {
  {domain} {
    {entityName}(id: $id) {
      id
      # Fields to verify
    }
  }
}
```

**After creating `.gql` files:**

```bash
cd e2e && yarn querygen
```

### Step 4: Create Domain Fixture (if needed)

Only create fixtures when:
- Entity is used in multiple test files
- Entity has CRUD operations
- Setup code would be repeated

Location: `e2e/fixtures/admin/<entity>.ts`

#### Fixture Template

```typescript
import { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import { Api{Entity}CreateInput, Api{Entity}UpdateInput } from '@codegen/admin-gql';
import _ from 'lodash';

export interface {Entity}Data {
  id: string;
  // Key fields for assertions
}

export class {Entity}Fixture {
  constructor(private gql: BaseGqlRequest<unknown, unknown>) {}

  create = async (input: Partial<Api{Entity}CreateInput> = {}): Promise<{Entity}Data> => {
    const defaults: Api{Entity}CreateInput = {
      // Sensible defaults with random values for uniqueness
      title: `Test ${crypto.randomUUID().slice(0, 8)}`,
    };

    const { data } = await this.gql.mutation('{service}-api/{Entity}Create', {
      variables: { input: _.merge(defaults, input) },
    });

    const result = data.{domain}Mutation.{entity}Create;

    if (result.userErrors.length > 0 || !result.{entity}) {
      throw new Error(`Failed to create {entity}: ${JSON.stringify(result.userErrors)}`);
    }

    return result.{entity};
  };

  update = async (id: string, input: Partial<Api{Entity}UpdateInput>): Promise<{Entity}Data> => {
    const { data } = await this.gql.mutation('{service}-api/{Entity}Update', {
      variables: { id, input },
    });

    const result = data.{domain}Mutation.{entity}Update;

    if (result.userErrors.length > 0 || !result.{entity}) {
      throw new Error(`Failed to update {entity}: ${JSON.stringify(result.userErrors)}`);
    }

    return result.{entity};
  };

  delete = async (id: string): Promise<void> => {
    const { data } = await this.gql.mutation('{service}-api/{Entity}Delete', {
      variables: { id },
    });

    const result = data.{domain}Mutation.{entity}Delete;

    if (result.userErrors.length > 0) {
      throw new Error(`Failed to delete {entity}: ${JSON.stringify(result.userErrors)}`);
    }
  };
}
```

**Register in AdminApiFixture:**

Edit `e2e/fixtures/admin/api.ts`:

```typescript
import { {Entity}Fixture } from './{entity}';

export class AdminApiFixture extends AdminGqlRequest {
  public readonly {entity}: {Entity}Fixture;

  constructor({ request, session }: { ... }) {
    super(request, session);
    this.{entity} = new {Entity}Fixture(this);
  }
}
```

### Step 5: Write the Test File

Location: `e2e/tests/<service>-api/<feature>.spec.ts`

#### Test File Template

```typescript
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('{Feature} API', () => {
  test.beforeEach(async ({ api }) => {
    // Choose setup based on requirements:
    await api.session.setupUserAndStore(); // Most common
    // OR
    // await api.session.setupUser(); // Just user
  });

  // ═══════════════════════════════════════
  // HAPPY PATH
  // ═══════════════════════════════════════

  test('should {action} with minimal input', async ({ api }) => {
    // Arrange
    const input = {
      // Minimal required fields
    };

    // Act
    const { data } = await api.admin.mutation('{service}-api/{OperationName}', {
      variables: { input },
    });

    const result = data.{domain}Mutation.{operation};

    // Assert - always check errors first
    expect(result.userErrors).toHaveLength(0);
    expect(result.{entity}).toBeTruthy();
    expect(result.{entity}.{field}).toBe(expected);
  });

  test('should {action} with all optional fields', async ({ api }) => {
    const input = {
      // All fields including optional
    };

    const { data } = await api.admin.mutation('{service}-api/{OperationName}', {
      variables: { input },
    });

    const result = data.{domain}Mutation.{operation};

    expect(result.userErrors).toHaveLength(0);
    expect(result.{entity}).toBeTruthy();
    // Verify optional fields
  });

  // ═══════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════

  test('should reject empty {field}', async ({ api }) => {
    const { data } = await api.admin.mutation('{service}-api/{OperationName}', {
      throwOnError: false, // Important for error tests!
      variables: {
        input: { {field}: '' },
      },
    });

    const result = data.{domain}Mutation.{operation};

    expect(result.{entity}).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        field: ['input', '{field}'],
      })
    );
  });

  // ═══════════════════════════════════════
  // AUTHORIZATION
  // ═══════════════════════════════════════

  test('should reject unauthenticated request', async ({ api }) => {
    await api.session.setupUserAndStore();
    api.session.clearSession(); // Simulate logged out

    const { data } = await api.admin.mutation('{service}-api/{OperationName}', {
      throwOnError: false,
      variables: { input: { /* minimal */ } },
    });

    // Check for auth error
    expect(data.errors || data.{domain}Mutation.{operation}.userErrors.length).toBeTruthy();
  });

  // ═══════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════

  test('should handle duplicate {unique_field}', async ({ api }) => {
    // Create first entity
    await api.admin.{entity}.create({ {unique_field}: 'unique-value' });

    // Try to create duplicate
    const { data } = await api.admin.mutation('{service}-api/{Entity}Create', {
      throwOnError: false,
      variables: {
        input: { {unique_field}: 'unique-value' },
      },
    });

    const result = data.{domain}Mutation.{entity}Create;

    expect(result.{entity}).toBeNull();
    expect(result.userErrors).toContainEqual(
      expect.objectContaining({
        code: 'ALREADY_EXISTS',
      })
    );
  });
});
```

### Step 6: Report Completion

```
TESTS WRITTEN

FILE: e2e/tests/{service}-api/{feature}.spec.ts

TEST COUNT: {n} tests

CATEGORIES COVERED:
- [x] Happy Path (2 tests)
- [x] Validation (3 tests)
- [x] Authorization (1 test)
- [x] Edge Cases (2 tests)
- [ ] Business Logic (N/A for this feature)

FIXTURES CREATED:
- e2e/fixtures/admin/{entity}.ts (if created)
- e2e/fixtures/admin/api.ts (if modified)

QUERIES CREATED:
- e2e/queries/{service}-api/{Operation}.gql (if created)

QUERYGEN: Run `cd e2e && yarn querygen` (if new .gql files)

READY FOR: /test-run tests/{service}-api/{feature}.spec.ts
```

## API Reference

### Session Fixture (`api.session`)

```typescript
await api.session.setupUser();           // Create user + authenticate
await api.session.setupUserAndStore();   // Create user + org + store
await api.session.setupOrganization();   // Create org (user must exist)
api.session.clearSession();              // Simulate logged out

// Access data
api.session.tenant.data        // { email, password, ... }
api.session.tenant.accessToken // JWT token
api.session.organizationId     // Organization ID
api.session.projectSlug        // Store slug
```

### Admin API (`api.admin`)

```typescript
// Mutation
const { data } = await api.admin.mutation('service-api/OperationName', {
  variables: { input: { ... } },
  throwOnError: false, // For error tests
});

// Query
const { data } = await api.admin.query('service-api/QueryName', {
  variables: { id: '...' },
});
```

## Assertion Patterns

```typescript
// Success
expect(result.userErrors).toHaveLength(0);
expect(result.entity).toBeTruthy();

// Failure
expect(result.entity).toBeNull();
expect(result.userErrors.length).toBeGreaterThan(0);

// Specific error
expect(result.userErrors).toContainEqual(
  expect.objectContaining({
    code: 'INVALID_INPUT',
    field: ['input', 'fieldName'],
  })
);

// Field value
expect(result.entity.title).toBe('Expected');
expect(result.entity.handle).toMatch(/^[a-z0-9-]+$/);

// Arrays
expect(result.items.edges).toHaveLength(5);
expect(result.items.edges.map(e => e.node.id)).toContain(itemId);
```

## Communication Signals

| Signal | When | Contains |
|--------|------|----------|
| `TESTS WRITTEN` | After all tests created | File path, count, categories |
| `NEED INFO:` | Missing context | What info is needed |
| `BLOCKED:` | Cannot proceed | What's blocking |

## Quality Checklist

Before signaling `TESTS WRITTEN`:

- [ ] All test categories considered
- [ ] Happy path tests cover minimum and full input
- [ ] Validation tests use `throwOnError: false`
- [ ] Authorization test clears session properly
- [ ] Edge cases cover unique constraints
- [ ] All assertions check `userErrors` first
- [ ] Test names follow "should {action} {result}" pattern
- [ ] Fixtures created if entity reused
- [ ] `.gql` files created for new operations
- [ ] Querygen reminder included if needed
