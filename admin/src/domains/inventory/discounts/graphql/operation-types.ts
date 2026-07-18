import type {
  ApiDiscountConnection,
  ApiDiscount,
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

export type DiscountDetailsQueryDiscount = Pick<
  ApiDiscount,
  | "id"
  | "revision"
  | "title"
  | "primaryCode"
  | "method"
  | "kind"
  | "discountClass"
  | "currency"
  | "state"
  | "effectiveStatus"
  | "createdAt"
  | "updatedAt"
  | "archivedAt"
>;

export interface DiscountDetailsQueryData {
  pricingQuery: {
    discount: DiscountDetailsQueryDiscount | null;
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
