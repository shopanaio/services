import type {
  ApiCustomer,
  ApiCustomerConnection,
  ApiCustomerCreateInput,
  ApiCustomerCreatePayload,
  ApiCustomerOrderByInput,
  ApiCustomersMutation,
  ApiCustomersQuery,
  ApiCustomerSegmentConnection,
  ApiCustomerTagConnection,
  ApiCustomerUpdateInput,
  ApiCustomerUpdatePayload,
  ApiCustomerWhereInput,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";

export interface CustomersQueryData {
  customersQuery: Pick<ApiCustomersQuery, "customers"> & {
    customers: ApiCustomerConnection;
  };
}

export interface CustomersQueryVariables extends RelayCursorPaginationVariables {
  where?: ApiCustomerWhereInput | null;
  orderBy?: ApiCustomerOrderByInput[] | null;
  currencyCode?: string | null;
}

export interface CustomerQueryData {
  customersQuery: Pick<ApiCustomersQuery, "customer"> & {
    customer: ApiCustomer | null;
  };
}

export interface CustomerQueryVariables {
  id: string;
  currencyCode?: string | null;
}

export interface CustomerEditorContextQueryData {
  customersQuery: Pick<ApiCustomersQuery, "customerSegments" | "customerTags"> & {
    customerSegments: ApiCustomerSegmentConnection;
    customerTags: ApiCustomerTagConnection;
  };
}

export interface CustomerCreateMutationData {
  customersMutation: Pick<ApiCustomersMutation, "customerCreate"> & {
    customerCreate: ApiCustomerCreatePayload;
  };
}

export interface CustomerCreateMutationVariables {
  input: ApiCustomerCreateInput;
}

export interface CustomerUpdateMutationData {
  customersMutation: Pick<ApiCustomersMutation, "customerUpdate"> & {
    customerUpdate: ApiCustomerUpdatePayload;
  };
}

export interface CustomerUpdateMutationVariables {
  customerId: string;
  expectedRevision?: number | null;
  operations: ApiCustomerUpdateInput;
}
