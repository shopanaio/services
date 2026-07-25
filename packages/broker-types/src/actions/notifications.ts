/**
 * Closed contracts for the notifications bounded context.
 */

export const NOTIFICATION_DEFINITION_KEYS = [
  "customer.order.confirmation",
  "customer.draft_order.invoice",
  "customer.shipping.confirmation",
  "customer.local_pickup.ready",
  "customer.local_pickup.picked_up",
  "customer.local_delivery.out_for_delivery",
  "customer.local_delivery.delivered",
  "customer.local_delivery.missed",
  "customer.gift_card.new",
  "customer.gift_card.receipt",
  "customer.store_credit.issued",
  "customer.order.invoice",
  "customer.order.edited",
  "customer.order.cancelled",
  "customer.order.payment_receipt",
  "customer.order.refund",
  "customer.checkout.abandoned",
  "customer.order.link",
  "customer.payment.error",
  "customer.payment.pending_error",
  "customer.payment.pending_success",
  "customer.payment.reminder",
  "customer.pos.abandoned_checkout",
  "customer.pos.email_to_customer",
  "customer.pos.receipt",
  "customer.pos.exchange_receipt",
  "customer.shipping.updated",
  "customer.shipping.out_for_delivery",
  "customer.shipping.delivered",
  "customer.return.created",
  "customer.return.order_label_created",
  "customer.return.request_received",
  "customer.return.request_approved",
  "customer.return.request_declined",
  "customer.change_request.received",
  "customer.cancellation_request.declined",
  "customer.account.invite",
  "customer.account.welcome",
  "customer.account.password_reset",
  "customer.account.payment_method_add_request",
  "customer.b2b.access",
  "customer.b2b.location_payment_method_update",
  "customer.contact",
  "customer.email_change.confirmation",
  "customer.auth.email_verification",
  "customer.auth.login_code",
  "customer.auth.new_login_alert",
  "customer.auth.password_reset",
  "customer.auth.account_deletion_confirmation",
  "customer.marketing.confirmation",
  "staff.order.new",
  "staff.order.change_request.new",
  "staff.order.sales_attribution_edited",
  "staff.draft_order.new",
] as const;

export type NotificationDefinitionKey =
  (typeof NOTIFICATION_DEFINITION_KEYS)[number];

export type NotificationChannel =
  | "EMAIL"
  | "SMS"
  | "WEBHOOK";

export type NotificationAudience = "CUSTOMER" | "STAFF";
export type NotificationPurpose = "BUSINESS" | "TEST";

export interface NotificationRecipientSnapshot {
  recipientId?: string;
  customerId?: string;
  userId?: string;
  email?: string;
  phone?: string;
  locale?: string;
  name?: string;
}

export interface NotificationSnapshot<TData = Record<string, unknown>> {
  storeId: string;
  locale?: string;
  recipients?: readonly NotificationRecipientSnapshot[];
  data: TData;
}

export interface NotificationTemplateVariable {
  path: string;
  type:
    | "STRING"
    | "NUMBER"
    | "MONEY"
    | "DATE"
    | "URL"
    | "BOOLEAN"
    | "ARRAY";
  required: boolean;
  description: string;
  children?: readonly NotificationTemplateVariable[];
}

export interface NotificationDefinitionMetadata {
  key: NotificationDefinitionKey;
  audience: NotificationAudience;
  optional: boolean;
  enabled: boolean;
  allowedChannels: readonly NotificationChannel[];
  defaultChannels: readonly NotificationChannel[];
  activeChannels: readonly NotificationChannel[];
  variables: readonly NotificationTemplateVariable[];
}

export interface EnqueueNotificationParams {
  key: NotificationDefinitionKey;
  storeId: string;
  organizationId: string;
  recipients?: readonly NotificationRecipientSnapshot[];
  locale?: string;
  data: Record<string, unknown>;
  idempotencyKey: string;
  subject?: { type: string; id: string };
  correlationId?: string;
}

export interface EnqueueNotificationResult {
  workflowId: string;
  accepted: true;
}

export interface NotificationDeliveryInputBase {
  deliveryId: string;
  idempotencyKey: string;
  storeId: string;
  notificationKey: NotificationDefinitionKey;
  correlationId: string;
  metadata: {
    eventId?: string;
    templateRevision?: number;
    locale?: string;
  };
}

export interface EmailDeliveryInput extends NotificationDeliveryInputBase {
  channel: "EMAIL";
  to: ReadonlyArray<{ email: string; name?: string }>;
  from?: { email: string; name?: string };
  replyTo?: string;
  subject: string;
  html?: string;
  text: string;
  headers?: Record<string, string>;
}

export interface SmsDeliveryInput extends NotificationDeliveryInputBase {
  channel: "SMS";
  to: string;
  from?: string;
  text: string;
  encoding: "GSM_7" | "UCS_2";
  segmentCount: number;
}

export interface WebhookDeliveryInput extends NotificationDeliveryInputBase {
  channel: "WEBHOOK";
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
  contentType: "application/json" | "application/xml";
}

export type NotificationDeliveryInput =
  | EmailDeliveryInput
  | SmsDeliveryInput
  | WebhookDeliveryInput;

export interface NotificationDeliveryReceipt {
  state: "ACCEPTED" | "DELIVERED" | "REJECTED" | "UNKNOWN";
  providerCode: string;
  providerMessageId?: string;
  acceptedAt?: string;
  deliveredAt?: string;
  responseCode?: string;
  retryAfterMs?: number;
}

export interface SendTestNotificationParams {
  storeId: string;
  organizationId: string;
  channel: NotificationChannel;
  recipient: NotificationRecipientSnapshot;
  key: NotificationDefinitionKey;
  data: Record<string, unknown>;
  locale?: string;
  idempotencyKey: string;
}

export interface PreviewNotificationParams {
  storeId: string;
  key: NotificationDefinitionKey;
  channel: NotificationChannel;
  locale?: string;
  data: Record<string, unknown>;
  subjectTemplate?: string;
  bodyTemplate?: string;
  plainTextTemplate?: string;
}

export interface PreviewNotificationResult {
  subject?: string;
  html?: string;
  text: string;
  locale: string;
  warnings: string[];
  sms?: { encoding: "GSM_7" | "UCS_2"; segmentCount: number; length: number };
}

export interface GetNotificationDefinitionParams {
  storeId: string;
  key: NotificationDefinitionKey;
}

export interface GetNotificationTemplateParams {
  storeId: string;
  key: NotificationDefinitionKey;
  channel: NotificationChannel;
  locale: string;
}

export interface GetNotificationDeliveryParams {
  storeId: string;
  deliveryId: string;
}

export interface ListNotificationDeliveryAttemptsParams {
  storeId: string;
  deliveryId: string;
}
