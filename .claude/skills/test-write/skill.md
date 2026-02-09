---
name: test-write
description: Write Playwright e2e tests for Shopana GraphQL API
user-invocable: true
---

# Test Writer Agent

Write comprehensive Playwright e2e tests for Shopana GraphQL API endpoints.

## Usage

```
/test-write <feature-or-endpoint>
```

Examples:
- `/test-write inventory-api product update`
- `/test-write rbac organization member invite`
- `/test-write media-api file upload`

## Project Context

Tests are located in `e2e/tests/` directory, organized by service domain:
- `users-api/` - Authentication (sign-in, sign-up)
- `iam-api/` - Organizations
- `rbac-api/` - Roles and permissions
- `store-api/` - Store management
- `inventory-api/` - Products, variants, stock
- `media-api/` - Files and uploads

## Step 1: Understand the Feature

Before writing tests:

1. **Find the GraphQL schema** for the endpoint:
   ```
   services/<service>/src/**/*.graphql
   ```

2. **Find existing queries/mutations** in `e2e/queries/<service-api>/`:
   - Check if `.gql` file already exists
   - If not, you'll need to create it

3. **Examine the resolver/script** to understand:
   - Required inputs
   - Expected outputs
   - Validation rules
   - Edge cases

## Step 2: Create Domain Fixture (Recommended)

Create reusable fixtures for entities to keep tests clean and DRY.

Location: `e2e/fixtures/admin/<entity>.ts`

### Fixture Template

```typescript
import { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import { Api<Entity>, Api<Entity>CreateInput, Api<Entity>UpdateInput } from '@codegen/admin-gql';
import _ from 'lodash';

export interface <Entity>Data {
  id: string;
  // ... key fields
}

export class <Entity>Fixture {
  constructor(private gql: BaseGqlRequest<unknown, unknown>) {}

  /**
   * Create entity with sensible defaults
   */
  create = async (input: Partial<Api<Entity>CreateInput> = {}): Promise<<Entity>Data> => {
    const defaults: Api<Entity>CreateInput = {
      title: `Test ${crypto.randomUUID().slice(0, 8)}`,
      handle: `test-${crypto.randomUUID().slice(0, 8)}`,
      // ... sensible defaults
    };

    const { data } = await this.gql.mutation('<service>-api/<Entity>Create', {
      variables: {
        input: _.merge(defaults, input),
      },
    });

    const result = data.<domain>Mutation.<entityCreate>;

    if (result.userErrors.length > 0 || !result.<entity>) {
      throw new Error(`Failed to create <entity>: ${JSON.stringify(result.userErrors)}`);
    }

    return result.<entity>;
  };

  /**
   * Update entity
   */
  update = async (id: string, input: Partial<Api<Entity>UpdateInput>): Promise<<Entity>Data> => {
    const { data } = await this.gql.mutation('<service>-api/<Entity>Update', {
      variables: {
        id,
        input,
      },
    });

    const result = data.<domain>Mutation.<entityUpdate>;

    if (result.userErrors.length > 0 || !result.<entity>) {
      throw new Error(`Failed to update <entity>: ${JSON.stringify(result.userErrors)}`);
    }

    return result.<entity>;
  };

  /**
   * Delete entity
   */
  delete = async (id: string): Promise<void> => {
    const { data } = await this.gql.mutation('<service>-api/<Entity>Delete', {
      variables: { id },
    });

    const result = data.<domain>Mutation.<entityDelete>;

    if (result.userErrors.length > 0) {
      throw new Error(`Failed to delete <entity>: ${JSON.stringify(result.userErrors)}`);
    }
  };

  /**
   * Find entity by ID
   */
  findOne = async (id: string): Promise<<Entity>Data | null> => {
    const { data } = await this.gql.query('<service>-api/<Entity>FindOne', {
      variables: { id },
    });

    return data.<domain>.<entity>;
  };

  /**
   * Find many entities
   */
  findMany = async (args: { first?: number; after?: string } = {}): Promise<{
    edges: Array<{ node: <Entity>Data }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  }> => {
    const { data } = await this.gql.query('<service>-api/<Entity>FindMany', {
      variables: args,
    });

    return data.<domain>.<entities>;
  };
}
```

