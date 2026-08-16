import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { Money } from "@shopana/shared-money";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { CheckoutSnapshot } from "@src/domain/order/checkoutSnapshot";
import type { Database } from "@src/infrastructure/db/database";
import { IdempotencyRepository } from "@src/repositories/idempotency/IdempotencyRepository";
import { OrderNumberRepository } from "@src/repositories/order-number/OrderNumberRepository";
import {
  type DeliveryAddressPII,
  type OrderContactPII,
  OrdersPiiRepository,
  type RecipientPII,
} from "@src/repositories/pii/OrdersPiiRepository";
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
import { BaseRepository } from "../BaseRepository.js";

export type OrderCreateLine = Readonly<{
  lineId: string;
  quantity: number;
  unit: {
    id: string;
    price: Money;
    compareAtPrice: Money | null;
    title: string;
    imageUrl: string | null;
    sku: string | null;
    snapshot: Record<string, unknown> | null;
  };
}>;

export type OrderCreateData = Readonly<{
  id: string;
  storeId: string;
  userId: string | null;
  idempotencyKey: string;
  salesChannel: string | null;
  externalSource: string | null;
  externalId: string | null;
  localeCode: string | null;
  currencyCode: string;
  subtotalAmount: Money;
  totalDiscountAmount: Money;
  totalTaxAmount: Money;
  totalShippingAmount: Money;
  totalAmount: Money;
  checkoutSnapshot: CheckoutSnapshot;
  lines: readonly OrderCreateLine[];
  deliveryGroups: ReadonlyArray<{
    id: string;
    orderLineIds: string[];
  }>;
  appliedDiscounts: ReadonlyArray<{
    code: string;
    appliedAt: Date;
    type: string;
    value: number | Money;
    provider: string;
  }>;
  contact: OrderContactPII | null;
  deliveryAddresses: DeliveryAddressPII[];
  recipients: RecipientPII[];
  deliveryGroupMappings: Array<{
    deliveryGroupId: string;
    addressId: string;
    recipientId: string;
  }>;
  deliveryMethods: Array<{
    code: string;
    provider: string;
    deliveryGroupId: string;
    deliveryMethodType: string;
    paymentModel: string | null;
    metadata: Record<string, unknown> | null;
    customerInput: Record<string, unknown> | null;
  }>;
  selectedDeliveryMethods: Array<{
    deliveryGroupId: string;
    code: string;
    provider: string;
  }>;
  paymentMethods: Array<{
    code: string;
    provider: string;
    flow: string;
    metadata: Record<string, unknown> | null;
    customerInput: Record<string, unknown> | null;
  }>;
  selectedPaymentMethod: { code: string; provider: string } | null;
  createdAt: Date;
}>;

export type OrderLoyaltyRewardRecord = Readonly<{
  id: string;
  storeId: string;
  snapshot: CheckoutSnapshot;
}>;

const minor = (value: Money | null): bigint | null =>
  value == null ? null : value.amountMinor();

const jsonSafe = (value: unknown): Record<string, unknown> =>
  JSON.parse(JSON.stringify(value, (_key, item) =>
    typeof item === "bigint" ? item.toString() : item,
  )) as Record<string, unknown>;

