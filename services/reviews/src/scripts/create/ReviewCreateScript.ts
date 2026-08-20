import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { internalError, mapContentCreate } from "./content.js";
import type { ReviewCreateParams, ReviewCreateResult } from "./types.js";

export class ReviewCreateScript extends BaseScript<ReviewCreateParams, ReviewCreateResult> {
  @Transactional()
  protected async execute(params: ReviewCreateParams): Promise<ReviewCreateResult> {
    const mapped = mapContentCreate(
      params.content,
      "REVIEW",
      this.context.hasUser ? this.context.user.id : undefined,
    );
    const errors: UserError[] = [...mapped.errors];
    if (params.rating < 1 || params.rating > 5) {
      errors.push({
        message: "Rating must be between 1 and 5",
        code: "INVALID_RATING",
        field: ["rating"],
      });
    }
    const criterionIds = new Set<string>();
    for (const [index, rating] of (params.ratings ?? []).entries()) {
      if (rating.value < 1 || rating.value > 5) {
        errors.push({
          message: "Criterion rating must be between 1 and 5",
          code: "INVALID_RATING",
          field: ["ratings", String(index), "value"],
        });
      }
      if (criterionIds.has(rating.criterionId)) {
        errors.push({
          message: "A criterion may only be rated once",
          code: "DUPLICATE_CRITERION",
          field: ["ratings", String(index), "criterionId"],
        });
      }
      criterionIds.add(rating.criterionId);
    }
    if (criterionIds.size > 0) {
      const criteria = await this.repository.configuration.getCriteriaByIds([...criterionIds]);
      const existingIds = new Set(
        criteria.filter((item) => item.deletedAt === null).map((item) => item.id),
      );
      for (const [index, rating] of (params.ratings ?? []).entries()) {
        if (!existingIds.has(rating.criterionId)) {
          errors.push({
            message: "Rating criterion was not found",
            code: "CRITERION_NOT_FOUND",
            field: ["ratings", String(index), "criterionId"],
          });
        }
      }
    }
    const fileIds = new Set<string>();
    for (const [index, media] of (params.media ?? []).entries()) {
      if (media.sortIndex < 0) {
        errors.push({
          message: "Media sort index cannot be negative",
          code: "INVALID_SORT_INDEX",
          field: ["media", String(index), "sortIndex"],
        });
      }
      if (fileIds.has(media.fileId)) {
        errors.push({
          message: "A media file may only be attached once",
          code: "DUPLICATE_MEDIA",
          field: ["media", String(index), "fileId"],
        });
      }
      if (media.moderation?.status === "REJECTED" && !media.moderation.moderationNote?.trim()) {
        errors.push({
          message: "Rejected media requires a moderation note",
          code: "INVALID_MODERATION_NOTE",
          field: ["media", String(index), "moderation", "moderationNote"],
        });
      }
      fileIds.add(media.fileId);
    }
    if (params.verification?.status !== undefined && params.verification.status !== "UNVERIFIED") {
      if (!params.verification.method?.trim() || !params.verification.verifiedAt) {
        errors.push({
          message: "Verified or revoked reviews require method and verifiedAt",
          code: "INVALID_VERIFICATION",
          field: ["verification"],
        });
      }
    }
    if (params.incentive?.isIncentivized && !params.incentive.disclosure?.trim()) {
      errors.push({
        message: "Incentivized reviews require disclosure",
        code: "INVALID_INCENTIVE",
        field: ["incentive", "disclosure"],
      });
    }
    if (errors.length > 0 || !mapped.values) return { userErrors: errors };

    const now = new Date().toISOString();
    try {
      const aggregate = await this.repository.review.create({
        content: mapped.values,
        review: {
          productId: params.productId,
          variantId: params.variantId ?? null,
          orderId: params.orderId ?? null,
          orderLineId: params.orderLineId ?? null,
          rating: params.rating,
          verificationStatus: params.verification?.status ?? "UNVERIFIED",
          verificationMethod:
            params.verification?.status === "UNVERIFIED"
              ? null
              : (params.verification?.method?.trim() ?? null),
          verifiedAt:
            params.verification?.status === "UNVERIFIED"
              ? null
              : (params.verification?.verifiedAt ?? null),
          isIncentivized: params.incentive?.isIncentivized ?? false,
          incentiveDisclosure: params.incentive?.disclosure?.trim() || null,
        },
        ratings: (params.ratings ?? []).map((item) => ({
          criterionId: item.criterionId,
          value: item.value,
        })),
        media: (params.media ?? []).map((item) => {
          const status = item.moderation?.status ?? "PENDING";
          return {
            fileId: item.fileId,
            sortIndex: item.sortIndex,
            caption: item.caption?.trim() || null,
            status,
            moderationNote: item.moderation?.moderationNote?.trim() || null,
            moderatedByPrincipalId:
              status === "PENDING" || !this.context.hasUser ? null : this.context.user.id,
            moderatedAt: status === "PENDING" ? null : now,
          };
        }),
      });
      this.logger.info({ reviewId: aggregate.review.id }, "Review created");
      return {
        review: { id: aggregate.review.id, productId: aggregate.review.productId },
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "content_item_store_idempotency_unique")) {
        return {
          userErrors: [
            {
              message: "Content with this idempotency key already exists",
              code: "DUPLICATE_IDEMPOTENCY_KEY",
              field: ["content", "source", "idempotencyKey"],
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(): ReviewCreateResult {
    return { userErrors: internalError() };
  }
}
