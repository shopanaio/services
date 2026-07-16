import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { internalError } from "./content.js";
import type {
  ReviewRequestCreateParams,
  ReviewRequestCreateResult,
} from "./types.js";

export class ReviewRequestCreateScript extends BaseScript<
  ReviewRequestCreateParams,
  ReviewRequestCreateResult
> {
  @Transactional()
  protected async execute(
    params: ReviewRequestCreateParams
  ): Promise<ReviewRequestCreateResult> {
    const locale = params.locale.trim();
    const sourceChannel = params.sourceChannel?.trim() || "ADMIN";
    const idempotencyKey = params.idempotencyKey.trim();
    const scheduledAt = new Date(params.scheduledAt);
    const expiresAt = params.expiresAt ? new Date(params.expiresAt) : null;
    const errors: UserError[] = [];

    if (!locale) errors.push({ message: "Locale cannot be empty", code: "INVALID_LOCALE", field: ["locale"] });
    if (!sourceChannel) errors.push({ message: "Source channel cannot be empty", code: "INVALID_SOURCE_CHANNEL", field: ["sourceChannel"] });
    if (!idempotencyKey) errors.push({ message: "Idempotency key cannot be empty", code: "INVALID_IDEMPOTENCY_KEY", field: ["idempotencyKey"] });
    if (Number.isNaN(scheduledAt.getTime())) {
      errors.push({ message: "scheduledAt must be a valid date", code: "INVALID_SCHEDULE", field: ["scheduledAt"] });
    } else if (scheduledAt.getTime() < Date.now()) {
      errors.push({ message: "scheduledAt cannot be in the past", code: "INVALID_SCHEDULE", field: ["scheduledAt"] });
    }
    if (expiresAt && (Number.isNaN(expiresAt.getTime()) || expiresAt < scheduledAt)) {
      errors.push({ message: "expiresAt must be on or after scheduledAt", code: "INVALID_EXPIRY", field: ["expiresAt"] });
    }
    if (errors.length > 0) return { userErrors: errors };

    try {
      const created = await this.repository.reviewRequest.create({
        customerId: params.customerId,
        orderId: params.orderId,
        orderLineId: params.orderLineId,
        productId: params.productId,
        variantId: params.variantId ?? null,
        reviewId: null,
        channel: params.channel,
        status: "SCHEDULED",
        locale,
        sourceChannel,
        idempotencyKey,
        accessTokenHash: null,
        providerMessageId: null,
        attemptCount: 0,
        scheduledAt: scheduledAt.toISOString(),
        sentAt: null,
        deliveredAt: null,
        openedAt: null,
        submittedAt: null,
        expiresAt: expiresAt?.toISOString() ?? null,
        lastError: null,
      });
      this.logger.info({ reviewRequestId: created.id }, "Review request created");
      return {
        reviewRequest: {
          id: created.id,
          customerId: created.customerId,
          productId: created.productId,
        },
        userErrors: [],
      };
    } catch (error) {
      if (isUniqueViolation(error, "review_request_store_idempotency_unique")) {
        return { userErrors: [{ message: "A review request with this idempotency key already exists", code: "DUPLICATE_IDEMPOTENCY_KEY", field: ["idempotencyKey"] }] };
      }
      throw error;
    }
  }

  protected handleError(): ReviewRequestCreateResult {
    return { userErrors: internalError() };
  }
}
