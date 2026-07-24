import type {
  NotificationAudience,
  NotificationChannel,
  NotificationDefinitionKey,
  NotificationDefinitionMetadata,
  NotificationTemplateVariable,
} from "@shopana/broker-types";
import { NOTIFICATION_DEFINITION_KEYS } from "@shopana/broker-types";
import { z } from "zod";

export type NotificationTrigger =
  | {
      kind: "EVENT";
      eventType: string;
      allowedProducerServices: readonly string[];
    }
  | { kind: "ACTION"; allowedCallerServices: readonly string[] }
  | { kind: "SCHEDULE"; scheduleOwner: "notifications" };

export interface RetentionPolicy {
  snapshotDays: number;
  renderedContentHours: number;
}

export interface NotificationDefinition
  extends Omit<NotificationDefinitionMetadata, "enabled" | "activeChannels"> {
  title: string;
  triggers: readonly NotificationTrigger[];
  dataSchema: z.ZodType<Record<string, unknown>>;
  recipientPolicy:
    | "SNAPSHOT"
    | "STAFF_CONFIGURATION"
    | "INTEGRATION_ROUTE";
  retentionPolicy: RetentionPolicy;
}

const boundedString = z.string().min(1).max(4_096);
const nullableString = z.string().max(4_096).nullable();
const moneySchema = z.object({
  amount: z.number().int(),
  currencyCode: z.string().length(3),
});
const storeSchema = z
  .object({
    id: boundedString,
    displayName: boundedString,
    defaultLocale: z.string().min(2).max(16),
    timezone: z.string().min(1).max(64),
  })
  .strict();
const customerSchema = z
  .object({
    id: boundedString.optional(),
    firstName: nullableString.optional(),
    lastName: nullableString.optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().max(64).nullable().optional(),
  })
  .strict();
const orderSchema = z
  .object({
    id: boundedString,
    number: boundedString,
    statusUrl: z.string().url().max(4_096).optional(),
    currencyCode: z.string().length(3),
    totalAmount: z.number().int(),
    createdAt: z.string().datetime(),
  })
  .strict();
const itemSchema = z
  .object({
    title: boundedString,
    quantity: z.number().int().positive(),
    unitAmount: z.number().int(),
    lineAmount: z.number().int(),
  })
  .strict();

const notificationDataSchema = z
  .object({
    store: storeSchema,
    customer: customerSchema.optional(),
    order: orderSchema.optional(),
    items: z.array(itemSchema).max(500).optional(),
    payment: z
      .object({
        id: boundedString.optional(),
        status: boundedString.optional(),
        amount: moneySchema.optional(),
        dueAt: z.string().datetime().optional(),
        errorMessage: z.string().max(2_000).optional(),
      })
      .strict()
      .optional(),
    fulfillment: z
      .object({
        id: boundedString.optional(),
        trackingNumber: boundedString.optional(),
        trackingUrl: z.string().url().max(4_096).optional(),
        carrier: boundedString.optional(),
      })
      .strict()
      .optional(),
    account: z
      .object({
        actionUrl: z.string().url().max(4_096).optional(),
        companyName: boundedString.optional(),
        locationName: boundedString.optional(),
      })
      .strict()
      .optional(),
    authentication: z
      .object({
        actionUrl: z.string().url().max(4_096).optional(),
        code: z.string().max(256).optional(),
        device: z.string().max(512).optional(),
        location: z.string().max(512).optional(),
        expiresAt: z.string().datetime().optional(),
      })
      .strict()
      .optional(),
    giftCard: z
      .object({
        code: boundedString.optional(),
        amount: moneySchema.optional(),
        expiresAt: z.string().datetime().optional(),
      })
      .strict()
      .optional(),
    storeCredit: z.object({ amount: moneySchema }).strict().optional(),
    return: z
      .object({
        id: boundedString.optional(),
        status: boundedString.optional(),
        labelUrl: z.string().url().max(4_096).optional(),
      })
      .strict()
      .optional(),
    summary: z
      .object({
        periodStart: z.string().datetime(),
        periodEnd: z.string().datetime(),
        orderCount: z.number().int().nonnegative(),
        total: moneySchema,
      })
      .strict()
      .optional(),
    message: z.string().max(20_000).optional(),
    integration: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  })
  .strict();

