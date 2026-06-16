# ProductBulkEdit — План реализации

## Обзор

Пошаговый план реализации массового редактирования продуктов на основе архитектуры из `product-bulk-edit-root-workflow.md`.

**Ключевые решения:**
- Root workflow с fan-out по chunks
- Guarded updates для state machine (без race conditions)
- Переиспользование существующих input типов (7 из 8)
- DBOS + BrokerWorkflows для идемпотентности

---

## Фаза 1: База данных

### 1.1 Drizzle схемы

**Создать файлы:**

```
services/inventory/src/repositories/models/
├── bulkEditJobs.ts      # NEW
├── bulkEditItems.ts     # NEW
└── productBulkFence.ts  # NEW
```

**`bulkEditJobs.ts`:**
```typescript
import { uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema.js";

export const bulkEditJobStatusEnum = inventorySchema.enum("bulk_edit_job_status", [
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "CANCELLED",
]);

export const bulkEditJob = inventorySchema.table("bulk_edit_job", {
  id: uuid("id").primaryKey(),
  projectId: uuid("project_id").notNull(),
  status: bulkEditJobStatusEnum("status").notNull().default("QUEUED"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  index("bulk_edit_job_project_created_idx").on(table.projectId, table.createdAt),
  index("bulk_edit_job_project_status_idx").on(table.projectId, table.status),
]);

export type BulkEditJob = typeof bulkEditJob.$inferSelect;
export type NewBulkEditJob = typeof bulkEditJob.$inferInsert;
```

**`bulkEditItems.ts`:**
```typescript
import { uuid, text, timestamp, integer, jsonb, boolean, unique, index } from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema.js";
import { bulkEditJob } from "./bulkEditJobs.js";

export const bulkEditItemStatusEnum = inventorySchema.enum("bulk_edit_item_status", [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "SUPERSEDED",
]);

export const bulkEditCancelReasonEnum = inventorySchema.enum("bulk_edit_cancel_reason", [
  "USER",
  "SUPERSEDED",
  "SYSTEM",
]);

export const bulkEditItem = inventorySchema.table("bulk_edit_item", {
  id: uuid("id").primaryKey(),
  jobId: uuid("job_id").notNull().references(() => bulkEditJob.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull(),
  productId: uuid("product_id").notNull(),
  variantId: uuid("variant_id"),
  opType: text("op_type").notNull(),
  opIndex: integer("op_index").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  params: jsonb("params").notNull(),
  status: bulkEditItemStatusEnum("status").notNull().default("PENDING"),
  fenceToken: text("fence_token").notNull(),
  cancelRequested: boolean("cancel_requested").notNull().default(false),
  cancelReason: bulkEditCancelReasonEnum("cancel_reason"),
  supersededByJobId: uuid("superseded_by_job_id"),
  errors: jsonb("errors"),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "string" }),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "string" }),
}, (table) => [
  // Query indexes (unique constraint добавляется через raw SQL миграцию, см. примечание ниже)
  index("bulk_edit_item_project_product_status_idx")
    .on(table.projectId, table.productId, table.status),
  index("bulk_edit_item_job_chunk_op_idx")
    .on(table.jobId, table.chunkIndex, table.opIndex),
  index("bulk_edit_item_job_status_idx")
    .on(table.jobId, table.status),
]);

export type BulkEditItem = typeof bulkEditItem.$inferSelect;
export type NewBulkEditItem = typeof bulkEditItem.$inferInsert;
```

> **Примечание о UNIQUE constraint:** Drizzle не поддерживает `COALESCE` в unique constraint напрямую. После генерации миграции добавить raw SQL:
> ```sql
> CREATE UNIQUE INDEX bulk_edit_item_unique_op
>   ON inventory.bulk_edit_item (job_id, op_type, COALESCE(variant_id, product_id));
> ```

**`productBulkFence.ts`:**
```typescript
import { text, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema.js";
import { bulkEditJob } from "./bulkEditJobs.js";

export const productBulkFence = inventorySchema.table("product_bulk_fence", {
  projectId: uuid("project_id").notNull(),
  productId: text("product_id").notNull(),
  fenceToken: text("fence_token").notNull(),
  jobId: uuid("job_id").notNull().references(() => bulkEditJob.id, { onDelete: "cascade" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.projectId, table.productId] }),
]);

export type ProductBulkFence = typeof productBulkFence.$inferSelect;
export type NewProductBulkFence = typeof productBulkFence.$inferInsert;
```

### 1.2 Экспорт схем

**Редактировать:** `services/inventory/src/repositories/models/index.ts`

```typescript
// Добавить экспорты
export * from "./bulkEditJobs.js";
export * from "./bulkEditItems.js";
export * from "./productBulkFence.js";
```

### 1.3 Генерация миграций

```bash
cd services/inventory
pnpm db:generate
```

---

## Фаза 2: Repositories

### 2.1 BulkEditJobRepository

**Создать:** `services/inventory/src/repositories/BulkEditJobRepository.ts`

```typescript
import { eq, and, inArray } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import { bulkEditJob, type BulkEditJob, type NewBulkEditJob } from "./models/bulkEditJobs.js";

export class BulkEditJobRepository extends BaseRepository {
  async create(data: { id: string }): Promise<BulkEditJob> {
    const now = new Date().toISOString();
    const [job] = await this.connection
      .insert(bulkEditJob)
      .values({
        id: data.id,
        projectId: this.storeId,
        status: "QUEUED",
        createdAt: now,
      } satisfies NewBulkEditJob)
      .returning();
    return job;
  }

  async findById(id: string): Promise<BulkEditJob | null> {
    const [job] = await this.connection
      .select()
      .from(bulkEditJob)
      .where(
        and(
          eq(bulkEditJob.projectId, this.storeId),
          eq(bulkEditJob.id, id)
        )
      );
    return job ?? null;
  }

  /**
   * Guarded update: QUEUED → RUNNING
   * Returns rows affected (0 = already CANCELLED)
   */
  async tryMarkRunning(jobId: string): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.connection
      .update(bulkEditJob)
      .set({
        status: "RUNNING",
        startedAt: now,
      })
      .where(
        and(
          eq(bulkEditJob.projectId, this.storeId),
          eq(bulkEditJob.id, jobId),
          eq(bulkEditJob.status, "QUEUED")
        )
      );
    return result.rowCount ?? 0;
  }

  async markCancelled(jobId: string): Promise<number> {
    const result = await this.connection
      .update(bulkEditJob)
      .set({ status: "CANCELLED" })
      .where(
        and(
          eq(bulkEditJob.projectId, this.storeId),
          eq(bulkEditJob.id, jobId),
          inArray(bulkEditJob.status, ["QUEUED", "RUNNING"])
        )
      );
    return result.rowCount ?? 0;
  }

  async finalize(jobId: string, status: "COMPLETED" | "CANCELLED"): Promise<void> {
    const now = new Date().toISOString();
    await this.connection
      .update(bulkEditJob)
      .set({
        status,
        finishedAt: now,
      })
      .where(
        and(
          eq(bulkEditJob.projectId, this.storeId),
          eq(bulkEditJob.id, jobId)
        )
      );
  }
}

// Экспорт типов
export type { BulkEditJob, NewBulkEditJob } from "./models/bulkEditJobs.js";
```