### Register Fixture in AdminApiFixture

Edit `e2e/fixtures/admin/api.ts`:

```typescript
import { <Entity>Fixture } from './<entity>';

export class AdminApiFixture extends AdminGqlRequest {
  // ... existing fixtures
  public readonly <entity>: <Entity>Fixture;

  constructor({ request, session }: { ... }) {
    super(request, session);
    // ... existing
    this.<entity> = new <Entity>Fixture(this);
  }
}
```

### Example: ProductFixture

```typescript
// e2e/fixtures/admin/product.ts
import { BaseGqlRequest } from '@fixtures/api/gqlRequest';
import { ApiProductCreateInput, ApiProductUpdateInput } from '@codegen/admin-gql';
import _ from 'lodash';

export interface ProductData {
  id: string;
  title: string;
  handle: string;
  isPublished: boolean;
}

export class ProductFixture {
  constructor(private gql: BaseGqlRequest<unknown, unknown>) {}

  create = async (input: Partial<ApiProductCreateInput> = {}): Promise<ProductData> => {
    const defaults: ApiProductCreateInput = {
      title: `Product ${crypto.randomUUID().slice(0, 8)}`,
      handle: `product-${crypto.randomUUID().slice(0, 8)}`,
    };

    const { data } = await this.gql.mutation('inventory-api/ProductCreateSimple', {
      variables: { input: _.merge(defaults, input) },
    });

    const result = data.catalogMutation.productCreate;

    if (result.userErrors.length > 0 || !result.product) {
      throw new Error(`Failed to create product: ${JSON.stringify(result.userErrors)}`);
    }

    return result.product;
  };

  update = async (id: string, input: Partial<ApiProductUpdateInput>): Promise<ProductData> => {
    const { data } = await this.gql.mutation('inventory-api/ProductUpdate', {
      variables: { id, input },
    });

    const result = data.catalogMutation.productUpdate;

    if (result.userErrors.length > 0 || !result.product) {
      throw new Error(`Failed to update product: ${JSON.stringify(result.userErrors)}`);
    }

    return result.product;
  };

  publish = async (id: string): Promise<ProductData> => {
    return this.update(id, { isPublished: true });
  };

  unpublish = async (id: string): Promise<ProductData> => {
    return this.update(id, { isPublished: false });
  };
}
```

### Usage in Tests (Clean!)

```typescript
test.describe('Product Update', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should update product title', async ({ api }) => {
    // Arrange - clean setup via fixture
    const product = await api.admin.product.create({ title: 'Original' });

    // Act
    const updated = await api.admin.product.update(product.id, {
      title: 'Updated Title',
    });

    // Assert
    expect(updated.title).toBe('Updated Title');
  });

  test('should publish product', async ({ api }) => {
    const product = await api.admin.product.create();
    expect(product.isPublished).toBe(false);

    const published = await api.admin.product.publish(product.id);
    expect(published.isPublished).toBe(true);
  });

  test('should handle update of non-existent product', async ({ api }) => {
    await expect(
      api.admin.product.update('non-existent-id', { title: 'X' })
    ).rejects.toThrow();
  });
});
```

### When to Create Fixtures

Create a fixture when:
- Entity is used in multiple test files
- Entity has CRUD operations
- Setup code is repeated across tests
- You need helper methods (publish, archive, etc.)

Skip fixture when:
- One-off test for specific edge case
- Testing the create/update mutation itself (use raw API)

## Step 3: Create GraphQL Queries (if needed)

Location: `e2e/queries/<service-api>/<OperationName>.gql`

