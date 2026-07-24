import { AuthNotificationEventHandlers } from "./AuthNotificationEventHandlers.js";
import { CheckoutNotificationEventHandlers } from "./CheckoutNotificationEventHandlers.js";
import { CustomerNotificationEventHandlers } from "./CustomerNotificationEventHandlers.js";
import { DeliveryNotificationEventHandlers } from "./DeliveryNotificationEventHandlers.js";
import { OrderNotificationEventHandlers } from "./OrderNotificationEventHandlers.js";
import { PaymentNotificationEventHandlers } from "./PaymentNotificationEventHandlers.js";
import { PrivacyEventHandlers } from "./PrivacyEventHandlers.js";

export const eventHandlers = [
  OrderNotificationEventHandlers,
  CheckoutNotificationEventHandlers,
  PaymentNotificationEventHandlers,
  DeliveryNotificationEventHandlers,
  CustomerNotificationEventHandlers,
  AuthNotificationEventHandlers,
  PrivacyEventHandlers,
] as const;

export * from "./NotificationIngressService.js";
