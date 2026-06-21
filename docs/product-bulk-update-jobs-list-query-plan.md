# Product Bulk Update Jobs List Query Plan

## Goal

Add a Relay-style list query that lets Admin FE recover currently active product bulk update jobs without storing job IDs locally.

The query must return all matching jobs for the current store/project, including multiple concurrently active jobs, and should reuse the existing bulk job node resolver so the response shape stays compatible with `productBulkUpdateJob(jobId)`.

## Current State

The Catalog Admin GraphQL API currently exposes only a single-job lookup:

```graphql
productBulkUpdateJob(jobId: ID!): ProductBulkUpdateJob
```

`ProductBulkUpdateJob` already exposes:

```graphql
type ProductBulkUpdateJob {
  id: ID!
  status: BulkUpdateJobStatus!
  createdAt: DateTime!
  startedAt: DateTime
  finishedAt: DateTime
  totalProducts: Int!
  progress: BulkUpdateJobProgress!
  items(first: Int, after: String, statusFilter: [BulkUpdateItemStatus!]): BulkUpdateItemConnection!
}
```

Relevant implementation points:

- `services/catalog/src/api/graphql-admin/schema/base.graphql`
  - has `productBulkUpdateJob(jobId)`.
- `services/catalog/src/api/graphql-admin/schema/bulk.graphql`
  - defines `ProductBulkUpdateJob`, `BulkUpdateJobStatus`, `BulkUpdateItemConnection`.
- `services/catalog/src/resolvers/admin/QueryResolver.ts`
  - resolves `productBulkUpdateJob(jobId)`.
- `services/catalog/src/resolvers/admin/ProductBulkUpdateJobResolver.ts`
  - resolves job node fields and item connection.
- `services/catalog/src/repositories/BulkEditJobRepository.ts`
  - supports `create`, `findById`, state transitions, but no list/connection query.

## Proposed API

Add a jobs connection query under `CatalogQuery`:

```graphql
type CatalogQuery {
  """
  Get product bulk update jobs for the current store.
  Defaults to active jobs when statusFilter is omitted.
  """
  productBulkUpdateJobs(
    first: Int
    after: String
    statusFilter: [BulkUpdateJobStatus!]
  ): ProductBulkUpdateJobConnection!
}
```

Add connection types to `bulk.graphql`:

```graphql
type ProductBulkUpdateJobConnection {
  edges: [ProductBulkUpdateJobEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ProductBulkUpdateJobEdge {
  cursor: String!
  node: ProductBulkUpdateJob!
}
```

Default behavior:

- If `statusFilter` is omitted, resolver/repository should use active statuses: `QUEUED`, `RUNNING`.
- If FE wants history, it can pass `statusFilter: [COMPLETED, CANCELLED]` or all statuses explicitly.
- `first` defaults to `20`.
- `first` is capped at `100`.

Example FE query:

```graphql
query ActiveProductBulkUpdateJobs {
  catalogQuery {
    productBulkUpdateJobs(first: 20) {
      edges {
        cursor
        node {
          id
          status
          createdAt
          startedAt
          totalProducts
          progress {
            total
            done
            succeeded
            failed
            cancelled
            superseded
            running
            pending
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
}
```

If several jobs are `QUEUED` or `RUNNING`, all of them are returned in `edges`.

## Global ID Contract

`ProductBulkUpdateJob` is a real entity node in the API response and its `id` must be a Relay global ID:

```text
gid://shopana/ProductBulkUpdateJob/<bulk_edit_job.uuid>
```

This entity type already exists in `@shopana/shared-graphql-guid`:

```ts
GlobalIdEntity.ProductBulkUpdateJob
```

The new connection and edge types do not need new global ID entity values because they are Relay wrappers, not domain entities:

- `ProductBulkUpdateJobConnection` has no `id`.
- `ProductBulkUpdateJobEdge` has no `id`.
- `ProductBulkUpdateJobEdge.cursor` is an opaque pagination cursor, not a global ID.
- `ProductBulkUpdateJobEdge.node.id` is the existing `ProductBulkUpdateJob` GID.

The list query repository should return internal UUIDs as `nodeId`; `ProductBulkUpdateJobResolver.id()` is responsible for encoding those UUIDs with `GlobalIdEntity.ProductBulkUpdateJob`.

Also align the existing single-job query with this contract. Since clients receive `job.id` as a GID, `productBulkUpdateJob(jobId)` should accept that GID and decode it:

```ts
const jobId = decodeGlobalIdByType(args.jobId, GlobalIdEntity.ProductBulkUpdateJob);
```

Raw UUID is not a public API contract for `productBulkUpdateJob(jobId)` and must not be supported by the resolver.

## Ordering And Cursor Rules

Use stable descending order:

```text
createdAt DESC, id DESC
```

