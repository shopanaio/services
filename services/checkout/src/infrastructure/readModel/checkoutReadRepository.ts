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
import {
  PaymentFlow,
  type PaymentMethodConstraints,
} from "@shopana/plugin-sdk/payment";

export class CheckoutReadRepository implements CheckoutReadPort {
  private readonly execute: SQLExecutor;

  constructor(executor: SQLExecutor = dumboPool.execute) {
    this.execute = executor;
  }

  async findById(id: string): Promise<CheckoutReadPortRow | null> {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .select(
        "id",
        "project_id",
        "api_key_id",
        "admin_id",
        "sales_channel",
        "external_source",
        "external_id",
        "customer_id",
        "customer_email",
        "customer_phone_e164",
        "customer_country_code",
        "customer_note",
        "locale_code",
        "currency_code",
        "subtotal",
        "shipping_total",
        "discount_total",
        "tax_total",
        "grand_total",
        "status",
        "expires_at",
        "metadata",
        "created_at",
        "updated_at",
        "deleted_at"
      )
      .where({ id })
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
      .table("checkout_delivery_addresses as da")
      .join("checkout_delivery_groups as dg", "dg.id", "da.delivery_group_id")
      .select(
        "da.id",
        "da.delivery_group_id",
        "da.address1",
        "da.address2",
        "da.city",
        "da.country_code",
        "da.province_code",
        "da.postal_code",
        "da.first_name",
        "da.last_name",
        "da.email",
        "da.phone",
        "da.metadata",
        "da.created_at",
        "da.updated_at"
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
        "dm.payment_model"
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
      .select("code", "provider", "flow", "metadata", "constraints")
      .where({ checkout_id: checkoutId })
      .orderBy(["provider", "code"])
      .toString();

    const result = await this.execute.query<any>(rawSql(q));
    return result.rows.map((row): CheckoutPaymentMethod => {
      const parseConstraints = (
        c: PaymentMethodConstraints | null
      ): PaymentMethodConstraints | null => {
        if (!c) {
          return null;
        }
        const codes = c.shippingMethodCodes;
        return {
          shippingMethodCodes: Array.isArray(codes) ? codes : [],
        };
      };

      return {
        code: row.code,
        provider: row.provider,
        flow: row.flow as PaymentFlow,
        metadata: row.metadata,
        constraints: parseConstraints(row.constraints),
      };
    });
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
