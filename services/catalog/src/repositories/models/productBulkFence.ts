import { text, uuid, timestamp } from "drizzle-orm/pg-core";
import { catalogSchema } from "./schema";
import { bulkEditJob } from "./bulkEditJobs";

export const productBulkFence = catalogSchema.table(
  "product_bulk_fence",
  {
    projectId: uuid("project_id").notNull(),
    productId: uuid("product_id").primaryKey(),
    fenceToken: text("fence_token").notNull(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => bulkEditJob.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  }
);

export type ProductBulkFence = typeof productBulkFence.$inferSelect;
export type NewProductBulkFence = typeof productBulkFence.$inferInsert;
