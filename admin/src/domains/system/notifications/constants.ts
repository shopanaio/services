export interface NotificationItemConfig {
  key: string;
  title: string;
  description: string;
  switchable?: boolean;
}

export interface NotificationSectionConfig {
  title: string;
  items: NotificationItemConfig[];
}

export const CUSTOMER_NOTIFICATION_SECTIONS: NotificationSectionConfig[] = [
  {
    title: "Order processing",
    items: [
      {
        key: "customer.order.confirmation",
        title: "Order confirmation",
        description: "Sent when a customer places an order",
      },
      {
        key: "customer.draft_order.invoice",
        title: "Draft order invoice",
        description: "Sent when you create an invoice on the draft order page",
      },
      {
        key: "customer.shipping.confirmation",
        title: "Shipping confirmation",
        description: "Sent when you mark an order as fulfilled",
      },
    ],
  },
  {
    title: "Gift cards",
    items: [
      {
        key: "customer.gift_card.new",
        title: "New gift card",
        description:
          "Sent to the customer or recipient when a gift card is fulfilled, or when you send a gift card",
      },
      {
        key: "customer.gift_card.receipt",
        title: "Gift card receipt",
        description: "Sent to a customer if they add a recipient to a gift card",
      },
    ],
  },
  {
    title: "Store credit",
    items: [
      {
        key: "customer.store_credit.issued",
        title: "Store credit issued",
        description: "Sent when store credit is issued to a customer",
      },
    ],
  },
  {
    title: "Order exceptions",
    items: [
      {
        key: "customer.order.invoice",
        title: "Order invoice",
        description: "Sent when an order has an outstanding balance",
      },
      {
        key: "customer.order.edited",
        title: "Order edited",
        description: "Sent when an order is edited",
      },
      {
        key: "customer.order.cancelled",
        title: "Order canceled",
        description: "Sent if a customer cancels their order",
      },
      {
        key: "customer.order.payment_receipt",
        title: "Order payment receipt",
        description: "Sent after a customer is charged using a saved payment method",
      },
      {
        key: "customer.order.refund",
        title: "Order refund",
        description: "Sent if an order is refunded",
      },
      {
        key: "customer.checkout.abandoned",
        title: "Abandoned checkout",
        description: "Sent when a customer leaves checkout before completing their purchase",
      },
      {
        key: "customer.order.link",
        title: "Order link",
        description: "Sent when a customer requests a new link from an expired order status page",
      },
    ],
  },
  {
    title: "Payments",
    items: [
      {
        key: "customer.payment.error",
        title: "Payment error",
        description: "Sent when a customer's payment can't be processed during checkout",
      },
      {
        key: "customer.payment.pending_error",
        title: "Pending payment error",
        description: "Sent when a customer's pending payment can't be processed",
      },
      {
        key: "customer.payment.pending_success",
        title: "Pending payment success",
        description: "Sent when a customer's pending payment is processed successfully",
      },
      {
        key: "customer.payment.reminder",
        title: "Payment reminder",
        description: "Sent on or after the due date for an unpaid order",
      },
    ],
  },
  {
    title: "Point of Sale",
    items: [
      {
        key: "customer.pos.abandoned_checkout",
        title: "POS abandoned checkout",
        description:
          "Sent when a POS draft order is created so a customer can complete a purchase online",
      },
      {
        key: "customer.pos.email_to_customer",
        title: "POS email to customer",
        description: "Sent when a POS cart is emailed to a customer so it can be completed online",
      },
      {
        key: "customer.pos.receipt",
        title: "POS and mobile receipt",
        description: "Sent when a customer places an in-person order and requests a receipt",
      },
      {
        key: "customer.pos.exchange_receipt",
        title: "POS exchange receipt",
        description: "Sent when a customer completes a POS exchange and requests a receipt",
      },
    ],
  },
  {
    title: "Shipping updated",
    items: [
      {
        key: "customer.shipping.updated",
        title: "Shipping update",
        description: "Sent when you add or update an order tracking number",
      },
      {
        key: "customer.shipping.out_for_delivery",
        title: "Out for delivery",
        description: "Sent when an order with a tracking number is out for delivery",
        switchable: true,
      },
      {
        key: "customer.shipping.delivered",
        title: "Delivered",
        description: "Sent if an order with a tracking number is delivered",
        switchable: true,
      },
    ],
  },
  {
    title: "Returns and cancellations",
    items: [
      {
        key: "customer.return.created",
        title: "Return created",
        description:
          "Sent when you create a return, including any return label or tracking information",
      },
      {
        key: "customer.return.order_label_created",
        title: "Order-level return label created",
        description: "Sent when you create a return label from the order page (US only)",
      },
      {
        key: "customer.return.request_received",
        title: "Return request received",
        description: "Sent when a customer's self-service return request is received",
      },
      {
        key: "customer.return.request_approved",
        title: "Return request approved",
        description: "Sent when you approve a return request",
      },
      {
        key: "customer.return.request_declined",
        title: "Return request declined",
        description: "Sent when you decline a return request",
      },
      {
        key: "customer.change_request.received",
        title: "Request received",
        description: "Sent when a customer's return or cancellation request is received",
      },
      {
        key: "customer.cancellation_request.declined",
        title: "Cancellation request declined",
        description: "Sent when you decline a cancellation request",
      },
    ],
  },
  {
    title: "Accounts and outreach",
    items: [
      {
        key: "customer.account.invite",
        title: "Customer account invite",
        description: "Sent when you invite a customer to create an account",
      },
      {
        key: "customer.account.welcome",
        title: "Customer account welcome",
        description: "Sent when a customer completes their account activation",
      },
      {
        key: "customer.account.password_reset",
        title: "Customer account password reset",
        description: "Sent when a customer requests to reset their account password",
      },
      {
        key: "customer.account.payment_method_add_request",
        title: "Customer payment method add request",
        description: "Sent when a customer requests to add a new payment method",
      },
      {
        key: "customer.b2b.access",
        title: "B2B access email",
        description: "Sent when a customer is added to a company",
      },
      {
        key: "customer.b2b.location_payment_method_update",
        title: "B2B location update payment method",
        description:
          "Sent when a customer requests to update their payment method for a B2B location",
      },
      {
        key: "customer.contact",
        title: "Contact customer",
        description: "Sent when you contact a customer from the orders or customers page",
      },
      {
        key: "customer.email_change.confirmation",
        title: "Customer email address change confirmation",
        description: "Sent when a customer changes their email address",
      },
    ],
  },
  {
    title: "Authentication",
    items: [
      {
        key: "customer.auth.email_verification",
        title: "Email verification",
        description: "Sent when a customer needs to verify their email address",
      },
      {
        key: "customer.auth.login_code",
        title: "Login code / magic link",
        description: "Sent when a customer requests a one-time login code or magic link",
      },
      {
        key: "customer.auth.new_login_alert",
        title: "New login alert",
        description: "Sent after a sign-in from a new device or location",
        switchable: true,
      },
      {
        key: "customer.auth.password_reset",
        title: "Password reset",
        description:
          "Sent when a customer requests a password reset (password-based accounts only)",
      },
      {
        key: "customer.auth.account_deletion_confirmation",
        title: "Account deletion confirmation",
        description: "Sent when a customer requests account deletion so they can confirm it",
      },
    ],
  },
  {
    title: "Marketing double opt-in",
    items: [
      {
        key: "customer.marketing.confirmation",
        title: "Customer marketing confirmation",
        description: "Sent to subscribers so they can confirm their email or SMS subscription",
        switchable: true,
      },
    ],
  },
];

export const STAFF_NOTIFICATION_SECTIONS: NotificationSectionConfig[] = [
  {
    title: "Events",
    items: [
      {
        key: "staff.order.new",
        title: "New order",
        description: "Sent when a customer places an order",
        switchable: true,
      },
      {
        key: "staff.order.change_request.new",
        title: "New change request",
        description: "Sent when a customer requests a change on an order",
        switchable: true,
      },
      {
        key: "staff.order.sales_attribution_edited",
        title: "Sales attribution edited",
        description:
          "Sent to order notification subscribers when the attributed staff on an order is edited.",
        switchable: true,
      },
      {
        key: "staff.draft_order.new",
        title: "New draft order",
        description: "Sent when a customer submits a draft order. Only sent to store owner",
        switchable: true,
      },
    ],
  },
];