### 2.2 BulkEditItemRepository

**Создать:** `services/inventory/src/repositories/BulkEditItemRepository.ts`

```typescript
import { eq, and, inArray, sql, ne } from "drizzle-orm";
import { BaseRepository } from "./BaseRepository.js";
import { bulkEditItem, type BulkEditItem, type NewBulkEditItem } from "./models/bulkEditItems.js";

export interface BulkEditItemCreateInput {
  id: string;
  jobId: string;
  productId: string;
  variantId: string | null;
  opType: string;
  opIndex: number;
  chunkIndex: number;
  params: unknown;
  fenceToken: string;
}

export class BulkEditItemRepository extends BaseRepository {
  async createMany(items: BulkEditItemCreateInput[]): Promise<void> {
    if (items.length === 0) return;
    await this.connection.insert(bulkEditItem).values(
      items.map((item) => ({
        ...item,
        projectId: this.storeId,
        status: "PENDING" as const,
        cancelRequested: false,
      } satisfies NewBulkEditItem))
    );
  }

  async findById(itemId: string): Promise<BulkEditItem | null> {
    const [item] = await this.connection
      .select()
      .from(bulkEditItem)
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.id, itemId)
        )
      );
    return item ?? null;
  }

  async findByJobId(jobId: string): Promise<BulkEditItem[]> {
    return this.connection
      .select()
      .from(bulkEditItem)
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.jobId, jobId)
        )
      )
      .orderBy(bulkEditItem.chunkIndex, bulkEditItem.opIndex);
  }

  /**
   * Supersede active items for products in new job
   */
  async supersedeActiveItems(
    productIds: string[],
    newJobId: string
  ): Promise<void> {
    if (productIds.length === 0) return;

    const now = new Date().toISOString();
    await this.connection
      .update(bulkEditItem)
      .set({
        status: "SUPERSEDED",
        cancelRequested: true,
        cancelReason: "SUPERSEDED",
        supersededByJobId: newJobId,
        finishedAt: sql`COALESCE(finished_at, ${now})`,
      })
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          inArray(bulkEditItem.productId, productIds),
          inArray(bulkEditItem.status, ["PENDING", "RUNNING"]),
          ne(bulkEditItem.jobId, newJobId)
        )
      );
  }

  /**
   * Guarded update: PENDING → RUNNING (only if not cancel_requested)
   */
  async tryMarkRunning(itemId: string): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.connection
      .update(bulkEditItem)
      .set({
        status: "RUNNING",
        startedAt: sql`COALESCE(started_at, ${now})`,
      })
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.id, itemId),
          eq(bulkEditItem.status, "PENDING"),
          eq(bulkEditItem.cancelRequested, false)
        )
      );
    return result.rowCount ?? 0;
  }

  /**
   * Guarded update: RUNNING → SUCCEEDED
   */
  async tryMarkSucceeded(itemId: string): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.connection
      .update(bulkEditItem)
      .set({
        status: "SUCCEEDED",
        finishedAt: now,
        errors: null,
      })
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.id, itemId),
          eq(bulkEditItem.status, "RUNNING")
        )
      );
    return result.rowCount ?? 0;
  }

  /**
   * Guarded update: RUNNING → FAILED
   */
  async tryMarkFailed(itemId: string, errors: unknown[]): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.connection
      .update(bulkEditItem)
      .set({
        status: "FAILED",
        finishedAt: now,
        errors,
      })
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.id, itemId),
          eq(bulkEditItem.status, "RUNNING")
        )
      );
    return result.rowCount ?? 0;
  }

  /**
   * Finalize step 1: PENDING + cancel_requested → CANCELLED, reason=USER
   * Используется для items, которые были явно отменены пользователем
   */
  async cancelUserRequestedItems(jobId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.connection
      .update(bulkEditItem)
      .set({
        status: "CANCELLED",
        cancelReason: "USER",
        finishedAt: now,
      })
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.jobId, jobId),
          eq(bulkEditItem.status, "PENDING"),
          eq(bulkEditItem.cancelRequested, true)
        )
      );
  }

  /**
   * Finalize step 2: remaining PENDING items → CANCELLED
   * reason зависит от статуса job (USER если job CANCELLED, иначе SYSTEM)
   */
  async cancelRemainingPendingItems(jobId: string, reason: "USER" | "SYSTEM"): Promise<void> {
    const now = new Date().toISOString();
    await this.connection
      .update(bulkEditItem)
      .set({
        status: "CANCELLED",
        cancelReason: reason,
        finishedAt: now,
      })
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.jobId, jobId),
          eq(bulkEditItem.status, "PENDING")
        )
      );
  }

  /**
   * Set cancel_requested flag on PENDING items for entire job
   */
  async requestCancelForJob(jobId: string): Promise<void> {
    await this.connection
      .update(bulkEditItem)
      .set({
        cancelRequested: true,
        cancelReason: "USER",
      })
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.jobId, jobId),
          eq(bulkEditItem.status, "PENDING")
        )
      );
  }

  /**
   * Set cancel_requested flag on PENDING items for specific products
   */
  async requestCancelForProducts(jobId: string, productIds: string[]): Promise<void> {
    if (productIds.length === 0) return;

    await this.connection
      .update(bulkEditItem)
      .set({
        cancelRequested: true,
        cancelReason: "USER",
      })
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.jobId, jobId),
          inArray(bulkEditItem.productId, productIds),
          eq(bulkEditItem.status, "PENDING")
        )
      );
  }

  /**
   * Count items by status for progress
   */
  async countByStatus(jobId: string): Promise<Record<string, number>> {
    const rows = await this.connection
      .select({
        status: bulkEditItem.status,
        count: sql<number>`count(*)::int`,
      })
      .from(bulkEditItem)
      .where(
        and(
          eq(bulkEditItem.projectId, this.storeId),
          eq(bulkEditItem.jobId, jobId)
        )
      )
      .groupBy(bulkEditItem.status);

    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.count;
    }
    return result;
  }
}

// Экспорт типов
export type { BulkEditItem, NewBulkEditItem } from "./models/bulkEditItems.js";
```

### 2.3 BulkFenceRepository

**Создать:** `services/inventory/src/repositories/BulkFenceRepository.ts`

