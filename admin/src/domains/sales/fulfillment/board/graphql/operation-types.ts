import type { ApiPageInfo } from "@/graphql/types";

export enum FulfillmentOrderStatus {
  Draft = "DRAFT",
  Active = "ACTIVE",
  Completed = "COMPLETED",
  Cancelled = "CANCELLED",
  Archived = "ARCHIVED",
}

export enum FulfillmentPaymentStatus {
  Pending = "PENDING",
  Paid = "PAID",
  Cancelled = "CANCELLED",
}

export enum FulfillmentStatus {
  Pending = "PENDING",
  Processing = "PROCESSING",
  OnHold = "ON_HOLD",
  Shipped = "SHIPPED",
  Delivered = "DELIVERED",
  Returned = "RETURNED",
  Cancelled = "CANCELLED",
  Fulfilled = "FULFILLED",
}

export enum FulfillmentTicketOrderField {
  SortIndex = "SORT_INDEX",
  OrderNumber = "ORDER_NUMBER",
  CreatedAt = "CREATED_AT",
  UpdatedAt = "UPDATED_AT",
  TotalAmount = "TOTAL_AMOUNT",
}

export interface ApiMoney {
  amount: string;
  currencyCode: string;
}

export interface ApiFulfillmentAddressSummary {
  address1: string;
  address2: string | null;
  city: string;
  countryCode: string;
}

export interface ApiFulfillmentCustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface ApiPaymentSummary {
  status: FulfillmentPaymentStatus;
  methodName: string | null;
}

export interface ApiFulfillmentStatusSummary {
  id: string;
  status: FulfillmentStatus;
}

export interface ApiFulfillmentLineItemSummary {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  quantity: number;
}

export interface ApiFulfillmentTag {
  id: string;
  name: string;
  color: "blue" | "green" | "orange" | "red" | "purple" | "cyan" | "magenta" | "default";
}

export interface ApiFulfillmentOrderSummary {
  id: string;
  version: number;
  number: string;
  status: FulfillmentOrderStatus;
  createdAt: string;
  totalAmount: ApiMoney;
  customer: ApiFulfillmentCustomerSummary | null;
  shippingAddress: ApiFulfillmentAddressSummary | null;
  paymentSummary: ApiPaymentSummary | null;
  fulfillmentSummary: ApiFulfillmentStatusSummary[];
  lineItemsSummary: ApiFulfillmentLineItemSummary[];
  tags: ApiFulfillmentTag[];
}

export interface ApiFulfillmentTicket {
  id: string;
  version: number;
  stageId: string;
  sortIndex: number;
  order: ApiFulfillmentOrderSummary;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFulfillmentTicketEdge {
  cursor: string;
  node: ApiFulfillmentTicket;
}

export interface ApiFulfillmentTicketConnection {
  edges: ApiFulfillmentTicketEdge[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}

export interface ApiFulfillmentStage {
  id: string;
  version: number;
  title: string;
  handle: string;
  sortIndex: number;
  ticketConnection: ApiFulfillmentTicketConnection;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFulfillmentStageEdge {
  cursor: string;
  node: ApiFulfillmentStage;
}

export interface ApiFulfillmentStageConnection {
  edges: ApiFulfillmentStageEdge[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}

export interface FulfillmentTicketWhereInput {
  _and?: FulfillmentTicketWhereInput[];
  _or?: FulfillmentTicketWhereInput[];
  search?: string;
  orderStatus?: FulfillmentOrderStatus[];
  paymentStatus?: FulfillmentPaymentStatus[];
  fulfillmentStatus?: FulfillmentStatus[];
  includeArchivedCancelled?: boolean;
  createdAtFrom?: string;
  createdAtTo?: string;
}

export interface FulfillmentTicketOrderByInput {
  field: FulfillmentTicketOrderField;
  direction: "ASC" | "DESC";
}

export interface FulfillmentBoardQueryVariables {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  where?: FulfillmentTicketWhereInput | null;
  orderBy?: FulfillmentTicketOrderByInput[] | null;
  ticketsFirst: number;
}

export interface FulfillmentBoardQueryData {
  fulfillmentQuery: { stages: ApiFulfillmentStageConnection };
}

export interface ApiUserError {
  code: string;
  field: string[] | null;
  message: string;
}

export interface FulfillmentStageCreateInput {
  clientMutationId: string;
  title: string;
  handle: string;
  sortIndex: number;
}

export interface FulfillmentStageUpdateInput {
  id: string;

  title?: string;
  handle?: string;
}

export interface FulfillmentStageDeleteInput {
  id: string;
}

export interface FulfillmentStagesReorderInput {
  clientMutationId: string;
  stages: Array<{ id: string; sortIndex: number }>;
}

export interface FulfillmentTicketMoveInput {
  clientMutationId: string;
  ticketId: string;

  sourceStageId: string;
  targetStageId: string;
  afterTicketId: string | null;
}

export interface FulfillmentTicketAppendInput {
  clientMutationId: string;
  orderId: string;
  stageId: string;
}

export interface FulfillmentStageMutationPayload {
  stage: ApiFulfillmentStage | null;
  userErrors: ApiUserError[];
}

export interface FulfillmentStageDeletePayload {
  deletedStageId: string | null;
  userErrors: ApiUserError[];
}

export interface FulfillmentStagesReorderPayload {
  stages: ApiFulfillmentStage[] | null;
  userErrors: ApiUserError[];
}

export interface FulfillmentTicketMovePayload {
  ticket: ApiFulfillmentTicket | null;
  userErrors: ApiUserError[];
}

export type FulfillmentTicketAppendPayload = FulfillmentTicketMovePayload;