const variables: readonly NotificationTemplateVariable[] = [
  {
    path: "store",
    type: "STRING",
    required: true,
    description: "Store snapshot",
    children: [
      { path: "store.id", type: "STRING", required: true, description: "Store ID" },
      { path: "store.displayName", type: "STRING", required: true, description: "Store display name" },
      { path: "store.defaultLocale", type: "STRING", required: true, description: "Store locale" },
      { path: "store.timezone", type: "STRING", required: true, description: "Store timezone" },
    ],
  },
  {
    path: "customer",
    type: "STRING",
    required: false,
    description: "Customer snapshot",
    children: [
      { path: "customer.id", type: "STRING", required: false, description: "Customer ID" },
      { path: "customer.firstName", type: "STRING", required: false, description: "First name" },
      { path: "customer.lastName", type: "STRING", required: false, description: "Last name" },
      { path: "customer.email", type: "STRING", required: false, description: "Email" },
      { path: "customer.phone", type: "STRING", required: false, description: "Phone" },
    ],
  },
  {
    path: "order",
    type: "STRING",
    required: false,
    description: "Order snapshot",
    children: [
      { path: "order.id", type: "STRING", required: false, description: "Order ID" },
      { path: "order.number", type: "STRING", required: false, description: "Order number" },
      { path: "order.statusUrl", type: "URL", required: false, description: "Status URL" },
      { path: "order.currencyCode", type: "STRING", required: false, description: "Currency" },
      { path: "order.totalAmount", type: "MONEY", required: false, description: "Total in minor units" },
      { path: "order.createdAt", type: "DATE", required: false, description: "Created time" },
    ],
  },
  {
    path: "items",
    type: "ARRAY",
    required: false,
    description: "Order line items",
    children: [
      { path: "items.title", type: "STRING", required: true, description: "Item title" },
      { path: "items.quantity", type: "NUMBER", required: true, description: "Quantity" },
      { path: "items.unitAmount", type: "MONEY", required: true, description: "Unit amount" },
      { path: "items.lineAmount", type: "MONEY", required: true, description: "Line amount" },
    ],
  },
  {
    path: "payment",
    type: "STRING",
    required: false,
    description: "Payment snapshot",
    children: [
      { path: "payment.id", type: "STRING", required: false, description: "Payment ID" },
      { path: "payment.status", type: "STRING", required: false, description: "Payment status" },
      { path: "payment.amount", type: "MONEY", required: false, description: "Payment amount" },
      { path: "payment.amount.amount", type: "NUMBER", required: false, description: "Payment amount in minor units" },
      { path: "payment.amount.currencyCode", type: "STRING", required: false, description: "Payment currency" },
      { path: "payment.dueAt", type: "DATE", required: false, description: "Payment due time" },
      { path: "payment.errorMessage", type: "STRING", required: false, description: "Payment error" },
    ],
  },
  {
    path: "fulfillment",
    type: "STRING",
    required: false,
    description: "Fulfillment snapshot",
    children: [
      { path: "fulfillment.id", type: "STRING", required: false, description: "Fulfillment ID" },
      { path: "fulfillment.trackingNumber", type: "STRING", required: false, description: "Tracking number" },
      { path: "fulfillment.trackingUrl", type: "URL", required: false, description: "Tracking URL" },
      { path: "fulfillment.carrier", type: "STRING", required: false, description: "Carrier" },
    ],
  },
  {
    path: "account",
    type: "STRING",
    required: false,
    description: "Account action snapshot",
    children: [
      { path: "account.actionUrl", type: "URL", required: false, description: "Account action URL" },
      { path: "account.companyName", type: "STRING", required: false, description: "Company name" },
      { path: "account.locationName", type: "STRING", required: false, description: "Location name" },
    ],
  },
  {
    path: "authentication",
    type: "STRING",
    required: false,
    description: "Authentication action snapshot",
    children: [
      { path: "authentication.actionUrl", type: "URL", required: false, description: "Authentication action URL" },
      { path: "authentication.code", type: "STRING", required: false, description: "Authentication code" },
      { path: "authentication.device", type: "STRING", required: false, description: "Device" },
      { path: "authentication.location", type: "STRING", required: false, description: "Login location" },
      { path: "authentication.expiresAt", type: "DATE", required: false, description: "Expiration time" },
    ],
  },
  {
    path: "giftCard",
    type: "STRING",
    required: false,
    description: "Gift card snapshot",
    children: [
      { path: "giftCard.code", type: "STRING", required: false, description: "Gift card code" },
      { path: "giftCard.amount", type: "MONEY", required: false, description: "Gift card amount" },
      { path: "giftCard.amount.amount", type: "NUMBER", required: false, description: "Gift card amount in minor units" },
      { path: "giftCard.amount.currencyCode", type: "STRING", required: false, description: "Gift card currency" },
      { path: "giftCard.expiresAt", type: "DATE", required: false, description: "Gift card expiration time" },
    ],
  },
  {
    path: "storeCredit",
    type: "STRING",
    required: false,
    description: "Store credit snapshot",
    children: [
      { path: "storeCredit.amount", type: "MONEY", required: false, description: "Store credit amount" },
      { path: "storeCredit.amount.amount", type: "NUMBER", required: false, description: "Store credit amount in minor units" },
      { path: "storeCredit.amount.currencyCode", type: "STRING", required: false, description: "Store credit currency" },
    ],
  },
  {
    path: "return",
    type: "STRING",
    required: false,
    description: "Return snapshot",
    children: [
      { path: "return.id", type: "STRING", required: false, description: "Return ID" },
      { path: "return.status", type: "STRING", required: false, description: "Return status" },
      { path: "return.labelUrl", type: "URL", required: false, description: "Return label URL" },
    ],
  },
  {
    path: "summary",
    type: "STRING",
    required: false,
    description: "Order summary snapshot",
    children: [
      { path: "summary.periodStart", type: "DATE", required: false, description: "Summary period start" },
      { path: "summary.periodEnd", type: "DATE", required: false, description: "Summary period end" },
      { path: "summary.orderCount", type: "NUMBER", required: false, description: "Order count" },
      { path: "summary.total", type: "MONEY", required: false, description: "Order total" },
      { path: "summary.total.amount", type: "NUMBER", required: false, description: "Order total in minor units" },
      { path: "summary.total.currencyCode", type: "STRING", required: false, description: "Order total currency" },
    ],
  },
  { path: "message", type: "STRING", required: false, description: "Trusted plain-text staff message" },
  {
    path: "integration",
    type: "STRING",
    required: false,
    description: "Structured integration fields",
    children: [
      {
        path: "integration.*",
        type: "STRING",
        required: false,
        description: "Provider-specific scalar integration field",
      },
    ],
  },
] as const;

