import type {
  ApiDiscountConnection,
  ApiDiscountCreateInput,
  ApiDiscountCreatePayload,
  ApiDiscountOrderByInput,
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

export interface DiscountCreateMutationData {
  pricingMutation: Pick<ApiPricingMutation, "discountCreate"> & {
    discountCreate: ApiDiscountCreatePayload;
  };
}

export interface DiscountCreateMutationVariables {
  input: ApiDiscountCreateInput;
}
