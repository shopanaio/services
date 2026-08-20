import type { UserError } from "../../kernel/BaseScript.js";
import type { StoreConfiguration } from "../../repositories/models/index.js";
import type {
  ProductQuestionSubscriptionUpdateInput,
  ReviewContentExternalReferenceUpdateInput,
  ReviewContentReportUpdateInput,
  ReviewModerationCaseUpdateInput,
  ReviewRequestUpdateInput,
  ReviewStoreConfigurationUpdateInput,
} from "../../resolvers/admin/generated/types.js";

export type ReviewsUpdateOperationType =
  | "storeConfigurationUpdate"
  | "ratingCriterionDefinitionUpdate"
  | "ratingCriterionApplicabilityUpdate"
  | "ratingCriterionTranslationsSync"
  | "ratingCriterionAssignmentsSync"
  | "productQuestionSubscriptionUpdate"
  | "contentRedact"
  | "contentRevisionRestore"
  | "reviewRequestUpdate"
  | "contentReportUpdate"
  | "moderationCaseUpdate"
  | "contentExternalReferenceUpdate";

export interface ReviewsUpdateOperationResult {
  type: ReviewsUpdateOperationType;
  applied: boolean;
  errors: UserError[];
}

export interface ReviewSectionResult {
  changed: boolean;
  entityId?: string;
  userErrors: UserError[];
}

export function sectionSuccess(changed = true, entityId?: string): ReviewSectionResult {
  return { changed, entityId, userErrors: [] };
}

export function sectionErrors(userErrors: UserError[]): ReviewSectionResult {
  return { changed: false, userErrors };
}

export function internalSectionError(): ReviewSectionResult {
  return sectionErrors([{ message: "Internal error", code: "INTERNAL_ERROR" }]);
}

export interface StoreConfigurationUpdateParams {
  configurationId: string;
  expectedRevision: number;
  operations?: ReviewStoreConfigurationUpdateInput | null;
}

export interface StoreConfigurationUpdateResult {
  configuration?: StoreConfiguration;
  userErrors: UserError[];
}

export interface QuestionSubscriptionUpdateParams {
  subscriptionId: string;
  expectedUpdatedAt: string;
  operations?: ProductQuestionSubscriptionUpdateInput | null;
}

export interface QuestionSubscriptionUpdateResult {
  subscription?: { id: string; questionId: string };
  userErrors: UserError[];
}

export interface ContentRedactParams {
  contentId: string;
  expectedRevision: number;
}

export interface ContentRedactResult {
  content?: { id: string };
  userErrors: UserError[];
}

export interface ContentRevisionRestoreParams {
  contentId: string;
  revision: number;
  expectedRevision: number;
}

export interface ContentRevisionRestoreResult {
  content?: { id: string };
  userErrors: UserError[];
}

export interface ReviewRequestUpdateParams {
  reviewRequestId: string;
  expectedUpdatedAt: string;
  operations?: ReviewRequestUpdateInput | null;
}

export interface ReviewRequestUpdateResult {
  reviewRequest?: { id: string };
  userErrors: UserError[];
}

export interface ContentReportUpdateParams {
  contentReportId: string;
  expectedUpdatedAt: string;
  operations?: ReviewContentReportUpdateInput | null;
}

export interface ContentReportUpdateResult {
  contentReport?: { id: string; contentId: string };
  userErrors: UserError[];
}

export interface ModerationCaseUpdateParams {
  moderationCaseId: string;
  expectedUpdatedAt: string;
  operations?: ReviewModerationCaseUpdateInput | null;
}

export interface ModerationCaseUpdateResult {
  moderationCase?: { id: string; contentId: string };
  userErrors: UserError[];
}

export interface ContentExternalReferenceUpdateParams {
  externalReferenceId: string;
  expectedUpdatedAt: string;
  operations?: ReviewContentExternalReferenceUpdateInput | null;
}

export interface ContentExternalReferenceUpdateResult {
  externalReference?: { id: string; contentId: string };
  userErrors: UserError[];
}
