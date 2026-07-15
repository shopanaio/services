import type { ApiPageInfo } from "@/graphql/types";
import type { RelayCursorPaginationVariables } from "@/ui-kit/cursor-pagination";

export enum QuestionStatus {
  Pending = "PENDING",
  Published = "PUBLISHED",
  Rejected = "REJECTED",
}

export enum QuestionAnswerState {
  Unanswered = "UNANSWERED",
  Answered = "ANSWERED",
}

export enum QuestionOrderField {
  AnswerCount = "ANSWER_COUNT",
  CreatedAt = "CREATED_AT",
  DislikeCount = "DISLIKE_COUNT",
  LikeCount = "LIKE_COUNT",
  ReportedCount = "REPORTED_COUNT",
  Status = "STATUS",
  UpdatedAt = "UPDATED_AT",
}

export enum QuestionReportReason {
  Spam = "SPAM",
  Offensive = "OFFENSIVE",
  ConflictOfInterest = "CONFLICT_OF_INTEREST",
  NotRelevant = "NOT_RELEVANT",
  Other = "OTHER",
}

export enum QuestionAnswerAuthorType {
  Seller = "SELLER",
  Staff = "STAFF",
  Customer = "CUSTOMER",
}

export interface ApiQuestionProductReference {
  id: string;
  title: string;
}

export interface ApiQuestionCustomerReference {
  id: string;
  displayName: string;
  email: string;
}

export interface ApiQuestionAnswer {
  id: string;
  version: number;
  body: string;
  authorType: QuestionAnswerAuthorType;
  authorName: string;
  isOfficial: boolean;
  likeCount: number;
  dislikeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiQuestionReport {
  id: string;
  reason: QuestionReportReason;
  details: string | null;
  createdAt: string;
  reporter: ApiQuestionCustomerReference;
}

export interface ApiQuestion {
  id: string;
  version: number;
  body: string;
  status: QuestionStatus;
  answerState: QuestionAnswerState;
  answerCount: number;
  answers: ApiQuestionAnswer[];
  likeCount: number;
  dislikeCount: number;
  reportedCount: number;
  reports: ApiQuestionReport[];
  moderationNote: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  product: ApiQuestionProductReference;
  customer: ApiQuestionCustomerReference;
}

export interface QuestionAnswerInput {
  id?: string | null;
  body: string;
  authorType: QuestionAnswerAuthorType;
  authorName: string;
  isOfficial: boolean;
}

export interface QuestionCreateInput {
  clientMutationId: string;
  productId: string;
  customerId: string;
  body: string;
  status: QuestionStatus;
  moderationNote?: string | null;
  answers?: QuestionAnswerInput[] | null;
}

export interface QuestionUpdateInput extends Omit<QuestionCreateInput, "clientMutationId"> {
  id: string;
  expectedVersion: number;
}

export interface QuestionUserError {
  code: string;
  field?: string | null;
  message: string;
}

export interface QuestionMutationPayload {
  question: ApiQuestion | null;
  userErrors: QuestionUserError[];
}

export interface QuestionEditorContext {
  products: ApiQuestionProductReference[];
  customers: ApiQuestionCustomerReference[];
}

export interface QuestionWhereInput {
  _and?: QuestionWhereInput[];
  _or?: QuestionWhereInput[];
  answerState?: Record<string, unknown>;
  body?: Record<string, unknown>;
  createdAt?: Record<string, unknown>;
  productId?: Record<string, unknown>;
  reportedCount?: Record<string, unknown>;
  status?: Record<string, unknown>;
}

export interface QuestionOrderByInput {
  field: QuestionOrderField;
  direction: "ASC" | "DESC";
}

export interface QuestionEdge {
  cursor: string;
  node: ApiQuestion;
}

export interface QuestionConnection {
  edges: QuestionEdge[];
  pageInfo: ApiPageInfo;
  totalCount: number;
}

export interface QuestionsQueryData {
  reviewQuery: { questions: QuestionConnection };
}

export interface QuestionsQueryVariables extends RelayCursorPaginationVariables {
  where?: QuestionWhereInput | null;
  orderBy?: QuestionOrderByInput[] | null;
}