export class OrderRepository extends BaseRepository {
  constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    private readonly orderNumbers: OrderNumberRepository,
    private readonly pii: OrdersPiiRepository,
    private readonly idempotency: IdempotencyRepository,
  ) {
    super(db, txManager);
  }

  async exists(id: string): Promise<boolean> {
    const rows = await this.connection
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    return rows.length > 0;
  }

  async findLoyaltyRewardRecord(id: string): Promise<OrderLoyaltyRewardRecord | null> {
    const [row] = await this.connection
      .select({ id: orders.id, storeId: orders.storeId, checkoutSnapshot: orders.checkoutSnapshot })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    return row
      ? {
          id: row.id,
          storeId: row.storeId,
          snapshot: row.checkoutSnapshot as unknown as CheckoutSnapshot,
        }
      : null;
  }

  async create(input: OrderCreateData): Promise<void> {
    const orderNumber = await this.orderNumbers.reserve(input.storeId);

    await this.connection.insert(orders).values({
      id: input.id,
      storeId: input.storeId,
      orderNumber: BigInt(orderNumber),
      apiKeyId: null,
      userId: input.userId,
      salesChannel: input.salesChannel,
      externalSource: input.externalSource,
      externalId: input.externalId,
      localeCode: input.localeCode,
      currencyCode: input.currencyCode,
      subtotal: input.subtotalAmount.amountMinor(),
      shippingTotal: input.totalShippingAmount.amountMinor(),
      discountTotal: input.totalDiscountAmount.amountMinor(),
      taxTotal: input.totalTaxAmount.amountMinor(),
      grandTotal: input.totalAmount.amountMinor(),
      status: "DRAFT",
      metadata: {},
      checkoutSnapshot: jsonSafe(input.checkoutSnapshot),
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    });

    if (input.lines.length > 0) {
      await this.connection.insert(orderItems).values(input.lines.map((line) => {
        const unitPrice = coerceMoney(line.unit.price);
        const compareAtPrice = coerceNullableMoney(line.unit.compareAtPrice);
        const subtotal = unitPrice.multiply(line.quantity).normalizeScale();
        const zero = Money.zero(unitPrice.currency().code);
        return {
          id: line.lineId,
          storeId: input.storeId,
          orderId: input.id,
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
          createdAt: input.createdAt,
          updatedAt: input.createdAt,
        };
      }));
    }

    if (input.deliveryAddresses.length > 0) {
      await this.pii.insertDeliveryAddresses(input.deliveryAddresses);
    }
    if (input.recipients.length > 0) {
      await this.pii.insertRecipients(input.recipients);
    }

    if (input.deliveryGroups.length > 0) {
      const mappings = new Map(input.deliveryGroupMappings.map((value) => [value.deliveryGroupId, value]));
      await this.connection.insert(orderDeliveryGroups).values(
        input.deliveryGroups.map((group) => ({
          id: group.id,
          storeId: input.storeId,
          orderId: input.id,
          addressId: mappings.get(group.id)?.addressId ?? null,
          recipientId: mappings.get(group.id)?.recipientId ?? null,
          selectedDeliveryMethodCode: null,
          selectedDeliveryMethodProvider: null,
          lineItemIds: group.orderLineIds,
          createdAt: input.createdAt,
          updatedAt: input.createdAt,
        })),
      );
    }

    if (input.deliveryMethods.length > 0) {
      await this.connection.insert(orderDeliveryMethods).values(
        input.deliveryMethods.map((method) => ({
          code: method.code,
          provider: method.provider,
          storeId: input.storeId,
          deliveryGroupId: method.deliveryGroupId,
          deliveryMethodType: method.deliveryMethodType,
          paymentModel: method.paymentModel,
          metadata: method.metadata ?? {},
          customerInput: method.customerInput ?? {},
        })),
      );
    }

    for (const selected of input.selectedDeliveryMethods) {
      await this.connection
        .update(orderDeliveryGroups)
        .set({
          selectedDeliveryMethodCode: selected.code,
          selectedDeliveryMethodProvider: selected.provider,
          updatedAt: input.createdAt,
        })
        .where(eq(orderDeliveryGroups.id, selected.deliveryGroupId));
    }

    if (input.paymentMethods.length > 0) {
      await this.connection.insert(orderPaymentMethods).values(
        input.paymentMethods.map((method) => ({
          orderId: input.id,
          storeId: input.storeId,
          code: method.code,
          provider: method.provider,
          flow: method.flow,
          metadata: method.metadata ?? {},
          customerInput: method.customerInput ?? {},
        })),
      );
    }

    if (input.selectedPaymentMethod) {
      await this.connection.insert(orderSelectedPaymentMethods).values({
        orderId: input.id,
        storeId: input.storeId,
        code: input.selectedPaymentMethod.code,
        provider: input.selectedPaymentMethod.provider,
      });
    }

    if (input.appliedDiscounts.length > 0) {
      await this.connection.insert(orderAppliedDiscounts).values(
        input.appliedDiscounts.map((discount) => ({
          orderId: input.id,
          storeId: input.storeId,
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

    if (input.contact) {
      await this.pii.upsertOrderContacts(input.contact);
    }

    const requestHash = createHash("sha256")
      .update(JSON.stringify({
        storeId: input.storeId,
        currencyCode: input.currencyCode,
        salesChannel: input.salesChannel,
      }))
      .digest("hex");
    await this.idempotency.save({
      storeId: input.storeId,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      response: { id: input.id },
    });
  }
}