Cursor should encode both fields:

```text
createdAt:id
```

Forward pagination condition for `after`:

```text
createdAt < cursor.createdAt
OR (createdAt = cursor.createdAt AND id < cursor.id)
```

This mirrors the existing cursor approach used by bulk item connections, while using `createdAt` as the primary ordering field for a job feed.

## Backend Implementation Plan

### 1. GraphQL Schema

Edit `services/catalog/src/api/graphql-admin/schema/bulk.graphql`:

- Add `ProductBulkUpdateJobConnection`.
- Add `ProductBulkUpdateJobEdge`.

Edit `services/catalog/src/api/graphql-admin/schema/base.graphql`:

- Add `productBulkUpdateJobs(first, after, statusFilter)` near `productBulkUpdateJob(jobId)`.

Keep `productBulkUpdateJob(jobId)` available for polling flows, but enforce the Relay GID input contract.

No new `GlobalIdEntity` value is required for the connection or edge types. Verify that `ProductBulkUpdateJobResolver.id()` continues to encode IDs as `GlobalIdEntity.ProductBulkUpdateJob`.

### 2. Repository Connection Method

Edit `services/catalog/src/repositories/BulkEditJobRepository.ts`.

Add input/result types:

```ts
export interface BulkEditJobConnectionInput {
  first?: number | null;
  after?: string | null;
  statusFilter?: Array<"QUEUED" | "RUNNING" | "COMPLETED" | "CANCELLED"> | null;
}

export interface BulkEditJobConnectionResult {
  edges: Array<{ cursor: string; nodeId: string }>;
  pageInfo: PageInfo;
  totalCount: number;
}
```

Add `getConnection(input)`:

- Apply mandatory multi-tenant filter:
  - `bulkEditJob.projectId = this.storeId`
- Apply status filter:
  - `input.statusFilter` if non-empty
  - otherwise default to `["QUEUED", "RUNNING"]`
- Apply cursor condition when `after` is present.
- Fetch `limit + 1` rows to compute `hasNextPage`.
- Return `edges`, `pageInfo`, and `totalCount`.

Use the existing repository pattern:

- Always query via `this.connection`.
- Do not expose jobs from another store/project.
- Keep cursor encode/decode helpers private to the repository unless they become shared.

### 3. Batch Repository Methods

The list query must not rely on one repository call per job or item. Add batch methods that support DataLoader-backed resolvers.

Edit `services/catalog/src/repositories/BulkEditJobRepository.ts`.

Add:

```ts
async getByIds(jobIds: readonly string[]): Promise<BulkEditJob[]> {
  if (jobIds.length === 0) return [];

  return this.connection
    .select()
    .from(bulkEditJob)
    .where(
      and(
        eq(bulkEditJob.projectId, this.storeId),
        inArray(bulkEditJob.id, [...jobIds])
      )
    );
}
```

Edit `services/catalog/src/repositories/BulkEditItemRepository.ts`.

Add item batch load support:

```ts
async getByIds(itemIds: readonly string[]): Promise<BulkEditItem[]> {
  if (itemIds.length === 0) return [];

  return this.connection
    .select()
    .from(bulkEditItem)
    .where(
      and(
        eq(bulkEditItem.projectId, this.storeId),
        inArray(bulkEditItem.id, [...itemIds])
      )
    );
}
```

Add progress batch support:

```ts
export interface BulkEditJobProgressCounts {
  total: number;
  done: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  superseded: number;
  running: number;
  pending: number;
}

async countByStatusForJobs(
  jobIds: readonly string[]
): Promise<Map<string, BulkEditJobProgressCounts>> {
  // SELECT job_id, status, count(*) FROM bulk_edit_item
  // WHERE project_id = this.storeId AND job_id IN (...)
  // GROUP BY job_id, status
}
```

Add total product batch support:

```ts
async countDistinctProductsForJobs(
  jobIds: readonly string[]
): Promise<Map<string, number>> {
  // SELECT job_id, count(distinct product_id)
  // WHERE project_id = this.storeId AND job_id IN (...)
  // GROUP BY job_id
}
```

Repository batch methods must return data scoped by `projectId = this.storeId`; loaders will map missing rows to `null`, `0`, or an empty progress object.

### 4. DataLoaders

Create `services/catalog/src/loaders/BulkEditLoader.ts`.

Expose DataLoaders for every job-list node field that would otherwise create N+1 queries:

