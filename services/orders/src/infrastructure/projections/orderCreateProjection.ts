import { createHash } from "node:crypto";
import { Money } from "@shopana/shared-money";
import type { TransactionManager } from "@shopana/shared-kernel";
import { consumeOrderCreateProjectionContext } from "@src/application/usecases/orderCreateProjectionContext";
import type { OrderCreated } from "@src/domain/order/events";
import type { Database } from "@src/infrastructure/db/database";
import { IdempotencyRepository } from "@src/infrastructure/idempotency/idempotencyRepository";
import { OrderNumberRepository } from "@src/infrastructure/orderNumber/orderNumberRepository";
import { OrdersPiiRepository } from "@src/infrastructure/pii/ordersPiiRepository";
import {
  orderAppliedDiscounts,
  orderDeliveryGroups,
  orderDeliveryMethods,
  orderItems,
  orderPaymentMethods,
  orders,
  orderSelectedPaymentMethods,
} from "@src/repositories/models/index";
import { coerceMoney, coerceNullableMoney } from "@src/utils/money";

const minor = (value: Money | null): bigint | null =>
  value == null ? null : value.amountMinor();

export class OrderCreateProjection {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>,
    private readonly orderNumbers: OrderNumberRepository,
    private readonly pii: OrdersPiiRepository,
    private readonly idempotency: IdempotencyRepository,
  ) {}

  private get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  async apply(event: OrderCreated, projectedVersion: bigint): Promise<void> {
    const storeId = event.metadata.storeId;
    const orderId = event.metadata.aggregateId;
    const context = consumeOrderCreateProjectionContext(orderId);
    const orderNumber = await this.orderNumbers.reserve(storeId);

    await this.connection.insert(orders).values({
      id: orderId,
      storeId,
      orderNumber: BigInt(orderNumber),
      apiKeyId: null,
      userId: event.metadata.userId ?? null,
      salesChannel: event.data.salesChannel,
      externalSource: event.data.externalSource,
      externalId: event.data.externalId,
      localeCode: event.data.localeCode,
      currencyCode: event.data.currencyCode,
      subtotal: minor(coerceMoney(event.data.subtotalAmount)) ?? 0n,
      shippingTotal: minor(coerceMoney(event.data.totalShippingAmount)) ?? 0n,
      discountTotal: minor(coerceMoney(event.data.totalDiscountAmount)) ?? 0n,
      taxTotal: minor(coerceMoney(event.data.totalTaxAmount)) ?? 0n,
      grandTotal: minor(coerceMoney(event.data.totalAmount)) ?? 0n,
      status: "DRAFT",
      metadata: {},
      projectedVersion,
      createdAt: event.metadata.now,
      updatedAt: event.metadata.now,
    });

    if (event.data.lines.length > 0) {
      await this.connection.insert(orderItems).values(event.data.lines.map((line) => {
        const unitPrice = coerceMoney(line.unit.price);
        const compareAtPrice = coerceNullableMoney(line.unit.compareAtPrice);
        const subtotal = unitPrice.multiply(line.quantity).normalizeScale();
        const zero = Money.zero(unitPrice.currency().code);
        return {
          id: line.lineId,
          storeId,
          orderId,
          quantity: line.quantity,
          subtotalAmount: minor(subtotal) ?? 0n,
          discountAmount: minor(zero) ?? 0n,
          taxAmount: minor(zero) ?? 0n,
          totalAmount: minor(subtotal) ?? 0n,
          unitId: line.unit.id,
          unitTitle: line.unit.title,
          unitPrice: minor(unitPrice),
          unitCompareAtPrice: minor(compareAtPrice),
          unitSku: line.unit.sku,
          unitImageUrl: line.unit.imageUrl,
          unitSnapshot: line.unit.snapshot,
          metadata: {},
          projectedVersion,
          createdAt: event.metadata.now,
          updatedAt: event.metadata.now,
        };
      }));
    }

    if (context?.deliveryAddresses.length) {
      await this.pii.insertDeliveryAddresses(context.deliveryAddresses);
    }
    if (context?.recipients.length) {
      await this.pii.insertRecipients(context.recipients);
    }

    if (context?.deliveryMethods.length) {
      await this.connection.insert(orderDeliveryMethods).values(
        context.deliveryMethods.map((method) => ({
          code: method.code,
          provider: method.provider,
          storeId,
          deliveryGroupId: method.deliveryGroupId,
          deliveryMethodType: method.deliveryMethodType,
          paymentModel: method.paymentModel,
          metadata: method.metadata ?? {},
          customerInput: method.customerInput ?? {},
        })),
      );
    }

    if (event.data.deliveryGroups.length > 0) {
      const mappings = new Map(
        (context?.deliveryGroupMappings ?? []).map((mapping) => [mapping.deliveryGroupId, mapping]),
      );
      const selectedMethods = new Map(
        (context?.selectedDeliveryMethods ?? []).map((method) => [method.deliveryGroupId, method]),
      );
      await this.connection.insert(orderDeliveryGroups).values(
        event.data.deliveryGroups.map((group) => {
          const mapping = mappings.get(group.id);
          const selectedMethod = selectedMethods.get(group.id);
          return {
            id: group.id,
            storeId,
            orderId,
            addressId: mapping?.addressId ?? null,
            recipientId: mapping?.recipientId ?? null,
            selectedDeliveryMethodCode: selectedMethod?.code ?? null,
            selectedDeliveryMethodProvider: selectedMethod?.provider ?? null,
            lineItemIds: group.orderLineIds,
            createdAt: event.metadata.now,
            updatedAt: event.metadata.now,
          };
        }),
      );
    }

    if (context?.paymentMethods.length) {
      await this.connection.insert(orderPaymentMethods).values(
        context.paymentMethods.map((method) => ({
          orderId,
          storeId,
          code: method.code,
          provider: method.provider,
          flow: method.flow,
          metadata: method.metadata ?? {},
          customerInput: method.customerInput ?? {},
        })),
      );
    }

    if (context?.selectedPaymentMethod) {
      await this.connection.insert(orderSelectedPaymentMethods).values({
        orderId,
        storeId,
        code: context.selectedPaymentMethod.code,
        provider: context.selectedPaymentMethod.provider,
      });
    }

    if (event.data.appliedDiscounts.length > 0) {
      await this.connection.insert(orderAppliedDiscounts).values(
        event.data.appliedDiscounts.map((discount) => ({
          orderId,
          storeId,
          code: discount.code,
          discountType: discount.type,
          value: typeof discount.value === "number"
            ? BigInt(discount.value)
            : discount.value.amountMinor(),
          provider: discount.provider,
          conditions: null,
          appliedAt: discount.appliedAt,
        })),
      );
    }

    if (context?.contact) {
      await this.pii.upsertOrderContacts(context.contact);
    }

    const requestHash = createHash("sha256")
      .update(JSON.stringify({
        storeId,
        currencyCode: event.data.currencyCode,
        salesChannel: event.data.salesChannel,
      }))
      .digest("hex");
    await this.idempotency.save({
      storeId,
      idempotencyKey: event.data.idempotencyKey,
      requestHash,
      response: { id: orderId },
    });
  }
}
