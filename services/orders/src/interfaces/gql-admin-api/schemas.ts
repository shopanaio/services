import { z } from "zod";
import {
  ApiBigIntFilterInput,
  ApiCountryCode,
  ApiCountryCodeFilterInput,
  ApiCurrencyCode,
  ApiCurrencyCodeFilterInput,
  ApiDateTimeFilterInput,
  ApiDecimalFilterInput,
  ApiDimensionUnit,
  ApiFulfillmentCancelInput,
  ApiFulfillmentCreateInput,
  ApiFulfillmentOrderCancelRequestInput,
  ApiFulfillmentOrderHoldInput,
  ApiFulfillmentOrderLineQuantityInput,
  ApiFulfillmentOrderMoveInput,
  ApiFulfillmentOrderReleaseHoldInput,
  ApiFulfillmentOrderSplitInput,
  ApiFulfillmentOrderStatus,
  ApiFulfillmentOrderSubmitInput,
  ApiFulfillmentRequestStatus,
  ApiFulfillmentStatus,
  ApiIdFilterInput,
  ApiLocaleCode,
  ApiMoneyInput,
  ApiOrderAction,
  ApiOrderActorType,
  ApiOrderAddressInput,
  ApiOrderAdminNoteUpdateInput,
  ApiOrderArchiveInput,
  ApiOrderBulkSelectionInput,
  ApiOrderCancelInput,
  ApiOrderCloseInput,
  ApiOrderCommentAddInput,
  ApiOrderCompleteDraftInput,
  ApiOrderContactInput,
  ApiOrderCreateInput,
  ApiOrderCustomFieldsUpdateInput,
  ApiOrderCustomerSetInput,
  ApiOrderDeleteInput,
  ApiOrderDeliveryInput,
  ApiOrderDeliveryStatus,
  ApiOrderDeliveryStatusFilterInput,
  ApiOrderDimensionsInput,
  ApiOrderEditAbandonInput,
  ApiOrderEditBeginInput,
  ApiOrderEditCommitInput,
  ApiOrderEditDiscountAddInput,
  ApiOrderEditDiscountRemoveInput,
  ApiOrderEditLineAddInput,
  ApiOrderEditLineRemoveInput,
  ApiOrderEditLineUpdateInput,
  ApiOrderEditShippingUpdateInput,
  ApiOrderExchangeCancelInput,
  ApiOrderExchangeCreateInput,
  ApiOrderExchangeStatus,
  ApiOrderFulfillmentStatus,
  ApiOrderFulfillmentStatusFilterInput,
  ApiOrderIntegrationKind,
  ApiOrderIntegrationLinkDetachInput,
  ApiOrderIntegrationSyncRequestInput,
  ApiOrderIntegrationSyncRetryInput,
  ApiOrderIntegrationSyncStatus,
  ApiOrderLineAddInput,
  ApiOrderLineCreateInput,
  ApiOrderLineDeleteInput,
  ApiOrderLineUpdateInput,
  ApiOrderManualPaymentRecordInput,
  ApiOrderOperationKind,
  ApiOrderOperationStatus,
  ApiOrderOrderByInput,
  ApiOrderOrigin,
  ApiOrderPaymentCaptureInput,
  ApiOrderPaymentRetryInput,
  ApiOrderPaymentStatus,
  ApiOrderPaymentStatusFilterInput,
  ApiOrderPaymentStatusOverrideInput,
  ApiOrderPaymentTransactionKind,
  ApiOrderPaymentTransactionStatus,
  ApiOrderPaymentVoidInput,
  ApiOrderPlacementStatus,
  ApiOrderPlacementStatusFilterInput,
  ApiOrderRefundCreateInput,
  ApiOrderRefundLineInput,
  ApiOrderRefundStatus,
  ApiOrderRefundTransactionAllocationInput,
  ApiOrderReopenInput,
  ApiOrderReturnApproveInput,
  ApiOrderReturnCancelInput,
  ApiOrderReturnCreateInput,
  ApiOrderReturnLineInput,
  ApiOrderReturnReceiveInput,
  ApiOrderReturnReceiveLineInput,
  ApiOrderReturnRefundInput,
  ApiOrderReturnRejectInput,
  ApiOrderReturnRequestStatus,
  ApiOrderReturnStatus,
  ApiOrderReturnStatusFilterInput,
  ApiOrderRiskLevel,
  ApiOrderSortDirection,
  ApiOrderSortField,
  ApiOrderStatus,
  ApiOrderStatusFilterInput,
  ApiOrderSyncDirection,
  ApiOrderTagsUpdateInput,
  ApiOrderUnarchiveInput,
  ApiOrderUpdateInput,
  ApiOrderWeightInput,
  ApiOrderWhereInput,
  ApiOrdersBulkActionInput,
  ApiOrdersBulkActionKind,
  ApiShipmentCancelInput,
  ApiShipmentCreateInput,
  ApiShipmentMarkDeliveredInput,
  ApiShipmentMarkShippedInput,
  ApiShipmentPackageInput,
  ApiShipmentPackageItemInput,
  ApiShipmentReconcileInput,
  ApiShipmentStatus,
  ApiShipmentTrackingInput,
  ApiShipmentTrackingUpdateInput,
  ApiStringFilterInput,
  ApiWeightUnit,
} from "./types.js";

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K], any, T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny =>
  v !== undefined && v !== null;

