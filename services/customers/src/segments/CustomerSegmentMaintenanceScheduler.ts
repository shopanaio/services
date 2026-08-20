import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import type { ContextStore } from "@shopana/shared-context";
import { InjectBroker, ServiceBroker } from "@shopana/shared-kernel";
import { sql } from "drizzle-orm";
import { Kernel } from "../kernel/Kernel.js";

type StoreResult = {
  readonly store: ContextStore | null;
  readonly userErrors: readonly { readonly message: string }[];
};

@Injectable()
export class CustomerSegmentMaintenanceScheduler {
  private readonly logger = new Logger(CustomerSegmentMaintenanceScheduler.name);

  constructor(@InjectBroker("customers") private readonly broker: ServiceBroker) {}

  @Interval(60_000)
  async dispatchDueMaintenance(): Promise<void> {
    if (!Kernel.isInitialized()) return;
    const rows = await Kernel.getInstance().db.execute<{ storeId: string }>(sql`
      SELECT pending.store_id AS "storeId"
      FROM (
        SELECT store_id
        FROM customers.customer_segment_temporal_schedule
        WHERE evaluate_at <= now()
          AND (lease_until IS NULL OR lease_until <= now())
        UNION
        SELECT store_id
        FROM customers.customer_segment_reevaluation_queue
        WHERE completed_at IS NULL
          AND available_at <= now()
          AND (lease_until IS NULL OR lease_until <= now())
        UNION
        SELECT store_id
        FROM customers.customer_segment_materialization_run
        WHERE status IN ('PENDING', 'RUNNING')
          AND (lease_until IS NULL OR lease_until <= now())
      ) AS pending
      GROUP BY pending.store_id
      ORDER BY pending.store_id
      LIMIT 100
    `);
    const tick = Math.floor(Date.now() / 60_000);
    for (const row of rows) {
      try {
        const result = await this.broker.call<StoreResult, { id: string }>("project.getStoreById", {
          id: row.storeId,
        });
        if (!result.store) continue;
        await this.broker.startWorkflow(
          "customers.customerSegmentMaintenance",
          {
            context: {
              storeId: result.store.id,
              organizationId: result.store.organizationId,
              requestId: `customer-segment-maintenance-${tick}`,
            },
          },
          {
            source: "content",
            resourceId: result.store.id,
            operation: "customerSegmentMaintenanceTick",
            contentHash: String(tick),
          },
        );
      } catch (error) {
        this.logger.error(
          { storeId: row.storeId, error },
          "Failed to dispatch customer segment maintenance",
        );
      }
    }
  }
}
