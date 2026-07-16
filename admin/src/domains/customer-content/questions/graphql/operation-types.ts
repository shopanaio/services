import type {
  ApiCatalogQuery,
  ApiCustomerConnection,
  ApiCustomersQuery,
  ApiProductConnection,
  ApiProductQuestion,
  ApiProductQuestionAnswerCreateInput,
  ApiProductQuestionAnswerCreatePayload,
  ApiProductQuestionAnswerDeletePayload,
  ApiProductQuestionAnswerOrderByInput,
  ApiProductQuestionAnswerUpdateInput,
  ApiProductQuestionAnswerUpdatePayload,
  ApiProductQuestionConnection,
  ApiProductQuestionCreateInput,
  ApiProductQuestionCreatePayload,
  ApiProductQuestionOrderByInput,
  ApiProductQuestionUpdateInput,
  ApiProductQuestionUpdatePayload,
  ApiProductQuestionWhereInput,
  ApiReviewContentDeleteInput,
  ApiReviewsMutation,
  ApiReviewsQuery,
} from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";

export interface QuestionsQueryData {
  reviewsQuery: Pick<ApiReviewsQuery, "productQuestions"> & {
    productQuestions: ApiProductQuestionConnection;
  };
}

export interface QuestionsQueryVariables extends RelayCursorPaginationVariables {
  where?: ApiProductQuestionWhereInput | null;
  orderBy?: ApiProductQuestionOrderByInput[] | null;
}

export interface QuestionQueryData {
  reviewsQuery: Pick<ApiReviewsQuery, "productQuestion"> & {
    productQuestion: ApiProductQuestion | null;
  };
}

export interface QuestionQueryVariables {
  id: string;
}

export interface QuestionEditorContextQueryData {
  catalogQuery: Pick<ApiCatalogQuery, "products"> & {
    products: ApiProductConnection;
  };
  customersQuery: Pick<ApiCustomersQuery, "customers"> & {
    customers: ApiCustomerConnection;
  };
}

export interface QuestionCreateMutationData {
  reviewsMutation: Pick<ApiReviewsMutation, "productQuestionCreate"> & {
    productQuestionCreate: ApiProductQuestionCreatePayload;
  };
}

export interface QuestionCreateMutationVariables {
  input: ApiProductQuestionCreateInput;
}

export interface QuestionUpdateMutationData {
  reviewsMutation: Pick<ApiReviewsMutation, "productQuestionUpdate"> & {
    productQuestionUpdate: ApiProductQuestionUpdatePayload;
  };
}

export interface QuestionUpdateMutationVariables {
  productQuestionId: string;
  expectedRevision: number;
  operations: ApiProductQuestionUpdateInput;
}

export interface QuestionAnswerCreateMutationData {
  reviewsMutation: Pick<ApiReviewsMutation, "productQuestionAnswerCreate"> & {
    productQuestionAnswerCreate: ApiProductQuestionAnswerCreatePayload;
  };
}

export interface QuestionAnswerCreateMutationVariables {
  input: ApiProductQuestionAnswerCreateInput;
}

export interface QuestionAnswerUpdateMutationData {
  reviewsMutation: Pick<ApiReviewsMutation, "productQuestionAnswerUpdate"> & {
    productQuestionAnswerUpdate: ApiProductQuestionAnswerUpdatePayload;
  };
}

export interface QuestionAnswerUpdateMutationVariables {
  productQuestionAnswerId: string;
  expectedRevision: number;
  operations: ApiProductQuestionAnswerUpdateInput;
}

export interface QuestionAnswerDeleteMutationData {
  reviewsMutation: Pick<ApiReviewsMutation, "productQuestionAnswerDelete"> & {
    productQuestionAnswerDelete: ApiProductQuestionAnswerDeletePayload;
  };
}

export interface QuestionAnswerDeleteMutationVariables {
  input: ApiReviewContentDeleteInput;
}

export type { ApiProductQuestionAnswerOrderByInput };