export const definedNonNullAnySchema = z.any().refine((v) => isDefinedNonNullAny(v));

export const ApiCountryCodeSchema = z.nativeEnum(ApiCountryCode);

export const ApiCurrencyCodeSchema = z.nativeEnum(ApiCurrencyCode);

export const ApiDimensionUnitSchema = z.nativeEnum(ApiDimensionUnit);

export const ApiFulfillmentOrderStatusSchema = z.nativeEnum(ApiFulfillmentOrderStatus);

export const ApiFulfillmentRequestStatusSchema = z.nativeEnum(ApiFulfillmentRequestStatus);

export const ApiFulfillmentStatusSchema = z.nativeEnum(ApiFulfillmentStatus);

export const ApiLocaleCodeSchema = z.nativeEnum(ApiLocaleCode);

export const ApiOrderActionSchema = z.nativeEnum(ApiOrderAction);

export const ApiOrderActorTypeSchema = z.nativeEnum(ApiOrderActorType);

export const ApiOrderDeliveryStatusSchema = z.nativeEnum(ApiOrderDeliveryStatus);

export const ApiOrderExchangeStatusSchema = z.nativeEnum(ApiOrderExchangeStatus);

export const ApiOrderFulfillmentStatusSchema = z.nativeEnum(ApiOrderFulfillmentStatus);

export const ApiOrderIntegrationKindSchema = z.nativeEnum(ApiOrderIntegrationKind);

export const ApiOrderIntegrationSyncStatusSchema = z.nativeEnum(ApiOrderIntegrationSyncStatus);

export const ApiOrderOperationKindSchema = z.nativeEnum(ApiOrderOperationKind);

export const ApiOrderOperationStatusSchema = z.nativeEnum(ApiOrderOperationStatus);

export const ApiOrderOriginSchema = z.nativeEnum(ApiOrderOrigin);

export const ApiOrderPaymentStatusSchema = z.nativeEnum(ApiOrderPaymentStatus);

export const ApiOrderPaymentTransactionKindSchema = z.nativeEnum(ApiOrderPaymentTransactionKind);

export const ApiOrderPaymentTransactionStatusSchema = z.nativeEnum(
  ApiOrderPaymentTransactionStatus,
);

export const ApiOrderPlacementStatusSchema = z.nativeEnum(ApiOrderPlacementStatus);

export const ApiOrderRefundStatusSchema = z.nativeEnum(ApiOrderRefundStatus);

export const ApiOrderReturnRequestStatusSchema = z.nativeEnum(ApiOrderReturnRequestStatus);

export const ApiOrderReturnStatusSchema = z.nativeEnum(ApiOrderReturnStatus);

export const ApiOrderRiskLevelSchema = z.nativeEnum(ApiOrderRiskLevel);

export const ApiOrderSortDirectionSchema = z.nativeEnum(ApiOrderSortDirection);

export const ApiOrderSortFieldSchema = z.nativeEnum(ApiOrderSortField);

export const ApiOrderStatusSchema = z.nativeEnum(ApiOrderStatus);

export const ApiOrderSyncDirectionSchema = z.nativeEnum(ApiOrderSyncDirection);

export const ApiOrdersBulkActionKindSchema = z.nativeEnum(ApiOrdersBulkActionKind);

export const ApiShipmentStatusSchema = z.nativeEnum(ApiShipmentStatus);

export const ApiWeightUnitSchema = z.nativeEnum(ApiWeightUnit);

export function ApiBigIntFilterInputSchema(): z.ZodObject<Properties<ApiBigIntFilterInput>> {
  return z.object({
    eq: z.string().nullish(),
    gt: z.string().nullish(),
    gte: z.string().nullish(),
    lt: z.string().nullish(),
    lte: z.string().nullish(),
  });
}

export function ApiCountryCodeFilterInputSchema(): z.ZodObject<
  Properties<ApiCountryCodeFilterInput>
> {
  return z.object({
    eq: ApiCountryCodeSchema.nullish(),
    in: z.array(ApiCountryCodeSchema).nullish(),
  });
}

export function ApiCurrencyCodeFilterInputSchema(): z.ZodObject<
  Properties<ApiCurrencyCodeFilterInput>
> {
  return z.object({
    eq: ApiCurrencyCodeSchema.nullish(),
    in: z.array(ApiCurrencyCodeSchema).nullish(),
  });
}

export function ApiDateTimeFilterInputSchema(): z.ZodObject<Properties<ApiDateTimeFilterInput>> {
  return z.object({
    eq: z.string().datetime({ offset: true }).nullish(),
    gt: z.string().datetime({ offset: true }).nullish(),
    gte: z.string().datetime({ offset: true }).nullish(),
    lt: z.string().datetime({ offset: true }).nullish(),
    lte: z.string().datetime({ offset: true }).nullish(),
  });
}

