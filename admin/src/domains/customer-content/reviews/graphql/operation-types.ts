import type {
  ApiCatalogQuery,
  ApiCustomerConnection,
  ApiCustomersQuery,
  ApiProductConnection,
  ApiProductReviewSummary,
  ApiReview,
  ApiReviewConnection,
  ApiReviewCreateInput,
  ApiReviewCreatePayload,
  ApiReviewOrderByInput,
  ApiReviewsMutation,
  ApiReviewsQuery,
  ApiReviewUpdateInput,
  ApiReviewUpdatePayload,
  ApiReviewWhereInput,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";

export interface ReviewsQueryData {
  reviewsQuery: Pick<ApiReviewsQuery, "reviews"> & {
    reviews: ApiReviewConnection;
  };
}

export interface ReviewsQueryVariables extends RelayCursorPaginationVariables {
  where?: ApiReviewWhereInput | null;
  orderBy?: ApiReviewOrderByInput[] | null;
}

export interface ReviewQueryData {
  reviewsQuery: Pick<ApiReviewsQuery, "review"> & {
    review: ApiReview | null;
  };
}

export interface ReviewQueryVariables {
  id: string;
}

export interface ReviewEditorContextQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "products"> & {
    products: ApiProductConnection;
  };
  customersQuery: Pick<ApiCustomersQuery, "customers"> & {
    customers: ApiCustomerConnection;
  };
}

export interface ReviewCreateMutationData {
  reviewsMutation: Pick<ApiReviewsMutation, "reviewCreate"> & {
    reviewCreate: ApiReviewCreatePayload;
  };
}

export interface ReviewCreateMutationVariables {
  input: ApiReviewCreateInput;
}

export interface ReviewUpdateMutationData {
  reviewsMutation: Pick<ApiReviewsMutation, "reviewUpdate"> & {
    reviewUpdate: ApiReviewUpdatePayload;
  };
}

export interface ReviewUpdateMutationVariables {
  reviewId: string;
  expectedRevision: number;
  operations: ApiReviewUpdateInput;
}

export interface ProductReviewSummaryQueryData {
  reviewsQuery: Pick<ApiReviewsQuery, "productReviewSummary"> & {
    productReviewSummary: ApiProductReviewSummary | null;
  };
}

export interface ProductReviewSummaryQueryVariables {
  productId: string;
}