Pattern:
```graphql
mutation ProductUpdate($input: ProductUpdateInput!) {
  catalogMutation {
    productUpdate(input: $input) {
      product {
        id
        title
        handle
        # ... fields you need to verify
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

Always include:
- All fields you need to assert on
- `userErrors` for mutations

After creating `.gql` files, run:
```bash
cd e2e && yarn querygen
```

## Step 4: Write the Test File

Location: `e2e/tests/<service-api>/<feature>.spec.ts`

### Template

```typescript
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ api }) => {
    // Choose setup based on requirements:
    await api.session.setupUserAndStore(); // Most common: user + org + store
    // OR
    await api.session.setupUser(); // Just user (no org/store)
  });

  test('should do the happy path', async ({ api }) => {
    const input = {
      // ... minimal required input
    };

    const { data } = await api.admin.mutation('<service-api>/OperationName', {
      variables: { input },
    });

    const result = data.<domain>Mutation.<operation>;

    // Always check errors first
    expect(result.userErrors).toHaveLength(0);
    expect(result.<entity>).toBeTruthy();

    // Then verify specific fields
    expect(result.<entity>.field).toBe(expected);
  });

  test('should reject invalid input', async ({ api }) => {
    const { data } = await api.admin.mutation('<service-api>/OperationName', {
      throwOnError: false, // Important for error tests!
      variables: {
        input: { /* invalid data */ },
      },
    });

    const result = data.<domain>Mutation.<operation>;

    expect(result.<entity>).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});
```

## Step 5: Test Categories

Write tests for each category:

### 1. Happy Path (Required)
- Minimal valid input
- Full input with all optional fields
- Common use cases

### 2. Input Validation (Required)
- Missing required fields
- Invalid field formats
- Invalid field values
- Empty strings where not allowed

### 3. Authorization (When Applicable)
- Unauthenticated access
- Unauthorized role access
- Cross-org/cross-store isolation

### 4. Edge Cases
- Duplicate entries (unique constraints)
- Max length/limits
- Special characters
- Empty collections

### 5. Business Logic
- Specific domain rules
- State transitions
- Cascading effects

## API Reference

### Session Fixture (`api.session`)

```typescript
// Create user and authenticate
await api.session.setupUser();

// Create user + organization + store
await api.session.setupUserAndStore();

// Create just organization (user must exist)
await api.session.setupOrganization();

// Access session data
api.session.tenant.data        // { email, password, firstName, lastName }
api.session.tenant.accessToken // JWT token
api.session.tenant.userId      // User ID
api.session.organizationId     // Organization ID
api.session.project            // Store object { id, name, displayName }
api.session.projectSlug        // Store name/slug

// Clear auth (simulate logged out)
api.session.clearSession();
```

### Admin API (`api.admin`)

```typescript
// Mutation
const { data } = await api.admin.mutation('service-api/OperationName', {
  variables: { input: { ... } },
  throwOnError: false, // Set to false for error tests
});

// Query
const { data } = await api.admin.query('service-api/QueryName', {
  variables: { id: 'xxx' },
});
```

### User Creation Helper

```typescript
import { generateUser } from '@utils/user';

const userData = generateUser();
// { email: 'test-{uuid}@playwright.dev', password, firstName, lastName }
```

## Naming Conventions

- File: `<feature>.spec.ts` (kebab-case)
- describe: `'Feature Name'` (Title Case)
- test: `'should <action> <result>'` (lowercase)

Examples:
```typescript
// File: e2e/tests/inventory-api/product-update.spec.ts
test.describe('Product Update API', () => {
  test('should update product title', ...);
  test('should reject update with empty title', ...);
  test('should reject update for non-existent product', ...);
});
```

## Assertion Patterns

```typescript
// Check for success
expect(result.userErrors).toHaveLength(0);
expect(result.product).toBeTruthy();

// Check for failure
expect(result.product).toBeNull();
expect(result.userErrors.length).toBeGreaterThan(0);

// Check specific error
expect(result.userErrors).toContainEqual(
  expect.objectContaining({
    code: 'INVALID_INPUT',
    field: ['input', 'title'],
  })
);

// Check field values
expect(result.product.title).toBe('Expected Title');
expect(result.product.handle).toMatch(/^[a-z0-9-]+$/);

// Check arrays
expect(result.products.edges).toHaveLength(5);
expect(result.products.edges.map(e => e.node.id)).toContain(productId);

