import type {
  ApiDiscountConnection,
  ApiDiscountOrderByInput,
  ApiDiscountWhereInput,
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