interface ManifestEntry {
  key: NotificationDefinitionKey;
  title: string;
  trigger: NotificationTrigger;
  audience: NotificationAudience;
  optional: boolean;
}

const event = (
  eventType: string,
  ...allowedProducerServices: string[]
): NotificationTrigger => ({
  kind: "EVENT",
  eventType,
  allowedProducerServices,
});
const orderEvent = (eventType: string): NotificationTrigger =>
  event(eventType, "orders", "order");
const action = (...allowedCallerServices: string[]): NotificationTrigger => ({
  kind: "ACTION",
  allowedCallerServices,
});
const schedule: NotificationTrigger = {
  kind: "SCHEDULE",
  scheduleOwner: "notifications",
};

const manifest = [
  ["customer.order.confirmation", "Order confirmation", orderEvent("orderCreated"), "CUSTOMER", false],
  ["customer.draft_order.invoice", "Draft order invoice", orderEvent("draftOrderInvoiceRequested"), "CUSTOMER", false],
  ["customer.shipping.confirmation", "Shipping confirmation", orderEvent("orderFulfilled"), "CUSTOMER", false],
  ["customer.local_pickup.ready", "Ready for local pickup", event("localPickupReady", "delivery", "shipping"), "CUSTOMER", false],
  ["customer.local_pickup.picked_up", "Picked up by customer", event("localPickupCompleted", "delivery", "shipping"), "CUSTOMER", false],
  ["customer.local_delivery.out_for_delivery", "Order out for local delivery", event("localDeliveryStarted", "delivery", "shipping"), "CUSTOMER", true],
  ["customer.local_delivery.delivered", "Order locally delivered", event("localDeliveryCompleted", "delivery", "shipping"), "CUSTOMER", true],
  ["customer.local_delivery.missed", "Order missed local delivery", event("localDeliveryMissed", "delivery", "shipping"), "CUSTOMER", true],
  ["customer.gift_card.new", "New gift card", event("giftCardIssued", "customers"), "CUSTOMER", false],
  ["customer.gift_card.receipt", "Gift card receipt", event("giftCardRecipientAssigned", "customers"), "CUSTOMER", false],
  ["customer.store_credit.issued", "Store credit issued", event("storeCreditIssued", "customers"), "CUSTOMER", false],
  ["customer.order.invoice", "Order invoice", orderEvent("orderInvoiceRequested"), "CUSTOMER", false],
  ["customer.order.edited", "Order edited", orderEvent("orderEdited"), "CUSTOMER", false],
  ["customer.order.cancelled", "Order cancelled", orderEvent("orderCancelled"), "CUSTOMER", false],
  ["customer.order.payment_receipt", "Order payment receipt", orderEvent("orderPaymentReceiptRequested"), "CUSTOMER", false],
  ["customer.order.refund", "Order refund", orderEvent("orderRefunded"), "CUSTOMER", false],
  ["customer.checkout.abandoned", "Abandoned checkout", event("checkoutAbandoned", "checkout"), "CUSTOMER", false],
  ["customer.order.link", "Order link", orderEvent("orderStatusLinkRequested"), "CUSTOMER", false],
  ["customer.payment.error", "Payment error", event("checkoutPaymentFailed", "checkout"), "CUSTOMER", false],
  ["customer.payment.pending_error", "Pending payment error", event("pendingPaymentFailed", "payments"), "CUSTOMER", false],
  ["customer.payment.pending_success", "Pending payment success", event("pendingPaymentSucceeded", "payments"), "CUSTOMER", false],
  ["customer.payment.reminder", "Payment reminder", event("paymentReminderDue", "payments", "orders", "order"), "CUSTOMER", false],
  ["customer.pos.abandoned_checkout", "POS abandoned checkout", event("posCheckoutAbandoned", "checkout"), "CUSTOMER", false],
  ["customer.pos.email_to_customer", "POS email to customer", event("posCartEmailRequested", "checkout"), "CUSTOMER", false],
  ["customer.pos.receipt", "POS and mobile receipt", orderEvent("posReceiptRequested"), "CUSTOMER", false],
  ["customer.pos.exchange_receipt", "POS exchange receipt", orderEvent("posExchangeReceiptRequested"), "CUSTOMER", false],
  ["customer.shipping.updated", "Shipping update", event("shippingTrackingUpdated", "delivery", "shipping"), "CUSTOMER", false],
  ["customer.shipping.out_for_delivery", "Out for delivery", event("shipmentOutForDelivery", "delivery", "shipping"), "CUSTOMER", true],
  ["customer.shipping.delivered", "Delivered", event("shipmentDelivered", "delivery", "shipping"), "CUSTOMER", true],
  ["customer.return.created", "Return created", orderEvent("returnCreated"), "CUSTOMER", false],
  ["customer.return.order_label_created", "Order-level return label created", event("returnLabelCreated", "orders", "order", "delivery", "shipping"), "CUSTOMER", false],
  ["customer.return.request_received", "Return request received", orderEvent("returnRequestReceived"), "CUSTOMER", false],
  ["customer.return.request_approved", "Return request approved", orderEvent("returnRequestApproved"), "CUSTOMER", false],
  ["customer.return.request_declined", "Return request declined", orderEvent("returnRequestDeclined"), "CUSTOMER", false],
  ["customer.change_request.received", "Change request received", orderEvent("orderChangeRequestReceived"), "CUSTOMER", false],
  ["customer.cancellation_request.declined", "Cancellation request declined", orderEvent("cancellationRequestDeclined"), "CUSTOMER", false],
  ["customer.account.invite", "Customer account invite", action("customers"), "CUSTOMER", false],
  ["customer.account.welcome", "Customer account welcome", event("customerAccountActivated", "customers"), "CUSTOMER", false],
  ["customer.account.password_reset", "Customer account password reset", action("customers"), "CUSTOMER", false],
  ["customer.account.payment_method_add_request", "Customer payment method add request", action("customers"), "CUSTOMER", false],
  ["customer.b2b.access", "B2B access email", event("b2bAccessGranted", "customers"), "CUSTOMER", false],
  ["customer.b2b.location_payment_method_update", "B2B location payment method update", action("customers"), "CUSTOMER", false],
  ["customer.contact", "Contact customer", action("orders", "order", "customers"), "CUSTOMER", false],
  ["customer.email_change.confirmation", "Customer email change confirmation", action("customers"), "CUSTOMER", false],
  ["customer.auth.email_verification", "Email verification", action("iam"), "CUSTOMER", false],
  ["customer.auth.login_code", "Login code or magic link", action("iam"), "CUSTOMER", false],
  ["customer.auth.new_login_alert", "New login alert", event("customerNewLoginDetected", "iam"), "CUSTOMER", true],
  ["customer.auth.password_reset", "Authentication password reset", action("iam"), "CUSTOMER", false],
  ["customer.auth.account_deletion_confirmation", "Account deletion confirmation", action("iam"), "CUSTOMER", false],
  ["customer.marketing.confirmation", "Customer marketing confirmation", action("customers"), "CUSTOMER", true],
  ["staff.order.summary", "Store order summary", schedule, "STAFF", true],
  ["staff.order.new", "New order", orderEvent("orderCreated"), "STAFF", true],
  ["staff.order.change_request.new", "New change request", orderEvent("orderChangeRequestReceived"), "STAFF", true],
  ["staff.order.sales_attribution_edited", "Sales attribution edited", orderEvent("orderSalesAttributionEdited"), "STAFF", true],
  ["staff.draft_order.new", "New draft order", orderEvent("draftOrderSubmitted"), "STAFF", true],
  ["integration.fulfillment.request", "Fulfillment request notification", orderEvent("orderFulfilled"), "INTEGRATION", false],
] as const satisfies readonly [
  readonly [NotificationDefinitionKey, string, NotificationTrigger, NotificationAudience, boolean],
  ...ReadonlyArray<readonly [NotificationDefinitionKey, string, NotificationTrigger, NotificationAudience, boolean]>,
];