export function ApiDecimalFilterInputSchema(): z.ZodObject<Properties<ApiDecimalFilterInput>> {
  return z.object({
    eq: z.string().nullish(),
    gt: z.string().nullish(),
    gte: z.string().nullish(),
    lt: z.string().nullish(),
    lte: z.string().nullish(),
  });
}

export function ApiFulfillmentCancelInputSchema(): z.ZodObject<
  Properties<ApiFulfillmentCancelInput>
> {
  return z.object({
    expectedVersion: z.number(),
    fulfillmentId: z.string(),
    idempotencyKey: z.string(),
    reasonCode: z.string(),
    restock: z.boolean().default(true).nullish(),
  });
}

export function ApiFulfillmentCreateInputSchema(): z.ZodObject<
  Properties<ApiFulfillmentCreateInput>
> {
  return z.object({
    expectedVersion: z.number(),
    fulfillmentOrderId: z.string(),
    idempotencyKey: z.string(),
    lines: z.array(z.lazy(() => ApiFulfillmentOrderLineQuantityInputSchema())),
    notifyCustomer: z.boolean().default(false).nullish(),
  });
}

export function ApiFulfillmentOrderCancelRequestInputSchema(): z.ZodObject<
  Properties<ApiFulfillmentOrderCancelRequestInput>
> {
  return z.object({
    expectedVersion: z.number(),
    fulfillmentOrderId: z.string(),
    idempotencyKey: z.string(),
    note: z.string().nullish(),
    reasonCode: z.string(),
  });
}

export function ApiFulfillmentOrderHoldInputSchema(): z.ZodObject<
  Properties<ApiFulfillmentOrderHoldInput>
> {
  return z.object({
    expectedVersion: z.number(),
    fulfillmentOrderId: z.string(),
    idempotencyKey: z.string(),
    note: z.string().nullish(),
    reasonCode: z.string(),
  });
}

export function ApiFulfillmentOrderLineQuantityInputSchema(): z.ZodObject<
  Properties<ApiFulfillmentOrderLineQuantityInput>
> {
  return z.object({
    fulfillmentOrderLineId: z.string(),
    quantity: z.number(),
  });
}

export function ApiFulfillmentOrderMoveInputSchema(): z.ZodObject<
  Properties<ApiFulfillmentOrderMoveInput>
> {
  return z.object({
    expectedVersion: z.number(),
    fulfillmentOrderId: z.string(),
    idempotencyKey: z.string(),
    locationId: z.string(),
    serviceCode: z.string().nullish(),
  });
}

export function ApiFulfillmentOrderReleaseHoldInputSchema(): z.ZodObject<
  Properties<ApiFulfillmentOrderReleaseHoldInput>
> {
  return z.object({
    expectedVersion: z.number(),
    fulfillmentOrderId: z.string(),
    holdId: z.string(),
    idempotencyKey: z.string(),
  });
}

export function ApiFulfillmentOrderSplitInputSchema(): z.ZodObject<
  Properties<ApiFulfillmentOrderSplitInput>
> {
  return z.object({
    expectedVersion: z.number(),
    fulfillmentOrderId: z.string(),
    idempotencyKey: z.string(),
    lines: z.array(z.lazy(() => ApiFulfillmentOrderLineQuantityInputSchema())),
  });
}

export function ApiFulfillmentOrderSubmitInputSchema(): z.ZodObject<
  Properties<ApiFulfillmentOrderSubmitInput>
> {
  return z.object({
    expectedVersion: z.number(),
    fulfillmentOrderId: z.string(),
    idempotencyKey: z.string(),
  });
}

export function ApiIdFilterInputSchema(): z.ZodObject<Properties<ApiIdFilterInput>> {
  return z.object({
    eq: z.string().nullish(),
    in: z.array(z.string()).nullish(),
    notIn: z.array(z.string()).nullish(),
  });
}

export function ApiMoneyInputSchema(): z.ZodObject<Properties<ApiMoneyInput>> {
  return z.object({
    amount: z.string(),
    currencyCode: ApiCurrencyCodeSchema,
  });
}

export function ApiOrderAddressInputSchema(): z.ZodObject<Properties<ApiOrderAddressInput>> {
  return z.object({
    address1: z.string().nullish(),
    address2: z.string().nullish(),
    city: z.string().nullish(),
    company: z.string().nullish(),
    countryCode: ApiCountryCodeSchema,
    data: z.unknown().nullish(),
    email: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    middleName: z.string().nullish(),
    phone: z.string().nullish(),
    postalCode: z.string().nullish(),
    provinceCode: z.string().nullish(),
  });
}

export function ApiOrderAdminNoteUpdateInputSchema(): z.ZodObject<
  Properties<ApiOrderAdminNoteUpdateInput>
> {
  return z.object({
    adminNote: z.string().nullish(),
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
  });
}

export function ApiOrderArchiveInputSchema(): z.ZodObject<Properties<ApiOrderArchiveInput>> {
  return z.object({
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
  });
}