```typescript
import { BaseRepository } from "./BaseRepository.js";
import { productBulkFence, type NewProductBulkFence } from "./models/productBulkFence.js";

export class BulkFenceRepository extends BaseRepository {
  /**
   * Upsert fence for product (sorted by productId to prevent deadlocks)
   */
  async upsertFences(
    fences: Array<{ productId: string; fenceToken: string; jobId: string }>
  ): Promise<void> {
    if (fences.length === 0) return;

    const now = new Date().toISOString();

    // Sort by productId to prevent deadlocks
    const sorted = [...fences].sort((a, b) => a.productId.localeCompare(b.productId));

    for (const fence of sorted) {
      await this.connection
        .insert(productBulkFence)
        .values({
          projectId: this.storeId,
          productId: fence.productId,
          fenceToken: fence.fenceToken,
          jobId: fence.jobId,
          updatedAt: now,
        } satisfies NewProductBulkFence)
        .onConflictDoUpdate({
          target: [productBulkFence.projectId, productBulkFence.productId],
          set: {
            fenceToken: fence.fenceToken,
            jobId: fence.jobId,
            updatedAt: now,
          },
        });
    }
  }
}
```

### 2.4 Интеграция в Repository

**Редактировать:** `services/inventory/src/repositories/Repository.ts`

```typescript
// Добавить импорты
import { BulkEditJobRepository } from "./BulkEditJobRepository.js";
import { BulkEditItemRepository } from "./BulkEditItemRepository.js";
import { BulkFenceRepository } from "./BulkFenceRepository.js";

export class Repository {
  // ... existing repositories
  public readonly product: ProductRepository;
  public readonly variant: VariantRepository;
  // ...

  // Добавить новые репозитории
  public readonly bulkEditJob: BulkEditJobRepository;
  public readonly bulkEditItem: BulkEditItemRepository;
  public readonly bulkFence: BulkFenceRepository;

  public readonly txManager: TransactionManager<Database>;

  static async create(config: RepositoryConfig): Promise<Repository> {
    const { db } = config;
    const txManager = new TransactionManager(db);

    // ... existing repositories
    const product = new ProductRepository(db, txManager);
    const variant = new VariantRepository(db, txManager);
    // ...

    // Добавить новые репозитории
    const bulkEditJob = new BulkEditJobRepository(db, txManager);
    const bulkEditItem = new BulkEditItemRepository(db, txManager);
    const bulkFence = new BulkFenceRepository(db, txManager);

    return new Repository(
      product,
      variant,
      // ... existing,
      bulkEditJob,
      bulkEditItem,
      bulkFence,
      txManager
    );
  }
}
```

---

## Фаза 3: Scripts

### 3.1 BulkEditCreateJobScript

**Создать:** `services/inventory/src/scripts/bulk-edit/BulkEditCreateJobScript.ts`

```typescript
import { v7 as uuidv7 } from "uuid";
import { BaseScript, type UserError, Transactional } from "../../kernel/BaseScript.js";
import type { BulkEditItem } from "../../repositories/models/index.js";

export interface FlatOperation {
  productId: string;
  variantId: string | null;
  opType: string;
  opIndex: number;
  params: unknown;
}

export interface BulkEditCreateJobParams {
  readonly operations: FlatOperation[];
}

export interface BulkEditCreateJobResult {
  jobId?: string;
  items?: BulkEditItem[];
  userErrors: UserError[];
}

export class BulkEditCreateJobScript extends BaseScript<
  BulkEditCreateJobParams,
  BulkEditCreateJobResult
> {
  @Transactional()
  protected async execute(params: BulkEditCreateJobParams): Promise<BulkEditCreateJobResult> {
    const { operations } = params;
    const projectId = this.getProjectId();

    if (operations.length === 0) {
      return {
        userErrors: [{ message: "At least one operation required", code: "EMPTY_INPUT" }],
      };
    }

    if (operations.length > 500) {
      return {
        userErrors: [{ message: "Total operations exceed limit of 500", code: "BATCH_LIMIT_EXCEEDED" }],
      };
    }

    const jobId = uuidv7();

    // 1. Create job
    await this.repository.bulkEditJob.create({ id: jobId });

    // 2. Collect unique productIds
    const productIds = [...new Set(operations.map((op) => op.productId))];

    // 3. Generate fence tokens (one per product)
    const fenceTokens = new Map<string, string>();
    for (const productId of productIds) {
      fenceTokens.set(productId, uuidv7());
    }

    // 4. Upsert fences (sorted to prevent deadlocks)
    await this.repository.bulkFence.upsertFences(
      productIds.map((productId) => ({
        productId,
        fenceToken: fenceTokens.get(productId)!,
        jobId,
      }))
    );

    // 5. Supersede active items for these products
    await this.repository.bulkEditItem.supersedeActiveItems(productIds, jobId);

    // 6. Create items with chunk assignment
    // chunkIndex = opIndex означает что операции одного типа (opIndex)
    // для разных продуктов выполняются параллельно
    const itemInputs = operations.map((op) => ({
      id: uuidv7(),
      jobId,
      productId: op.productId,
      variantId: op.variantId,
      opType: op.opType,
      opIndex: op.opIndex,
      chunkIndex: op.opIndex,
      params: op.params,
      fenceToken: fenceTokens.get(op.productId)!,
    }));

    await this.repository.bulkEditItem.createMany(itemInputs);

    // 7. Load created items
    const items = await this.repository.bulkEditItem.findByJobId(jobId);

    this.logger.info({ jobId, itemCount: items.length }, "Bulk edit job created");

    return { jobId, items, userErrors: [] };
  }

  protected handleError(_error: unknown): BulkEditCreateJobResult {
    return {
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
```

### 3.2 BulkEditFinalizeJobScript

**Создать:** `services/inventory/src/scripts/bulk-edit/BulkEditFinalizeJobScript.ts`

```typescript
import { BaseScript, type UserError } from "../../kernel/BaseScript.js";

export interface BulkEditFinalizeJobParams {
  readonly jobId: string;
}

export interface BulkEditFinalizeJobResult {
  success: boolean;
  userErrors: UserError[];
}

export class BulkEditFinalizeJobScript extends BaseScript<
  BulkEditFinalizeJobParams,
  BulkEditFinalizeJobResult
> {
  protected async execute(params: BulkEditFinalizeJobParams): Promise<BulkEditFinalizeJobResult> {
    const { jobId } = params;

    const job = await this.repository.bulkEditJob.findById(jobId);
    if (!job) {
      return {
        success: false,
        userErrors: [{ message: "Job not found", code: "NOT_FOUND" }],
      };
    }

    const isCancelled = job.status === "CANCELLED";

    // Step 1: PENDING + cancel_requested=true → CANCELLED, reason=USER
    await this.repository.bulkEditItem.cancelUserRequestedItems(jobId);

    // Step 2: Remaining PENDING → CANCELLED
    await this.repository.bulkEditItem.cancelRemainingPendingItems(
      jobId,
      isCancelled ? "USER" : "SYSTEM"
    );

    // Step 3: Finalize job status
    await this.repository.bulkEditJob.finalize(
      jobId,
      isCancelled ? "CANCELLED" : "COMPLETED"
    );

    this.logger.info({ jobId, status: isCancelled ? "CANCELLED" : "COMPLETED" }, "Bulk edit job finalized");

    return { success: true, userErrors: [] };
  }

  protected handleError(_error: unknown): BulkEditFinalizeJobResult {
    return {
      success: false,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
```