```ts
import DataLoader from "dataloader";
import type {
  BulkEditJob,
  BulkEditItem,
} from "../repositories/models/index.js";
import type { Repository } from "../repositories/Repository.js";
import type { BulkEditJobProgressCounts } from "../repositories/BulkEditItemRepository.js";

export class BulkEditLoader {
  public readonly bulkEditJob: DataLoader<string, BulkEditJob | null>;
  public readonly bulkEditItem: DataLoader<string, BulkEditItem | null>;
  public readonly bulkEditJobProgress: DataLoader<string, BulkEditJobProgressCounts>;
  public readonly bulkEditJobTotalProducts: DataLoader<string, number>;

  constructor(repository: Repository) {
    this.bulkEditJob = new DataLoader<string, BulkEditJob | null>(async (jobIds) => {
      const rows = await repository.bulkEditJob.getByIds(jobIds);
      return jobIds.map((id) => rows.find((job) => job.id === id) ?? null);
    });

    this.bulkEditItem = new DataLoader<string, BulkEditItem | null>(async (itemIds) => {
      const rows = await repository.bulkEditItem.getByIds(itemIds);
      return itemIds.map((id) => rows.find((item) => item.id === id) ?? null);
    });

    this.bulkEditJobProgress = new DataLoader<string, BulkEditJobProgressCounts>(
      async (jobIds) => {
        const counts = await repository.bulkEditItem.countByStatusForJobs(jobIds);
        return jobIds.map((jobId) => counts.get(jobId) ?? emptyProgressCounts());
      }
    );

    this.bulkEditJobTotalProducts = new DataLoader<string, number>(
      async (jobIds) => {
        const counts = await repository.bulkEditItem.countDistinctProductsForJobs(jobIds);
        return jobIds.map((jobId) => counts.get(jobId) ?? 0);
      }
    );
  }
}
```

Register the loader in `services/catalog/src/loaders/Loader.ts`:

- import `BulkEditLoader`;
- add public fields:
  - `bulkEditJob`
  - `bulkEditItem`
  - `bulkEditJobProgress`
  - `bulkEditJobTotalProducts`
- instantiate `const bulkEditLoader = new BulkEditLoader(repository);`
- assign fields from `bulkEditLoader`.

This follows `knowledge/vault/patterns/dataloader.md`: loaders are per-request, batch calls by key, and return values in the same order as input keys.

### 5. Node Resolvers Use DataLoaders

Update `services/catalog/src/resolvers/admin/ProductBulkUpdateJobResolver.ts`.

Replace direct repository calls:

```ts
async $preload() {
  const job = await this.$ctx.loaders.bulkEditJob.load(this.$props);
  if (!job) {
    throw new Error(`BulkEditJob with ID ${this.$props} not found`);
  }
  return job;
}

async totalProducts(): Promise<number> {
  return this.$ctx.loaders.bulkEditJobTotalProducts.load(this.$props);
}

async progress() {
  return this.$ctx.loaders.bulkEditJobProgress.load(this.$props);
}
```

Keep `items(...)` as a connection query per requested job. The item nodes returned by that connection must be loaded through a DataLoader.

Update `services/catalog/src/resolvers/admin/BulkUpdateItemResolver.ts`.

Replace direct repository calls:

```ts
async $preload() {
  const item = await this.$ctx.loaders.bulkEditItem.load(this.$props);
  if (!item) {
    throw new Error(`BulkEditItem with ID ${this.$props} not found`);
  }
  return item;
}
```

This prevents the common nested FE query from doing:

- 1 query for jobs;
- N queries for job nodes;
- N queries for `totalProducts`;
- N queries for `progress`;
- M queries for item nodes.

With loaders, the same request becomes:

- 1 query for the job connection;
- 1 batched query for job nodes;
- 1 batched query for total product counts;
- 1 batched query for progress counts;
- one item connection query per job when `items` is selected;
- 1 batched query for all selected item nodes.

### 6. Connection Resolver

Create `services/catalog/src/resolvers/admin/ProductBulkUpdateJobConnectionResolver.ts`.

Use the existing catalog connection base:

```ts
export class ProductBulkUpdateJobConnectionResolver
  extends BaseConnectionResolver<BulkEditJobConnectionInput> {
  async $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.bulkEditJob.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return new ProductBulkUpdateJobResolver(nodeId, this.$ctx);
  }
}
```

Export it from `services/catalog/src/resolvers/admin/index.ts`.

### 7. Query Resolver

Edit `services/catalog/src/resolvers/admin/QueryResolver.ts`.

First fix/confirm the single-job query strictly decodes the incoming GID:

```ts
async productBulkUpdateJob(args: { jobId: string }) {
  const jobId = decodeGlobalIdByType(
    args.jobId,
    GlobalIdEntity.ProductBulkUpdateJob
  );

  const job = await this.$ctx.kernel.repository.bulkEditJob.findById(jobId);
  if (!job) return null;
  return new ProductBulkUpdateJobResolver(job.id, this.$ctx);
}
```

Add:

