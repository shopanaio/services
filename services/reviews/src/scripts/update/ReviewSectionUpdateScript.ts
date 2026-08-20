import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { NewReviewMedia, NewReviewRating } from "../../repositories/models/index.js";
import type { ContentPatch } from "../../repositories/content/ContentRepository.js";
import type { ReviewPatch } from "../../repositories/review/ReviewRepository.js";
import type { ReviewUpdateOperation } from "../../workflows/dto/index.js";
import {
  mapContentAuthorUpdate,
  mapContentModerationUpdate,
  mapContentPublications,
  mapContentSourceUpdate,
  mapContentTextUpdate,
  mapContentTranslations,
} from "./content.js";
import {
  internalSectionError,
  sectionErrors,
  sectionSuccess,
  type ReviewSectionResult,
} from "./types.js";

type ReviewAggregateSectionOperation = Exclude<
  ReviewUpdateOperation,
  { type: "reviewReplyCreate" } | { type: "reviewReplyUpdate" } | { type: "reviewReplyDelete" }
>;

export interface ReviewSectionUpdateParams {
  reviewId: string;
  operation: ReviewAggregateSectionOperation;
}

export class ReviewSectionUpdateScript extends BaseScript<
  ReviewSectionUpdateParams,
  ReviewSectionResult
