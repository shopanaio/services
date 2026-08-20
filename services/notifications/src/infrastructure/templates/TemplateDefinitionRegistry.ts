import type {
  NotificationAudience,
  NotificationChannel,
  NotificationDefinitionKey,
  NotificationDefinitionMetadata,
} from "@shopana/broker-types";
import { NOTIFICATION_DEFINITION_KEYS } from "@shopana/broker-types";
import { z } from "zod";
import { getDefinitionContract } from "./DefinitionContracts.js";

export type NotificationTrigger = { kind: "EVENT"; eventType: string } | { kind: "ACTION" };

export interface RetentionPolicy {
  snapshotDays: number;
  renderedContentHours: number;
}

export interface NotificationDefinition extends Omit<
  NotificationDefinitionMetadata,
  "enabled" | "activeChannels"
> {
  title: string;
  triggers: readonly NotificationTrigger[];
  dataSchema: z.ZodType<Record<string, unknown>>;
  recipientPolicy: "SNAPSHOT" | "STAFF_CONFIGURATION";
  retentionPolicy: RetentionPolicy;
}

const event = (eventType: string): NotificationTrigger => ({
  kind: "EVENT",
  eventType,
});
const action = (): NotificationTrigger => ({ kind: "ACTION" });

const manifest = [
  ["customer.order.confirmation", "Order confirmation", event("orderCreated"), "CUSTOMER", false],
  [
    "customer.draft_order.invoice",
    "Draft order invoice",
    event("draftOrderInvoiceRequested"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.shipping.confirmation",
    "Shipping confirmation",
    event("orderFulfilled"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.local_pickup.ready",
    "Ready for local pickup",
    event("localPickupReady"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.local_pickup.picked_up",
    "Picked up by customer",
    event("localPickupCompleted"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.local_delivery.out_for_delivery",
    "Order out for local delivery",
    event("localDeliveryStarted"),
    "CUSTOMER",
    true,
  ],
  [
    "customer.local_delivery.delivered",
    "Order locally delivered",
    event("localDeliveryCompleted"),
    "CUSTOMER",
    true,
  ],
  [
    "customer.local_delivery.missed",
    "Order missed local delivery",
    event("localDeliveryMissed"),
    "CUSTOMER",
    true,
  ],
  ["customer.gift_card.new", "New gift card", event("giftCardIssued"), "CUSTOMER", false],
  [
    "customer.gift_card.receipt",
    "Gift card receipt",
    event("giftCardRecipientAssigned"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.store_credit.issued",
    "Store credit issued",
    event("storeCreditIssued"),
    "CUSTOMER",
    false,
  ],
  ["customer.order.invoice", "Order invoice", event("orderInvoiceRequested"), "CUSTOMER", false],
  ["customer.order.edited", "Order edited", event("orderEdited"), "CUSTOMER", false],
  ["customer.order.cancelled", "Order cancelled", event("orderCancelled"), "CUSTOMER", false],
  [
    "customer.order.payment_receipt",
    "Order payment receipt",
    event("orderPaymentReceiptRequested"),
    "CUSTOMER",
    false,
  ],
  ["customer.order.refund", "Order refund", event("orderRefunded"), "CUSTOMER", false],
  [
    "customer.checkout.abandoned",
    "Abandoned checkout",
    event("checkoutAbandoned"),
    "CUSTOMER",
    false,
  ],
  ["customer.order.link", "Order link", event("orderStatusLinkRequested"), "CUSTOMER", false],
  ["customer.payment.error", "Payment error", event("checkoutPaymentFailed"), "CUSTOMER", false],
  [
    "customer.payment.pending_error",
    "Pending payment error",
    event("pendingPaymentFailed"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.payment.pending_success",
    "Pending payment success",
    event("pendingPaymentSucceeded"),
    "CUSTOMER",
    false,
  ],
  ["customer.payment.reminder", "Payment reminder", event("paymentReminderDue"), "CUSTOMER", false],
  [
    "customer.pos.abandoned_checkout",
    "POS abandoned checkout",
    event("posCheckoutAbandoned"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.pos.email_to_customer",
    "POS email to customer",
    event("posCartEmailRequested"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.pos.receipt",
    "POS and mobile receipt",
    event("posReceiptRequested"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.pos.exchange_receipt",
    "POS exchange receipt",
    event("posExchangeReceiptRequested"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.shipping.updated",
    "Shipping update",
    event("shippingTrackingUpdated"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.shipping.out_for_delivery",
    "Out for delivery",
    event("shipmentOutForDelivery"),
    "CUSTOMER",
    true,
  ],
  ["customer.shipping.delivered", "Delivered", event("shipmentDelivered"), "CUSTOMER", true],
  ["customer.return.created", "Return created", event("returnCreated"), "CUSTOMER", false],
  [
    "customer.return.order_label_created",
    "Order-level return label created",
    event("returnLabelCreated"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.return.request_received",
    "Return request received",
    event("returnRequestReceived"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.return.request_approved",
    "Return request approved",
    event("returnRequestApproved"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.return.request_declined",
    "Return request declined",
    event("returnRequestDeclined"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.change_request.received",
    "Change request received",
    event("orderChangeRequestReceived"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.cancellation_request.declined",
    "Cancellation request declined",
    event("cancellationRequestDeclined"),
    "CUSTOMER",
    false,
  ],
  ["customer.account.invite", "Customer account invite", action(), "CUSTOMER", false],
  [
    "customer.account.welcome",
    "Customer account welcome",
    event("customerAccountActivated"),
    "CUSTOMER",
    false,
  ],
  [
    "customer.account.password_reset",
    "Customer account password reset",
    action(),
    "CUSTOMER",
    false,
  ],
  [
    "customer.account.payment_method_add_request",
    "Customer payment method add request",
    action(),
    "CUSTOMER",
    false,
  ],
  ["customer.b2b.access", "B2B access email", event("b2bAccessGranted"), "CUSTOMER", false],
  [
    "customer.b2b.location_payment_method_update",
    "B2B location payment method update",
    action(),
    "CUSTOMER",
    false,
  ],
  ["customer.contact", "Contact customer", action(), "CUSTOMER", false],
  [
    "customer.email_change.confirmation",
    "Customer email change confirmation",
    action(),
    "CUSTOMER",
    false,
  ],
  ["customer.auth.email_verification", "Email verification", action(), "CUSTOMER", false],
  ["customer.auth.login_code", "Login code or magic link", action(), "CUSTOMER", false],
  [
    "customer.auth.new_login_alert",
    "New login alert",
    event("customerNewLoginDetected"),
    "CUSTOMER",
    true,
  ],
  ["customer.auth.password_reset", "Authentication password reset", action(), "CUSTOMER", false],
  [
    "customer.auth.account_deletion_confirmation",
    "Account deletion confirmation",
    action(),
    "CUSTOMER",
    false,
  ],
  [
    "customer.marketing.confirmation",
    "Customer marketing confirmation",
    action(),
    "CUSTOMER",
    true,
  ],
  [
    "customer.privacy.request_update",
    "Privacy request update",
    event("customerDataRequestStatusChanged"),
    "CUSTOMER",
    false,
  ],
  ["staff.order.new", "New order", event("orderCreated"), "STAFF", true],
  [
    "staff.order.change_request.new",
    "New change request",
    event("orderChangeRequestReceived"),
    "STAFF",
    true,
  ],
  [
    "staff.order.sales_attribution_edited",
    "Sales attribution edited",
    event("orderSalesAttributionEdited"),
    "STAFF",
    true,
  ],
  ["staff.draft_order.new", "New draft order", event("draftOrderSubmitted"), "STAFF", true],
] as const satisfies readonly [
  readonly [NotificationDefinitionKey, string, NotificationTrigger, NotificationAudience, boolean],
  ...ReadonlyArray<
    readonly [NotificationDefinitionKey, string, NotificationTrigger, NotificationAudience, boolean]
  >,
];

export class TemplateDefinitionRegistry {
  static readonly VERSION = "2026-08-v6";

  private readonly definitions: ReadonlyMap<NotificationDefinitionKey, NotificationDefinition>;
  private readonly eventIndex: ReadonlyMap<string, readonly NotificationDefinition[]>;

  constructor() {
    const definitions = manifest.map(
      ([key, title, trigger, audience, optional]): NotificationDefinition => {
        const contract = getDefinitionContract(key);
        return {
          key,
          title,
          triggers: [trigger],
          audience,
          optional,
          allowedChannels: ["EMAIL", "SMS"],
          defaultChannels: ["EMAIL"],
          dataSchema: contract.dataSchema,
          recipientPolicy: audience === "STAFF" ? "STAFF_CONFIGURATION" : "SNAPSHOT",
          variables: contract.variables,
          retentionPolicy: key.startsWith("customer.auth.")
            ? { snapshotDays: 7, renderedContentHours: 1 }
            : { snapshotDays: 30, renderedContentHours: 24 },
        };
      },
    );

    this.definitions = new Map(definitions.map((definition) => [definition.key, definition]));
    const eventIndex = new Map<string, NotificationDefinition[]>();
    for (const definition of definitions) {
      for (const trigger of definition.triggers) {
        if (trigger.kind !== "EVENT") continue;
        const entries = eventIndex.get(trigger.eventType) ?? [];
        entries.push(definition);
        eventIndex.set(trigger.eventType, entries);
      }
    }
    this.eventIndex = eventIndex;
    this.assertInvariants();
  }

  get(key: NotificationDefinitionKey): NotificationDefinition {
    const definition = this.definitions.get(key);
    if (!definition) throw new Error(`Unknown notification definition ${key}`);
    return definition;
  }

  list(): readonly NotificationDefinition[] {
    return [...this.definitions.values()];
  }

  forEvent(eventType: string): readonly NotificationDefinition[] {
    return this.eventIndex.get(eventType) ?? [];
  }

  listEventTypes(): readonly string[] {
    return [...this.eventIndex.keys()].sort();
  }

  private assertInvariants(): void {
    if (this.definitions.size !== 55 || NOTIFICATION_DEFINITION_KEYS.length !== 55) {
      throw new Error("Notification registry must contain exactly 55 keys");
    }
    for (const key of NOTIFICATION_DEFINITION_KEYS) {
      if (!this.definitions.has(key)) {
        throw new Error(`Notification registry is missing ${key}`);
      }
    }
  }
}