### 3.3 BulkEditCancelJobScript

**Создать:** `services/inventory/src/scripts/bulk-edit/BulkEditCancelJobScript.ts`

```typescript
import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { BulkEditJob } from "../../repositories/models/index.js";

export interface BulkEditCancelJobParams {
  readonly jobId: string;
}

export interface BulkEditCancelJobResult {
  job?: BulkEditJob;
  userErrors: UserError[];
}

export class BulkEditCancelJobScript extends BaseScript<
  BulkEditCancelJobParams,
  BulkEditCancelJobResult
> {
  protected async execute(params: BulkEditCancelJobParams): Promise<BulkEditCancelJobResult> {
    const { jobId } = params;

    const rows = await this.repository.bulkEditJob.markCancelled(jobId);

    if (rows === 0) {
      const job = await this.repository.bulkEditJob.findById(jobId);
      if (!job) {
        return {
          userErrors: [{ message: "Job not found", code: "NOT_FOUND" }],
        };
      }
      // Job exists but already completed/cancelled
      return {
        job,
        userErrors: [{ message: "Job already completed or cancelled", code: "INVALID_STATE" }],
      };
    }

    // Set cancel flags on PENDING items
    await this.repository.bulkEditItem.requestCancelForJob(jobId);

    const job = await this.repository.bulkEditJob.findById(jobId);

    this.logger.info({ jobId }, "Bulk edit job cancelled");

    return { job: job ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): BulkEditCancelJobResult {
    return {
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
```

### 3.4 BulkEditCancelItemsScript

**Создать:** `services/inventory/src/scripts/bulk-edit/BulkEditCancelItemsScript.ts`

```typescript
import { BaseScript, type UserError } from "../../kernel/BaseScript.js";
import type { BulkEditJob } from "../../repositories/models/index.js";

export interface BulkEditCancelItemsParams {
  readonly jobId: string;
  readonly productIds: string[];
}

export interface BulkEditCancelItemsResult {
  job?: BulkEditJob;
  userErrors: UserError[];
}

export class BulkEditCancelItemsScript extends BaseScript<
  BulkEditCancelItemsParams,
  BulkEditCancelItemsResult
> {
  protected async execute(params: BulkEditCancelItemsParams): Promise<BulkEditCancelItemsResult> {
    const { jobId, productIds } = params;

    const job = await this.repository.bulkEditJob.findById(jobId);
    if (!job) {
      return {
        userErrors: [{ message: "Job not found", code: "NOT_FOUND" }],
      };
    }

    if (productIds.length === 0) {
      return {
        job,
        userErrors: [{ message: "No product IDs provided", code: "EMPTY_INPUT" }],
      };
    }

    await this.repository.bulkEditItem.requestCancelForProducts(jobId, productIds);

    this.logger.info({ jobId, productCount: productIds.length }, "Bulk edit items cancel requested");

    return { job, userErrors: [] };
  }

  protected handleError(_error: unknown): BulkEditCancelItemsResult {
    return {
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
```

### 3.5 Index файл

**Создать:** `services/inventory/src/scripts/bulk-edit/index.ts`

```typescript
export { BulkEditCreateJobScript } from "./BulkEditCreateJobScript.js";
export type {
  BulkEditCreateJobParams,
  BulkEditCreateJobResult,
  FlatOperation,
} from "./BulkEditCreateJobScript.js";

export { BulkEditFinalizeJobScript } from "./BulkEditFinalizeJobScript.js";
export type {
  BulkEditFinalizeJobParams,
  BulkEditFinalizeJobResult,
} from "./BulkEditFinalizeJobScript.js";

export { BulkEditCancelJobScript } from "./BulkEditCancelJobScript.js";
export type {
  BulkEditCancelJobParams,
  BulkEditCancelJobResult,
} from "./BulkEditCancelJobScript.js";

export { BulkEditCancelItemsScript } from "./BulkEditCancelItemsScript.js";
export type {
  BulkEditCancelItemsParams,
  BulkEditCancelItemsResult,
} from "./BulkEditCancelItemsScript.js";
```

> **Примечание:** Скрипты используют `this.getProjectId()` для получения projectId из контекста. Все репозитории автоматически получают `storeId` из AsyncLocalStorage.

---

## Фаза 4: Workflows

### 4.1 DTO

**Создать:** `services/inventory/src/workflows/dto/BulkEditWorkflowDto.ts`

```typescript
/**
 * Input для root workflow — получает плоские операции от resolver'а
 * projectId берётся из контекста внутри скрипта (через this.getProjectId())
 */
export interface ProductBulkEditInput {
  operations: FlatOperation[];
}

/**
 * Плоская операция — одна строка в bulk_edit_items
 */
export interface FlatOperation {
  productId: string;
  variantId: string | null;
  opType: string;
  opIndex: number;
  params: unknown;
}

/**
 * Результат root workflow
 */
export interface ProductBulkEditResult {
  jobId: string;
}

/**
 * Input для child workflow — только itemId, всё остальное из БД
 */
export interface OperationWorkflowInput {
  itemId: string;
}

/**
 * Результат child workflow — успех/ошибки
 */
export interface OperationResult {
  applied: boolean;
  errors: BulkEditError[];
}

/**
 * Ошибка операции
 */
export interface BulkEditError {
  message: string;
  code: string;
  field?: string[];
}
```

> **Примечание:** Тип `BulkEditItem` для работы с items берётся из `BulkEditItemRepository.ts` (`type BulkEditItem = typeof bulkEditItem.$inferSelect`).

### 4.2 ProductBulkEditWorkflow (Root)

**Создать:** `services/inventory/src/workflows/ProductBulkEditWorkflow.ts`

