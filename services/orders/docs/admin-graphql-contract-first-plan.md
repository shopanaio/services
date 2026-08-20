# Orders Admin API: contract-first RFC и план реализации

Статус: **proposal**  
Область: `services/orders`, Admin GraphQL Federation subgraph, PostgreSQL, DBOS, provider Apps, CRM integrations  
Порядок разработки: **GraphQL SDL → PostgreSQL schema → domain/business logic → resolvers/API**

## 1. Решение

Orders должен стать владельцем коммерческого факта заказа и полной истории его изменений. Admin API проектируется не как CRUD над одной записью, а как набор явных бизнес-команд над следующими capability:

1. order core — создание, lifecycle, customer/contact snapshots, tags, notes;
2. order editing — draft editing и staged edit размещённого заказа;
3. payment projection — финансовое состояние заказа и команды к Payments;
4. fulfillment — allocation/work units, fulfillments, shipments и интеграции с 3PL/fulfillment services;
5. returns, exchanges и refunds;
6. activity/audit — immutable timeline и event stream;
7. integrations — внешние идентификаторы, CRM/ERP sync и reconciliation.

Ключевой принцип: `status`, `paymentStatus`, `fulfillmentStatus`, `deliveryStatus` и `returnStatus` не являются произвольно редактируемыми полями. Они меняются только через разрешённые команды или вычисляются из дочерних фактов.

## 2. Цели

- Поддержать все операции, уже заявленные в черновом Admin UI.
- Дать полный enterprise-контракт для draft orders, placed orders, оплат, fulfillment, returns и интеграций.
- Разделить коммерческий order aggregate, fulfillment work и provider execution.
- Поддержать merchant-managed, third-party fulfillment service и carrier shipment provider.
- Подготовить безопасную двустороннюю интеграцию с CRM/ERP без прямого доступа интеграций к таблицам Orders.
- Обеспечить optimistic concurrency, idempotency, tenant isolation, RBAC, audit и read-after-write consistency.
- Сохранить исторические snapshots независимо от изменений Catalog, Customer, Pricing, Delivery и Payments.
- Следовать существующим правилам Shopana: Federation, Global IDs, Relay connections, Scripts, DBOS, transactional outbox, Zod и DataLoader.

## 3. Не цели первой версии

- Workflow-конструктор произвольных merchant states. В V1 используется фиксированный lifecycle и явные actions.
- Синхронный fan-out GraphQL resolver в CRM, carrier или 3PL.
- Хранение CRM-specific полей в core-таблице `orders`.
- Изменение заказа прямым generic patch/JSON Patch.
- Backfill, compatibility tables, dual-read или поддержка старой схемы. Проект работает с чистой БД.
- Использование Admin UI mock types как backend source of truth.

## 4. Архитектурные границы

| Область | Владелец | Что хранит Orders |
| --- | --- | --- |
| Checkout | `checkout` | immutable placement snapshot и `checkoutId` |
| Catalog | `catalog` | snapshot title/SKU/image/product/variant targeting на order line |
| Pricing | `pricing` | окончательные amounts, discounts, taxes и quote references |
| Inventory | `catalog`/inventory capability | reservation/allocation references и projected release/restock results |
| Payments | `payments` | выбранный method snapshot, attempts/transactions/refunds projection |
| Delivery rates | `delivery.carrier-service` | выбранный delivery method/destination snapshot |
| Shipment execution | `delivery.shipment-provider` | provider route/reference/status/tracking projection |
| Fulfillment work | `orders.fulfillment` | fulfillment orders, line allocations, holds, service requests, fulfillments |
| Customer | `iam`/customers | customer federation reference плюс immutable contact snapshot |
| CRM/ERP | provider App | external links, sync state, attempts и last exported/imported revisions |

Правила границ:

- ни один repository Orders не выполняет cross-service SQL join;
- `storeId` и `organizationId` берутся только из trusted context;
- внешние IDs сохраняются как references, но не заменяют Shopana UUID;
- provider route фиксируется в момент создания operation и не меняется при retry;
- provider payload допускается в JSONB, core business facts — в типизированных колонках;
- Payments и provider Apps сообщают факты через versioned events/actions, а Orders строит проекции.

## 5. Модель lifecycle

### 5.1. Order lifecycle

```text
DRAFT ──complete──> OPEN ──close──> CLOSED
  │                  │               │
  └──delete          └──cancel──────> CANCELLED
                     CLOSED ──reopen─> OPEN
```

`ARCHIVED` не является lifecycle status. Архивирование задаётся отдельным `archivedAt`, поэтому закрытый или отменённый заказ не теряет своё настоящее состояние.

### 5.2. Derived aggregate statuses

- `paymentStatus` выводится из successful payment transactions и outstanding amount;
- `fulfillmentStatus` выводится из fulfillment order lines и fulfillments;
- `deliveryStatus` выводится из shipment/tracking state;
- `returnStatus` выводится из return requests и received quantities;
- `riskLevel` выводится из risk assessments/disputes.

Ручной override допускается только для offline/imported financial facts, требует отдельного permission, причины и audit event. Provider-managed online payment нельзя сделать `PAID` обычным status update.

## 6. Канонический Admin GraphQL SDL

Ниже — целевой V1 SDL. `Node`, `Connection`, `PageInfo`, `DisplayableError`, `Money`, `Customer`, `User`, `ApiKey`, `CurrencyCode`, `CountryCode`, `LocaleCode`, `DateTime`, `Cursor`, `Decimal`, `JSON` и `URL` должны приходить из shared/federated schemas.

