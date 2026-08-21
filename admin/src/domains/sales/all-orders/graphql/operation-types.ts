import type { ApiPageInfo } from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";

/** Temporary GraphQL-shaped contract. Monetary values use major units. */
export enum OrderStatus {
  Draft = "DRAFT",
  Active = "ACTIVE",
  Completed = "COMPLETED",
  Cancelled = "CANCELLED",
  Archived = "ARCHIVED",
}
export enum OrderPaymentStatus {
  Pending = "PENDING",
  Paid = "PAID",
  Cancelled = "CANCELLED",
}
export enum OrderFulfillmentStatus {
  Pending = "PENDING",
  Processing = "PROCESSING",
  OnHold = "ON_HOLD",
  Shipped = "SHIPPED",
  Delivered = "DELIVERED",
  Returned = "RETURNED",
  Cancelled = "CANCELLED",
  Fulfilled = "FULFILLED",
}
export enum OrderOrderField {
  OrderNumber = "ORDER_NUMBER",
  CustomerName = "CUSTOMER_NAME",
  TotalAmount = "TOTAL_AMOUNT",
  Status = "STATUS",
  PaymentStatus = "PAYMENT_STATUS",
  FulfillmentStatus = "FULFILLMENT_STATUS",
  CreatedAt = "CREATED_AT",
  UpdatedAt = "UPDATED_AT",
}

export interface ApiOrderAddress {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  province: string | null;
  postalCode: string;
  countryCode: string;
  email?: string | null;
  phone: string | null;
}
export interface ApiOrderCustomer {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
}
export interface ApiOrderCustomerDetails {
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string;
  phone: string | null;
  note: string | null;
  meta: string | null;
}
export interface ApiOrderCustomerStatistic {
  ordersCount: number;
  totalSpent: number;
}
export interface ApiOrderPaymentMethod {
  id: string;
  name: string;
}
export interface ApiOrderShippingMethod {
  id: string;
  name: string;
  price: number;
}
export interface ApiOrderWeight {
  value: number;
  unit: "g" | "kg" | "lb";
}
export interface ApiOrderProductInfo {
  id: string;
  title: string;
  sku: string | null;
  thumbnailUrl: string | null;
}
export interface ApiOrderItem {
  id: string;
  price: number;
  quantity: number;
  originalQuantity: number;
  fulfillmentQuantity: number | null;
  totalAmount: number;
  subtotalAmount: number;
  taxAmount: number | null;
  discountAmount: number | null;
  productCostPrice: number | null;
  weight: ApiOrderWeight | null;
  product: ApiOrderProductInfo;
  createdAt: string;
}
export interface ApiOrderShippingItem {
  id: string;
  shippingMethod: ApiOrderShippingMethod;
  trackingCode: string | null;
  trackingUrl: string | null;
  estimatedDeliveryAt: string | null;
}
export interface ApiOrderFulfillment {
  id: string;
  parentId: string | null;
  status: OrderFulfillmentStatus;
  orderItems: ApiOrderItem[];
  shippingItem: ApiOrderShippingItem | null;
  createdAt: string;
  updatedAt: string;
}
export interface ApiOrderPaymentItem {
  id: string;
  status: OrderPaymentStatus;
  amount: number;
  method: ApiOrderPaymentMethod | null;
}
export interface ApiOrderPaymentSummary {
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
}
export interface ApiOrderEvent {
  id: string;
  type: "SYSTEM" | "COMMENT";
  message: string;
  actorName: string | null;
  createdAt: string;
}
export interface ApiOrderTag {
  id: string;
  name: string;
}

export interface ApiOrder {
  id: string;
  version: number;
  orderNumber: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  adminNote: string | null;
  externalSystemId: string | null;
  currencyCode: string;
  displayCurrencyCode: string | null;
  displayExchangeRate: number | null;
  customer: ApiOrderCustomer | null;
  customerDetails: ApiOrderCustomerDetails;
  customerStatistic: ApiOrderCustomerStatistic | null;
  billingAddress: ApiOrderAddress | null;
  shippingAddress: ApiOrderAddress | null;
  paymentMethod: ApiOrderPaymentMethod | null;
  shippingMethod: ApiOrderShippingMethod | null;
  orderItems: ApiOrderItem[];
  productsInfo: ApiOrderProductInfo[];
  fulfillments: ApiOrderFulfillment[];
  paymentItem: ApiOrderPaymentItem | null;
  paymentSummary: ApiOrderPaymentSummary;
  events: ApiOrderEvent[];
  tags: ApiOrderTag[];
}