export function ApiOrderBulkSelectionInputSchema(): z.ZodObject<
  Properties<ApiOrderBulkSelectionInput>
> {
  return z.object({
    excludedIds: z.array(z.string()).nullish(),
    ids: z.array(z.string()).nullish(),
    where: z.lazy(() => ApiOrderWhereInputSchema().nullish()),
  });
}

export function ApiOrderCancelInputSchema(): z.ZodObject<Properties<ApiOrderCancelInput>> {
  return z.object({
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
    notifyCustomer: z.boolean().default(false).nullish(),
    reasonCode: z.string(),
    refundMode: z.string().default("ORIGINAL_PAYMENT_METHODS").nullish(),
    restock: z.boolean().default(true).nullish(),
    staffNote: z.string().nullish(),
  });
}

export function ApiOrderCloseInputSchema(): z.ZodObject<Properties<ApiOrderCloseInput>> {
  return z.object({
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
    reason: z.string().nullish(),
  });
}

export function ApiOrderCommentAddInputSchema(): z.ZodObject<Properties<ApiOrderCommentAddInput>> {
  return z.object({
    comment: z.string(),
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
    visibility: z.string().default("STAFF").nullish(),
  });
}

export function ApiOrderCompleteDraftInputSchema(): z.ZodObject<
  Properties<ApiOrderCompleteDraftInput>
> {
  return z.object({
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
    notifyCustomer: z.boolean().default(false).nullish(),
  });
}

export function ApiOrderContactInputSchema(): z.ZodObject<Properties<ApiOrderContactInput>> {
  return z.object({
    company: z.string().nullish(),
    email: z.string().nullish(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    middleName: z.string().nullish(),
    note: z.string().nullish(),
    phone: z.string().nullish(),
  });
}

export function ApiOrderCreateInputSchema(): z.ZodObject<Properties<ApiOrderCreateInput>> {
  return z.object({
    adminNote: z.string().nullish(),
    billingAddress: z.lazy(() => ApiOrderAddressInputSchema().nullish()),
    clientMutationId: z.string().nullish(),
    contact: z.lazy(() => ApiOrderContactInputSchema()),
    customFields: z.unknown().nullish(),
    customerId: z.string().nullish(),
    customerNote: z.string().nullish(),
    externalId: z.string().nullish(),
    idempotencyKey: z.string(),
    lines: z.array(z.lazy(() => ApiOrderLineCreateInputSchema())),
    localeCode: ApiLocaleCodeSchema.nullish(),
    paymentMethodCode: z.string().nullish(),
    shipping: z.lazy(() => ApiOrderDeliveryInputSchema().nullish()),
    sourceCode: z.string().nullish(),
    tags: z.array(z.string()).nullish(),
  });
}

export function ApiOrderCustomFieldsUpdateInputSchema(): z.ZodObject<
  Properties<ApiOrderCustomFieldsUpdateInput>
> {
  return z.object({
    customFields: z.unknown(),
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
  });
}

export function ApiOrderCustomerSetInputSchema(): z.ZodObject<
  Properties<ApiOrderCustomerSetInput>
> {
  return z.object({
    customerId: z.string().nullish(),
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
  });
}

export function ApiOrderDeleteInputSchema(): z.ZodObject<Properties<ApiOrderDeleteInput>> {
  return z.object({
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
  });
}

export function ApiOrderDeliveryInputSchema(): z.ZodObject<Properties<ApiOrderDeliveryInput>> {
  return z.object({
    address: z.lazy(() => ApiOrderAddressInputSchema().nullish()),
    methodCode: z.string().nullish(),
    recipient: z.lazy(() => ApiOrderContactInputSchema().nullish()),
  });
}

export function ApiOrderDeliveryStatusFilterInputSchema(): z.ZodObject<
  Properties<ApiOrderDeliveryStatusFilterInput>
> {
  return z.object({
    eq: ApiOrderDeliveryStatusSchema.nullish(),
    in: z.array(ApiOrderDeliveryStatusSchema).nullish(),
  });
}

export function ApiOrderDimensionsInputSchema(): z.ZodObject<Properties<ApiOrderDimensionsInput>> {
  return z.object({
    height: z.number(),
    length: z.number(),
    unit: ApiDimensionUnitSchema,
    width: z.number(),
  });
}

export function ApiOrderEditAbandonInputSchema(): z.ZodObject<
  Properties<ApiOrderEditAbandonInput>
> {
  return z.object({
    editId: z.string(),
    expectedEditVersion: z.number(),
    idempotencyKey: z.string(),
  });
}

export function ApiOrderEditBeginInputSchema(): z.ZodObject<Properties<ApiOrderEditBeginInput>> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    orderId: z.string(),
  });
}

export function ApiOrderEditCommitInputSchema(): z.ZodObject<Properties<ApiOrderEditCommitInput>> {
  return z.object({
    editId: z.string(),
    expectedEditVersion: z.number(),
    expectedOrderVersion: z.number(),
    idempotencyKey: z.string(),
    notifyCustomer: z.boolean().default(false).nullish(),
    staffNote: z.string().nullish(),
  });
}