```typescript
import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { DBOS } from "@dbos-inc/dbos-sdk";
import { Kernel } from "../kernel/Kernel.js";
import type {
  ProductBulkEditInput,
  ProductBulkEditResult,
  FlatOperation,
  BulkEditError,
} from "./dto/BulkEditWorkflowDto.js";
import type { BulkEditItem } from "../repositories/models/index.js";
import { BulkEditCreateJobScript } from "../scripts/bulk-edit/index.js";
import { BulkEditFinalizeJobScript } from "../scripts/bulk-edit/index.js";

@Injectable()
export class ProductBulkEditWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  // ═══════════════════════════════════════════════════════════
  //  Entry point
  // ═══════════════════════════════════════════════════════════

  @Workflow("productBulkEdit")
  async run(input: ProductBulkEditInput): Promise<ProductBulkEditResult> {
    const { operations } = input;

    // 1. Create job (atomic, idempotent via DBOS)
    const { jobId, chunks } = await this.stepCreateJob(operations);

    // 2. Try QUEUED → RUNNING (guarded)
    const started = await this.stepTryMarkJobRunning(jobId);
    if (!started) {
      // Job already CANCELLED
      await this.stepFinalizeJob(jobId);
      return { jobId };
    }

    // 3. Execute chunks
    await this.executeChunks(jobId, chunks);
    await this.stepFinalizeJob(jobId);

    return { jobId };
  }

  // ═══════════════════════════════════════════════════════════
  //  Chunk execution
  // ═══════════════════════════════════════════════════════════

  private async executeChunks(
    jobId: string,
    chunks: BulkEditItem[][]
  ): Promise<void> {
    for (const chunk of chunks) {
      const cancelled = await this.stepIsJobCancelled(jobId);
      if (cancelled) break;

      await Promise.allSettled(chunk.map((item) => this.executeItem(item)));
    }
  }

  private async executeItem(item: BulkEditItem): Promise<void> {
    // 1. Try PENDING → RUNNING (guarded)
    const started = await this.stepTryMarkItemRunning(item.id);
    if (!started) return; // SUPERSEDED or cancel_requested

    // 2. Run child workflow
    try {
      const result = await this.runOperationWorkflow(item);

      // 3. Record result (guarded — won't overwrite SUPERSEDED)
      if (result.errors.length > 0) {
        await this.stepTryMarkItemFailed(item.id, result.errors);
      } else {
        await this.stepTryMarkItemSucceeded(item.id);
      }
    } catch (error) {
      // Child threw — mark FAILED to prevent stuck RUNNING
      await this.stepTryMarkItemFailed(item.id, [
        {
          message: error instanceof Error ? error.message : "Unknown error",
          code: "WORKFLOW_ERROR",
        },
      ]);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  Child workflow
  // ═══════════════════════════════════════════════════════════

  private async runOperationWorkflow(
    item: BulkEditItem
  ): Promise<{ errors: BulkEditError[] }> {
    const result = await this.broker.runWorkflow(
      "inventory.bulkEditOperation",
      { itemId: item.id },
      {
        source: "workflow",
        workflowId: DBOS.workflowID!,
        stepId: item.opType,
        callId: item.id,
      }
    );

    return result as { errors: BulkEditError[] };
  }

  // ═══════════════════════════════════════════════════════════
  //  Steps
  // ═══════════════════════════════════════════════════════════

  @WorkflowStep()
  private async stepCreateJob(
    operations: FlatOperation[]
  ): Promise<{ jobId: string; chunks: BulkEditItem[][] }> {
    const result = await this.kernel.runScript(BulkEditCreateJobScript, { operations });

    if (result.userErrors.length > 0 || !result.jobId || !result.items) {
      throw new Error(result.userErrors[0]?.message ?? "Failed to create job");
    }

    return {
      jobId: result.jobId,
      chunks: groupByChunkIndex(result.items),
    };
  }

  @WorkflowStep()
  private async stepTryMarkJobRunning(jobId: string): Promise<boolean> {
    const rows = await this.kernel.repository.bulkEditJob.tryMarkRunning(jobId);
    return rows > 0;
  }

  @WorkflowStep()
  private async stepIsJobCancelled(jobId: string): Promise<boolean> {
    const job = await this.kernel.repository.bulkEditJob.findById(jobId);
    return job?.status === "CANCELLED";
  }

  @WorkflowStep()
  private async stepTryMarkItemRunning(itemId: string): Promise<boolean> {
    const rows = await this.kernel.repository.bulkEditItem.tryMarkRunning(itemId);
    return rows > 0;
  }

  @WorkflowStep()
  private async stepTryMarkItemSucceeded(itemId: string): Promise<void> {
    await this.kernel.repository.bulkEditItem.tryMarkSucceeded(itemId);
  }

  @WorkflowStep()
  private async stepTryMarkItemFailed(
    itemId: string,
    errors: BulkEditError[]
  ): Promise<void> {
    await this.kernel.repository.bulkEditItem.tryMarkFailed(itemId, errors);
  }

  @WorkflowStep()
  private async stepFinalizeJob(jobId: string): Promise<void> {
    await this.kernel.runScript(BulkEditFinalizeJobScript, { jobId });
  }
}

// ─── Utility ──────────────────────────────────────────────────

function groupByChunkIndex(items: BulkEditItem[]): BulkEditItem[][] {
  const map = new Map<number, BulkEditItem[]>();
  for (const item of items) {
    const list = map.get(item.chunkIndex) ?? [];
    list.push(item);
    map.set(item.chunkIndex, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([, items]) => items);
}
```

### 4.3 BulkEditOperationWorkflow (Child)

**Создать:** `services/inventory/src/workflows/BulkEditOperationWorkflow.ts`

```typescript
import { Injectable } from "@nestjs/common";
import {
  BrokerWorkflows,
  Workflow,
  WorkflowStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type {
  OperationWorkflowInput,
  OperationResult,
  BulkEditError,
} from "./dto/BulkEditWorkflowDto.js";
import type { BulkEditItem } from "../repositories/BulkEditItemRepository.js";

// Script imports — используем существующие скрипты
import { ProductUpdateScript } from "../scripts/product/ProductUpdateScript.js";
import { ProductPublishScript } from "../scripts/product/ProductPublishScript.js";
import { ProductUnpublishScript } from "../scripts/product/ProductUnpublishScript.js";
import { VariantSetSkuScript } from "../scripts/variant/VariantSetSkuScript.js";
import { VariantSetPricingScript } from "../scripts/variant/VariantSetPricingScript.js";
import { VariantSetCostScript } from "../scripts/variant/VariantSetCostScript.js";
import { VariantSetStockScript } from "../scripts/variant/VariantSetStockScript.js";
import { VariantSetDimensionsScript } from "../scripts/variant/VariantSetDimensionsScript.js";
import { VariantSetWeightScript } from "../scripts/variant/VariantSetWeightScript.js";

@Injectable()
export class BulkEditOperationWorkflow extends BrokerWorkflows {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Workflow("bulkEditOperation")
  async run(input: OperationWorkflowInput): Promise<OperationResult> {
    const { itemId } = input;

    // 1. Load item from DB
    const item = await this.stepLoadItem(itemId);
    if (!item) {
      return { applied: false, errors: [{ message: "Item not found", code: "NOT_FOUND" }] };
    }

    // 2. Execute operation
    const result = await this.stepRunOperation(item);

    return result;
  }

  @WorkflowStep()
  private async stepLoadItem(itemId: string): Promise<BulkEditItem | null> {
    // Используем findById вместо findByJobId
    return this.kernel.repository.bulkEditItem.findById(itemId);
  }

  @WorkflowStep()
  private async stepRunOperation(item: BulkEditItem): Promise<OperationResult> {
    const { opType, params } = item;
    const errors: BulkEditError[] = [];

    try {
      switch (opType) {
        case "productUpdate": {
          const result = await this.kernel.runScript(ProductUpdateScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        // productStatusUpdate: используем отдельные скрипты ProductPublishScript/ProductUnpublishScript
        case "productStatusUpdate": {
          const p = params as { productId: string; action: "PUBLISH" | "UNPUBLISH" };
          if (p.action === "PUBLISH") {
            const result = await this.kernel.runScript(ProductPublishScript, { id: p.productId });
            if (result.userErrors.length > 0) {
              errors.push(...result.userErrors.map(toError));
            }
          } else {
            const result = await this.kernel.runScript(ProductUnpublishScript, { id: p.productId });
            if (result.userErrors.length > 0) {
              errors.push(...result.userErrors.map(toError));
            }
          }
          break;
        }

        case "variantSetSku": {
          const result = await this.kernel.runScript(VariantSetSkuScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantSetPricing": {
          const result = await this.kernel.runScript(VariantSetPricingScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantSetCost": {
          const result = await this.kernel.runScript(VariantSetCostScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantSetStock": {
          const result = await this.kernel.runScript(VariantSetStockScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantSetDimensions": {
          const result = await this.kernel.runScript(VariantSetDimensionsScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        case "variantSetWeight": {
          const result = await this.kernel.runScript(VariantSetWeightScript, params as any);
          if (result.userErrors.length > 0) {
            errors.push(...result.userErrors.map(toError));
          }
          break;
        }

        default:
          errors.push({ message: `Unknown operation type: ${opType}`, code: "INVALID_OP_TYPE" });
      }
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : "Unknown error",
        code: "SCRIPT_ERROR",
      });
    }

    return { applied: errors.length === 0, errors };
  }
}

function toError(userError: { message: string; code?: string; field?: string[] }): BulkEditError {
  return {
    message: userError.message,
    code: userError.code ?? "UNKNOWN",
    field: userError.field,
  };
}
```