export interface OrderWhereInput {
  _and?: OrderWhereInput[];
  _or?: OrderWhereInput[];
  id?: Record<string, unknown>;
  status?: Record<string, unknown>;
  paymentStatus?: Record<string, unknown>;
  fulfillmentStatus?: Record<string, unknown>;
  createdAt?: Record<string, unknown>;
  updatedAt?: Record<string, unknown>;
  customerId?: Record<string, unknown>;
  customerName?: Record<string, unknown>;
  customerEmail?: Record<string, unknown>;
  customerPhone?: Record<string, unknown>;
  orderNumber?: Record<string, unknown>;
  externalSystemId?: Record<string, unknown>;
  totalAmount?: Record<string, unknown>;
  currencyCode?: Record<string, unknown>;
  shippingCountry?: Record<string, unknown>;
  shippingMethodId?: Record<string, unknown>;
  paymentMethodId?: Record<string, unknown>;
  tag?: Record<string, unknown>;
  trackingCode?: Record<string, unknown>;
  hasTracking?: Record<string, unknown>;
}
export interface OrderOrderByInput {
  field: OrderOrderField;
  direction: "ASC" | "DESC";
}
export interface OrderEdge {
  cursor: string;
  node: ApiOrder;
}
export interface OrderConnection {
  edges: OrderEdge[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}
export interface OrdersQueryVariables extends RelayCursorPaginationVariables {
  where?: OrderWhereInput | null;
  orderBy?: OrderOrderByInput[] | null;
}
export interface OrdersQueryData {
  ordersQuery: { orders: OrderConnection };
}
export interface OrderQueryData {
  ordersQuery: { order: ApiOrder | null };
}

export interface OrderUserError {
  code: string;
  field?: string | null;
  message: string;
}
export interface OrderMutationPayload {
  order: ApiOrder | null;
  userErrors: OrderUserError[];
}
export interface OrderAddressInput {
  firstName: string;
  lastName: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  province?: string | null;
  postalCode: string;
  countryCode: string;
  email?: string | null;
  phone?: string | null;
}
export interface OrderItemWriteInput {
  id?: string;
  productId: string;
  title: string;
  sku?: string | null;
  price: number;
  quantity: number;
  weight?: number | null;
  costPrice?: number | null;
}
export interface OrderCreateInput {
  clientMutationId: string;
  customerId?: string | null;
  customerDetails: ApiOrderCustomerDetails;
  currencyCode: string;
  externalSystemId?: string | null;
  shippingMethodId?: string | null;
  paymentMethodId?: string | null;
  shippingAddress?: OrderAddressInput | null;
  billingAddress?: OrderAddressInput | null;
  items: OrderItemWriteInput[];
  tags: string[];
  adminNote?: string | null;
}
export interface OrderUpdateInput extends Omit<OrderCreateInput, "clientMutationId"> {
  id: string;
}
export interface VersionedOrderInput {
  id: string;
}
export interface OrderDeleteInput extends VersionedOrderInput {}
export interface OrderCancelInput extends VersionedOrderInput {
  comment: string;
}
export interface OrderStatusUpdateInput extends VersionedOrderInput {
  nextStatus: OrderStatus;
  comment?: string | null;
}
export interface OrderPaymentStatusUpdateInput extends VersionedOrderInput {
  paymentItemId: string;
  nextStatus: OrderPaymentStatus;
  comment?: string | null;
}
export interface OrderFulfillmentStatusUpdateInput extends VersionedOrderInput {
  fulfillmentId: string;
  nextStatus: OrderFulfillmentStatus;
  comment?: string | null;
}
export interface OrderCustomerUpdateInput extends VersionedOrderInput {
  customerId: string | null;
}
export interface OrderTagsUpdateInput extends VersionedOrderInput {
  tags: string[];
}
export interface OrderAdminNoteUpdateInput extends VersionedOrderInput {
  adminNote: string | null;
}
export interface OrderCommentAddInput extends VersionedOrderInput {
  comment: string;
}
export interface OrderItemAddInput extends VersionedOrderInput {
  item: OrderItemWriteInput;
}
export interface OrderItemUpdateInput extends VersionedOrderInput {
  itemId: string;
  quantity?: number;
  weight?: number | null;
  costPrice?: number | null;
}
export interface OrderItemDeleteInput extends VersionedOrderInput {
  itemId: string;
}
export interface OrderFulfillmentSplitInput extends VersionedOrderInput {
  fulfillmentId: string;
  items: Array<{ orderItemId: string; quantity: number }>;
}
export interface OrderFulfillmentUndoSplitInput extends VersionedOrderInput {
  fulfillmentId: string;
}
export interface OrderShippingItemCreateInput extends VersionedOrderInput {
  fulfillmentId: string;
  shippingMethodId: string;
  trackingCode?: string | null;
}
export interface OrderShippingItemUpdateInput extends VersionedOrderInput {
  fulfillmentId: string;
  shippingItemId: string;
  shippingMethodId: string;
  trackingCode?: string | null;
}
export interface OrderShippingDetailsUpdateInput extends VersionedOrderInput {
  shippingMethodId?: string | null;
  shippingAddress?: OrderAddressInput | null;
}
export interface OrderPaymentDetailsUpdateInput extends VersionedOrderInput {
  paymentMethodId?: string | null;
  billingAddress?: OrderAddressInput | null;
}