export function ApiOrderEditDiscountAddInputSchema(): z.ZodObject<
  Properties<ApiOrderEditDiscountAddInput>
> {
  return z.object({
    amount: z.lazy(() => ApiMoneyInputSchema()),
    editId: z.string(),
    expectedEditVersion: z.number(),
    idempotencyKey: z.string(),
    reasonCode: z.string(),
    title: z.string(),
  });
}

export function ApiOrderEditDiscountRemoveInputSchema(): z.ZodObject<
  Properties<ApiOrderEditDiscountRemoveInput>
> {
  return z.object({
    discountId: z.string(),
    editId: z.string(),
    expectedEditVersion: z.number(),
    idempotencyKey: z.string(),
  });
}

export function ApiOrderEditLineAddInputSchema(): z.ZodObject<
  Properties<ApiOrderEditLineAddInput>
> {
  return z.object({
    editId: z.string(),
    expectedEditVersion: z.number(),
    idempotencyKey: z.string(),
    line: z.lazy(() => ApiOrderLineCreateInputSchema()),
  });
}

export function ApiOrderEditLineRemoveInputSchema(): z.ZodObject<
  Properties<ApiOrderEditLineRemoveInput>
> {
  return z.object({
    editId: z.string(),
    expectedEditVersion: z.number(),
    idempotencyKey: z.string(),
    lineId: z.string(),
  });
}

export function ApiOrderEditLineUpdateInputSchema(): z.ZodObject<
  Properties<ApiOrderEditLineUpdateInput>
> {
  return z.object({
    editId: z.string(),
    expectedEditVersion: z.number(),
    idempotencyKey: z.string(),
    lineId: z.string(),
    quantity: z.number().nullish(),
    unitPrice: z.lazy(() => ApiMoneyInputSchema().nullish()),
  });
}

export function ApiOrderEditShippingUpdateInputSchema(): z.ZodObject<
  Properties<ApiOrderEditShippingUpdateInput>
> {
  return z.object({
    editId: z.string(),
    expectedEditVersion: z.number(),
    idempotencyKey: z.string(),
    shipping: z.lazy(() => ApiOrderDeliveryInputSchema()),
  });
}

export function ApiOrderExchangeCancelInputSchema(): z.ZodObject<
  Properties<ApiOrderExchangeCancelInput>
> {
  return z.object({
    exchangeId: z.string(),
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    reasonCode: z.string(),
  });
}

export function ApiOrderExchangeCreateInputSchema(): z.ZodObject<
  Properties<ApiOrderExchangeCreateInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    inboundLines: z.array(z.lazy(() => ApiOrderReturnLineInputSchema())),
    notifyCustomer: z.boolean().default(false).nullish(),
    orderId: z.string(),
    outboundLines: z.array(z.lazy(() => ApiOrderLineCreateInputSchema())),
    staffNote: z.string().nullish(),
  });
}

export function ApiOrderFulfillmentStatusFilterInputSchema(): z.ZodObject<
  Properties<ApiOrderFulfillmentStatusFilterInput>
> {
  return z.object({
    eq: ApiOrderFulfillmentStatusSchema.nullish(),
    in: z.array(ApiOrderFulfillmentStatusSchema).nullish(),
  });
}

export function ApiOrderIntegrationLinkDetachInputSchema(): z.ZodObject<
  Properties<ApiOrderIntegrationLinkDetachInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    integrationLinkId: z.string(),
    orderId: z.string(),
    reason: z.string(),
  });
}

export function ApiOrderIntegrationSyncRequestInputSchema(): z.ZodObject<
  Properties<ApiOrderIntegrationSyncRequestInput>
> {
  return z.object({
    expectedVersion: z.number(),
    force: z.boolean().default(false).nullish(),
    idempotencyKey: z.string(),
    integrationLinkId: z.string(),
    orderId: z.string(),
  });
}

export function ApiOrderIntegrationSyncRetryInputSchema(): z.ZodObject<
  Properties<ApiOrderIntegrationSyncRetryInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    operationId: z.string(),
    orderId: z.string(),
  });
}

export function ApiOrderLineAddInputSchema(): z.ZodObject<Properties<ApiOrderLineAddInput>> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    line: z.lazy(() => ApiOrderLineCreateInputSchema()),
    orderId: z.string(),
  });
}

export function ApiOrderLineCreateInputSchema(): z.ZodObject<Properties<ApiOrderLineCreateInput>> {
  return z.object({
    customFields: z.unknown().nullish(),
    purchasableId: z.string().nullish(),
    quantity: z.number(),
    requiresShipping: z.boolean().default(true).nullish(),
    sku: z.string().nullish(),
    taxable: z.boolean().default(true).nullish(),
    title: z.string(),
    unitCompareAtPrice: z.lazy(() => ApiMoneyInputSchema().nullish()),
    unitCost: z.lazy(() => ApiMoneyInputSchema().nullish()),
    unitPrice: z.lazy(() => ApiMoneyInputSchema()),
    weight: z.lazy(() => ApiOrderWeightInputSchema().nullish()),
  });
}

