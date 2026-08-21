import type { NotificationSnapshot } from "@shopana/events";
import { Money } from "@shopana/shared-money";
import type { OrderNotificationFacts } from "../../repositories/order/OrderRepository.js";

/**
 * Builds the customer-facing notification snapshot attached to canonical order
 * lifecycle events consumed by the notifications service. The `order` block
 * mirrors `OrderCreatedNotificationData`, so every order notification template
 * reads the same shape regardless of which event produced it.
 */
export function orderNotificationSnapshot(
  facts: OrderNotificationFacts,
  data: Record<string, unknown> = {},
): NotificationSnapshot<Record<string, unknown>> {
  const name = [facts.firstName, facts.lastName].filter(Boolean).join(" ") || undefined;
  const recipient: Record<string, unknown> = {
    ...(facts.customerId ? { customerId: facts.customerId } : {}),
    ...(facts.email ? { email: facts.email } : {}),
    ...(facts.phoneE164 ? { phone: facts.phoneE164 } : {}),
    ...(facts.localeCode ? { locale: facts.localeCode } : {}),
    ...(name ? { name } : {}),
  };
  return {
    storeId: facts.storeId,
    ...(facts.localeCode ? { locale: facts.localeCode } : {}),
    recipients: [recipient],
    data: {
      order: {
        id: facts.orderId,
        number: facts.orderNumber,
        currencyCode: facts.currencyCode,
        totalAmount: Money.fromMinor(
          BigInt(facts.totalAmountMinor),
          facts.currencyCode,
        ).toRoundedUnit(),
        createdAt: facts.createdAt,
      },
      ...data,
    },
  };
}