export class TemplateDefinitionRegistry {
  static readonly VERSION = "2026-07-v1";

  private readonly definitions: ReadonlyMap<
    NotificationDefinitionKey,
    NotificationDefinition
  >;
  private readonly eventIndex: ReadonlyMap<
    string,
    readonly NotificationDefinition[]
  >;

  constructor() {
    const definitions = manifest.map(
      ([key, title, trigger, audience, optional]): NotificationDefinition => {
        const integration = audience === "INTEGRATION";
        return {
          key,
          title,
          triggers: [trigger],
          audience,
          optional,
          allowedChannels: integration
            ? ["EMAIL", "INTEGRATION"]
            : ["EMAIL", "SMS"],
          defaultChannels: integration ? ["INTEGRATION"] : ["EMAIL"],
          dataSchema: notificationDataSchema as z.ZodType<
            Record<string, unknown>
          >,
          recipientPolicy:
            audience === "STAFF"
              ? "STAFF_CONFIGURATION"
              : integration
                ? "INTEGRATION_ROUTE"
                : "SNAPSHOT",
          variables,
          retentionPolicy: key.startsWith("customer.auth.")
            ? { snapshotDays: 7, renderedContentHours: 1 }
            : { snapshotDays: 30, renderedContentHours: 24 },
        };
      }
    );

    this.definitions = new Map(
      definitions.map((definition) => [definition.key, definition])
    );
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

  assertEventProducer(eventType: string, producer: string): void {
    const definitions = this.forEvent(eventType);
    if (definitions.length === 0) {
      throw new Error(`Event ${eventType} is not a notification trigger`);
    }
    if (
      definitions.some((definition) =>
        definition.triggers.some(
          (trigger) =>
            trigger.kind === "EVENT" &&
            trigger.eventType === eventType &&
            trigger.allowedProducerServices.includes(producer)
        )
      )
    ) {
      return;
    }
    throw new Error(`Producer ${producer} is not allowed for ${eventType}`);
  }

  assertActionCaller(key: NotificationDefinitionKey, caller: string): void {
    const allowed = this.get(key).triggers.some(
      (trigger) =>
        trigger.kind === "ACTION" &&
        trigger.allowedCallerServices.includes(caller)
    );
    if (!allowed) {
      throw new Error(`Caller ${caller} is not allowed to enqueue ${key}`);
    }
  }

  private assertInvariants(): void {
    if (
      this.definitions.size !== 56 ||
      NOTIFICATION_DEFINITION_KEYS.length !== 56
    ) {
      throw new Error("Notification registry must contain exactly 56 keys");
    }
    for (const key of NOTIFICATION_DEFINITION_KEYS) {
      if (!this.definitions.has(key)) {
        throw new Error(`Notification registry is missing ${key}`);
      }
    }
  }
}
