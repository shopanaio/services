import type { SQLExecutor } from "@event-driven-io/dumbo";
import { rawSql } from "@event-driven-io/dumbo";
import { knex } from "@src/infrastructure/db/knex";
import { dumboPool } from "@src/infrastructure/db/dumbo";
import { Money } from "@shopana/shared-money";
import type {
  CheckoutCreatedDto,
  CheckoutLinesAddedDto,
  CheckoutLinesUpdatedDto,
  CheckoutLinesDeletedDto,
  CheckoutLinesClearedDto,
  CheckoutPromoCodeAddedDto,
  CheckoutPromoCodeRemovedDto,
  CheckoutDeliveryGroupAddressUpdatedDto,
  CheckoutDeliveryGroupAddressClearedDto,
  CheckoutDeliveryGroupMethodUpdatedDto,
  CheckoutDeliveryGroupRemovedDto,
  CheckoutCustomerIdentityUpdatedDto,
  CheckoutCustomerNoteUpdatedDto,
  CheckoutLanguageCodeUpdatedDto,
  CheckoutCurrencyCodeUpdatedDto,
} from "@src/domain/checkout/events";

/**
 * Repository for performing write operations on checkout read model tables.
 *
 * - Uses Knex to build SQL strings
 * - Uses dumboPool.execute to run SQL
 * - Accepts event DTO types as input
 */
export class CheckoutWriteRepository {
  private readonly execute: SQLExecutor;

  constructor(executor: SQLExecutor = dumboPool.execute) {
    this.execute = executor;
  }

  /**
   * Updates customer identity fields on checkout.
   */
  async updateCustomerIdentity(event: CheckoutCustomerIdentityUpdatedDto): Promise<void> {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", event.metadata.aggregateId)
      .update({
        customer_email: event.data.email ?? null,
        customer_id: (event.data.customerId as any) ?? null,
        customer_phone_e164: event.data.phone ?? null,
        customer_country_code: (event.data.countryCode as any) ?? null,
        updated_at: knex.fn.now(),
      })
      .toString();
    await this.run([q]);
  }

  /**
   * Updates customer note on checkout.
   */
  async updateCustomerNote(event: CheckoutCustomerNoteUpdatedDto): Promise<void> {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", event.metadata.aggregateId)
      .update({
        customer_note: event.data.note ?? null,
        updated_at: knex.fn.now(),
      })
      .toString();
    await this.run([q]);
  }

  /**
   * Updates checkout language code.
   */
  async updateLanguageCode(event: CheckoutLanguageCodeUpdatedDto): Promise<void> {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", event.metadata.aggregateId)
      .update({
        locale_code: (event.data.localeCode as any) ?? null,
        updated_at: knex.fn.now(),
      })
      .toString();
    await this.run([q]);
  }

  /**
   * Updates checkout currency code.
   */
  async updateCurrencyCode(event: CheckoutCurrencyCodeUpdatedDto): Promise<void> {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", event.metadata.aggregateId)
      .update({
        currency_code: event.data.currencyCode,
        updated_at: knex.fn.now(),
      })
      .toString();
    await this.run([q]);
  }

  /**
   * Creates a checkout row and initial delivery groups/methods.
   */
  async createCheckout(event: CheckoutCreatedDto): Promise<void> {
    const statements: string[] = [];

    const insertCheckoutSql = knex
      .withSchema("platform")
      .table("checkouts")
      .insert({
        id: event.metadata.aggregateId,
        project_id: event.metadata.projectId as any,
        api_key_id: null,
        admin_id: null,
        sales_channel: event.data.salesChannel,
        external_source: event.data.externalSource,
        external_id: event.data.externalId,
        customer_id: null,
        customer_email: null,
        customer_phone_e164: null,
        customer_country_code: null,
        customer_note: null,
        locale_code: event.data.localeCode as any,
        currency_code: event.data.currencyCode,
        subtotal: 0,
        shipping_total: 0,
        discount_total: 0,
        tax_total: 0,
        grand_total: 0,
        status: "new",
        expires_at: null,
        projected_version: 0,
        metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
        created_at: event.metadata.now,
        updated_at: event.metadata.now,
        deleted_at: null,
      })
      .toString();
    statements.push(insertCheckoutSql);

    const deliveryGroups = event.data.deliveryGroups ?? [];
    if (deliveryGroups.length > 0) {
      const insertGroupsSql = knex
        .withSchema("platform")
        .table("checkout_delivery_groups")
        .insert(
          deliveryGroups.map((g) => ({
            id: g.id,
            project_id: event.metadata.projectId as any,
            checkout_id: event.metadata.aggregateId,
            selected_delivery_method: null,
            line_item_ids: knex.raw("ARRAY[]::uuid[]"),
            created_at: event.metadata.now,
            updated_at: event.metadata.now,
          })),
        )
        .toString();
      statements.push(insertGroupsSql);
    }

    const methods = (event.data.deliveryGroups || []).flatMap((g) =>
      (g.deliveryMethods || []).map((m) => ({ groupId: g.id, method: m })),
    );
    if (methods.length > 0) {
      const insertMethodsSql = knex
        .withSchema("platform")
        .table("checkout_delivery_methods")
        .insert(
          methods.map(({ groupId, method }) => ({
            code: method.code,
            project_id: event.metadata.projectId as any,
            delivery_group_id: groupId,
            delivery_method_type: method.deliveryMethodType,
            payment_model: method.shippingPaymentModel,
          })),
        )
        .toString();
      statements.push(insertMethodsSql);
    }

    await this.run(statements);
  }

