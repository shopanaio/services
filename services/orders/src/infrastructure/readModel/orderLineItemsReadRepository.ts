import type { SQLExecutor } from "@event-driven-io/dumbo";
import { rawSql } from "@event-driven-io/dumbo";
import { dumboPool } from "@src/infrastructure/db/dumbo";
import { knex } from "@src/infrastructure/db/knex";
// TODO(workspace): Remove .js extension from TypeScript imports according to workspace rules
import type {
  OrderLineItemsReadPort,
  OrderLineItemReadPortRow,
} from "@src/application/read/orderLineItemsReadRepository";

export class OrderLineItemsReadRepositoryPort
  implements OrderLineItemsReadPort
{
  private readonly execute: SQLExecutor;

  constructor(executor: SQLExecutor = dumboPool.execute) {
    this.execute = executor;
  }

  async findByOrderId(
    orderId: string
  ): Promise<OrderLineItemReadPortRow[]> {
    const q = knex
      .withSchema("platform")
      .table("order_items")
      .select(
        "id",
        "project_id",
        "order_id",
        "quantity",
        "unit_id",
        "unit_title",
        "unit_price",
        "unit_compare_at_price",
        "unit_sku",
        "unit_image_url",
        "unit_snapshot",
        "subtotal_amount",
        "discount_amount",
        "tax_amount",
        "total_amount",
        "metadata",
        "projected_version",
        "created_at",
        "updated_at",
        "deleted_at"
      )
      .where({ order_id: orderId })
      .orderBy("id", "asc")
      .toString();

    const { rows } = await this.execute.query<OrderLineItemReadPortRow>(
      rawSql(q)
    );
    return rows;
  }
}
