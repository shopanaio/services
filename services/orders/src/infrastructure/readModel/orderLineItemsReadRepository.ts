import { asc, eq } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type {
  OrderLineItemsReadPort,
  OrderLineItemReadPortRow,
} from "@src/application/read/orderLineItemsReadRepository";
import type { Database } from "@src/infrastructure/db/database";
import { orderItems } from "@src/repositories/models/index";
import { coerceToDate } from "@src/utils/date";

export class OrderLineItemsReadRepositoryPort implements OrderLineItemsReadPort {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>,
  ) {}

  private get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  async findByOrderId(orderId: string): Promise<OrderLineItemReadPortRow[]> {
    const rows = await this.connection
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.id));

    return rows.map((row) => ({
      id: row.id,
      store_id: row.storeId,
      order_id: row.orderId,
      quantity: row.quantity,
      unit_id: row.unitId ?? "",
      unit_title: row.unitTitle ?? "",
      unit_price: row.unitPrice ?? 0n,
      unit_compare_at_price: row.unitCompareAtPrice,
      unit_sku: row.unitSku,
      unit_image_url: row.unitImageUrl,
      unit_snapshot: row.unitSnapshot,
      subtotal_amount: row.subtotalAmount,
      discount_amount: row.discountAmount,
      tax_amount: row.taxAmount,
      total_amount: row.totalAmount,
      metadata: row.metadata,
      projected_version: row.projectedVersion,
      created_at: coerceToDate(row.createdAt),
      updated_at: coerceToDate(row.updatedAt),
      deleted_at: row.deletedAt == null ? null : coerceToDate(row.deletedAt),
    }));
  }
}
