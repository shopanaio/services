import type { SQLExecutor } from "@event-driven-io/dumbo";
import { rawSql, singleOrNull } from "@event-driven-io/dumbo";
import { dumboPool } from "@src/infrastructure/db/dumbo";
import { knex } from "@src/infrastructure/db/knex";
import type {
  CheckoutReadPort,
  CheckoutReadPortRow,
  CheckoutDeliveryAddressRow,
  CheckoutPromoCodeRow,
  CheckoutDeliveryGroupRow,
  CheckoutDeliveryMethodRow,
  CheckoutDeliveryGroup,
  CheckoutPromoCode,
  CheckoutPaymentMethod,
} from "@src/application/read/checkoutReadRepository";
import { PaymentFlow } from "@shopana/plugin-sdk/payment";

export class CheckoutReadRepository implements CheckoutReadPort {
  private readonly execute: SQLExecutor;

  constructor(executor: SQLExecutor = dumboPool.execute) {
    this.execute = executor;
  }

  async findById(id: string): Promise<CheckoutReadPortRow | null> {
    const q = knex
      .withSchema("platform")
      .table("checkouts as c")
      .leftJoin(
        "checkout_customer_identities as ci",
        "ci.id",
        "c.id",
      )
      .select(
        "c.id",
        "c.project_id",
        "c.api_key_id",
        "c.admin_id",
        "c.sales_channel",
        "c.external_source",
        "c.external_id",
        knex.raw("ci.customer_id as customer_id"),
        knex.raw("ci.first_name as customer_first_name"),
        knex.raw("ci.last_name as customer_last_name"),
        knex.raw("ci.middle_name as customer_middle_name"),
        knex.raw("ci.email as customer_email"),
        knex.raw("ci.phone_e164 as customer_phone_e164"),
        knex.raw("ci.country_code as customer_country_code"),
        "c.customer_note",
        "c.locale_code",
        "c.currency_code",
        "c.subtotal",
        "c.shipping_total",
        "c.discount_total",
        "c.tax_total",
        "c.grand_total",
        "c.status",
        "c.expires_at",
        "c.metadata",
        "c.created_at",
        "c.updated_at",
        "c.deleted_at",
      )
      .where({ "c.id": id })
      .toString();

    const row = await singleOrNull(
      this.execute.query<CheckoutReadPortRow>(rawSql(q))
    );
    return row ?? null;
  }

  async findDeliveryAddresses(
    checkoutId: string
  ): Promise<CheckoutDeliveryAddressRow[]> {
    const q = knex
      .withSchema("platform")
      .table("checkout_delivery_groups as dg")
      .join("checkout_delivery_addresses as da", "dg.address_id", "da.id")
      .leftJoin("checkout_recipients as cr", "cr.id", "dg.recipient_id")
      .select(
        "da.id",
        knex.raw("dg.id as delivery_group_id"),
        "da.address1",
        "da.address2",
        "da.city",
        "da.country_code",
        "da.province_code",
        "da.postal_code",
        knex.raw("cr.first_name as first_name"),
        knex.raw("cr.last_name as last_name"),
        knex.raw("cr.middle_name as middle_name"),
        knex.raw("cr.email as email"),
        knex.raw("cr.phone as phone"),
        "da.metadata",
        "da.created_at",
        "da.updated_at",
      )
      .where("dg.checkout_id", checkoutId)
      .orderBy("da.created_at", "asc")
      .toString();

    const result = await this.execute.query<CheckoutDeliveryAddressRow>(
      rawSql(q)
    );
    return result.rows;
  }

  async findAppliedPromoCodes(
    checkoutId: string
  ): Promise<CheckoutPromoCode[]> {
    const q = knex
      .withSchema("platform")
      .table("checkout_applied_discounts")
      .select(
        "checkout_id",
        "project_id",
        "code",
        "discount_type",
        "value",
        "provider",
        "conditions",
        "applied_at"
      )
      .where({ checkout_id: checkoutId })
      .orderBy("applied_at", "asc")
      .toString();

    const result = await this.execute.query<CheckoutPromoCodeRow>(rawSql(q));
    return result.rows.map(
      (row): CheckoutPromoCode => ({
        checkoutId: row.checkout_id,
        projectId: row.project_id,
        code: row.code,
        discountType: row.discount_type,
        value: parseInt(row.value, 10), // Convert bigint string to number
        provider: row.provider,
        conditions: row.conditions,
        appliedAt: row.applied_at,
      })
    );
  }

  async findDeliveryGroups(
    checkoutId: string
  ): Promise<CheckoutDeliveryGroup[]> {
    const q = knex
      .withSchema("platform")
      .table("checkout_delivery_groups")
      .select(
        "id",
        "project_id",
        "checkout_id",
        "selected_delivery_method_code",
        "selected_delivery_method_provider",
        knex.raw("COALESCE(line_item_ids::text[], '{}') as line_item_ids"),
        "created_at",
        "updated_at"
      )
      .where({ checkout_id: checkoutId })
      .orderBy("created_at", "asc")
      .toString();

    const result = await this.execute.query<CheckoutDeliveryGroupRow>(
      rawSql(q)
    );
    return result.rows.map(
      (group): CheckoutDeliveryGroup => ({
        id: group.id,
        projectId: group.project_id,
        checkoutId: group.checkout_id,
        selectedDeliveryMethod: group.selected_delivery_method_code,
        selectedDeliveryMethodProvider: group.selected_delivery_method_provider,
        lineItemIds: group.line_item_ids,
        recipient: null,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
      })
    );
  }

  async findDeliveryMethods(
    checkoutId: string
  ): Promise<CheckoutDeliveryMethodRow[]> {
    const q = knex
      .withSchema("platform")
      .table("checkout_delivery_methods as dm")
      .join("checkout_delivery_groups as dg", "dg.id", "dm.delivery_group_id")
      .select(
        "dm.code",
        "dm.provider",
        "dm.project_id",
        "dm.delivery_group_id",
        "dm.delivery_method_type",
        "dm.payment_model",
        "dm.customer_input"
      )
      .where("dg.checkout_id", checkoutId)
      .orderBy(["dm.provider", "dm.code"])
      .toString();

    const result = await this.execute.query<CheckoutDeliveryMethodRow>(
      rawSql(q)
    );
    return result.rows;
  }

  async findPaymentMethods(
    checkoutId: string
  ): Promise<CheckoutPaymentMethod[]> {
    const q = knex
      .withSchema("platform")
      .table("checkout_payment_methods")
      .select(
        "code",
        "provider",
        "flow",
        "metadata",
        "customer_input",
      )
      .where({ checkout_id: checkoutId })
      .orderBy(["provider", "code"])
      .toString();

    const result = await this.execute.query<any>(rawSql(q));
    return result.rows.map((row): CheckoutPaymentMethod => ({
      code: row.code,
      provider: row.provider,
      flow: row.flow as PaymentFlow,
      metadata: row.metadata,
      customerInput: row.customer_input,
    }));
  }

  async findSelectedPaymentMethod(
    checkoutId: string
  ): Promise<{ code: string; provider: string } | null> {
    const q = knex
      .withSchema("platform")
      .table("checkout_selected_payment_methods")
      .select("code", "provider")
      .where({ checkout_id: checkoutId })
      .toString();

    const result = await this.execute.query<any>(rawSql(q));
    if (result.rows.length === 0) return null;
    return { code: result.rows[0].code, provider: result.rows[0].provider };
  }
}
