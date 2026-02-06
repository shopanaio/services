# E2E Tests (Playwright)

## Running Tests

```bash
# Specific file
yarn playwright test tests/inventory-api/product-create.spec.ts --workers 1
```

All commands run from this `e2e/` directory. Use `shopana_test` MCP tool or run from shell.

## Testing Workflow

1. **Dev server is already running** — do NOT start, stop, or restart any services. The server hot-reloads on code changes automatically.
2. **Make code changes** in the service (resolver, script, schema, etc.). Wait a moment for hot-reload.
3. **Run tests one file at a time** — never run the entire suite or a whole directory at once:
   ```bash
   yarn playwright test tests/inventory-api/product-create.spec.ts --workers 1
   ```
4. **Analyze failures** — read the error output, categorize failures by error type, fix the code.
5. **Re-run the same file** to verify the fix. Only move to the next file when all tests pass.
6. **Repeat** for each test file that needs verification.

### Hot-reload
- Hot-reload works only for code in `services/` (resolvers, scripts, etc.) — save a file and the server restarts automatically.
- If you changed shared packages (`packages/*`) — run `shopana build --packages` first. Then touch/edit any file in the service to trigger a hot-reload restart.
- If you changed GraphQL schemas — rebuild schemas (`shopana schema --action build`), then rebuild packages if needed, then touch a service file to trigger restart.

### Rules
- **NEVER** touch running processes (dev server, gateway, database). They are managed separately.
- **NEVER** run all tests at once. Always target a single `.spec.ts` file.

## Project Structure

```
e2e/
├── tests/           # Test specs organized by service domain
├── queries/         # .gql files organized by service (e.g. inventory-api/ProductCreate.gql)
├── fixtures/        # Playwright fixtures: api, admin, storefront, session
├── codegen/         # Generated TS types from GraphQL schemas (admin-gql.ts, client-gql.ts)
├── utils/           # Helpers: generateUser(), globalid, pagination builders
├── data/            # Seed data (products, categories, tags)
└── bin/             # Build scripts, schema download
```

## Test Pattern

```typescript
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Feature', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore(); // creates user → org → store
  });

  test('should work', async ({ api }) => {
    const { data } = await api.admin.mutation('inventory-api/ProductCreate', {
      variables: { input: { title: 'Test' } },
    });
    expect(data.catalogMutation.productCreate.userErrors).toHaveLength(0);
  });
});
```

## Fixtures (via `api`)

- `api.admin` — AdminApiFixture: GraphQL calls to admin endpoint (port 4001). Auto-injects auth headers.
- `api.client` — StorefrontApiFixture: GraphQL calls to storefront endpoint (port 4000).
- `api.session` — SessionFixture: manages auth context.
  - `setupUser()` — create & authenticate user
  - `setupUserAndStore()` — create user + org + store (most common)
  - `clearSession()` — simulate unauthenticated state

## GraphQL Queries

Stored as `.gql` files in `queries/<service>/`. Referenced by path string:
```typescript
api.admin.mutation('inventory-api/ProductCreate', { variables: {...} })
api.admin.query('inventory-api/ProductGet', { variables: {...} })
```

Type-safe filenames generated in `queries/filenames.ts` (run `npm run querygen` to update).

## Code Generation

```bash
yarn codegen    # regenerate TS types from GraphQL schemas
yarn querygen   # regenerate query filename type map
```

Types are prefixed with `Api` (e.g. `ApiProduct`, `ApiMutation`). Sources:
- Admin schema: `../infra/federation/supergraph-admin.graphql`
- Client schema: `schema-client.graphql`

## Conventions

- Always check `userErrors` before asserting on data.
- Use `generateUser()` from `utils/user.ts` for test users (email: `test-{uuid}@playwright.dev`).
- Custom matcher: `expect(data).toMatchSchema(yupSchema)` for structure validation.
- Tests are fully parallel by default (5 workers). Use `--workers 1` to debug ordering issues.
- Each test gets its own user/org/store — no shared state between tests.

## Environment (.env)

```
ADMIN_GRAPHQL_URL=http://127.0.0.1:4001/graphql
CLIENT_GRAPHQL_URL=http://127.0.0.1:4000/graphql
BASE_URL=http://localhost:3000
```