export function ApiOrderLineDeleteInputSchema(): z.ZodObject<Properties<ApiOrderLineDeleteInput>> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    lineId: z.string(),
    orderId: z.string(),
  });
}

export function ApiOrderLineUpdateInputSchema(): z.ZodObject<Properties<ApiOrderLineUpdateInput>> {
  return z.object({
    customFields: z.unknown().nullish(),
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    lineId: z.string(),
    orderId: z.string(),
    quantity: z.number().nullish(),
    unitCost: z.lazy(() => ApiMoneyInputSchema().nullish()),
    weight: z.lazy(() => ApiOrderWeightInputSchema().nullish()),
  });
}

export function ApiOrderManualPaymentRecordInputSchema(): z.ZodObject<
  Properties<ApiOrderManualPaymentRecordInput>
> {
  return z.object({
    amount: z.lazy(() => ApiMoneyInputSchema()),
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    methodCode: z.string(),
    note: z.string().nullish(),
    orderId: z.string(),
    paidAt: z.string().datetime({ offset: true }),
    reference: z.string().nullish(),
  });
}

export function ApiOrderOrderByInputSchema(): z.ZodObject<Properties<ApiOrderOrderByInput>> {
  return z.object({
    direction: ApiOrderSortDirectionSchema,
    field: ApiOrderSortFieldSchema,
  });
}

export function ApiOrderPaymentCaptureInputSchema(): z.ZodObject<
  Properties<ApiOrderPaymentCaptureInput>
> {
  return z.object({
    amount: z.lazy(() => ApiMoneyInputSchema().nullish()),
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    orderId: z.string(),
    transactionId: z.string(),
  });
}

export function ApiOrderPaymentRetryInputSchema(): z.ZodObject<
  Properties<ApiOrderPaymentRetryInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    orderId: z.string(),
    paymentMethodCode: z.string().nullish(),
    returnUrl: z.string().url().nullish(),
  });
}

export function ApiOrderPaymentStatusFilterInputSchema(): z.ZodObject<
  Properties<ApiOrderPaymentStatusFilterInput>
> {
  return z.object({
    eq: ApiOrderPaymentStatusSchema.nullish(),
    in: z.array(ApiOrderPaymentStatusSchema).nullish(),
  });
}

export function ApiOrderPaymentStatusOverrideInputSchema(): z.ZodObject<
  Properties<ApiOrderPaymentStatusOverrideInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    note: z.string(),
    orderId: z.string(),
    reasonCode: z.string(),
    status: ApiOrderPaymentStatusSchema,
  });
}

export function ApiOrderPaymentVoidInputSchema(): z.ZodObject<
  Properties<ApiOrderPaymentVoidInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    orderId: z.string(),
    reason: z.string(),
    transactionId: z.string(),
  });
}

export function ApiOrderPlacementStatusFilterInputSchema(): z.ZodObject<
  Properties<ApiOrderPlacementStatusFilterInput>
> {
  return z.object({
    eq: ApiOrderPlacementStatusSchema.nullish(),
    in: z.array(ApiOrderPlacementStatusSchema).nullish(),
  });
}

export function ApiOrderRefundCreateInputSchema(): z.ZodObject<
  Properties<ApiOrderRefundCreateInput>
> {
  return z.object({
    amount: z.lazy(() => ApiMoneyInputSchema()),
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    lines: z.array(z.lazy(() => ApiOrderRefundLineInputSchema())).nullish(),
    note: z.string().nullish(),
    notifyCustomer: z.boolean().default(false).nullish(),
    orderId: z.string(),
    reasonCode: z.string(),
    transactionAllocations: z
      .array(z.lazy(() => ApiOrderRefundTransactionAllocationInputSchema()))
      .nullish(),
  });
}

export function ApiOrderRefundLineInputSchema(): z.ZodObject<Properties<ApiOrderRefundLineInput>> {
  return z.object({
    amount: z.lazy(() => ApiMoneyInputSchema()),
    orderLineId: z.string(),
    quantity: z.number(),
  });
}

export function ApiOrderRefundTransactionAllocationInputSchema(): z.ZodObject<
  Properties<ApiOrderRefundTransactionAllocationInput>
> {
  return z.object({
    amount: z.lazy(() => ApiMoneyInputSchema()),
    transactionId: z.string(),
  });
}

export function ApiOrderReopenInputSchema(): z.ZodObject<Properties<ApiOrderReopenInput>> {
  return z.object({
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
    reason: z.string(),
  });
}

export function ApiOrderReturnApproveInputSchema(): z.ZodObject<
  Properties<ApiOrderReturnApproveInput>
> {
  return z.object({
    createReturnShipment: z.boolean().default(false).nullish(),
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    locationId: z.string(),
    returnId: z.string(),
    staffNote: z.string().nullish(),
  });
}