```graphql
extend type Query {
  ordersQuery: OrdersQuery!
}

extend type Mutation {
  ordersMutation: OrdersMutation!
}

"""Read namespace for the Orders Admin API."""
type OrdersQuery {
  order(id: ID!): Order
  orderByNumber(number: BigInt!): Order
  orders(
    first: Int = 20
    after: Cursor
    last: Int
    before: Cursor
    where: OrderWhereInput
    orderBy: [OrderOrderByInput!]
  ): OrderConnection!
  orderEditSession(id: ID!): OrderEditSession
  orderOperation(id: ID!): OrderOperation
}

"""Command namespace. Every command is store-scoped from trusted context."""
type OrdersMutation {
  # Draft and core lifecycle
  orderCreate(input: OrderCreateInput!): OrderPayload!
  orderUpdate(input: OrderUpdateInput!): OrderPayload!
  orderDelete(input: OrderDeleteInput!): OrderDeletePayload!
  orderCompleteDraft(input: OrderCompleteDraftInput!): OrderPayload!
  orderCancel(input: OrderCancelInput!): OrderOperationPayload!
  orderClose(input: OrderCloseInput!): OrderPayload!
  orderReopen(input: OrderReopenInput!): OrderPayload!
  orderArchive(input: OrderArchiveInput!): OrderPayload!
  orderUnarchive(input: OrderUnarchiveInput!): OrderPayload!

  # Customer, staff data and lightweight updates
  orderCustomerSet(input: OrderCustomerSetInput!): OrderPayload!
  orderTagsUpdate(input: OrderTagsUpdateInput!): OrderPayload!
  orderAdminNoteUpdate(input: OrderAdminNoteUpdateInput!): OrderPayload!
  orderCommentAdd(input: OrderCommentAddInput!): OrderActivityPayload!
  orderCustomFieldsUpdate(input: OrderCustomFieldsUpdateInput!): OrderPayload!

  # Direct draft-line operations
  orderLineAdd(input: OrderLineAddInput!): OrderLinePayload!
  orderLineUpdate(input: OrderLineUpdateInput!): OrderLinePayload!
  orderLineDelete(input: OrderLineDeleteInput!): OrderDeletePayload!

  # Staged edit for an OPEN order
  orderEditBegin(input: OrderEditBeginInput!): OrderEditPayload!
  orderEditLineAdd(input: OrderEditLineAddInput!): OrderEditPayload!
  orderEditLineUpdate(input: OrderEditLineUpdateInput!): OrderEditPayload!
  orderEditLineRemove(input: OrderEditLineRemoveInput!): OrderEditPayload!
  orderEditShippingUpdate(input: OrderEditShippingUpdateInput!): OrderEditPayload!
  orderEditDiscountAdd(input: OrderEditDiscountAddInput!): OrderEditPayload!
  orderEditDiscountRemove(input: OrderEditDiscountRemoveInput!): OrderEditPayload!
  orderEditCommit(input: OrderEditCommitInput!): OrderOperationPayload!
  orderEditAbandon(input: OrderEditAbandonInput!): OrderEditPayload!

  # Payments. Aggregate paymentStatus remains derived.
  orderManualPaymentRecord(input: OrderManualPaymentRecordInput!): OrderOperationPayload!
  orderPaymentCapture(input: OrderPaymentCaptureInput!): OrderOperationPayload!
  orderPaymentVoid(input: OrderPaymentVoidInput!): OrderOperationPayload!
  orderPaymentRetry(input: OrderPaymentRetryInput!): OrderOperationPayload!
  orderRefundCreate(input: OrderRefundCreateInput!): OrderOperationPayload!
  orderPaymentStatusOverride(input: OrderPaymentStatusOverrideInput!): OrderPayload!

  # Fulfillment work capability
  fulfillmentOrderSplit(input: FulfillmentOrderSplitInput!): FulfillmentOrderPayload!
  fulfillmentOrderMove(input: FulfillmentOrderMoveInput!): FulfillmentOrderPayload!
  fulfillmentOrderHold(input: FulfillmentOrderHoldInput!): FulfillmentOrderPayload!
  fulfillmentOrderReleaseHold(input: FulfillmentOrderReleaseHoldInput!): FulfillmentOrderPayload!
  fulfillmentOrderSubmit(input: FulfillmentOrderSubmitInput!): OrderOperationPayload!
  fulfillmentOrderCancelRequest(input: FulfillmentOrderCancelRequestInput!): OrderOperationPayload!
  fulfillmentCreate(input: FulfillmentCreateInput!): FulfillmentPayload!
  fulfillmentCancel(input: FulfillmentCancelInput!): OrderOperationPayload!

  # Physical shipment lifecycle
  shipmentCreate(input: ShipmentCreateInput!): OrderOperationPayload!
  shipmentTrackingUpdate(input: ShipmentTrackingUpdateInput!): ShipmentPayload!
  shipmentMarkShipped(input: ShipmentMarkShippedInput!): ShipmentPayload!
  shipmentMarkDelivered(input: ShipmentMarkDeliveredInput!): ShipmentPayload!
  shipmentCancel(input: ShipmentCancelInput!): OrderOperationPayload!
  shipmentReconcile(input: ShipmentReconcileInput!): OrderOperationPayload!

  # Returns and exchanges
  orderReturnCreate(input: OrderReturnCreateInput!): OrderReturnPayload!
  orderReturnApprove(input: OrderReturnApproveInput!): OrderReturnPayload!
  orderReturnReject(input: OrderReturnRejectInput!): OrderReturnPayload!
  orderReturnCancel(input: OrderReturnCancelInput!): OrderReturnPayload!
  orderReturnReceive(input: OrderReturnReceiveInput!): OrderOperationPayload!
  orderExchangeCreate(input: OrderExchangeCreateInput!): OrderExchangePayload!
  orderExchangeCancel(input: OrderExchangeCancelInput!): OrderExchangePayload!

  # CRM/ERP/marketplace synchronization
  orderIntegrationSyncRequest(input: OrderIntegrationSyncRequestInput!): OrderOperationPayload!
  orderIntegrationSyncRetry(input: OrderIntegrationSyncRetryInput!): OrderOperationPayload!
  orderIntegrationLinkDetach(input: OrderIntegrationLinkDetachInput!): OrderPayload!

  # Enterprise bulk operation
  ordersBulkAction(input: OrdersBulkActionInput!): OrderOperationPayload!
}

enum OrderStatus {
  DRAFT
  OPEN
  CLOSED
  CANCELLED
}

enum OrderPaymentStatus {
  PENDING
  AUTHORIZED
  PARTIALLY_PAID
  PAID
  PARTIALLY_REFUNDED
  REFUNDED
  VOIDED
  EXPIRED
  FAILED
}

enum OrderFulfillmentStatus {
  UNFULFILLED
  SCHEDULED
  ON_HOLD
  PARTIALLY_FULFILLED
  FULFILLED
  CANCELLED
}

enum OrderDeliveryStatus {
  NOT_SHIPPED
  PARTIALLY_SHIPPED
  SHIPPED
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  DELIVERY_ATTEMPTED
  DELAYED
  EXCEPTION
  RETURNED_TO_SENDER
  CANCELLED
}

enum OrderReturnStatus {
  NONE
  REQUESTED
  PARTIALLY_RETURNED
  RETURNED
}

enum OrderRiskLevel {
  NONE
  LOW
  MEDIUM
  HIGH
}

enum OrderOrigin {
  CHECKOUT
  ADMIN
  API
  IMPORT
  MARKETPLACE
  CRM
}

enum OrderActorType {
  USER
  API_KEY
  CUSTOMER
  APP
  SYSTEM
}

enum OrderAction {
  UPDATE_DETAILS
  EDIT_LINES
  COMPLETE_DRAFT
  CANCEL
  CLOSE
  REOPEN
  ARCHIVE
  UNARCHIVE
  RECORD_MANUAL_PAYMENT
  CAPTURE_PAYMENT
  VOID_PAYMENT
  REFUND
  RETRY_PAYMENT
  CREATE_FULFILLMENT
  CREATE_RETURN
  CREATE_EXCHANGE
  REQUEST_INTEGRATION_SYNC
}

enum OrderPaymentTransactionKind {
  AUTHORIZATION
  CAPTURE
  SALE
  REFUND
  VOID
  MANUAL
  ADJUSTMENT
}

enum OrderPaymentTransactionStatus {
  PENDING
  SUCCESS
  FAILURE
  CANCELLED
}

enum FulfillmentOrderStatus {
  OPEN
  SCHEDULED
  ON_HOLD
  IN_PROGRESS
  CLOSED
  CANCELLED
}

enum FulfillmentRequestStatus {
  UNSUBMITTED
  SUBMITTED
  ACCEPTED
  REJECTED
  CANCELLATION_REQUESTED
  CANCELLATION_ACCEPTED
  CANCELLATION_REJECTED
}

enum FulfillmentStatus {
  PENDING
  OPEN
  SUCCESS
  FAILURE
  CANCELLED
}

enum ShipmentStatus {
  DRAFT
  LABEL_CREATED
  READY_FOR_PICKUP
  PICKED_UP
  IN_TRANSIT
  OUT_FOR_DELIVERY
  DELIVERED
  DELIVERY_ATTEMPTED
  DELAYED
  EXCEPTION
  RETURNED_TO_SENDER
  CANCELLED
}

enum OrderReturnRequestStatus {
  REQUESTED
  APPROVED
  REJECTED
  CANCELLED
  IN_TRANSIT
  RECEIVED
  COMPLETED
}

enum OrderExchangeStatus {
  REQUESTED
  OPEN
  COMPLETED
  CANCELLED
}

enum OrderRefundStatus {
  PENDING
  SUCCEEDED
  FAILED
  CANCELLED
}

enum OrderOperationKind {
  ORDER_CANCEL
  ORDER_EDIT_COMMIT
  PAYMENT_CAPTURE
  PAYMENT_VOID
  PAYMENT_REFUND
  PAYMENT_RETRY
  FULFILLMENT_SUBMIT
  FULFILLMENT_CANCEL
  SHIPMENT_CREATE
  SHIPMENT_CANCEL
  SHIPMENT_RECONCILE
  RETURN_RECEIVE
  INTEGRATION_SYNC
  BULK_ACTION
}

enum OrderOperationStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
  CANCELLED
}

enum OrderIntegrationKind {
  CRM
  ERP
  MARKETPLACE
  WMS
  ANALYTICS
}

enum OrderIntegrationSyncStatus {
  NEVER_SYNCED
  PENDING
  SYNCED
  OUT_OF_SYNC
  FAILED
  DISABLED
}

enum OrderSyncDirection {
  EXPORT
  IMPORT
  BIDIRECTIONAL
}

enum OrdersBulkActionKind {
  ARCHIVE
  UNARCHIVE
  ADD_TAGS
  REMOVE_TAGS
  CANCEL
  REQUEST_INTEGRATION_SYNC
}

enum OrderSortField {
  NUMBER
  CUSTOMER_NAME
  TOTAL_AMOUNT
  STATUS
  PAYMENT_STATUS
  FULFILLMENT_STATUS
  DELIVERY_STATUS
  CREATED_AT
  UPDATED_AT
  PLACED_AT
}

enum SortDirection {
  ASC
  DESC
}

type Order implements Node @key(fields: "id") {
  id: ID!
  version: Int!
  number: BigInt!
  status: OrderStatus!
  paymentStatus: OrderPaymentStatus!
  fulfillmentStatus: OrderFulfillmentStatus!
  deliveryStatus: OrderDeliveryStatus!
  returnStatus: OrderReturnStatus!
  riskLevel: OrderRiskLevel!
  availableActions: [OrderAction!]!
  origin: OrderOrigin!
  source: OrderSource
  checkout: Checkout
  customer: Customer
  customerSnapshot: OrderCustomerSnapshot!
  contact: OrderContact!
  billingAddress: OrderAddress
  shippingAddress: OrderAddress
  localeCode: LocaleCode
  currencyCode: CurrencyCode!
  cost: OrderCost!
  totalQuantity: Int!
  lines: [OrderLine!]!
  discounts: [OrderDiscount!]!
  taxLines: [OrderTaxLine!]!
  deliveryGroups: [OrderDeliveryGroup!]!
  payment: OrderPayment!
  fulfillmentOrders: [FulfillmentOrder!]!
  fulfillments: [Fulfillment!]!
  shipments: [Shipment!]!
  returns(first: Int = 20, after: Cursor): OrderReturnConnection!
  exchanges(first: Int = 20, after: Cursor): OrderExchangeConnection!
  refunds(first: Int = 20, after: Cursor): OrderRefundConnection!
  activity(first: Int = 50, after: Cursor): OrderActivityConnection!
  integrationLinks: [OrderIntegrationLink!]!
  tags: [String!]!
  adminNote: String
  customerNote: String
  customFields: JSON!
  placedAt: DateTime
  cancelledAt: DateTime
  closedAt: DateTime
  archivedAt: DateTime
  expiresAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderSource {
  code: String!
  externalId: String
  externalUrl: URL
}

type OrderCustomerSnapshot {
  customerId: ID
  email: String
  phone: String
  firstName: String
  middleName: String
  lastName: String
  company: String
  countryCode: CountryCode
}

type OrderContact {
  email: String
  phone: String
  firstName: String
  middleName: String
  lastName: String
  company: String
  note: String
  redactedAt: DateTime
}

type OrderAddress implements Node {
  id: ID!
  firstName: String
  middleName: String
  lastName: String
  company: String
  address1: String
  address2: String
  city: String
  provinceCode: String
  postalCode: String
  countryCode: CountryCode
  email: String
  phone: String
  data: JSON!
  redactedAt: DateTime
}

type OrderCost {
  subtotalAmount: Money!
  discountAmount: Money!
  shippingAmount: Money!
  taxAmount: Money!
  dutyAmount: Money!
  adjustmentAmount: Money!
  totalAmount: Money!
  paidAmount: Money!
  refundedAmount: Money!
  outstandingAmount: Money!
}

type OrderLine implements Node {
  id: ID!
  version: Int!
  parentLine: OrderLine
  purchasableId: ID
  productId: ID
  variantId: ID
  title: String!
  sku: String
  imageUrl: URL
  quantity: Int!
  cancelledQuantity: Int!
  fulfillableQuantity: Int!
  fulfilledQuantity: Int!
  returnableQuantity: Int!
  returnedQuantity: Int!
  refundableQuantity: Int!
  requiresShipping: Boolean!
  taxable: Boolean!
  weight: Weight
  unitCost: Money
  cost: OrderLineCost!
  purchasableSnapshot: JSON!
  customFields: JSON!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderLineCost {
  unitPrice: Money!
  unitCompareAtPrice: Money
  subtotalAmount: Money!
  discountAmount: Money!
  taxAmount: Money!
  dutyAmount: Money!
  totalAmount: Money!
}

type OrderDiscount implements Node {
  id: ID!
  code: String
  title: String!
  source: String!
  target: String!
  value: Decimal!
  amount: Money!
  metadata: JSON!
}

type OrderTaxLine implements Node {
  id: ID!
  title: String!
  rate: Decimal!
  amount: Money!
  included: Boolean!
  jurisdiction: String
}

type OrderDeliveryGroup implements Node {
  id: ID!
  lines: [OrderLine!]!
  address: OrderAddress
  recipient: OrderContact
  selectedMethod: OrderDeliveryMethod
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderDeliveryMethod {
  code: String!
  title: String!
  providerCode: String!
  type: String!
  paymentModel: String
  amount: Money!
  customerInput: JSON!
  providerSnapshot: JSON!
}

type OrderPayment {
  status: OrderPaymentStatus!
  selectedMethod: OrderPaymentMethod
  authorizedAmount: Money!
  capturedAmount: Money!
  refundedAmount: Money!
  voidedAmount: Money!
  outstandingAmount: Money!
  attempts: [OrderPaymentAttempt!]!
  transactions: [OrderPaymentTransaction!]!
  disputes: [OrderPaymentDispute!]!
}

type OrderPaymentMethod {
  code: String!
  title: String!
  providerCode: String!
  flow: String!
  customerInput: JSON!
  providerSnapshot: JSON!
}

type OrderPaymentAttempt implements Node {
  id: ID!
  status: OrderPaymentStatus!
  requestedAmount: Money!
  providerCode: String!
  providerReference: String
  failureCode: String
  failureMessage: String
  customerAction: JSON
  expiresAt: DateTime
  processedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderPaymentTransaction implements Node {
  id: ID!
  kind: OrderPaymentTransactionKind!
  status: OrderPaymentTransactionStatus!
  amount: Money!
  providerCode: String!
  providerReference: String
  parentTransaction: OrderPaymentTransaction
  failureCode: String
  failureMessage: String
  processedAt: DateTime
  createdAt: DateTime!
}

type OrderPaymentDispute implements Node {
  id: ID!
  providerCode: String!
  providerReference: String!
  status: String!
  reason: String
  amount: Money!
  responseDueAt: DateTime
  resolvedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type FulfillmentOrder implements Node {
  id: ID!
  version: Int!
  order: Order!
  deliveryGroup: OrderDeliveryGroup!
  status: FulfillmentOrderStatus!
  requestStatus: FulfillmentRequestStatus!
  lines: [FulfillmentOrderLine!]!
  assignedLocationId: ID!
  assignedService: FulfillmentServiceRoute
  holds: [FulfillmentHold!]!
  fulfillAt: DateTime
  fulfillBy: DateTime
  supportedActions: [String!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type FulfillmentOrderLine implements Node {
  id: ID!
  orderLine: OrderLine!
  quantity: Int!
  remainingQuantity: Int!
  fulfilledQuantity: Int!
}

type FulfillmentServiceRoute {
  appCode: String!
  installationId: ID!
  serviceCode: String!
  providerRevision: String!
  externalReference: String
}

type FulfillmentHold implements Node {
  id: ID!
  reasonCode: String!
  note: String
  heldBy: OrderActor!
  createdAt: DateTime!
  releasedAt: DateTime
}

type Fulfillment implements Node {
  id: ID!
  version: Int!
  order: Order!
  fulfillmentOrder: FulfillmentOrder!
  status: FulfillmentStatus!
  locationId: ID!
  lines: [FulfillmentLine!]!
  shipments: [Shipment!]!
  notifyCustomer: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type FulfillmentLine {
  orderLine: OrderLine!
  quantity: Int!
}

type Shipment implements Node {
  id: ID!
  version: Int!
  order: Order!
  fulfillment: Fulfillment!
  status: ShipmentStatus!
  providerCode: String
  providerReference: String
  serviceCode: String
  tracking: [ShipmentTracking!]!
  packages: [ShipmentPackage!]!
  events: [ShipmentEvent!]!
  shippedAt: DateTime
  estimatedDeliveryAt: DateTime
  deliveredAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ShipmentTracking {
  number: String!
  url: URL
  company: String
}

type ShipmentPackage implements Node {
  id: ID!
  weight: Weight
  dimensions: Dimensions
  declaredValue: Money
  items: [ShipmentPackageItem!]!
}

type ShipmentPackageItem {
  orderLine: OrderLine!
  quantity: Int!
}

type ShipmentEvent implements Node {
  id: ID!
  status: ShipmentStatus!
  message: String
  location: String
  happenedAt: DateTime!
  recordedAt: DateTime!
}

type OrderReturn implements Node {
  id: ID!
  version: Int!
  order: Order!
  status: OrderReturnRequestStatus!
  lines: [OrderReturnLine!]!
  returnShipment: Shipment
  customerNote: String
  staffNote: String
  requestedAt: DateTime!
  approvedAt: DateTime
  receivedAt: DateTime
  completedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderReturnLine {
  orderLine: OrderLine!
  quantity: Int!
  receivedQuantity: Int!
  restockableQuantity: Int!
  damagedQuantity: Int!
  reasonCode: String!
  note: String
}

type OrderExchange implements Node {
  id: ID!
  version: Int!
  order: Order!
  status: OrderExchangeStatus!
  inboundLines: [OrderReturnLine!]!
  outboundLines: [OrderLine!]!
  balance: Money!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderRefund implements Node {
  id: ID!
  version: Int!
  order: Order!
  status: OrderRefundStatus!
  amount: Money!
  reasonCode: String!
  note: String
  lines: [OrderRefundLine!]!
  transactions: [OrderPaymentTransaction!]!
  createdAt: DateTime!
  processedAt: DateTime
}

type OrderRefundLine {
  orderLine: OrderLine
  quantity: Int
  amount: Money!
}

type OrderActivity implements Node {
  id: ID!
  sequence: BigInt!
  type: String!
  visibility: String!
  message: String
  actor: OrderActor!
  data: JSON!
  happenedAt: DateTime!
  recordedAt: DateTime!
}

type OrderActor {
  type: OrderActorType!
  id: ID
  displayName: String
  user: User
  apiKey: ApiKey
}

type OrderIntegrationLink implements Node {
  id: ID!
  kind: OrderIntegrationKind!
  appCode: String!
  installationId: ID!
  direction: OrderSyncDirection!
  externalId: String
  externalUrl: URL
  status: OrderIntegrationSyncStatus!
  lastExportedOrderVersion: Int
  lastImportedExternalVersion: String
  lastSyncedAt: DateTime
  lastErrorCode: String
  lastErrorMessage: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrderOperation implements Node {
  id: ID!
  kind: OrderOperationKind!
  status: OrderOperationStatus!
  order: Order
  resourceId: ID
  idempotencyKey: String!
  progress: Int
  failureCode: String
  failureMessage: String
  retryable: Boolean!
  createdAt: DateTime!
  startedAt: DateTime
  completedAt: DateTime
}

type OrderEditSession implements Node {
  id: ID!
  version: Int!
  order: Order!
  baseOrderVersion: Int!
  status: String!
  calculatedOrder: CalculatedOrder!
  changes: [OrderEditChange!]!
  createdBy: OrderActor!
  createdAt: DateTime!
  expiresAt: DateTime!
}

type CalculatedOrder {
  lines: [OrderLine!]!
  cost: OrderCost!
  balanceDelta: Money!
}

type OrderEditChange implements Node {
  id: ID!
  kind: String!
  payload: JSON!
  createdAt: DateTime!
}

type OrderConnection implements Connection {
  edges: [OrderEdge!]!
  nodes: [Order!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type OrderEdge { cursor: Cursor!, node: Order! }
type OrderReturnConnection implements Connection { edges: [OrderReturnEdge!]!, nodes: [OrderReturn!]!, pageInfo: PageInfo!, totalCount: Int! }
type OrderReturnEdge { cursor: Cursor!, node: OrderReturn! }
type OrderExchangeConnection implements Connection { edges: [OrderExchangeEdge!]!, nodes: [OrderExchange!]!, pageInfo: PageInfo!, totalCount: Int! }
type OrderExchangeEdge { cursor: Cursor!, node: OrderExchange! }
type OrderRefundConnection implements Connection { edges: [OrderRefundEdge!]!, nodes: [OrderRefund!]!, pageInfo: PageInfo!, totalCount: Int! }
type OrderRefundEdge { cursor: Cursor!, node: OrderRefund! }
type OrderActivityConnection implements Connection { edges: [OrderActivityEdge!]!, nodes: [OrderActivity!]!, pageInfo: PageInfo!, totalCount: Int! }
type OrderActivityEdge { cursor: Cursor!, node: OrderActivity! }

input OrderWhereInput {
  and: [OrderWhereInput!]
  or: [OrderWhereInput!]
  id: IDFilterInput
  number: BigIntFilterInput
  status: OrderStatusFilterInput
  paymentStatus: OrderPaymentStatusFilterInput
  fulfillmentStatus: OrderFulfillmentStatusFilterInput
  deliveryStatus: OrderDeliveryStatusFilterInput
  returnStatus: OrderReturnStatusFilterInput
  customerId: IDFilterInput
  customerName: StringFilterInput
  customerEmail: StringFilterInput
  customerPhone: StringFilterInput
  externalId: StringFilterInput
  sourceCode: StringFilterInput
  totalAmount: DecimalFilterInput
  currencyCode: CurrencyCodeFilterInput
  shippingCountry: CountryCodeFilterInput
  deliveryMethodCode: StringFilterInput
  paymentMethodCode: StringFilterInput
  tag: StringFilterInput
  trackingNumber: StringFilterInput
  hasTracking: Boolean
  archived: Boolean
  createdAt: DateTimeFilterInput
  updatedAt: DateTimeFilterInput
  placedAt: DateTimeFilterInput
}

input OrderOrderByInput { field: OrderSortField!, direction: SortDirection! }
input IDFilterInput { eq: ID, in: [ID!], notIn: [ID!] }
input BigIntFilterInput { eq: BigInt, gt: BigInt, gte: BigInt, lt: BigInt, lte: BigInt }
input DecimalFilterInput { eq: Decimal, gt: Decimal, gte: Decimal, lt: Decimal, lte: Decimal }
input StringFilterInput { eq: String, in: [String!], contains: String, startsWith: String }
input DateTimeFilterInput { eq: DateTime, gt: DateTime, gte: DateTime, lt: DateTime, lte: DateTime }
input OrderStatusFilterInput { eq: OrderStatus, in: [OrderStatus!] }
input OrderPaymentStatusFilterInput { eq: OrderPaymentStatus, in: [OrderPaymentStatus!] }
input OrderFulfillmentStatusFilterInput { eq: OrderFulfillmentStatus, in: [OrderFulfillmentStatus!] }
input OrderDeliveryStatusFilterInput { eq: OrderDeliveryStatus, in: [OrderDeliveryStatus!] }
input OrderReturnStatusFilterInput { eq: OrderReturnStatus, in: [OrderReturnStatus!] }
input CurrencyCodeFilterInput { eq: CurrencyCode, in: [CurrencyCode!] }
input CountryCodeFilterInput { eq: CountryCode, in: [CountryCode!] }

input MoneyInput { amount: Decimal!, currencyCode: CurrencyCode! }
input WeightInput { value: Float!, unit: WeightUnit! }
input DimensionsInput { width: Float!, height: Float!, length: Float!, unit: DimensionUnit! }

input OrderAddressInput {
  firstName: String
  middleName: String
  lastName: String
  company: String
  address1: String
  address2: String
  city: String
  provinceCode: String
  postalCode: String
  countryCode: CountryCode!
  email: String
  phone: String
  data: JSON
}

input OrderContactInput {
  email: String
  phone: String
  firstName: String
  middleName: String
  lastName: String
  company: String
  note: String
}

input OrderLineCreateInput {
  purchasableId: ID
  title: String!
  sku: String
  quantity: Int!
  unitPrice: MoneyInput!
  unitCompareAtPrice: MoneyInput
  unitCost: MoneyInput
  weight: WeightInput
  requiresShipping: Boolean = true
  taxable: Boolean = true
  customFields: JSON
}

input OrderDeliveryInput {
  methodCode: String
  address: OrderAddressInput
  recipient: OrderContactInput
}

input OrderCreateInput {
  idempotencyKey: String!
  clientMutationId: String
  customerId: ID
  contact: OrderContactInput!
  billingAddress: OrderAddressInput
  shipping: OrderDeliveryInput
  localeCode: LocaleCode
  sourceCode: String
  externalId: String
  lines: [OrderLineCreateInput!]!
  paymentMethodCode: String
  tags: [String!]
  adminNote: String
  customerNote: String
  customFields: JSON
}

input OrderUpdateInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  contact: OrderContactInput
  billingAddress: OrderAddressInput
  shipping: OrderDeliveryInput
  localeCode: LocaleCode
  customerNote: String
}

input OrderDeleteInput { id: ID!, expectedVersion: Int!, idempotencyKey: String! }
input OrderCompleteDraftInput { id: ID!, expectedVersion: Int!, idempotencyKey: String!, notifyCustomer: Boolean = false }
input OrderCloseInput { id: ID!, expectedVersion: Int!, idempotencyKey: String!, reason: String }
input OrderReopenInput { id: ID!, expectedVersion: Int!, idempotencyKey: String!, reason: String! }
input OrderArchiveInput { id: ID!, expectedVersion: Int!, idempotencyKey: String! }
input OrderUnarchiveInput { id: ID!, expectedVersion: Int!, idempotencyKey: String! }

input OrderCancelInput {
  id: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  reasonCode: String!
  staffNote: String
  notifyCustomer: Boolean = false
  restock: Boolean = true
  refundMode: String = "ORIGINAL_PAYMENT_METHODS"
}

input OrderCustomerSetInput { id: ID!, expectedVersion: Int!, idempotencyKey: String!, customerId: ID }
input OrderTagsUpdateInput { id: ID!, expectedVersion: Int!, idempotencyKey: String!, tags: [String!]! }
input OrderAdminNoteUpdateInput { id: ID!, expectedVersion: Int!, idempotencyKey: String!, adminNote: String }
input OrderCommentAddInput { id: ID!, expectedVersion: Int!, idempotencyKey: String!, comment: String!, visibility: String = "STAFF" }
input OrderCustomFieldsUpdateInput { id: ID!, expectedVersion: Int!, idempotencyKey: String!, customFields: JSON! }

input OrderLineAddInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String!, line: OrderLineCreateInput! }
input OrderLineUpdateInput {
  orderId: ID!
  lineId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  quantity: Int
  unitCost: MoneyInput
  weight: WeightInput
  customFields: JSON
}
input OrderLineDeleteInput { orderId: ID!, lineId: ID!, expectedVersion: Int!, idempotencyKey: String! }

input OrderEditBeginInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String! }
input OrderEditLineAddInput { editId: ID!, expectedEditVersion: Int!, idempotencyKey: String!, line: OrderLineCreateInput! }
input OrderEditLineUpdateInput { editId: ID!, lineId: ID!, expectedEditVersion: Int!, idempotencyKey: String!, quantity: Int, unitPrice: MoneyInput }
input OrderEditLineRemoveInput { editId: ID!, lineId: ID!, expectedEditVersion: Int!, idempotencyKey: String! }
input OrderEditShippingUpdateInput { editId: ID!, expectedEditVersion: Int!, idempotencyKey: String!, shipping: OrderDeliveryInput! }
input OrderEditDiscountAddInput { editId: ID!, expectedEditVersion: Int!, idempotencyKey: String!, title: String!, amount: MoneyInput!, reasonCode: String! }
input OrderEditDiscountRemoveInput { editId: ID!, discountId: ID!, expectedEditVersion: Int!, idempotencyKey: String! }
input OrderEditCommitInput { editId: ID!, expectedEditVersion: Int!, expectedOrderVersion: Int!, idempotencyKey: String!, notifyCustomer: Boolean = false, staffNote: String }
input OrderEditAbandonInput { editId: ID!, expectedEditVersion: Int!, idempotencyKey: String! }

input OrderManualPaymentRecordInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String!, amount: MoneyInput!, methodCode: String!, reference: String, paidAt: DateTime!, note: String }
input OrderPaymentCaptureInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String!, transactionId: ID!, amount: MoneyInput }
input OrderPaymentVoidInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String!, transactionId: ID!, reason: String! }
input OrderPaymentRetryInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String!, paymentMethodCode: String, returnUrl: URL }
input OrderPaymentStatusOverrideInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String!, status: OrderPaymentStatus!, reasonCode: String!, note: String! }

input OrderRefundCreateInput {
  orderId: ID!
  expectedVersion: Int!
  idempotencyKey: String!
  amount: MoneyInput!
  reasonCode: String!
  note: String
  notifyCustomer: Boolean = false
  lines: [OrderRefundLineInput!]
  transactionAllocations: [OrderRefundTransactionAllocationInput!]
}
input OrderRefundLineInput { orderLineId: ID!, quantity: Int!, amount: MoneyInput! }
input OrderRefundTransactionAllocationInput { transactionId: ID!, amount: MoneyInput! }

input FulfillmentOrderLineQuantityInput { fulfillmentOrderLineId: ID!, quantity: Int! }
input FulfillmentOrderSplitInput { fulfillmentOrderId: ID!, expectedVersion: Int!, idempotencyKey: String!, lines: [FulfillmentOrderLineQuantityInput!]! }
input FulfillmentOrderMoveInput { fulfillmentOrderId: ID!, expectedVersion: Int!, idempotencyKey: String!, locationId: ID!, serviceCode: String }
input FulfillmentOrderHoldInput { fulfillmentOrderId: ID!, expectedVersion: Int!, idempotencyKey: String!, reasonCode: String!, note: String }
input FulfillmentOrderReleaseHoldInput { fulfillmentOrderId: ID!, holdId: ID!, expectedVersion: Int!, idempotencyKey: String! }
input FulfillmentOrderSubmitInput { fulfillmentOrderId: ID!, expectedVersion: Int!, idempotencyKey: String! }
input FulfillmentOrderCancelRequestInput { fulfillmentOrderId: ID!, expectedVersion: Int!, idempotencyKey: String!, reasonCode: String!, note: String }
input FulfillmentCreateInput { fulfillmentOrderId: ID!, expectedVersion: Int!, idempotencyKey: String!, lines: [FulfillmentOrderLineQuantityInput!]!, notifyCustomer: Boolean = false }
input FulfillmentCancelInput { fulfillmentId: ID!, expectedVersion: Int!, idempotencyKey: String!, reasonCode: String!, restock: Boolean = true }

input ShipmentCreateInput { fulfillmentId: ID!, expectedVersion: Int!, idempotencyKey: String!, providerCode: String, serviceCode: String, packages: [ShipmentPackageInput!]!, notifyCustomer: Boolean = false }
input ShipmentPackageInput { weight: WeightInput, dimensions: DimensionsInput, declaredValue: MoneyInput, items: [ShipmentPackageItemInput!]! }
input ShipmentPackageItemInput { orderLineId: ID!, quantity: Int! }
input ShipmentTrackingUpdateInput { shipmentId: ID!, expectedVersion: Int!, idempotencyKey: String!, tracking: [ShipmentTrackingInput!]! }
input ShipmentTrackingInput { number: String!, url: URL, company: String }
input ShipmentMarkShippedInput { shipmentId: ID!, expectedVersion: Int!, idempotencyKey: String!, shippedAt: DateTime! }
input ShipmentMarkDeliveredInput { shipmentId: ID!, expectedVersion: Int!, idempotencyKey: String!, deliveredAt: DateTime! }
input ShipmentCancelInput { shipmentId: ID!, expectedVersion: Int!, idempotencyKey: String!, reasonCode: String! }
input ShipmentReconcileInput { shipmentId: ID!, expectedVersion: Int!, idempotencyKey: String! }

input OrderReturnLineInput { orderLineId: ID!, quantity: Int!, reasonCode: String!, note: String }
input OrderReturnCreateInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String!, lines: [OrderReturnLineInput!]!, customerNote: String, staffNote: String, notifyCustomer: Boolean = false }
input OrderReturnApproveInput { returnId: ID!, expectedVersion: Int!, idempotencyKey: String!, locationId: ID!, createReturnShipment: Boolean = false, staffNote: String }
input OrderReturnRejectInput { returnId: ID!, expectedVersion: Int!, idempotencyKey: String!, reasonCode: String!, staffNote: String }
input OrderReturnCancelInput { returnId: ID!, expectedVersion: Int!, idempotencyKey: String!, reasonCode: String! }
input OrderReturnReceiveInput { returnId: ID!, expectedVersion: Int!, idempotencyKey: String!, locationId: ID!, lines: [OrderReturnReceiveLineInput!]!, refund: OrderReturnRefundInput }
input OrderReturnReceiveLineInput { orderLineId: ID!, receivedQuantity: Int!, restockableQuantity: Int!, damagedQuantity: Int! }
input OrderReturnRefundInput { amount: MoneyInput!, reasonCode: String!, notifyCustomer: Boolean = false }

input OrderExchangeCreateInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String!, inboundLines: [OrderReturnLineInput!]!, outboundLines: [OrderLineCreateInput!]!, notifyCustomer: Boolean = false, staffNote: String }
input OrderExchangeCancelInput { exchangeId: ID!, expectedVersion: Int!, idempotencyKey: String!, reasonCode: String! }

input OrderIntegrationSyncRequestInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String!, integrationLinkId: ID!, force: Boolean = false }
input OrderIntegrationSyncRetryInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String!, operationId: ID! }
input OrderIntegrationLinkDetachInput { orderId: ID!, expectedVersion: Int!, idempotencyKey: String!, integrationLinkId: ID!, reason: String! }
input OrdersBulkActionInput { selection: OrderBulkSelectionInput!, action: OrdersBulkActionKind!, idempotencyKey: String!, reasonCode: String, tags: [String!], integrationLinkId: ID }
input OrderBulkSelectionInput { ids: [ID!], where: OrderWhereInput, excludedIds: [ID!] }

type OrderUserError implements DisplayableError {
  field: [String!]
  message: String!
  code: String!
  retryable: Boolean!
  currentVersion: Int
}

type OrderPayload { order: Order, userErrors: [OrderUserError!]!, clientMutationId: String }
type OrderDeletePayload { deletedId: ID, order: Order, userErrors: [OrderUserError!]! }
type OrderLinePayload { order: Order, line: OrderLine, userErrors: [OrderUserError!]! }
type OrderActivityPayload { order: Order, activity: OrderActivity, userErrors: [OrderUserError!]! }
type OrderEditPayload { order: Order, edit: OrderEditSession, userErrors: [OrderUserError!]! }
type OrderOperationPayload { order: Order, operation: OrderOperation, userErrors: [OrderUserError!]! }
type FulfillmentOrderPayload { order: Order, fulfillmentOrder: FulfillmentOrder, userErrors: [OrderUserError!]! }
type FulfillmentPayload { order: Order, fulfillment: Fulfillment, userErrors: [OrderUserError!]! }
type ShipmentPayload { order: Order, shipment: Shipment, userErrors: [OrderUserError!]! }
type OrderReturnPayload { order: Order, return: OrderReturn, userErrors: [OrderUserError!]! }
type OrderExchangePayload { order: Order, exchange: OrderExchange, userErrors: [OrderUserError!]! }
```

### 6.1. SDL validation notes

- Если shared Admin schema ещё не содержит `Cursor`, `Connection`, `PageInfo`, `DisplayableError`, `Money`, `Weight`, `Dimensions` и соответствующие unit enums, они сначала добавляются в `packages/shared-references`, а не дублируются в Orders.
- `BigInt` сериализуется строкой, чтобы order number/sequence не теряли точность.
- `Money.amount` и `MoneyInput.amount` — decimal string; в PostgreSQL суммы сохраняются minor-unit `bigint` и currency code.
- `Order.version` отображает event-stream revision; `updatedAt` не используется как concurrency token.
- Global IDs декодируются с проверкой entity type до вызова Script.
- `userErrors` используются для validation/business/permission conflicts; transport/system failures остаются GraphQL errors.
- `orderOperation` нужен для long-running DBOS operations и polling. Mutation может вернуть уже `SUCCEEDED` operation для синхронно завершившейся команды.

