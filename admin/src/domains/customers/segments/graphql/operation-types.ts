import type { ApiPageInfo } from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";
import type { ApiCustomer } from "../../all-customers/graphql/operation-types";

/** Temporary API-shaped contract for manual segments in the customers service. */
export enum CustomerSegmentType {
  Manual = "MANUAL",
}

export enum CustomerSegmentOrderField {
  Name = "NAME",
  MemberCount = "MEMBER_COUNT",
  CreatedAt = "CREATED_AT",
  UpdatedAt = "UPDATED_AT",
}

export type CustomerSegmentSortDirection = "ASC" | "DESC";

export interface ApiCustomerSegment {
  id: string;
  version: number;
  name: string;
  description: string | null;
  color: string;
  type: CustomerSegmentType;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSegmentMemberEdge {
  cursor: string;
  node: Pick<ApiCustomer, "id">;
}

export interface CustomerSegmentMemberConnection {
  edges: CustomerSegmentMemberEdge[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}

export interface ApiCustomerSegmentDetails extends ApiCustomerSegment {
  members: CustomerSegmentMemberConnection;
}

export interface CustomerSegmentUserError {
  code: string;
  field?: string | null;
  message: string;
}

export interface CustomerSegmentCreateInput {
  clientMutationId: string;
  name: string;
  description?: string | null;
  color: string;
}

export interface CustomerSegmentUpdateInput {
  id: string;
  expectedVersion: number;
  name: string;
  description?: string | null;
  color: string;
}

export interface CustomerSegmentDeleteInput {
  id: string;
  expectedVersion: number;
}

export interface CustomerSegmentMembersSetInput {
  id: string;
  expectedVersion: number;
  customerIds: string[];
}

export interface CustomerSegmentMutationPayload {
  segment: ApiCustomerSegment | null;
  userErrors: CustomerSegmentUserError[];
}

export interface CustomerSegmentDeletePayload {
  deletedSegmentId: string | null;
  userErrors: CustomerSegmentUserError[];
}

export interface CustomerSegmentWhereInput {
  _and?: CustomerSegmentWhereInput[];
  _or?: CustomerSegmentWhereInput[];
  name?: Record<string, unknown>;
  description?: Record<string, unknown>;
  type?: Record<string, unknown>;
  memberCount?: Record<string, unknown>;
  createdAt?: Record<string, unknown>;
  updatedAt?: Record<string, unknown>;
}

export interface CustomerSegmentOrderByInput {
  field: CustomerSegmentOrderField;
  direction: CustomerSegmentSortDirection;
}

export interface CustomerSegmentEdge {
  cursor: string;
  node: ApiCustomerSegment;
}

export interface CustomerSegmentConnection {
  edges: CustomerSegmentEdge[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}

export interface CustomerSegmentsQueryData {
  customersQuery: {
    segments: CustomerSegmentConnection;
  };
}

export interface CustomerSegmentsQueryVariables extends RelayCursorPaginationVariables {
  where?: CustomerSegmentWhereInput | null;
  orderBy?: CustomerSegmentOrderByInput[] | null;
}

export interface CustomerSegmentQueryData {
  customersQuery: {
    segment: ApiCustomerSegmentDetails | null;
  };
}

export interface CustomerSegmentQueryVariables {
  id: string;
}

export interface CustomerSegmentCreateMutationData {
  customersMutation: {
    customerSegmentCreate: CustomerSegmentMutationPayload;
  };
}

export interface CustomerSegmentCreateMutationVariables {
  input: CustomerSegmentCreateInput;
}

export interface CustomerSegmentUpdateMutationData {
  customersMutation: {
    customerSegmentUpdate: CustomerSegmentMutationPayload;
  };
}

export interface CustomerSegmentUpdateMutationVariables {
  input: CustomerSegmentUpdateInput;
}

export interface CustomerSegmentDeleteMutationData {
  customersMutation: {
    customerSegmentDelete: CustomerSegmentDeletePayload;
  };
}

export interface CustomerSegmentDeleteMutationVariables {
  input: CustomerSegmentDeleteInput;
}

export interface CustomerSegmentMembersSetMutationData {
  customersMutation: {
    customerSegmentMembersSet: CustomerSegmentMutationPayload;
  };
}

export interface CustomerSegmentMembersSetMutationVariables {
  input: CustomerSegmentMembersSetInput;
}
