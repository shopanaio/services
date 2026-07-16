import type {
  ApiCustomerSegment,
  ApiCustomerSegmentConnection,
  ApiCustomerSegmentCreateInput,
  ApiCustomerSegmentCreatePayload,
  ApiCustomerSegmentCustomersSetInput,
  ApiCustomerSegmentCustomersSetPayload,
  ApiCustomerSegmentDeleteInput,
  ApiCustomerSegmentDeletePayload,
  ApiCustomerSegmentOrderByInput,
  ApiCustomerSegmentUpdateInput,
  ApiCustomerSegmentUpdatePayload,
  ApiCustomerSegmentWhereInput,
  ApiCustomersMutation,
  ApiCustomersQuery,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";

export interface CustomerSegmentsQueryData {
  customersQuery: Pick<ApiCustomersQuery, "customerSegments"> & {
    customerSegments: ApiCustomerSegmentConnection;
  };
}

export interface CustomerSegmentsQueryVariables extends RelayCursorPaginationVariables {
  where?: ApiCustomerSegmentWhereInput | null;
  orderBy?: ApiCustomerSegmentOrderByInput[] | null;
}

export interface CustomerSegmentQueryData {
  customersQuery: Pick<ApiCustomersQuery, "customerSegment"> & {
    customerSegment: ApiCustomerSegment | null;
  };
}

export interface CustomerSegmentQueryVariables {
  id: string;
}

export interface CustomerSegmentCreateMutationData {
  customersMutation: Pick<ApiCustomersMutation, "customerSegmentCreate"> & {
    customerSegmentCreate: ApiCustomerSegmentCreatePayload;
  };
}

export interface CustomerSegmentCreateMutationVariables {
  input: ApiCustomerSegmentCreateInput;
}

export interface CustomerSegmentUpdateMutationData {
  customersMutation: Pick<ApiCustomersMutation, "customerSegmentUpdate"> & {
    customerSegmentUpdate: ApiCustomerSegmentUpdatePayload;
  };
}

export interface CustomerSegmentUpdateMutationVariables {
  segmentId: string;
  expectedRevision?: number | null;
  operations: ApiCustomerSegmentUpdateInput;
}

export interface CustomerSegmentDeleteMutationData {
  customersMutation: Pick<ApiCustomersMutation, "customerSegmentDelete"> & {
    customerSegmentDelete: ApiCustomerSegmentDeletePayload;
  };
}

export interface CustomerSegmentDeleteMutationVariables {
  input: ApiCustomerSegmentDeleteInput;
}

export interface CustomerSegmentCustomersSetMutationData {
  customersMutation: Pick<ApiCustomersMutation, "customerSegmentCustomersSet"> & {
    customerSegmentCustomersSet: ApiCustomerSegmentCustomersSetPayload;
  };
}

export interface CustomerSegmentCustomersSetMutationVariables {
  input: ApiCustomerSegmentCustomersSetInput;
}
