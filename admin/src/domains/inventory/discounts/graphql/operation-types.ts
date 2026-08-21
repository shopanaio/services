import type {
  ApiDiscountConnection,
  ApiDiscount,
  ApiDiscountCreateInput,
  ApiDiscountCreatePayload,
  ApiGenericUserError,
  ApiDiscountOperationResult,
  ApiDiscountOrderByInput,
  ApiDiscountUpdateInput,
  ApiDiscountUpdatePayload,
  ApiDiscountWhereInput,
  ApiPricingMutation,
  ApiPricingQuery,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";

export interface DiscountsQueryData {
  pricingQuery: Pick<ApiPricingQuery, "discounts"> & {
    discounts: ApiDiscountConnection;
  };
}

export interface DiscountsQueryVariables extends RelayCursorPaginationVariables {
  where?: ApiDiscountWhereInput | null;
  orderBy?: ApiDiscountOrderByInput[] | null;
}

export interface DiscountDetailsQueryData {
  pricingQuery: {
    discount: ApiDiscount | null;
  };
}

export interface DiscountDetailsQueryVariables {
  id: string;
}

export interface DiscountCreateMutationData {
  pricingMutation: Pick<ApiPricingMutation, "discountCreate"> & {
    discountCreate: ApiDiscountCreatePayload;
  };
}

export interface DiscountCreateMutationVariables {
  input: ApiDiscountCreateInput;
}

export interface DiscountUpdateMutationData {
  pricingMutation: Pick<ApiPricingMutation, "discountUpdate"> & {
    discountUpdate: ApiDiscountUpdatePayload;
  };
}

export interface DiscountUpdateMutationVariables {
  discountId: string;

  operations: ApiDiscountUpdateInput;
}

export interface DiscountUpdateResult {
  discount: ApiDiscount | null;
  operationResults: ApiDiscountOperationResult[];
  userErrors: ApiGenericUserError[];
  errors: ApiGenericUserError[];
}
