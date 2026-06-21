# E2E Tests (Playwright)

## Running Tests

```bash
# Specific file
yarn playwright test tests/inventory-api/product-create.spec.ts --workers 1
```

All commands run from this `e2e/` directory. Use `shopana_test` MCP tool or run from shell.

## Testing Workflow

1. **Playwright starts the E2E runtime by default** — `playwright.config.ts` starts isolated Docker infrastructure, runs migrations, and starts services, gateways, and Admin UI on dedicated test ports through `bin/start-test-env.mjs`. Set `E2E_START_SERVERS=false` only when intentionally targeting an already running environment.
2. **Make code changes** in the service (resolver, script, schema, etc.). Wait a moment for hot-reload.
3. **Run tests one file at a time** — never run the entire suite or a whole directory at once:
   ```bash
   yarn playwright test tests/inventory-api/product-create.spec.ts --workers 1
   ```
4. **Analyze failures** — read the error output, categorize failures by error type, fix the code.
5. **Re-run the same file** to verify the fix. Only move to the next file when all tests pass.
6. **Repeat** for each test file that needs verification.

### Hot-reload
- The E2E runtime uses `shopana dev` for services, so service source changes hot-reload while the test environment is running.
- If you changed shared packages (`packages/*`) — run `shopana build --packages` first.
- If you changed GraphQL schemas — rebuild schemas (`shopana schema --action build`) before running tests when needed.
- Set `E2E_START_DOCKER=false` to skip Docker infrastructure startup.
- Set `E2E_RUN_MIGRATIONS=false` to skip migration startup.

### Rules
- **NEVER** touch unrelated running processes. Playwright owns only the processes it starts through `bin/start-test-env.mjs`.
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

- `api.admin` — AdminApiFixture: GraphQL calls to the admin endpoint from `ADMIN_GRAPHQL_URL`. Auto-injects auth headers.
- `api.client` — StorefrontApiFixture: GraphQL calls to the storefront endpoint from `CLIENT_GRAPHQL_URL`.
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

When `E2E_START_SERVERS` is not `false`, Playwright overrides these runtime URLs with the dedicated test ports:

```
BASE_URL=http://127.0.0.1:3300
ADMIN_GRAPHQL_URL=http://127.0.0.1:14001/graphql
CLIENT_GRAPHQL_URL=http://127.0.0.1:14000/graphql
CONFIG_FILE=config.e2e.yml
```

The isolated Docker infra uses PostgreSQL on `15432`, MinIO on `19000`, and local data under `.tmp/e2e-data`.

Use `E2E_CONFIG_FILE=...` to point the auto-start runtime at another config file.