// Check nested objects
expect(result.product.options).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: 'Color', slug: 'color' }),
  ])
);
```

## Common Patterns

### Testing with Multiple Users

```typescript
test('should isolate data between users', async ({ api }) => {
  // First user
  await api.session.setupUserAndStore();
  const { data: created } = await api.admin.mutation('...', { ... });

  // Second user (new session)
  const secondUser = generateUser();
  await api.admin.user.create(secondUser);
  // ... create new org/store

  // Verify isolation
  const { data: queried } = await api.admin.query('...', { ... });
  expect(queried.items).not.toContain(created.id);
});
```

### Testing Pagination

```typescript
test('should paginate results', async ({ api }) => {
  // Create multiple items
  for (let i = 0; i < 5; i++) {
    await api.admin.mutation('...', { ... });
  }

  // Query first page
  const { data: page1 } = await api.admin.query('...', {
    variables: { first: 2 },
  });
  expect(page1.items.edges).toHaveLength(2);
  expect(page1.items.pageInfo.hasNextPage).toBe(true);

  // Query next page
  const { data: page2 } = await api.admin.query('...', {
    variables: { first: 2, after: page1.items.pageInfo.endCursor },
  });
  expect(page2.items.edges).toHaveLength(2);
});
```

### Testing Authorization

```typescript
test('should reject unauthenticated access', async ({ api }) => {
  await api.session.setupUserAndStore();
  api.session.clearSession(); // Simulate logged out

  const { data } = await api.admin.mutation('...', {
    throwOnError: false,
    variables: { ... },
  });

  expect(data.errors || data.mutation.userErrors.length).toBeTruthy();
});
```

## Output Format

After writing tests, provide:

```
CREATED FILES:
- e2e/fixtures/admin/<entity>.ts (domain fixture)
- e2e/fixtures/admin/api.ts (updated with new fixture)
- e2e/queries/<service-api>/<Operation>.gql (if new)
- e2e/tests/<service-api>/<feature>.spec.ts

FIXTURE METHODS:
- <entity>.create(input?) - Create with defaults
- <entity>.update(id, input) - Update entity
- <entity>.delete(id) - Delete entity
- <entity>.findOne(id) - Get by ID

TESTS WRITTEN:
- [Happy Path] should create product with minimal input
- [Happy Path] should create product with all options
- [Validation] should reject empty title
- [Validation] should reject duplicate handle
- [Auth] should reject unauthenticated request

READY FOR: /test-run tests/<service-api>/<feature>.spec.ts
```

## Important Rules

1. **PREFER domain fixtures** for entity setup - keeps tests clean and readable
2. **Use raw API only** when testing the mutation/query itself or edge cases
3. **NEVER mock GraphQL responses** - all tests hit the real API
4. **NEVER share state between tests** - each test creates its own data
5. **ALWAYS check `userErrors` first** in mutation results
6. **ALWAYS use `throwOnError: false`** for error tests
7. **ALWAYS run querygen** after creating new `.gql` files
8. **Keep tests focused** - one behavior per test
9. **Use descriptive test names** - should read like documentation

## Clean Test Principle

Tests should follow Arrange-Act-Assert pattern with fixtures:

```typescript
test('should update product price', async ({ api }) => {
  // Arrange - use fixture for clean setup
  const product = await api.admin.product.create({ title: 'Widget' });
  const variant = product.variants.edges[0].node;

  // Act - call the API being tested
  const { data } = await api.admin.mutation('inventory-api/VariantSetPricing', {
    variables: {
      variantId: variant.id,
      input: { price: 99.99 },
    },
  });

  // Assert - verify result
  expect(data.catalogMutation.variantSetPricing.userErrors).toHaveLength(0);
  expect(data.catalogMutation.variantSetPricing.variant.price).toBe(99.99);
});
```

NOT this (verbose, hard to read):

```typescript
test('should update product price', async ({ api }) => {
  // Too much noise in the test
  const { data: createData } = await api.admin.mutation('inventory-api/ProductCreate', {
    variables: {
      input: {
        title: 'Widget',
        handle: 'widget-123',
        // ... many more fields
      },
    },
  });
  expect(createData.catalogMutation.productCreate.userErrors).toHaveLength(0);
  const product = createData.catalogMutation.productCreate.product;
  // ... actual test buried in setup code
});
```
