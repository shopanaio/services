import { text, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { inventorySchema } from "./schema";
import { bulkEditJob } from "./bulkEditJobs";

export const productBulkFence = inventorySchema.table(
  "product_bulk_fence",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").notNull(),
    fenceToken: text("fence_token").notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => bulkEditJob.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.productId] })]
);

export type ProductBulkFence = typeof productBulkFence.$inferSelect;
export type NewProductBulkFence = typeof productBulkFence.$inferInsert;