export function ApiOrderReturnCancelInputSchema(): z.ZodObject<
  Properties<ApiOrderReturnCancelInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    reasonCode: z.string(),
    returnId: z.string(),
  });
}

export function ApiOrderReturnCreateInputSchema(): z.ZodObject<
  Properties<ApiOrderReturnCreateInput>
> {
  return z.object({
    customerNote: z.string().nullish(),
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    lines: z.array(z.lazy(() => ApiOrderReturnLineInputSchema())),
    notifyCustomer: z.boolean().default(false).nullish(),
    orderId: z.string(),
    staffNote: z.string().nullish(),
  });
}

export function ApiOrderReturnLineInputSchema(): z.ZodObject<Properties<ApiOrderReturnLineInput>> {
  return z.object({
    note: z.string().nullish(),
    orderLineId: z.string(),
    quantity: z.number(),
    reasonCode: z.string(),
  });
}

export function ApiOrderReturnReceiveInputSchema(): z.ZodObject<
  Properties<ApiOrderReturnReceiveInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    lines: z.array(z.lazy(() => ApiOrderReturnReceiveLineInputSchema())),
    locationId: z.string(),
    refund: z.lazy(() => ApiOrderReturnRefundInputSchema().nullish()),
    returnId: z.string(),
  });
}

export function ApiOrderReturnReceiveLineInputSchema(): z.ZodObject<
  Properties<ApiOrderReturnReceiveLineInput>
> {
  return z.object({
    damagedQuantity: z.number(),
    orderLineId: z.string(),
    receivedQuantity: z.number(),
    restockableQuantity: z.number(),
  });
}

export function ApiOrderReturnRefundInputSchema(): z.ZodObject<
  Properties<ApiOrderReturnRefundInput>
> {
  return z.object({
    amount: z.lazy(() => ApiMoneyInputSchema()),
    notifyCustomer: z.boolean().default(false).nullish(),
    reasonCode: z.string(),
  });
}

export function ApiOrderReturnRejectInputSchema(): z.ZodObject<
  Properties<ApiOrderReturnRejectInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    reasonCode: z.string(),
    returnId: z.string(),
    staffNote: z.string().nullish(),
  });
}

export function ApiOrderReturnStatusFilterInputSchema(): z.ZodObject<
  Properties<ApiOrderReturnStatusFilterInput>
> {
  return z.object({
    eq: ApiOrderReturnStatusSchema.nullish(),
    in: z.array(ApiOrderReturnStatusSchema).nullish(),
  });
}

export function ApiOrderStatusFilterInputSchema(): z.ZodObject<
  Properties<ApiOrderStatusFilterInput>
> {
  return z.object({
    eq: ApiOrderStatusSchema.nullish(),
    in: z.array(ApiOrderStatusSchema).nullish(),
  });
}

export function ApiOrderTagsUpdateInputSchema(): z.ZodObject<Properties<ApiOrderTagsUpdateInput>> {
  return z.object({
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
    tags: z.array(z.string()),
  });
}

export function ApiOrderUnarchiveInputSchema(): z.ZodObject<Properties<ApiOrderUnarchiveInput>> {
  return z.object({
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
  });
}

export function ApiOrderUpdateInputSchema(): z.ZodObject<Properties<ApiOrderUpdateInput>> {
  return z.object({
    billingAddress: z.lazy(() => ApiOrderAddressInputSchema().nullish()),
    contact: z.lazy(() => ApiOrderContactInputSchema().nullish()),
    customerNote: z.string().nullish(),
    expectedVersion: z.number(),
    id: z.string(),
    idempotencyKey: z.string(),
    localeCode: ApiLocaleCodeSchema.nullish(),
    shipping: z.lazy(() => ApiOrderDeliveryInputSchema().nullish()),
  });
}

export function ApiOrderWeightInputSchema(): z.ZodObject<Properties<ApiOrderWeightInput>> {
  return z.object({
    unit: ApiWeightUnitSchema,
    value: z.number(),
  });
}

