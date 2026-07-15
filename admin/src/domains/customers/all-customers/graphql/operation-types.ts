import type { ApiPageInfo } from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";

/**
 * Temporary schema-shaped contract for the future customers service.
 *
 * The mock request boundary implements these exact shapes. Once the subgraph
 * lands, this file can be replaced by generated types without changing the UI.
 */
export enum CustomerStatus {
  Active = "ACTIVE",
  Disabled = "DISABLED",
  Blocked = "BLOCKED",
}

export enum CustomerRiskLevel {
  Low = "LOW",
  Medium = "MEDIUM",
  High = "HIGH",
}

export enum CustomerMarketingState {
  Subscribed = "SUBSCRIBED",
  NotSubscribed = "NOT_SUBSCRIBED",
  Pending = "PENDING",
}

export enum CustomerOrderField {
  DisplayName = "DISPLAY_NAME",
  Email = "EMAIL",
  Status = "STATUS",
  RiskLevel = "RISK_LEVEL",
  OrdersCount = "ORDERS_COUNT",
  TotalSpentMinor = "TOTAL_SPENT_MINOR",
  LastOrderAt = "LAST_ORDER_AT",
  CreatedAt = "CREATED_AT",
  UpdatedAt = "UPDATED_AT",
}

export type CustomerSortDirection = "ASC" | "DESC";

export interface ApiCustomerAddress {
  id: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string | null;
  postalCode: string;
  countryCode: string;
}

export interface ApiCustomerSegmentReference {
  id: string;
  name: string;
}

export interface ApiCustomerActivity {
  ordersCount: number;
  totalSpentMinor: number;
  averageOrderValueMinor: number;
  returnsCount: number;
  lastOrderAt: string | null;
}

export interface ApiCustomerModeration {
  riskLevel: CustomerRiskLevel;
  complaintCount: number;
  lastComplaintAt: string | null;
  blockedReason: string | null;
  moderationNote: string | null;
}

export interface ApiCustomer {
  id: string;
  version: number;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string | null;
  status: CustomerStatus;
  locale: string;
  taxExempt: boolean;
  tags: string[];
  note: string | null;
  emailMarketingState: CustomerMarketingState;
  smsMarketingState: CustomerMarketingState;
  segments: ApiCustomerSegmentReference[];
  defaultAddress: ApiCustomerAddress | null;
  activity: ApiCustomerActivity;
  moderation: ApiCustomerModeration;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddressInput {
  address1: string;
  address2?: string | null;
  city: string;
  province?: string | null;
  postalCode: string;
  countryCode: string;
}

interface CustomerWriteInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: CustomerStatus;
  locale: string;
  taxExempt: boolean;
  tags: string[];
  note?: string | null;
  emailMarketingState: CustomerMarketingState;
  smsMarketingState: CustomerMarketingState;
  segmentIds: string[];
  defaultAddress?: CustomerAddressInput | null;
  riskLevel: CustomerRiskLevel;
  blockedReason?: string | null;
  moderationNote?: string | null;
}

export interface CustomerCreateInput extends CustomerWriteInput {
  clientMutationId: string;
}

export interface CustomerUpdateInput extends CustomerWriteInput {
  id: string;
  expectedVersion: number;
}

export interface CustomerUserError {
  code: string;
  field?: string | null;
  message: string;
}

export interface CustomerMutationPayload {
  customer: ApiCustomer | null;
  userErrors: CustomerUserError[];
}

export interface CustomerWhereInput {
  _and?: CustomerWhereInput[];
  _or?: CustomerWhereInput[];
  id?: Record<string, unknown>;
  displayName?: Record<string, unknown>;
  email?: Record<string, unknown>;
  phone?: Record<string, unknown>;
  status?: Record<string, unknown>;
  riskLevel?: Record<string, unknown>;
  emailMarketingState?: Record<string, unknown>;
  segmentId?: Record<string, unknown>;
  countryCode?: Record<string, unknown>;
  ordersCount?: Record<string, unknown>;
  totalSpentMinor?: Record<string, unknown>;
  lastOrderAt?: Record<string, unknown>;
  complaintCount?: Record<string, unknown>;
  createdAt?: Record<string, unknown>;
}

export interface CustomerOrderByInput {
  field: CustomerOrderField;
  direction: CustomerSortDirection;
}

export interface CustomerEdge {
  cursor: string;
  node: ApiCustomer;
}

export interface CustomerConnection {
  edges: CustomerEdge[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}

export interface CustomersQueryData {
  customersQuery: {
    customers: CustomerConnection;
  };
}

export interface CustomersQueryVariables extends RelayCursorPaginationVariables {
  where?: CustomerWhereInput | null;
  orderBy?: CustomerOrderByInput[] | null;
}

export interface CustomerQueryData {
  customersQuery: {
    customer: ApiCustomer | null;
  };
}

export interface CustomerQueryVariables {
  id: string;
}

export interface CustomerCreateMutationData {
  customersMutation: {
    customerCreate: CustomerMutationPayload;
  };
}

export interface CustomerCreateMutationVariables {
  input: CustomerCreateInput;
}

export interface CustomerUpdateMutationData {
  customersMutation: {
    customerUpdate: CustomerMutationPayload;
  };
}

export interface CustomerUpdateMutationVariables {
  input: CustomerUpdateInput;
}
