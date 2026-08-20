import { asc, eq } from "drizzle-orm";
import type {
  OrderLineItemsReadPort,
  OrderLineItemReadPortRow,
} from "@src/application/read/orderLineItemsReadRepository";
import { orderLines } from "@src/repositories/models/index";
import { coerceToDate } from "@src/utils/date";
import { BaseRepository } from "@src/repositories/BaseRepository";

export class OrderLineItemRepository extends BaseRepository implements OrderLineItemsReadPort {
  async findByOrderId(orderId: string): Promise<OrderLineItemReadPortRow[]> {
    const rows = await this.connection
      .select()
      .from(orderLines)
      .where(eq(orderLines.orderId, orderId))
      .orderBy(asc(orderLines.id));

    return rows.map((row) => ({
      id: row.id,
      store_id: row.storeId,
      order_id: row.orderId,
      quantity: row.quantity,
      unit_id: row.purchasableId,
      unit_title: row.title,
      unit_price: row.unitPriceAmount,
      unit_compare_at_price: row.unitCompareAtPriceAmount,
      unit_sku: row.sku,
      unit_image_url: row.imageUrl,
      unit_snapshot: row.purchasableSnapshot,
      subtotal_amount: row.subtotalAmount,
      discount_amount: row.discountAmount,
      tax_amount: row.taxAmount,
      total_amount: row.totalAmount,
      metadata: row.metadata,
      created_at: coerceToDate(row.createdAt),
      updated_at: coerceToDate(row.updatedAt),
      deleted_at: null,
    }));
  }
}
