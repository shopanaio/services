import type { ApiPageInfo } from "@/graphql/types";
import type { ApiFile } from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";

/**
 * Temporary API contract for the future review subgraph.
 *
 * Keep this API-shaped so the mock transport can be replaced by generated
 * GraphQL types without changing the page or its table components.
 */
export enum ReviewStatus {
  Pending = "PENDING",
  Published = "PUBLISHED",
  Rejected = "REJECTED",
}

export enum ReviewOrderField {
  CreatedAt = "CREATED_AT",
  LikeCount = "LIKE_COUNT",
  DislikeCount = "DISLIKE_COUNT",
  IsVerifiedPurchase = "IS_VERIFIED_PURCHASE",
  Rating = "RATING",
  ReportedCount = "REPORTED_COUNT",
  Status = "STATUS",
  UpdatedAt = "UPDATED_AT",
}

export enum ReviewReportReason {
  Spam = "SPAM",
  Offensive = "OFFENSIVE",
  ConflictOfInterest = "CONFLICT_OF_INTEREST",
  NotRelevant = "NOT_RELEVANT",
  Other = "OTHER",
}

export interface ApiReviewReport {
  id: string;
  reason: ReviewReportReason;
  details: string | null;
  createdAt: string;
  reporter: ApiReviewCustomerReference;
}

export type ReviewSortDirection = "ASC" | "DESC";

export interface ApiReviewProductReference {
  id: string;
  title: string;
}

export interface ApiReviewCustomerReference {
  id: string;
  displayName: string;
  email: string;
}

export interface ApiReview {
  id: string;
  version: number;
  title: string | null;
  body: string;
  rating: number;
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  likeCount: number;
  dislikeCount: number;
  reportedCount: number;
  reports: ApiReviewReport[];
  mediaCount: number;
  media: ApiFile[];
  moderationNote: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Resolved by federation from the catalog service. */
  product: ApiReviewProductReference;
  /** Resolved by federation from the customers service. */
  customer: ApiReviewCustomerReference;
}

export interface ReviewUserError {
  code: string;
  field?: string | null;
  message: string;
}

export interface ReviewCreateInput {
  clientMutationId: string;
  productId: string;
  customerId: string;
  title?: string | null;
  body: string;
  rating: number;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  moderationNote?: string | null;
  mediaFileIds?: string[] | null;
}

export interface ReviewUpdateInput {
  id: string;
  expectedVersion: number;
  productId: string;
  customerId: string;
  title?: string | null;
  body: string;
  rating: number;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  moderationNote?: string | null;
  mediaFileIds?: string[] | null;
}

export interface ReviewMutationPayload {
  review: ApiReview | null;
  userErrors: ReviewUserError[];
}

export interface ReviewEditorContext {
  products: ApiReviewProductReference[];
  customers: ApiReviewCustomerReference[];
}

export interface ReviewWhereInput {
  _and?: ReviewWhereInput[];
  _or?: ReviewWhereInput[];
  body?: Record<string, unknown>;
  createdAt?: Record<string, unknown>;
  hasMedia?: Record<string, unknown>;
  isVerifiedPurchase?: Record<string, unknown>;
  productId?: Record<string, unknown>;
  rating?: Record<string, unknown>;
  reportedCount?: Record<string, unknown>;
  status?: Record<string, unknown>;
  title?: Record<string, unknown>;
}

export interface ReviewOrderByInput {
  field: ReviewOrderField;
  direction: ReviewSortDirection;
}

export interface ReviewEdge {
  cursor: string;
  node: ApiReview;
}

export interface ReviewConnection {
  edges: ReviewEdge[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}

export interface ReviewsQueryData {
  reviewQuery: {
    reviews: ReviewConnection;
  };
}

export interface ReviewsQueryVariables extends RelayCursorPaginationVariables {
  where?: ReviewWhereInput | null;
  orderBy?: ReviewOrderByInput[] | null;
}
