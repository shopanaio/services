-- Up Migration

CREATE TYPE "orders"."order_status" AS ENUM (
  'DRAFT',
  'OPEN',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE "orders"."order_payment_status" AS ENUM (
  'NOT_REQUIRED',
  'PENDING',
  'AUTHORIZED',
  'PARTIALLY_PAID',
  'PAID',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'VOIDED',
  'EXPIRED',
  'FAILED'
);

CREATE TYPE "orders"."order_fulfillment_status" AS ENUM (
  'UNFULFILLED',
  'SCHEDULED',
  'ON_HOLD',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
  'CANCELLED'
);

CREATE TYPE "orders"."order_delivery_status" AS ENUM (
  'NOT_SHIPPED',
  'PARTIALLY_SHIPPED',
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_ATTEMPTED',
  'DELAYED',
  'EXCEPTION',
  'RETURNED_TO_SENDER',
  'CANCELLED'
);

CREATE TYPE "orders"."order_return_status" AS ENUM (
  'NONE',
  'REQUESTED',
  'PARTIALLY_RETURNED',
  'RETURNED'
);

CREATE TYPE "orders"."order_actor_type" AS ENUM (
  'CUSTOMER',
  'STAFF',
  'API_KEY',
  'APP',
  'SYSTEM'
);

CREATE TYPE "orders"."order_origin" AS ENUM (
  'CHECKOUT',
  'ADMIN',
  'API',
  'IMPORT',
  'MARKETPLACE',
  'CRM'
);

CREATE TYPE "orders"."order_cancellation_reason" AS ENUM (
  'CUSTOMER_REQUEST',
  'CHANGED_MIND',
  'DUPLICATE_ORDER',
  'INCORRECT_ITEMS',
  'INCORRECT_ADDRESS',
  'PAYMENT_ISSUE',
  'FRAUD',
  'INVENTORY_UNAVAILABLE',
  'MERCHANT_DECISION',
  'OTHER'
);

CREATE TYPE "orders"."order_address_type" AS ENUM (
  'SHIPPING',
  'BILLING',
  'RETURN'
);

CREATE TYPE "orders"."order_adjustment_type" AS ENUM (
  'FEE',
  'CREDIT',
  'ROUNDING',
  'CORRECTION',
  'OTHER'
);

CREATE TYPE "orders"."order_discount_value_type" AS ENUM (
  'PERCENTAGE',
  'FIXED_AMOUNT',
  'FREE_SHIPPING'
);

CREATE TYPE "orders"."order_discount_target_type" AS ENUM (
  'ORDER_LINES',
  'DELIVERY'
);

CREATE TYPE "orders"."order_delivery_group_status" AS ENUM (
  'OPEN',
  'ON_HOLD',
  'READY',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "orders"."order_delivery_method_type" AS ENUM (
  'LOCAL',
  'NONE',
  'PICK_UP',
  'PICKUP_POINT',
  'RETAIL',
  'SHIPPING'
);

CREATE TYPE "orders"."order_shipping_payment_model" AS ENUM (
  'MERCHANT_COLLECTED',
  'CARRIER_DIRECT'
);

CREATE TYPE "orders"."order_payment_flow" AS ENUM (
  'ONLINE',
  'OFFLINE',
  'ON_DELIVERY'
);

CREATE TYPE "orders"."order_payment_attempt_status" AS ENUM (
  'REQUIRES_ACTION',
  'PENDING',
  'AUTHORIZED',
  'PAID',
  'FAILED',
  'CANCELLED',
  'EXPIRED'
);

CREATE TYPE "orders"."order_payment_customer_action_type" AS ENUM (
  'REDIRECT',
  'INSTRUCTIONS'
);

CREATE TYPE "orders"."order_payment_transaction_kind" AS ENUM (
  'AUTHORIZATION',
  'CAPTURE',
  'SALE',
  'REFUND',
  'VOID',
  'MANUAL',
  'ADJUSTMENT'
);

CREATE TYPE "orders"."order_payment_transaction_status" AS ENUM (
  'PENDING',
  'SUCCESS',
  'FAILURE',
  'CANCELLED'
);

CREATE TYPE "orders"."order_void_status" AS ENUM (
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "orders"."order_dispute_status" AS ENUM (
  'INQUIRY',
  'NEEDS_RESPONSE',
  'UNDER_REVIEW',
  'WON',
  'LOST',
  'ACCEPTED',
  'CLOSED'
);

CREATE TYPE "orders"."order_risk_level" AS ENUM (
  'NONE',
  'LOW',
  'MEDIUM',
  'HIGH'
);

CREATE TYPE "orders"."order_fulfillment_operation_status" AS ENUM (
  'PENDING',
  'OPEN',
  'SUCCESS',
  'FAILURE',
  'CANCELLED'
);

CREATE TYPE "orders"."order_fulfillment_order_status" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'SCHEDULED',
  'ON_HOLD',
  'CLOSED',
  'CANCELLED'
);

CREATE TYPE "orders"."order_fulfillment_request_status" AS ENUM (
  'UNSUBMITTED',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'CANCELLATION_REQUESTED',
  'CANCELLATION_ACCEPTED',
  'CANCELLATION_REJECTED'
);

CREATE TYPE "orders"."order_shipment_status" AS ENUM (
  'DRAFT',
  'LABEL_CREATED',
  'READY_FOR_PICKUP',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_ATTEMPTED',
  'DELAYED',
  'EXCEPTION',
  'RETURNED_TO_SENDER',
  'CANCELLED'
);

CREATE TYPE "orders"."order_return_request_status" AS ENUM (
  'REQUESTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'IN_TRANSIT',
  'RECEIVED',
  'COMPLETED'
);

CREATE TYPE "orders"."order_return_reason" AS ENUM (
  'CHANGED_MIND',
  'DAMAGED',
  'DEFECTIVE',
  'INCORRECT_ITEM',
  'NOT_AS_DESCRIBED',
  'SIZE_OR_FIT',
  'OTHER'
);

CREATE TYPE "orders"."order_return_disposition" AS ENUM (
  'PENDING',
  'RESTOCK',
  'REFURBISH',
  'QUARANTINE',
  'DISPOSE',
  'RETURN_TO_VENDOR'
);

CREATE TYPE "orders"."order_exchange_status" AS ENUM (
  'REQUESTED',
  'OPEN',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "orders"."order_refund_status" AS ENUM (
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "orders"."order_refund_destination" AS ENUM (
  'ORIGINAL_PAYMENT',
  'STORE_CREDIT',
  'MANUAL'
);

CREATE TYPE "orders"."order_refund_adjustment_type" AS ENUM (
  'SHIPPING',
  'TAX',
  'DUTY',
  'FEE',
  'ROUNDING',
  'OTHER'
);

CREATE TYPE "orders"."order_event_visibility" AS ENUM (
  'INTERNAL',
  'CUSTOMER'
);

CREATE TYPE "orders"."order_idempotency_status" AS ENUM (
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED'
);

CREATE TYPE "orders"."order_outbox_status" AS ENUM (
  'PENDING',
  'PUBLISHED',
  'FAILED'
);

CREATE TYPE "orders"."order_placement_status" AS ENUM (
  'AWAITING_FINALIZATION',
  'CONFIRMED',
  'FAILED'
);

CREATE TYPE "orders"."order_edit_status" AS ENUM (
  'ACTIVE',
  'COMMITTED',
  'ABORTED',
  'EXPIRED'
);

CREATE TYPE "orders"."order_operation_kind" AS ENUM (
  'ORDER_CANCEL',
  'ORDER_EDIT_COMMIT',
  'PAYMENT_CAPTURE',
  'PAYMENT_VOID',
  'PAYMENT_REFUND',
  'PAYMENT_RETRY',
  'FULFILLMENT_SUBMIT',
  'FULFILLMENT_CANCEL',
  'SHIPMENT_CREATE',
  'SHIPMENT_CANCEL',
  'SHIPMENT_RECONCILE',
  'RETURN_RECEIVE',
  'INTEGRATION_SYNC',
  'BULK_ACTION'
);

CREATE TYPE "orders"."order_operation_status" AS ENUM (
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "orders"."order_integration_kind" AS ENUM (
  'CRM',
  'ERP',
  'MARKETPLACE',
  'WMS',
  'ANALYTICS'
);

CREATE TYPE "orders"."order_integration_sync_status" AS ENUM (
  'NEVER_SYNCED',
  'PENDING',
  'SYNCED',
  'OUT_OF_SYNC',
  'FAILED',
  'DISABLED'
);

CREATE TYPE "orders"."order_sync_direction" AS ENUM (
  'EXPORT',
  'IMPORT',
  'BIDIRECTIONAL'
);

CREATE TYPE "orders"."order_inbox_status" AS ENUM (
  'RECEIVED',
  'APPLIED',
  'IGNORED',
  'FAILED'
);