```ts
productBulkUpdateJobs(args: {
  first?: number | null;
  after?: string | null;
  statusFilter?: Array<"QUEUED" | "RUNNING" | "COMPLETED" | "CANCELLED"> | null;
}) {
  return new ProductBulkUpdateJobConnectionResolver(args, this.$ctx);
}
```

Do not decode job IDs here. The list query returns raw repository node IDs internally; `ProductBulkUpdateJobResolver.id()` already encodes them as global IDs.

### 8. Generated Types And Schema Artifacts

After schema/resolver edits:

- Run the project schema build through `shopana-cli` MCP (`shopana_schema` with `action: "build"`).
- Regenerate Catalog Admin GraphQL types using the project’s existing codegen flow for this service.
- Regenerate e2e GraphQL types if new e2e query fixtures are added.

Do not manually edit generated files except through the configured generation commands.

## E2E API Test Plan

Add query fixture:

`e2e/queries/inventory-api/ProductBulkUpdateJobs.gql`

```graphql
query ProductBulkUpdateJobs(
  $first: Int
  $after: String
  $statusFilter: [BulkUpdateJobStatus!]
) {
  catalogQuery {
    productBulkUpdateJobs(first: $first, after: $after, statusFilter: $statusFilter) {
      edges {
        cursor
        node {
          id
          status
          createdAt
          startedAt
          finishedAt
          totalProducts
          progress {
            total
            done
            succeeded
            failed
            cancelled
            superseded
            running
            pending
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
}
```

Add tests to `e2e/tests/inventory-api/product-bulk-edit.spec.ts` or a focused new file.

Recommended stable tests:

1. `should list multiple bulk update jobs without job ids`
   - Create two bulk update jobs.
   - Query `productBulkUpdateJobs(statusFilter: [QUEUED, RUNNING, COMPLETED], first: 10)`.
   - Assert both returned job IDs are present.
   - Include `COMPLETED` because jobs can finish before the list query runs.

2. `should filter jobs by status`
   - Create and wait for one completed job.
   - Query `statusFilter: [COMPLETED]`.
   - Assert the job is returned and all returned nodes have `COMPLETED`.

3. `should paginate bulk update jobs`
   - Create at least two jobs.
   - Query `first: 1`.
   - Use `pageInfo.endCursor` for the next page.
   - Assert second page does not repeat the first cursor/job.

4. `should reject raw UUID in productBulkUpdateJob`
   - Create a bulk update job.
   - Extract the raw UUID from the returned GID only in test code.
   - Query `productBulkUpdateJob(jobId: rawUuid)` with `throwOnError: false`.
   - Assert a GraphQL error is returned.

Avoid tests that require jobs to remain `RUNNING`; current jobs can complete too quickly and would make the test flaky.

## Batching And DataLoader Requirements

Batching is required for the initial implementation, not a follow-up optimization.

Required loaders:

| Loader | Key | Value | Repository method |
| ------ | --- | ----- | ----------------- |
| `bulkEditJob` | job UUID | `BulkEditJob \| null` | `bulkEditJob.getByIds` |
| `bulkEditItem` | item UUID | `BulkEditItem \| null` | `bulkEditItem.getByIds` |
| `bulkEditJobProgress` | job UUID | `BulkEditJobProgressCounts` | `bulkEditItem.countByStatusForJobs` |
| `bulkEditJobTotalProducts` | job UUID | `number` | `bulkEditItem.countDistinctProductsForJobs` |

Resolver rule:

- Entity node resolvers should use `$ctx.loaders.*.load(id)` in `$preload()`.
- Computed per-job aggregate fields should use loaders, not direct repository calls.
- Connection resolvers may call repository connection methods directly because a connection query is already a batch boundary.
- Loaders must preserve input order and return sensible defaults for missing aggregate rows.

Do not denormalize progress counters into `bulk_edit_job` in this change; the current architecture computes progress from `bulk_edit_items`.

## Acceptance Criteria

- FE can call one GraphQL query without known job IDs and receive all active bulk update jobs for the current store.
- Multiple simultaneous `QUEUED`/`RUNNING` jobs appear in the same connection response.
- `productBulkUpdateJob(jobId)` accepts only Relay GID values for `ProductBulkUpdateJob`.
- Raw UUID values are rejected by `productBulkUpdateJob(jobId)`.
- Query is scoped to `projectId = this.storeId`.
- Response follows Relay shape: `edges`, `cursor`, `node`, `pageInfo`, `totalCount`.
- Pagination is stable by `createdAt DESC, id DESC`.
- Job node fields are DataLoader-backed:
  - `ProductBulkUpdateJob.$preload`
  - `ProductBulkUpdateJob.totalProducts`
  - `ProductBulkUpdateJob.progress`
  - `BulkUpdateItem.$preload`
- E2E coverage proves listing, filtering, and pagination.