> {
  @Transactional()
  protected async execute(params: ReviewSectionUpdateParams): Promise<ReviewSectionResult> {
    const aggregate = await this.repository.review.findById(params.reviewId);
    if (!aggregate) {
      return sectionErrors([{ message: "Review not found", code: "NOT_FOUND" }]);
    }

    const { operation } = params;
    switch (operation.type) {
      case "contentUpdate":
        return this.updateContentPatch(
          params.reviewId,
          mapContentTextUpdate(aggregate.content, operation.params, "REVIEW"),
        );
      case "contentAuthorUpdate":
        return this.updateContentPatch(
          params.reviewId,
          mapContentAuthorUpdate(aggregate.content, operation.params),
        );
      case "contentSourceUpdate":
        return this.updateContentPatch(
          params.reviewId,
          mapContentSourceUpdate(aggregate.content, operation.params),
        );
      case "contentModerationUpdate":
        return this.updateContentPatch(
          params.reviewId,
          mapContentModerationUpdate(
            aggregate.content,
            operation.params,
            this.context.hasUser ? this.context.user.id : undefined,
          ),
        );
      case "contentTranslationsSync": {
        const mapped = mapContentTranslations(
          operation.params.items,
          "REVIEW",
          this.context.hasUser ? this.context.user.id : undefined,
        );
        if (mapped.errors.length > 0) return sectionErrors(mapped.errors);
        await this.repository.content.replaceTranslations(params.reviewId, mapped.items);
        return sectionSuccess();
      }
      case "contentPublicationsSync": {
        const mapped = mapContentPublications(operation.params.items);
        if (mapped.errors.length > 0) return sectionErrors(mapped.errors);
        await this.repository.content.replacePublications(params.reviewId, mapped.items);
        return sectionSuccess();
      }
      case "reviewSubjectUpdate":
        return this.updateSubject(params.reviewId, aggregate.review, operation.params);
      case "reviewRatingUpdate":
        return this.updateRating(params.reviewId, aggregate.review.rating, operation.params);
      case "reviewVerificationUpdate":
        return this.updateVerification(params.reviewId, aggregate.review, operation.params);
      case "reviewIncentiveUpdate":
        return this.updateIncentive(params.reviewId, aggregate.review, operation.params);
      case "reviewMediaSync":
        return this.syncMedia(params.reviewId, aggregate.media, operation.params.items);
    }
  }

  protected handleError(error: unknown): ReviewSectionResult {
    if (isUniqueViolation(error, "content_item_store_idempotency_unique")) {
      return sectionErrors([
        {
          message: "Content with this idempotency key already exists",
          code: "DUPLICATE_IDEMPOTENCY_KEY",
          field: ["idempotencyKey"],
        },
      ]);
    }
    return internalSectionError();
  }

  private async updateContentPatch(
    reviewId: string,
    mapped: {
      patch: ContentPatch;
      errors: ReviewSectionResult["userErrors"];
    },
  ): Promise<ReviewSectionResult> {
    if (mapped.errors.length > 0) return sectionErrors(mapped.errors);
    if (Object.keys(mapped.patch).length === 0) return sectionSuccess(false);
    const updated = await this.repository.content.updateWithinRevision(reviewId, mapped.patch);
    return updated
      ? sectionSuccess()
      : sectionErrors([{ message: "Review not found", code: "NOT_FOUND" }]);
  }

  private async updateSubject(
    reviewId: string,
    current: {
      productId: string;
      variantId: string | null;
      orderId: string | null;
      orderLineId: string | null;
    },
    input: Extract<ReviewAggregateSectionOperation, { type: "reviewSubjectUpdate" }>["params"],
  ): Promise<ReviewSectionResult> {
    const patch: ReviewPatch = {};
    if (hasOwn(input, "productId")) {
      if (!input.productId) {
        return sectionErrors([
          {
            message: "Product cannot be cleared",
            code: "INVALID_PRODUCT",
            field: ["productId"],
          },
        ]);
      }
      patch.productId = input.productId;
    }
    if (hasOwn(input, "variantId")) patch.variantId = input.variantId ?? null;
    if (hasOwn(input, "orderId")) patch.orderId = input.orderId ?? null;
    if (hasOwn(input, "orderLineId")) {
      patch.orderLineId = input.orderLineId ?? null;
    }
    const changed = changedReviewPatch(current, patch);
    if (Object.keys(changed).length === 0) return sectionSuccess(false);
    const updated = await this.repository.review.updateDetails(reviewId, changed);
    return updated
      ? sectionSuccess()
      : sectionErrors([{ message: "Review not found", code: "NOT_FOUND" }]);
  }

  private async updateRating(
    reviewId: string,
    currentOverall: number,
    input: Extract<ReviewAggregateSectionOperation, { type: "reviewRatingUpdate" }>["params"],
  ): Promise<ReviewSectionResult> {
    const errors: ReviewSectionResult["userErrors"] = [];
    let overall: number | undefined;
    if (hasOwn(input, "overall")) {
      if (input.overall == null || input.overall < 1 || input.overall > 5) {
        errors.push({
          message: "Rating must be between 1 and 5",
          code: "INVALID_RATING",
          field: ["overall"],
        });
      } else {
        overall = input.overall;
      }
    }

    let ratings:
      Array<Omit<NewReviewRating, "storeId" | "reviewId" | "createdAt" | "updatedAt">> | undefined;
    if (input.criteria != null) {
      const criterionIds = new Set<string>();
      ratings = input.criteria.map((item, index) => {
        if (item.value < 1 || item.value > 5) {
          errors.push({
            message: "Criterion rating must be between 1 and 5",
            code: "INVALID_RATING",
            field: ["criteria", String(index), "value"],
          });
        }
        if (criterionIds.has(item.criterionId)) {
          errors.push({
            message: "A criterion may only be rated once",
            code: "DUPLICATE_CRITERION",
            field: ["criteria", String(index), "criterionId"],
          });
        }
        criterionIds.add(item.criterionId);
        return { criterionId: item.criterionId, value: item.value };
      });
      if (criterionIds.size > 0) {
        const criteria = await this.repository.configuration.getCriteriaByIds([...criterionIds]);
        const existingIds = new Set(
          criteria
            .filter((criterion) => criterion.deletedAt === null)
            .map((criterion) => criterion.id),
        );
        for (const [index, item] of input.criteria.entries()) {
          if (!existingIds.has(item.criterionId)) {
            errors.push({
              message: "Rating criterion was not found",
              code: "CRITERION_NOT_FOUND",
              field: ["criteria", String(index), "criterionId"],
            });
          }
        }
      }
    }
    if (errors.length > 0) return sectionErrors(errors);

    const overallChanged = overall !== undefined && overall !== currentOverall;
    if (overallChanged) {
      await this.repository.review.updateDetails(reviewId, { rating: overall });
    }
    if (ratings) await this.repository.review.replaceRatings(reviewId, ratings);
    return sectionSuccess(overallChanged || ratings !== undefined);
  }

  private async updateVerification(
    reviewId: string,
    current: {
      verificationStatus: "UNVERIFIED" | "VERIFIED" | "REVOKED";
      verificationMethod: string | null;
      verifiedAt: string | null;
    },
    input: Extract<ReviewAggregateSectionOperation, { type: "reviewVerificationUpdate" }>["params"],
  ): Promise<ReviewSectionResult> {
    const unverified = input.status === "UNVERIFIED";
    const method = unverified
      ? null
      : hasOwn(input, "method")
        ? input.method?.trim() || null
        : current.verificationMethod;
    const verifiedAt = unverified
      ? null
      : hasOwn(input, "verifiedAt")
        ? (input.verifiedAt ?? null)
        : current.verifiedAt;
    if (!unverified && (!method || !verifiedAt)) {
      return sectionErrors([
        {
          message: "Verified or revoked reviews require method and verifiedAt",
          code: "INVALID_VERIFICATION",
        },
      ]);
    }
    if (method && method.length > 64) {
      return sectionErrors([
        {
          message: "Verification method cannot exceed 64 characters",
          code: "INVALID_VERIFICATION",
          field: ["method"],
        },
      ]);
    }
    const patch = changedReviewPatch(current, {
      verificationStatus: input.status,
      verificationMethod: method,
      verifiedAt,
    });
    if (Object.keys(patch).length === 0) return sectionSuccess(false);
    await this.repository.review.updateDetails(reviewId, patch);
    return sectionSuccess();
  }

  private async updateIncentive(
    reviewId: string,
    current: { isIncentivized: boolean; incentiveDisclosure: string | null },
    input: Extract<ReviewAggregateSectionOperation, { type: "reviewIncentiveUpdate" }>["params"],
  ): Promise<ReviewSectionResult> {
    const disclosure = input.isIncentivized
      ? hasOwn(input, "disclosure")
        ? input.disclosure?.trim() || null
        : current.incentiveDisclosure
      : null;
    if (input.isIncentivized && !disclosure) {
      return sectionErrors([
        {
          message: "Incentivized reviews require disclosure",
          code: "INVALID_INCENTIVE",
          field: ["disclosure"],
        },
      ]);
    }
    if (disclosure && disclosure.length > 500) {
      return sectionErrors([
        {
          message: "Incentive disclosure cannot exceed 500 characters",
          code: "INVALID_INCENTIVE",
          field: ["disclosure"],
        },
      ]);
    }
    const patch = changedReviewPatch(current, {
      isIncentivized: input.isIncentivized,
      incentiveDisclosure: disclosure,
    });
    if (Object.keys(patch).length === 0) return sectionSuccess(false);
    await this.repository.review.updateDetails(reviewId, patch);
    return sectionSuccess();
  }

  private async syncMedia(
    reviewId: string,
    current: Array<{
      fileId: string;
      status: "PENDING" | "PUBLISHED" | "REJECTED";
      moderationNote: string | null;
      moderatedByPrincipalId: string | null;
      moderatedAt: string | null;
    }>,
    inputs: Extract<
      ReviewAggregateSectionOperation,
      { type: "reviewMediaSync" }
    >["params"]["items"],
  ): Promise<ReviewSectionResult> {
    const errors: ReviewSectionResult["userErrors"] = [];
    const fileIds = new Set<string>();
    const currentByFileId = new Map(current.map((item) => [item.fileId, item]));
    const now = new Date().toISOString();
    const items: Array<
      Omit<NewReviewMedia, "id" | "storeId" | "reviewId" | "createdAt" | "updatedAt">
    > = inputs.map((input, index) => {
      const existing = currentByFileId.get(input.fileId);
      const status = input.moderation?.status ?? existing?.status ?? "PENDING";
      const moderationNote = input.moderation
        ? input.moderation.moderationNote?.trim() || null
        : (existing?.moderationNote ?? null);
      const caption = input.caption?.trim() || null;
      if (input.sortIndex < 0) {
        errors.push({
          message: "Media sort index cannot be negative",
          code: "INVALID_SORT_INDEX",
          field: [String(index), "sortIndex"],
        });
      }
      if (fileIds.has(input.fileId)) {
        errors.push({
          message: "A media file may only be attached once",
          code: "DUPLICATE_MEDIA",
          field: [String(index), "fileId"],
        });
      }
      if (status === "REJECTED" && !moderationNote) {
        errors.push({
          message: "Rejected media requires a moderation note",
          code: "INVALID_MODERATION_NOTE",
          field: [String(index), "moderation", "moderationNote"],
        });
      }
      if (caption && caption.length > 500) {
        errors.push({
          message: "Media caption cannot exceed 500 characters",
          code: "INVALID_CAPTION",
          field: [String(index), "caption"],
        });
      }
      if (moderationNote && moderationNote.length > 1000) {
        errors.push({
          message: "Media moderation note cannot exceed 1000 characters",
          code: "INVALID_MODERATION_NOTE",
          field: [String(index), "moderation", "moderationNote"],
        });
      }
      fileIds.add(input.fileId);
      const moderationChanged = input.moderation !== null && input.moderation !== undefined;
      return {
        fileId: input.fileId,
        sortIndex: input.sortIndex,
        caption,
        status,
        moderationNote,
        moderatedByPrincipalId: moderationChanged
          ? status === "PENDING" || !this.context.hasUser
            ? null
            : this.context.user.id
          : (existing?.moderatedByPrincipalId ?? null),
        moderatedAt: moderationChanged
          ? status === "PENDING"
            ? null
            : now
          : (existing?.moderatedAt ?? null),
      };
    });
    if (errors.length > 0) return sectionErrors(errors);
    await this.repository.review.replaceMedia(reviewId, items);
    return sectionSuccess();
  }
}

function changedReviewPatch<T extends Record<string, unknown>>(
  current: T,
  patch: ReviewPatch,
): ReviewPatch {
  const result: ReviewPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (current[key] !== value) Object.assign(result, { [key]: value });
  }
  return result;
}

function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}