  /**
   * Applies full upsert of checkout lines and totals for Added/Updated/Deleted events.
   */
  async applyCheckoutLines(
    event: CheckoutLinesAddedDto | CheckoutLinesUpdatedDto | CheckoutLinesDeletedDto,
  ): Promise<void> {
    const sqls = this.buildCheckoutLinesUpsertStatements({
      projectId: event.metadata.projectId,
      checkoutId: event.metadata.aggregateId,
      now: event.metadata.now,
      data: event.data,
    });
    await this.run(sqls);
  }

  /**
   * Clears lines and updates totals to provided values.
   */
  async clearCheckoutLines(event: CheckoutLinesClearedDto): Promise<void> {
    const projectId = event.metadata.projectId;
    const checkoutId = event.metadata.aggregateId;

    const toBigintSql = (m: Money | null) => (m == null ? null : m.amountMinor().toString());

    const deleteSql = knex
      .withSchema("platform")
      .table("checkout_line_items")
      .delete()
      .where({ checkout_id: checkoutId, project_id: projectId as any })
      .toString();

    const updateCheckoutSql = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", checkoutId)
      .update({
        subtotal: toBigintSql(event.data.checkoutCost.subtotal),
        discount_total: toBigintSql(event.data.checkoutCost.discountTotal),
        tax_total: toBigintSql(event.data.checkoutCost.taxTotal),
        shipping_total: toBigintSql(event.data.checkoutCost.shippingTotal),
        grand_total: toBigintSql(event.data.checkoutCost.grandTotal),
        updated_at: knex.fn.now(),
      })
      .toString();

    await this.run([deleteSql, updateCheckoutSql]);
  }

  /**
   * Applies promo code change: updates line totals and applied discounts list.
   */
  async applyPromoCodeAdded(event: CheckoutPromoCodeAddedDto): Promise<void> {
    const linesSqls = this.buildCheckoutLinesUpsertStatements({
      projectId: event.metadata.projectId,
      checkoutId: event.metadata.aggregateId,
      now: event.metadata.now,
      data: {
        checkoutLines: event.data.checkoutLines,
        checkoutLinesCost: event.data.checkoutLinesCost,
        checkoutCost: event.data.checkoutCost,
      },
    });

    const discountsSqls = this.buildAppliedDiscountsUpsertStatements({
      projectId: event.metadata.projectId,
      checkoutId: event.metadata.aggregateId,
      data: event.data,
    });

    await this.run([...linesSqls, ...discountsSqls]);
  }

  /**
   * Applies promo code removal: updates line totals and applied discounts list.
   */
  async applyPromoCodeRemoved(event: CheckoutPromoCodeRemovedDto): Promise<void> {
    const linesSqls = this.buildCheckoutLinesUpsertStatements({
      projectId: event.metadata.projectId,
      checkoutId: event.metadata.aggregateId,
      now: event.metadata.now,
      data: {
        checkoutLines: event.data.checkoutLines,
        checkoutLinesCost: event.data.checkoutLinesCost,
        checkoutCost: event.data.checkoutCost,
      },
    });

    const discountsSqls = this.buildAppliedDiscountsUpsertStatements({
      projectId: event.metadata.projectId,
      checkoutId: event.metadata.aggregateId,
      data: event.data,
    });

    await this.run([...linesSqls, ...discountsSqls]);
  }