export function ApiOrderWhereInputSchema(): z.ZodObject<Properties<ApiOrderWhereInput>> {
  return z.object({
    and: z.array(z.lazy(() => ApiOrderWhereInputSchema())).nullish(),
    archived: z.boolean().nullish(),
    createdAt: z.lazy(() => ApiDateTimeFilterInputSchema().nullish()),
    currencyCode: z.lazy(() => ApiCurrencyCodeFilterInputSchema().nullish()),
    customerEmail: z.lazy(() => ApiStringFilterInputSchema().nullish()),
    customerId: z.lazy(() => ApiIdFilterInputSchema().nullish()),
    customerName: z.lazy(() => ApiStringFilterInputSchema().nullish()),
    customerPhone: z.lazy(() => ApiStringFilterInputSchema().nullish()),
    deliveryMethodCode: z.lazy(() => ApiStringFilterInputSchema().nullish()),
    deliveryStatus: z.lazy(() => ApiOrderDeliveryStatusFilterInputSchema().nullish()),
    externalId: z.lazy(() => ApiStringFilterInputSchema().nullish()),
    fulfillmentStatus: z.lazy(() => ApiOrderFulfillmentStatusFilterInputSchema().nullish()),
    hasTracking: z.boolean().nullish(),
    id: z.lazy(() => ApiIdFilterInputSchema().nullish()),
    number: z.lazy(() => ApiBigIntFilterInputSchema().nullish()),
    or: z.array(z.lazy(() => ApiOrderWhereInputSchema())).nullish(),
    paymentMethodCode: z.lazy(() => ApiStringFilterInputSchema().nullish()),
    paymentStatus: z.lazy(() => ApiOrderPaymentStatusFilterInputSchema().nullish()),
    placedAt: z.lazy(() => ApiDateTimeFilterInputSchema().nullish()),
    placementStatus: z.lazy(() => ApiOrderPlacementStatusFilterInputSchema().nullish()),
    returnStatus: z.lazy(() => ApiOrderReturnStatusFilterInputSchema().nullish()),
    shippingCountry: z.lazy(() => ApiCountryCodeFilterInputSchema().nullish()),
    sourceCode: z.lazy(() => ApiStringFilterInputSchema().nullish()),
    status: z.lazy(() => ApiOrderStatusFilterInputSchema().nullish()),
    tag: z.lazy(() => ApiStringFilterInputSchema().nullish()),
    totalAmount: z.lazy(() => ApiDecimalFilterInputSchema().nullish()),
    trackingNumber: z.lazy(() => ApiStringFilterInputSchema().nullish()),
    updatedAt: z.lazy(() => ApiDateTimeFilterInputSchema().nullish()),
  });
}

export function ApiOrdersBulkActionInputSchema(): z.ZodObject<
  Properties<ApiOrdersBulkActionInput>
> {
  return z.object({
    action: ApiOrdersBulkActionKindSchema,
    idempotencyKey: z.string(),
    integrationLinkId: z.string().nullish(),
    reasonCode: z.string().nullish(),
    selection: z.lazy(() => ApiOrderBulkSelectionInputSchema()),
    tags: z.array(z.string()).nullish(),
  });
}

export function ApiShipmentCancelInputSchema(): z.ZodObject<Properties<ApiShipmentCancelInput>> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    reasonCode: z.string(),
    shipmentId: z.string(),
  });
}

export function ApiShipmentCreateInputSchema(): z.ZodObject<Properties<ApiShipmentCreateInput>> {
  return z.object({
    expectedVersion: z.number(),
    fulfillmentId: z.string(),
    idempotencyKey: z.string(),
    notifyCustomer: z.boolean().default(false).nullish(),
    packages: z.array(z.lazy(() => ApiShipmentPackageInputSchema())),
    providerCode: z.string().nullish(),
    serviceCode: z.string().nullish(),
  });
}

export function ApiShipmentMarkDeliveredInputSchema(): z.ZodObject<
  Properties<ApiShipmentMarkDeliveredInput>
> {
  return z.object({
    deliveredAt: z.string().datetime({ offset: true }),
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    shipmentId: z.string(),
  });
}

export function ApiShipmentMarkShippedInputSchema(): z.ZodObject<
  Properties<ApiShipmentMarkShippedInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    shipmentId: z.string(),
    shippedAt: z.string().datetime({ offset: true }),
  });
}

export function ApiShipmentPackageInputSchema(): z.ZodObject<Properties<ApiShipmentPackageInput>> {
  return z.object({
    declaredValue: z.lazy(() => ApiMoneyInputSchema().nullish()),
    dimensions: z.lazy(() => ApiOrderDimensionsInputSchema().nullish()),
    items: z.array(z.lazy(() => ApiShipmentPackageItemInputSchema())),
    weight: z.lazy(() => ApiOrderWeightInputSchema().nullish()),
  });
}

export function ApiShipmentPackageItemInputSchema(): z.ZodObject<
  Properties<ApiShipmentPackageItemInput>
> {
  return z.object({
    orderLineId: z.string(),
    quantity: z.number(),
  });
}

export function ApiShipmentReconcileInputSchema(): z.ZodObject<
  Properties<ApiShipmentReconcileInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    shipmentId: z.string(),
  });
}

export function ApiShipmentTrackingInputSchema(): z.ZodObject<
  Properties<ApiShipmentTrackingInput>
> {
  return z.object({
    company: z.string().nullish(),
    number: z.string(),
    url: z.string().url().nullish(),
  });
}

export function ApiShipmentTrackingUpdateInputSchema(): z.ZodObject<
  Properties<ApiShipmentTrackingUpdateInput>
> {
  return z.object({
    expectedVersion: z.number(),
    idempotencyKey: z.string(),
    shipmentId: z.string(),
    tracking: z.array(z.lazy(() => ApiShipmentTrackingInputSchema())),
  });
}

export function ApiStringFilterInputSchema(): z.ZodObject<Properties<ApiStringFilterInput>> {
  return z.object({
    contains: z.string().nullish(),
    eq: z.string().nullish(),
    in: z.array(z.string()).nullish(),
    startsWith: z.string().nullish(),
  });
}
