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
      .table("checkout_line_items as cli")
      .leftJoin("checkout_tags as ct", "ct.id", "cli.tag_id")
      .select(
        "cli.id",
        "cli.project_id",
        "cli.checkout_id",
        "cli.parent_line_item_id",
        "cli.quantity",
        // Price config columns
        "cli.price_type",
        "cli.price_amount",
        "cli.price_percent",
        // Unit columns
        "cli.unit_id",
        "cli.unit_title",
        "cli.unit_price",
        "cli.unit_original_price",
        "cli.unit_compare_at_price",
        "cli.unit_sku",
        "cli.unit_image_url",
        "cli.unit_snapshot",
        // Cost columns
        "cli.subtotal_amount",
        "cli.discount_amount",
        "cli.tax_amount",
        "cli.total_amount",
        "cli.metadata",
        "cli.created_at",
        "cli.updated_at",
        "cli.deleted_at",
        // Tag columns
        knex.raw("ct.id as tag_id"),
        knex.raw("ct.slug as tag_slug"),
        knex.raw("ct.is_unique as tag_is_unique"),
        knex.raw("ct.created_at as tag_created_at"),
        knex.raw("ct.updated_at as tag_updated_at")
      )
      .where({ "cli.checkout_id": checkoutId })
      .orderBy("cli.created_at", "asc")
      .toString();

    const { rows } = await this.execute.query<CheckoutLineItemReadPortRow>(
      rawSql(q)
    );
    return rows;
  }
}