  /**
   * Updates delivery group address (upsert) and group timestamp.
   */
  async updateDeliveryGroupAddress(event: CheckoutDeliveryGroupAddressUpdatedDto): Promise<void> {
    const { deliveryGroupId, address } = event.data;

    const upsertAddressSql = knex
      .withSchema("platform")
      .table("checkout_delivery_addresses")
      .insert({
        id: address.id,
        delivery_group_id: deliveryGroupId,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        country_code: address.countryCode,
        province_code: address.provinceCode,
        postal_code: address.postalCode,
        first_name: address.firstName,
        last_name: address.lastName,
        email: address.email,
        phone: address.phone,
        metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
        created_at: event.metadata.now,
        updated_at: event.metadata.now,
      })
      .onConflict("id")
      .merge({
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        country_code: address.countryCode,
        province_code: address.provinceCode,
        postal_code: address.postalCode,
        first_name: address.firstName,
        last_name: address.lastName,
        email: address.email,
        phone: address.phone,
        metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
        updated_at: knex.fn.now(),
      })
      .toString();

    const updateGroupSql = knex
      .withSchema("platform")
      .table("checkout_delivery_groups")
      .where("id", deliveryGroupId)
      .update({ updated_at: knex.fn.now() })
      .toString();

    await this.run([upsertAddressSql, updateGroupSql]);
  }

  /**
   * Clears delivery group address and updates group timestamp.
   */
  async clearDeliveryGroupAddress(event: CheckoutDeliveryGroupAddressClearedDto): Promise<void> {
    const { deliveryGroupId, addressId } = event.data;

    const deleteAddressSql = knex
      .withSchema("platform")
      .table("checkout_delivery_addresses")
      .where({ id: addressId, delivery_group_id: deliveryGroupId })
      .del()
      .toString();

    const updateGroupSql = knex
      .withSchema("platform")
      .table("checkout_delivery_groups")
      .where("id", deliveryGroupId)
      .update({ updated_at: knex.fn.now() })
      .toString();

    await this.run([deleteAddressSql, updateGroupSql]);
  }

  /**
   * Updates selected delivery method and optionally updates shipping and grand totals.
   */
  async updateDeliveryGroupMethod(event: CheckoutDeliveryGroupMethodUpdatedDto): Promise<void> {
    const { deliveryGroupId, deliveryMethod, shippingTotal } = event.data;
    const checkoutId = event.metadata.aggregateId;

    const updateGroupSql = knex
      .withSchema("platform")
      .table("checkout_delivery_groups")
      .where("id", deliveryGroupId)
      .update({
        selected_delivery_method: deliveryMethod.code,
        updated_at: knex.fn.now(),
      })
      .toString();

    const stmts = [updateGroupSql];

    if (shippingTotal !== undefined) {
      const updateCheckoutSql = knex
        .withSchema("platform")
        .table("checkouts")
        .where("id", checkoutId)
        .update({
          shipping_total: shippingTotal?.toString() || "0",
          updated_at: knex.fn.now(),
          grand_total: knex.raw(
            "subtotal + tax_total + shipping_total - discount_total",
          ),
        })
        .toString();
      stmts.push(updateCheckoutSql);
    }

    await this.run(stmts);
  }

  /**
   * Removes delivery group and its address; optionally updates shipping/grand totals.
   */
  async removeDeliveryGroup(event: CheckoutDeliveryGroupRemovedDto): Promise<void> {
    const { deliveryGroupId, shippingTotal } = event.data;
    const checkoutId = event.metadata.aggregateId;

    const deleteAddressSql = knex
      .withSchema("platform")
      .table("checkout_delivery_addresses")
      .where("delivery_group_id", deliveryGroupId)
      .del()
      .toString();

    const deleteGroupSql = knex
      .withSchema("platform")
      .table("checkout_delivery_groups")
      .where("id", deliveryGroupId)
      .del()
      .toString();

    const stmts = [deleteAddressSql, deleteGroupSql];

    if (shippingTotal !== undefined) {
      const updateCheckoutSql = knex
        .withSchema("platform")
        .table("checkouts")
        .where("id", checkoutId)
        .update({
          shipping_total: shippingTotal?.toString() || "0",
          updated_at: knex.fn.now(),
          grand_total: knex.raw(
            "subtotal + tax_total + shipping_total - discount_total",
          ),
        })
        .toString();
      stmts.push(updateCheckoutSql);
    }

    await this.run(stmts);
  }

  // -----------------------------
  // Helpers
  // -----------------------------

