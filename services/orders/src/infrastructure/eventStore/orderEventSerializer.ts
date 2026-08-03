import { Money } from "@shopana/shared-money";
import type { OrderCreated, OrderCreatedPayload, OrderEvent } from "@src/domain/order/events";
import { coerceToDate } from "@src/utils/date";

type JsonObject = Record<string, unknown>;

function reviveMoney(value: unknown): Money {
  return Money.fromJSON(value as Parameters<typeof Money.fromJSON>[0]);
}

function reviveOptionalMoney(value: unknown): Money | null {
  return value == null ? null : reviveMoney(value);
}

export function serializeOrderEvent(event: OrderEvent): {
  type: string;
  data: JsonObject;
  metadata: JsonObject;
} {
  return JSON.parse(JSON.stringify(event, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  )) as {
    type: string;
    data: JsonObject;
    metadata: JsonObject;
  };
}

export function deserializeOrderEvent(input: {
  type: string;
  data: JsonObject;
  metadata: JsonObject;
}): OrderEvent {
  if (input.type !== "order.created") {
    throw new Error(`Unsupported order event type: ${input.type}`);
  }

  const data = input.data as unknown as OrderCreatedPayload;
  const checkoutSnapshot = data.checkoutSnapshot;
  const event: OrderCreated = {
    type: "order.created",
    data: {
      ...data,
      subtotalAmount: reviveMoney(data.subtotalAmount),
      totalDiscountAmount: reviveMoney(data.totalDiscountAmount),
      totalTaxAmount: reviveMoney(data.totalTaxAmount),
      totalShippingAmount: reviveMoney(data.totalShippingAmount),
      totalAmount: reviveMoney(data.totalAmount),
      lines: data.lines.map((line) => ({
        ...line,
        unit: {
          ...line.unit,
          price: reviveMoney(line.unit.price),
          compareAtPrice: reviveOptionalMoney(line.unit.compareAtPrice),
        },
      })),
      deliveryGroups: data.deliveryGroups.map((group) => ({
        ...group,
        deliveryCost: group.deliveryCost == null ? null : {
          ...group.deliveryCost,
          amount: reviveMoney(group.deliveryCost.amount),
        },
      })),
      appliedDiscounts: data.appliedDiscounts.map((discount) => ({
        ...discount,
        appliedAt: coerceToDate(discount.appliedAt),
        value: typeof discount.value === "number"
          ? discount.value
          : reviveMoney(discount.value),
      })),
      checkoutSnapshot: {
        ...checkoutSnapshot,
        capturedAt: coerceToDate(checkoutSnapshot.capturedAt),
        lines: checkoutSnapshot.lines.map((line) => ({
          ...line,
          unit: { ...line.unit, price: reviveMoney(line.unit.price) },
        })),
        deliveryGroups: checkoutSnapshot.deliveryGroups.map((group) => ({
          ...group,
          shippingCost: group.shippingCost == null ? null : {
            ...group.shippingCost,
            amount: reviveMoney(group.shippingCost.amount),
          },
        })),
        appliedPromoCodes: checkoutSnapshot.appliedPromoCodes.map((promo) => ({
          ...promo,
          value: typeof promo.value === "number" ? promo.value : reviveMoney(promo.value),
        })),
      },
    },
    metadata: {
      ...(input.metadata as unknown as OrderCreated["metadata"]),
      now: coerceToDate(input.metadata.now),
    },
  };

  return event;
}