### 4.4 Регистрация workflows

**Редактировать:** `services/inventory/src/workflows/index.ts`

```typescript
export { ProductBulkEditWorkflow } from "./ProductBulkEditWorkflow.js";
export { BulkEditOperationWorkflow } from "./BulkEditOperationWorkflow.js";
```

---

## Фаза 5: GraphQL API

### 5.1 Schema

**Создать:** `services/inventory/src/api/graphql-admin/schema/bulk.graphql`

```graphql
# ════════════════════════════════════════════════════════════
#  Enums
# ════════════════════════════════════════════════════════════

enum BulkUpdateJobStatus {
  QUEUED
  RUNNING
  COMPLETED
  CANCELLED
}

enum BulkUpdateItemStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
  CANCELLED
  SUPERSEDED
}

enum BulkUpdateOpType {
  PRODUCT_UPDATE
  PRODUCT_STATUS_UPDATE
  VARIANT_SET_SKU
  VARIANT_SET_PRICING
  VARIANT_SET_COST
  VARIANT_SET_STOCK
  VARIANT_SET_DIMENSIONS
  VARIANT_SET_WEIGHT
}

enum ProductStatusAction {
  PUBLISH
  UNPUBLISH
}

enum BulkUpdateCancelReason {
  USER
  SUPERSEDED
  SYSTEM
}

# ════════════════════════════════════════════════════════════
#  Input Types
# ════════════════════════════════════════════════════════════

"""
Bulk update input. Max 500 operations total.
Each array = one operation type. No grouping by product needed.
"""
input ProductBulkUpdateInput {
  """Update product fields. Reuses ProductUpdateInput (id = productId)."""
  productUpdate: [ProductUpdateInput!]

  """Change product publish status."""
  productStatusUpdate: [ProductStatusUpdateInput!]

  """Set variant SKU. Reuses VariantSetSkuInput."""
  variantSetSku: [VariantSetSkuInput!]

  """Set variant pricing. Reuses VariantSetPricingInput."""
  variantSetPricing: [VariantSetPricingInput!]

  """Set variant cost. Reuses VariantSetCostInput."""
  variantSetCost: [VariantSetCostInput!]

  """Set variant stock. Reuses VariantSetStockInput."""
  variantSetStock: [VariantSetStockInput!]

  """Set variant dimensions. Reuses VariantSetDimensionsInput."""
  variantSetDimensions: [VariantSetDimensionsInput!]

  """Set variant weight. Reuses VariantSetWeightInput."""
  variantSetWeight: [VariantSetWeightInput!]
}

"""
Product status change (publish/unpublish).
Only new input type for bulk (2 fields).
"""
input ProductStatusUpdateInput {
  """Product ID."""
  productId: ID!

  """Action: PUBLISH or UNPUBLISH."""
  action: ProductStatusAction!
}

# ════════════════════════════════════════════════════════════
#  Payload Types
# ════════════════════════════════════════════════════════════

"""
Result of bulk update start/cancel.
"""
type ProductBulkUpdatePayload {
  """Created or updated job (null on validation error)."""
  job: ProductBulkUpdateJob

  """Validation/execution errors."""
  userErrors: [BulkUpdateUserError!]!
}

# ════════════════════════════════════════════════════════════
#  Job & Progress Types
# ════════════════════════════════════════════════════════════

"""
Bulk update job with progress.
"""
type ProductBulkUpdateJob {
  """Job ID."""
  id: ID!

  """Current status."""
  status: BulkUpdateJobStatus!

  """When created."""
  createdAt: DateTime!

  """When started running."""
  startedAt: DateTime

  """When finished."""
  finishedAt: DateTime

  """Total products in batch."""
  totalProducts: Int!

  """Progress computed from items."""
  progress: BulkUpdateJobProgress!

  """Items with pagination and filtering."""
  items(
    first: Int
    after: String
    statusFilter: [BulkUpdateItemStatus!]
  ): BulkUpdateItemConnection!
}

"""
Job progress. All counters computed from items.
"""
type BulkUpdateJobProgress {
  """Total operations."""
  total: Int!

  """Done (succeeded + failed + cancelled + superseded)."""
  done: Int!

  """Successfully applied."""
  succeeded: Int!

  """Failed."""
  failed: Int!

  """Cancelled."""
  cancelled: Int!

  """Superseded by another job."""
  superseded: Int!

  """Currently running."""
  running: Int!

  """Pending execution."""
  pending: Int!
}

# ════════════════════════════════════════════════════════════
#  Item Types
# ════════════════════════════════════════════════════════════

"""
Single operation in bulk update job.
"""
type BulkUpdateItem {
  """Item ID."""
  id: ID!

  """Product ID."""
  productId: ID!

  """Variant ID (null for product-level operations)."""
  variantId: ID

  """Operation type."""
  opType: BulkUpdateOpType!

  """Order within product."""
  opIndex: Int!

  """Current status."""
  status: BulkUpdateItemStatus!

  """When started."""
  startedAt: DateTime

  """When finished."""
  finishedAt: DateTime

  """Execution errors."""
  errors: [BulkUpdateUserError!]!

  """Cancel reason (only for CANCELLED/SUPERSEDED)."""
  cancelReason: BulkUpdateCancelReason

  """Job that superseded this item."""
  supersededByJobId: ID
}

type BulkUpdateItemConnection {
  edges: [BulkUpdateItemEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type BulkUpdateItemEdge {
  cursor: String!
  node: BulkUpdateItem!
}

# ════════════════════════════════════════════════════════════
#  Error Type
# ════════════════════════════════════════════════════════════

"""
Bulk update error with operation context.
"""
type BulkUpdateUserError implements UserError {
  """Error message."""
  message: String!

  """Input field path."""
  field: [String!]

  """Error code."""
  code: String

  """Product ID."""
  productId: ID

  """Variant ID."""
  variantId: ID

  """Operation that failed."""
  operation: String
}
```