  private toBigintSql(m: Money | null): string | null {
    return m == null ? null : m.amountMinor().toString();
  }

  private buildCheckoutLinesUpsertStatements(input: {
    projectId: string;
    checkoutId: string;
    now: Date;
    data: {
      checkoutLines: Array<{
        lineId: string;
        quantity: number;
        unit: {
          id: string;
          title: string;
          price: Money;
          compareAtPrice: Money | null;
          sku: string | null;
          imageUrl: string | null;
          snapshot: Record<string, unknown> | null;
        };
      }>;
      checkoutLinesCost: Record<string, {
        subtotal: Money;
        discount: Money | null;
        tax: Money | null;
        total: Money;
      }>;
      checkoutCost: {
        subtotal: Money;
        discountTotal: Money;
        taxTotal: Money;
        shippingTotal: Money;
        grandTotal: Money;
      };
    };
  }): string[] {
    const { projectId, checkoutId, now, data } = input;
    const stmtSqls: string[] = [];

    const deleteAllSql = knex
      .withSchema("platform")
      .table("checkout_line_items")
      .delete()
      .where({ checkout_id: checkoutId, project_id: projectId as any })
      .toString();
    stmtSqls.push(deleteAllSql);

    if (data.checkoutLines.length > 0) {
      const values = data.checkoutLines.map((l) => {
        const cost = data.checkoutLinesCost[l.lineId];
        const qty = BigInt(l.quantity);
        const unitPriceMinor = cost && qty > 0n ? cost.subtotal.amountMinor() / qty : 0n;
        const unitPrice = Money.fromMinor(unitPriceMinor);

        return {
          id: l.lineId,
          project_id: projectId as any,
          checkout_id: checkoutId,
          quantity: l.quantity,
          subtotal_amount: this.toBigintSql(cost?.subtotal ?? null),
          discount_amount: this.toBigintSql(cost?.discount ?? null),
          tax_amount: this.toBigintSql(cost?.tax ?? null),
          total_amount: this.toBigintSql(cost?.total ?? null),
          unit_id: l.unit.id,
          unit_title: l.unit.title,
          unit_price: this.toBigintSql(unitPrice),
          unit_compare_at_price: this.toBigintSql(l.unit.compareAtPrice),
          unit_sku: l.unit.sku,
          unit_image_url: l.unit.imageUrl,
          unit_snapshot: knex.raw("?::jsonb", [JSON.stringify(l.unit.snapshot ?? {})]),
          metadata: null,
          projected_version: 0,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        };
      });

      const insertSql = knex
        .withSchema("platform")
        .table("checkout_line_items")
        .insert(values)
        .toString();

      stmtSqls.push(insertSql);
    }

    const updateCheckoutSql = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", checkoutId)
      .update({
        subtotal: this.toBigintSql(data.checkoutCost.subtotal),
        discount_total: this.toBigintSql(data.checkoutCost.discountTotal),
        tax_total: this.toBigintSql(data.checkoutCost.taxTotal),
        shipping_total: this.toBigintSql(data.checkoutCost.shippingTotal),
        grand_total: this.toBigintSql(data.checkoutCost.grandTotal),
        updated_at: knex.fn.now(),
      })
      .toString();

    stmtSqls.push(updateCheckoutSql);

    return stmtSqls;
  }

  private buildAppliedDiscountsUpsertStatements(input: {
    projectId: string;
    checkoutId: string;
    data: CheckoutPromoCodeAddedDto["data"] | CheckoutPromoCodeRemovedDto["data"];
  }): string[] {
    const { projectId, checkoutId, data } = input;
    const stmtSqls: string[] = [];

    const deleteAllSql = knex
      .withSchema("platform")
      .table("checkout_applied_discounts")
      .delete()
      .where({ checkout_id: checkoutId, project_id: projectId as any })
      .toString();
    stmtSqls.push(deleteAllSql);

    if (data.appliedDiscounts.length > 0) {
      const values = data.appliedDiscounts.map((d) => ({
        checkout_id: checkoutId,
        project_id: projectId as any,
        code: d.code,
        discount_type: d.type,
        value: d.value,
        provider: d.provider,
        applied_at: d.appliedAt,
      }));

      const insertSql = knex
        .withSchema("platform")
        .table("checkout_applied_discounts")
        .insert(values)
        .toString();

      stmtSqls.push(insertSql);
    }

    return stmtSqls;
  }

  private async run(statements: string[]): Promise<void> {
    for (const s of statements) {
      await this.execute.command(rawSql(s));
    }
  }
}
