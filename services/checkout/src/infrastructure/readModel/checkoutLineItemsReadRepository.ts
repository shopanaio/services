import type { SQLExecutor } from "@event-driven-io/dumbo";
import { rawSql } from "@event-driven-io/dumbo";
import { dumboPool } from "@src/infrastructure/db/dumbo";
import { knex } from "@src/infrastructure/db/knex";
// TODO(workspace): Remove .js extension from TypeScript imports according to workspace rules
import type {
  CheckoutLineItemsReadPort,
  CheckoutLineItemReadPortRow,
} from "@src/application/read/checkoutLineItemsReadRepository";

export class CheckoutLineItemsReadRepositoryPort
  implements CheckoutLineItemsReadPort
{
  private readonly execute: SQLExecutor;

  constructor(executor: SQLExecutor = dumboPool.execute) {
    this.execute = executor;
  }

  async findByCheckoutId(
    checkoutId: string
  ): Promise<CheckoutLineItemReadPortRow[]> {
    const q = knex
      .withSchema("platform")
      .table("checkout_line_items")
      .select(
        "id",
        "project_id",
        "checkout_id",
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
      .where({ checkout_id: checkoutId })
      .orderBy("id", "asc")
      .toString();

    const { rows } = await this.execute.query<CheckoutLineItemReadPortRow>(
      rawSql(q)
    );
    return rows;
  }
}