### 5.2 Mutations

**Редактировать:** `services/inventory/src/api/graphql-admin/schema/base.graphql`

Добавить в `type InventoryMutation`:

```graphql
type InventoryMutation {
  # ... existing mutations ...

  # ─── Bulk Update ──────────────────────────────────────────

  """
  Start async bulk update.
  Requires X-Idempotency-Key header.
  """
  productBulkUpdate(input: ProductBulkUpdateInput!): ProductBulkUpdatePayload!

  """
  Cancel entire bulk job.
  """
  productBulkUpdateCancel(jobId: ID!): ProductBulkUpdatePayload!

  """
  Cancel specific products in job.
  """
  productBulkUpdateCancelItems(
    jobId: ID!
    productIds: [ID!]!
  ): ProductBulkUpdatePayload!
}
```

Добавить в `type InventoryQuery`:

```graphql
type InventoryQuery {
  # ... existing queries ...

  """
  Get bulk update job by ID.
  """
  productBulkUpdateJob(jobId: ID!): ProductBulkUpdateJob
}
```

---

## Фаза 6: Resolver

### 6.1 Validation Schema

**Создать:** `services/inventory/src/resolvers/admin/validation/productBulkEditSchema.ts`

```typescript
import { z } from "zod";
// Zod-схемы автогенерируются из GraphQL - импортируем из generated/schemas.js
import {
  ProductUpdateInputSchema,
  VariantSetSkuInputSchema,
  VariantSetPricingInputSchema,
  VariantSetCostInputSchema,
  VariantSetStockInputSchema,
  VariantSetDimensionsInputSchema,
  VariantSetWeightInputSchema,
} from "../generated/schemas.js";

const productStatusUpdateSchema = z.object({
  productId: z.string().min(1),
  action: z.enum(["PUBLISH", "UNPUBLISH"]),
});

export const ProductBulkUpdateInputSchema = () =>
  z
    .object({
      productUpdate: z.array(ProductUpdateInputSchema()).optional(),
      productStatusUpdate: z.array(productStatusUpdateSchema).optional(),
      variantSetSku: z.array(VariantSetSkuInputSchema()).optional(),
      variantSetPricing: z.array(VariantSetPricingInputSchema()).optional(),
      variantSetCost: z.array(VariantSetCostInputSchema()).optional(),
      variantSetStock: z.array(VariantSetStockInputSchema()).optional(),
      variantSetDimensions: z.array(VariantSetDimensionsInputSchema()).optional(),
      variantSetWeight: z.array(VariantSetWeightInputSchema()).optional(),
    })
    .refine((input) => countTotalOps(input) >= 1, {
      message: "At least one operation required",
      params: { code: "EMPTY_INPUT" },
    })
    .refine((input) => countTotalOps(input) <= 500, {
      message: "Total operations exceed limit of 500",
      params: { code: "BATCH_LIMIT_EXCEEDED" },
    });

function countTotalOps(input: Record<string, unknown[] | undefined>): number {
  return Object.values(input).reduce(
    (sum, arr) => sum + (arr?.length ?? 0),
    0
  );
}
```

### 6.2 Mutation Resolver

**Редактировать:** `services/inventory/src/resolvers/admin/MutationResolver.ts`

```typescript
import { ProductBulkUpdateInputSchema } from "./validation/productBulkEditSchema.js";
import type { FlatOperation } from "../../workflows/dto/BulkEditWorkflowDto.js";
import { ProductBulkUpdateJobResolver } from "./ProductBulkUpdateJobResolver.js";
import {
  BulkEditCancelJobScript,
  BulkEditCancelItemsScript,
} from "../../scripts/bulk-edit/index.js";

// Добавить в InventoryMutationResolver class:

@ZodResolver(ProductBulkUpdateInputSchema())
async productBulkUpdate(args: { input: ProductBulkUpdateInput }) {
  const { input } = args;

  // 1. Collect variant IDs for product resolution
  const variantIds = collectVariantIds(input);

  // 2. Batch resolve productId for variant operations
  // Используем существующий getByIds и извлекаем productId
  const variants = await this.$ctx.kernel.repository.variant.getByIds(variantIds);
  const variantToProduct = new Map(variants.map(v => [v.id, v.productId]));

  // 3. Flatten input to operations
  const operations = flattenBulkInput(input, variantToProduct);

  // 4. Get idempotency key from request headers (добавить в context middleware)
  // Если idempotencyKey не указан, генерируем на основе requestId
  const idempotencyKey = this.$ctx.requestId;

  // 5. Run workflow via broker
  // projectId берётся из контекста внутри скрипта/workflow
  const result = await this.$ctx.kernel.services.broker.runWorkflow(
    "inventory.productBulkEdit",
    { operations },
    {
      source: "client",
      clientKey: idempotencyKey,
      tenantId: this.$ctx.store.id,
    }
  ) as { jobId: string };

  // 6. Load job for response
  const job = await this.$ctx.kernel.repository.bulkEditJob.findById(result.jobId);

  return {
    job: job ? new ProductBulkUpdateJobResolver(job, this.$ctx) : null,
    userErrors: [],
  };
}

async productBulkUpdateCancel(args: { jobId: string }) {
  const result = await this.$ctx.kernel.runScript(BulkEditCancelJobScript, {
    jobId: args.jobId,
  });

  return {
    job: result.job ? new ProductBulkUpdateJobResolver(result.job, this.$ctx) : null,
    userErrors: result.userErrors,
  };
}

async productBulkUpdateCancelItems(args: { jobId: string; productIds: string[] }) {
  const result = await this.$ctx.kernel.runScript(BulkEditCancelItemsScript, {
    jobId: args.jobId,
    productIds: args.productIds,
  });

  return {
    job: result.job ? new ProductBulkUpdateJobResolver(result.job, this.$ctx) : null,
    userErrors: result.userErrors,
  };
}

// ─── Helpers ──────────────────────────────────────────────────

const OP_INDEX: Record<string, number> = {
  productUpdate: 0,
  productStatusUpdate: 1,
  variantSetSku: 2,
  variantSetPricing: 3,
  variantSetCost: 4,
  variantSetStock: 5,
  variantSetDimensions: 6,
  variantSetWeight: 7,
};

function collectVariantIds(input: ProductBulkUpdateInput): string[] {
  const ids: string[] = [];
  for (const v of input.variantSetSku ?? []) ids.push(v.variantId);
  for (const v of input.variantSetPricing ?? []) ids.push(v.variantId);
  for (const v of input.variantSetCost ?? []) ids.push(v.variantId);
  for (const v of input.variantSetStock ?? []) ids.push(v.variantId);
  for (const v of input.variantSetDimensions ?? []) ids.push(v.variantId);
  for (const v of input.variantSetWeight ?? []) ids.push(v.variantId);
  return [...new Set(ids)];
}

function flattenBulkInput(
  input: ProductBulkUpdateInput,
  variantToProduct: Map<string, string>
): FlatOperation[] {
  const ops: FlatOperation[] = [];

  // Product operations
  for (const pu of input.productUpdate ?? []) {
    ops.push({
      productId: pu.id,
      variantId: null,
      opType: "productUpdate",
      opIndex: OP_INDEX.productUpdate,
      params: pu,
    });
  }

  // productStatusUpdate — единый opType, action в params (как в архитектуре)
  for (const ps of input.productStatusUpdate ?? []) {
    ops.push({
      productId: ps.productId,
      variantId: null,
      opType: "productStatusUpdate",
      opIndex: OP_INDEX.productStatusUpdate,
      params: { productId: ps.productId, action: ps.action },
    });
  }

  // Variant operations
  const variantArrays = [
    { key: "variantSetSku", items: input.variantSetSku },
    { key: "variantSetPricing", items: input.variantSetPricing },
    { key: "variantSetCost", items: input.variantSetCost },
    { key: "variantSetStock", items: input.variantSetStock },
    { key: "variantSetDimensions", items: input.variantSetDimensions },
    { key: "variantSetWeight", items: input.variantSetWeight },
  ];

  for (const { key, items } of variantArrays) {
    for (const vi of items ?? []) {
      const productId = variantToProduct.get(vi.variantId);
      if (!productId) {
        // Variant not found — skip or throw, handled in validation
        continue;
      }
      ops.push({
        productId,
        variantId: vi.variantId,
        opType: key,
        opIndex: OP_INDEX[key],
        params: vi,
      });
    }
  }

  return ops;
}
```

