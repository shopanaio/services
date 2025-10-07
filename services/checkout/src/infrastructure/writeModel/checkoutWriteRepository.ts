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
  CheckoutPaymentMethodUpdatedDto,
  CheckoutDeliveryGroupRecipientUpdatedDto,
  CheckoutDeliveryGroupRecipientClearedDto,
} from "@src/domain/checkout/dto";

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
  async updateCustomerIdentity(input: CheckoutCustomerIdentityUpdatedDto): Promise<void> {
    const checkoutId = input.metadata.aggregateId;
    const projectId = input.metadata.projectId;

    // Upsert into checkout_customer_identities using checkoutId as identity id
    const upsertIdentitySql = knex
      .withSchema("platform")
      .table("checkout_customer_identities")
      .insert({
        id: checkoutId,
        project_id: projectId as any,
        customer_id: (input.data.customerId as any) ?? null,
        email: input.data.email ?? null,
        phone_e164: input.data.phone ?? null,
        country_code: (input.data.countryCode as any) ?? null,
        first_name: input.data.firstName ?? null,
        last_name: input.data.lastName ?? null,
        middle_name: input.data.middleName ?? null,
        updated_at: input.metadata.now,
        created_at: input.metadata.now,
        metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
      })
      .onConflict(["id"]).merge({
        project_id: projectId as any,
        customer_id: (input.data.customerId as any) ?? null,
        email: input.data.email ?? null,
        phone_e164: input.data.phone ?? null,
        country_code: (input.data.countryCode as any) ?? null,
        first_name: input.data.firstName ?? null,
        last_name: input.data.lastName ?? null,
        middle_name: input.data.middleName ?? null,
        updated_at: knex.fn.now(),
      })
      .toString();

    await this.run([upsertIdentitySql]);
  }

  /**
   * Updates customer note on checkout.
   */
  async updateCustomerNote(input: CheckoutCustomerNoteUpdatedDto): Promise<void> {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", input.metadata.aggregateId)
      .update({
        customer_note: input.data.note ?? null,
        updated_at: knex.fn.now(),
      })
      .toString();
    await this.run([q]);
  }

  /**
   * Updates checkout language code.
   */
  async updateLanguageCode(input: CheckoutLanguageCodeUpdatedDto): Promise<void> {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", input.metadata.aggregateId)
      .update({
        locale_code: (input.data.localeCode as any) ?? null,
        updated_at: knex.fn.now(),
      })
      .toString();
    await this.run([q]);
  }

  /**
   * Updates checkout currency code.
   */
  async updateCurrencyCode(input: CheckoutCurrencyCodeUpdatedDto): Promise<void> {
    const q = knex
      .withSchema("platform")
      .table("checkouts")
      .where("id", input.metadata.aggregateId)
      .update({
        currency_code: input.data.currencyCode,
        updated_at: knex.fn.now(),
      })
      .toString();
    await this.run([q]);
  }

  /**
   * Creates a checkout row and initial delivery groups/methods.
   */
  async createCheckout(input: CheckoutCreatedDto): Promise<void> {
    const statements: string[] = [];

    const insertCheckoutSql = knex
      .withSchema("platform")
      .table("checkouts")
      .insert({
        id: input.metadata.aggregateId,
        project_id: input.metadata.projectId as any,
        api_key_id: null,
        admin_id: null,
        sales_channel: input.data.salesChannel,
        external_source: input.data.externalSource,
        external_id: input.data.externalId,
        customer_note: null,
        locale_code: input.data.localeCode as any,
        currency_code: input.data.currencyCode,
        subtotal: 0,
        shipping_total: 0,
        discount_total: 0,
        tax_total: 0,
        grand_total: 0,
        status: "new",
        expires_at: null,
        metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
        created_at: input.metadata.now,
        updated_at: input.metadata.now,
        deleted_at: null,
      })
      .toString();
    statements.push(insertCheckoutSql);

    const deliveryGroups = input.data.deliveryGroups ?? [];
    if (deliveryGroups.length > 0) {
      const insertGroupsSql = knex
        .withSchema("platform")
        .table("checkout_delivery_groups")
        .insert(
          deliveryGroups.map((g) => ({
            id: g.id,
            project_id: input.metadata.projectId as any,
            checkout_id: input.metadata.aggregateId,
            selected_delivery_method_code: null,
            selected_delivery_method_provider: null,
            line_item_ids: knex.raw("ARRAY[]::uuid[]"),
            created_at: input.metadata.now,
            updated_at: input.metadata.now,
          })),
        )
        .toString();
      statements.push(insertGroupsSql);
    }

    const methods = (input.data.deliveryGroups || []).flatMap((g) =>
      (g.deliveryMethods || []).map((m) => ({ groupId: g.id, method: m })),
    );
    if (methods.length > 0) {
      const insertMethodsSql = knex
        .withSchema("platform")
        .table("checkout_delivery_methods")
        .insert(
          methods.map(({ groupId, method }) => ({
            code: method.code,
            provider: method.provider,
            project_id: input.metadata.projectId as any,
            delivery_group_id: groupId,
            delivery_method_type: method.deliveryMethodType,
            payment_model: method.shippingPaymentModel,
          })),
        )
        .toString();
      statements.push(insertMethodsSql);
    }

    // Insert payment methods if provided
    const paymentMethods = input.data.paymentMethods || [];
    if (paymentMethods.length > 0) {
      const insertPaymentMethodsSql = knex
        .withSchema("platform")
        .table("checkout_payment_methods")
        .insert(
          paymentMethods.map((method) => ({
            checkout_id: input.metadata.aggregateId,
            project_id: input.metadata.projectId as any,
            code: method.code,
            provider: method.provider,
            flow: method.flow,
            metadata: knex.raw("?::jsonb", [JSON.stringify(method.metadata ?? {})]),
            customer_input: knex.raw("?::jsonb", [
              JSON.stringify((method as any).constraints ?? (method as any).customerInput ?? {}),
            ]),
          })),
        )
        .toString();
      statements.push(insertPaymentMethodsSql);
    }

    await this.run(statements);
  }

  /**
   * Applies full upsert of checkout lines and totals for Added/Updated/Deleted events.
   */
  async applyCheckoutLines(
    input: CheckoutLinesAddedDto | CheckoutLinesUpdatedDto | CheckoutLinesDeletedDto,
  ): Promise<void> {
    const sqls = this.buildCheckoutLinesUpsertStatements({
      projectId: input.metadata.projectId,
      checkoutId: input.metadata.aggregateId,
      now: input.metadata.now,
      data: input.data,
    });
    await this.run(sqls);
  }

  /**
   * Clears lines and updates totals to provided values.
   */
  async clearCheckoutLines(input: CheckoutLinesClearedDto): Promise<void> {
    const projectId = input.metadata.projectId;
    const checkoutId = input.metadata.aggregateId;

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
        subtotal: toBigintSql(input.data.checkoutCost.subtotal),
        discount_total: toBigintSql(input.data.checkoutCost.discountTotal),
        tax_total: toBigintSql(input.data.checkoutCost.taxTotal),
        shipping_total: toBigintSql(input.data.checkoutCost.shippingTotal),
        grand_total: toBigintSql(input.data.checkoutCost.grandTotal),
        updated_at: knex.fn.now(),
      })
      .toString();

    await this.run([deleteSql, updateCheckoutSql]);
  }

  /**
   * Applies promo code change: updates line totals and applied discounts list.
   */
  async applyPromoCodeAdded(input: CheckoutPromoCodeAddedDto): Promise<void> {
    const linesSqls = this.buildCheckoutLinesUpsertStatements({
      projectId: input.metadata.projectId,
      checkoutId: input.metadata.aggregateId,
      now: input.metadata.now,
      data: {
        checkoutLines: input.data.checkoutLines,
        checkoutLinesCost: input.data.checkoutLinesCost,
        checkoutCost: input.data.checkoutCost,
      },
    });

    const discountsSqls = this.buildAppliedDiscountsUpsertStatements({
      projectId: input.metadata.projectId,
      checkoutId: input.metadata.aggregateId,
      data: input.data,
    });

    await this.run([...linesSqls, ...discountsSqls]);
  }

  /**
   * Applies promo code removal: updates line totals and applied discounts list.
   */
  async applyPromoCodeRemoved(input: CheckoutPromoCodeRemovedDto): Promise<void> {
    const linesSqls = this.buildCheckoutLinesUpsertStatements({
      projectId: input.metadata.projectId,
      checkoutId: input.metadata.aggregateId,
      now: input.metadata.now,
      data: {
        checkoutLines: input.data.checkoutLines,
        checkoutLinesCost: input.data.checkoutLinesCost,
        checkoutCost: input.data.checkoutCost,
      },
    });

    const discountsSqls = this.buildAppliedDiscountsUpsertStatements({
      projectId: input.metadata.projectId,
      checkoutId: input.metadata.aggregateId,
      data: input.data,
    });

    await this.run([...linesSqls, ...discountsSqls]);
  }

  /**
   * Updates delivery group address (upsert) and group timestamp.
   */
  async updateDeliveryGroupAddress(input: CheckoutDeliveryGroupAddressUpdatedDto): Promise<void> {
    const { deliveryGroupId, address } = input.data;

    const upsertAddressSql = knex
      .withSchema("platform")
      .table("checkout_recipients")
      .insert({
        id: address.id, // 1:1 with address
        project_id: input.metadata.projectId as any,
        first_name: address.firstName ?? null,
        last_name: address.lastName ?? null,
        middle_name: (address as any).middleName ?? null,
        email: address.email ?? null,
        phone: address.phone ?? null,
        metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
        created_at: input.metadata.now,
        updated_at: input.metadata.now,
      })
      .onConflict(["id"]).merge({
        first_name: address.firstName ?? null,
        last_name: address.lastName ?? null,
        middle_name: (address as any).middleName ?? null,
        email: address.email ?? null,
        phone: address.phone ?? null,
        updated_at: knex.fn.now(),
      })
      .toString();

    const upsertDeliveryAddressSql = knex
      .withSchema("platform")
      .table("checkout_delivery_addresses")
      .insert({
        id: address.id,
        address1: address.address1,
        address2: address.address2 ?? null,
        city: address.city,
        country_code: address.countryCode,
        province_code: address.provinceCode ?? null,
        postal_code: address.postalCode ?? null,
        metadata: knex.raw("?::jsonb", [JSON.stringify(address.data ?? {})]),
        created_at: input.metadata.now,
        updated_at: input.metadata.now,
      })
      .onConflict("id")
      .merge({
        address1: address.address1,
        address2: address.address2 ?? null,
        city: address.city,
        country_code: address.countryCode,
        province_code: address.provinceCode ?? null,
        postal_code: address.postalCode ?? null,
        metadata: knex.raw("?::jsonb", [JSON.stringify(address.data ?? {})]),
        updated_at: knex.fn.now(),
      })
      .toString();

    const updateGroupSql = knex
      .withSchema("platform")
      .table("checkout_delivery_groups")
      .where("id", deliveryGroupId)
      .update({
        address_id: address.id,
        recipient_id: address.id,
        updated_at: knex.fn.now(),
      })
      .toString();

    await this.run([upsertAddressSql, upsertDeliveryAddressSql, updateGroupSql]);
  }

  /**
   * Clears delivery group address and updates group timestamp.
   */
  async clearDeliveryGroupAddress(input: CheckoutDeliveryGroupAddressClearedDto): Promise<void> {
    const { deliveryGroupId, addressId } = input.data;

    const deleteRecipientsSql = knex
      .raw(
        `DELETE FROM platform.checkout_recipients r WHERE r.id IN (SELECT recipient_id FROM platform.checkout_delivery_groups WHERE id = ?)`,
        [deliveryGroupId],
      )
      .toString();

    const deleteAddressSql = knex
      .raw(
        `DELETE FROM platform.checkout_delivery_addresses a WHERE a.id IN (SELECT address_id FROM platform.checkout_delivery_groups WHERE id = ?)`,
        [deliveryGroupId],
      )
      .toString();

    const updateGroupTimestampSql = knex
      .withSchema("platform")
      .table("checkout_delivery_groups")
      .where("id", deliveryGroupId)
      .update({ updated_at: knex.fn.now() })
      .toString();

    await this.run([deleteRecipientsSql, deleteAddressSql, updateGroupTimestampSql]);
  }

  /**
   * Updates selected delivery method and optionally updates shipping and grand totals.
   */
  async updateDeliveryGroupMethod(input: CheckoutDeliveryGroupMethodUpdatedDto): Promise<void> {
    const { deliveryGroupId, deliveryMethod, shippingTotal } = input.data;
    const checkoutId = input.metadata.aggregateId;

    const updateGroupSql = knex
      .withSchema("platform")
      .table("checkout_delivery_groups")
      .where("id", deliveryGroupId)
      .update({
        selected_delivery_method_code: deliveryMethod.code,
        selected_delivery_method_provider: deliveryMethod.provider,
        updated_at: knex.fn.now(),
      })
      .toString();

    const stmts = [updateGroupSql];

    // Persist customer_input for selected delivery method if provided
    if (deliveryMethod.customerInput != null) {
      const upsertDeliveryMethodSql = knex
        .withSchema("platform")
        .table("checkout_delivery_methods")
        .insert({
          code: deliveryMethod.code,
          provider: deliveryMethod.provider,
          project_id: input.metadata.projectId as any,
          delivery_group_id: deliveryGroupId,
          delivery_method_type: deliveryMethod.deliveryMethodType,
          payment_model: deliveryMethod.shippingPaymentModel,
          customer_input: knex.raw("?::jsonb", [JSON.stringify(deliveryMethod.customerInput ?? {})]),
        })
        .onConflict(["code", "provider", "delivery_group_id"]).merge({
          customer_input: knex.raw("?::jsonb", [JSON.stringify(deliveryMethod.customerInput ?? {})]),
        })
        .toString();
      stmts.push(upsertDeliveryMethodSql);
    }

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
  async removeDeliveryGroup(input: CheckoutDeliveryGroupRemovedDto): Promise<void> {
    const { deliveryGroupId, shippingTotal } = input.data;
    const checkoutId = input.metadata.aggregateId;

    const deleteRecipientsSql = knex
      .raw(
        `DELETE FROM platform.checkout_recipients r WHERE r.id IN (SELECT recipient_id FROM platform.checkout_delivery_groups WHERE id = ?)`,
        [deliveryGroupId],
      )
      .toString();

    const deleteAddressSql = knex
      .raw(
        `DELETE FROM platform.checkout_delivery_addresses a WHERE a.id IN (SELECT address_id FROM platform.checkout_delivery_groups WHERE id = ?)`,
        [deliveryGroupId],
      )
      .toString();

    const deleteGroupSql = knex
      .withSchema("platform")
      .table("checkout_delivery_groups")
      .where("id", deliveryGroupId)
      .del()
      .toString();

    const stmts = [deleteRecipientsSql, deleteAddressSql, deleteGroupSql];

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
   * Updates payment methods and selected payment method for checkout.
   */
  async updatePaymentMethod(input: CheckoutPaymentMethodUpdatedDto): Promise<void> {
    const { paymentMethod } = input.data;
    const checkoutId = input.metadata.aggregateId;
    const projectId = input.metadata.projectId;

    const statements: string[] = [];

    // Upsert payment method
    const upsertPaymentMethodSql = knex
      .withSchema("platform")
      .table("checkout_payment_methods")
      .insert({
        checkout_id: checkoutId,
        project_id: projectId as any,
        code: paymentMethod.code,
        provider: paymentMethod.provider,
        flow: paymentMethod.flow,
        metadata: knex.raw("?::jsonb", [JSON.stringify(paymentMethod.metadata ?? {})]),
        customer_input: knex.raw("?::jsonb", [
          JSON.stringify((paymentMethod as any).customerInput ?? {}),
        ]),
      })
      .onConflict(["checkout_id", "code", "provider"])
      .merge({
        flow: paymentMethod.flow,
        metadata: knex.raw("?::jsonb", [JSON.stringify(paymentMethod.metadata ?? {})]),
        customer_input: knex.raw("?::jsonb", [
          JSON.stringify((paymentMethod as any).customerInput ?? {}),
        ]),
      })
      .toString();
    statements.push(upsertPaymentMethodSql);

    // Update selected payment method
    const upsertSelectedPaymentMethodSql = knex
      .withSchema("platform")
      .table("checkout_selected_payment_methods")
      .insert({
        checkout_id: checkoutId,
        project_id: projectId as any,
        code: paymentMethod.code,
        provider: paymentMethod.provider,
      })
      .onConflict(["checkout_id"]) // PK is checkout_id
      .merge({
        code: paymentMethod.code,
        provider: paymentMethod.provider,
      })
      .toString();
    statements.push(upsertSelectedPaymentMethodSql);

    await this.run(statements);
  }

  /**
   * Updates delivery group recipient (upsert) and group timestamp.
   */
  async updateDeliveryGroupRecipient(input: CheckoutDeliveryGroupRecipientUpdatedDto): Promise<void> {
    const { deliveryGroupId, recipient } = input.data;

    const upsertRecipientSql = knex
      .withSchema("platform")
      .table("checkout_recipients")
      .insert({
        id: recipient.id,
        project_id: input.metadata.projectId as any,
        first_name: recipient.firstName ?? null,
        last_name: recipient.lastName ?? null,
        middle_name: recipient.middleName ?? null,
        email: recipient.email ?? null,
        phone: recipient.phone ?? null,
        metadata: knex.raw("?::jsonb", [JSON.stringify({})]),
        created_at: input.metadata.now,
        updated_at: input.metadata.now,
      })
      .onConflict(["id"]).merge({
        first_name: recipient.firstName ?? null,
        last_name: recipient.lastName ?? null,
        middle_name: recipient.middleName ?? null,
        email: recipient.email ?? null,
        phone: recipient.phone ?? null,
        updated_at: knex.fn.now(),
      })
      .toString();

    const updateGroupSql = knex
      .withSchema("platform")
      .table("checkout_delivery_groups")
      .where("id", deliveryGroupId)
      .update({
        recipient_id: recipient.id,
        updated_at: knex.fn.now(),
      })
      .toString();

    await this.run([upsertRecipientSql, updateGroupSql]);
  }

  /**
   * Clears delivery group recipient and updates group timestamp.
   */
  async clearDeliveryGroupRecipient(input: CheckoutDeliveryGroupRecipientClearedDto): Promise<void> {
    const { deliveryGroupId } = input.data;

    const deleteRecipientsSql = knex
      .raw(
        `DELETE FROM platform.checkout_recipients r WHERE r.id IN (SELECT recipient_id FROM platform.checkout_delivery_groups WHERE id = ?)`,
        [deliveryGroupId],
      )
      .toString();

    const updateGroupTimestampSql = knex
      .withSchema("platform")
      .table("checkout_delivery_groups")
      .where("id", deliveryGroupId)
      .update({ updated_at: knex.fn.now() })
      .toString();

    await this.run([deleteRecipientsSql, updateGroupTimestampSql]);
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