> **Примечание по idempotencyKey:** В текущей реализации inventory сервиса `idempotencyKey` не поддерживается в контексте. Используется `requestId` как fallback. Для полной поддержки идемпотентности нужно:
> 1. Добавить парсинг `X-Idempotency-Key` header в context middleware
> 2. Добавить поле `idempotencyKey?: string` в `ServiceContext`

---

## Фаза 7: Тесты

### 7.1 E2E тесты

**Создать:** `e2e/tests/inventory-api/product-bulk-edit.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Product Bulk Edit API", () => {
  test("should create bulk edit job", async ({ request }) => {
    const response = await request.post("/graphql", {
      headers: {
        "X-Idempotency-Key": `test-${Date.now()}`,
      },
      data: {
        query: `
          mutation ProductBulkUpdate($input: ProductBulkUpdateInput!) {
            inventoryMutation {
              productBulkUpdate(input: $input) {
                job {
                  id
                  status
                  progress { total pending }
                }
                userErrors { message code }
              }
            }
          }
        `,
        variables: {
          input: {
            productUpdate: [
              { id: "product_1", title: "Updated Title" },
            ],
          },
        },
      },
    });

    const json = await response.json();
    expect(json.data.inventoryMutation.productBulkUpdate.job).toBeTruthy();
    expect(json.data.inventoryMutation.productBulkUpdate.userErrors).toHaveLength(0);
  });

  test("should cancel bulk edit job", async ({ request }) => {
    // Create job first
    // ... then cancel
  });

  test("should reject empty input", async ({ request }) => {
    // Test validation
  });

  test("should reject >500 operations", async ({ request }) => {
    // Test limit
  });
});
```

---

## Чеклист

### Фаза 1: База данных
- [ ] `repositories/models/bulkEditJobs.ts` — Drizzle schema + enum + types
- [ ] `repositories/models/bulkEditItems.ts` — Drizzle schema + enums + types
- [ ] `repositories/models/productBulkFence.ts` — Drizzle schema + types
- [ ] Обновить `repositories/models/index.ts` — экспорты
- [ ] `pnpm db:generate` — генерация миграций

### Фаза 2: Repositories
- [ ] `BulkEditJobRepository.ts` — CRUD + guarded updates
- [ ] `BulkEditItemRepository.ts` — CRUD + findById + guarded updates + countByStatus
- [ ] `BulkFenceRepository.ts` — upsertFences
- [ ] Интеграция всех репозиториев в `Repository.ts`

> **Примечание:** Для резолва productId по variantId используется существующий `VariantRepository.getByIds()`

### Фаза 3: Scripts
- [ ] `scripts/bulk-edit/BulkEditCreateJobScript.ts` — создание job + items + fences + supersede
- [ ] `scripts/bulk-edit/BulkEditFinalizeJobScript.ts` — финализация job
- [ ] `scripts/bulk-edit/BulkEditCancelJobScript.ts` — отмена job
- [ ] `scripts/bulk-edit/BulkEditCancelItemsScript.ts` — отмена items по productIds
- [ ] `scripts/bulk-edit/index.ts` — экспорты

### Фаза 4: Workflows
- [ ] `dto/BulkEditWorkflowDto.ts` — типы для workflow
- [ ] `ProductBulkEditWorkflow.ts` — root workflow с fan-out
- [ ] `BulkEditOperationWorkflow.ts` — child workflow для операций
- [ ] Регистрация в `workflows/index.ts`

### Фаза 5: GraphQL
- [ ] `bulk.graphql` — enums, input types, payload types, job/item types
- [ ] Обновить `base.graphql` — добавить mutations/queries в InventoryMutation/InventoryQuery

### Фаза 6: Resolver
- [ ] `validation/productBulkEditSchema.ts` — Zod validation
- [ ] `ProductBulkUpdateJobResolver.ts` — resolver для Job типа
- [ ] Обновить `MutationResolver.ts` — productBulkUpdate, productBulkUpdateCancel, productBulkUpdateCancelItems
- [ ] Обновить `QueryResolver.ts` — productBulkUpdateJob

### Фаза 7: Тесты
- [ ] `e2e/tests/inventory-api/product-bulk-edit.spec.ts`
- [ ] Тест создания job
- [ ] Тест supersede (новый job перебивает старый)
- [ ] Тест cancel (отмена job/products)
- [ ] Тест валидации (пустой input, >500 операций)
- [ ] Тест idempotency (повторный запрос с тем же ключом)

---

## Зависимости между фазами

```
Фаза 1 (DB) ──┬──→ Фаза 2 (Repos) ──→ Фаза 3 (Scripts) ──→ Фаза 4 (Workflows)
              │                                                    │
              └──────────────────────────────────────────────────────┘
                                                                   │
Фаза 5 (GraphQL) ─────────────────────────────────────────────────→┤
                                                                   │
                                                                   ↓
                                                          Фаза 6 (Resolver)
                                                                   │
                                                                   ↓
                                                          Фаза 7 (Tests)
```

Фазы 1-4 выполняются последовательно. Фаза 5 (GraphQL) может выполняться параллельно с фазами 2-4.
