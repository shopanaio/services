import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { getPgErrorInfo, PG_ERROR_CODES } from "../../kernel/types.js";
import { conflict, internalError, invalidDate, notFound } from "./errors.js";
import type {
  RatingCriterionDeleteParams,
  RatingCriterionDeleteResult,
} from "./types.js";

export class RatingCriterionDeleteScript extends BaseScript<
  RatingCriterionDeleteParams,
  RatingCriterionDeleteResult
> {
  @Transactional()
  protected async execute(params: RatingCriterionDeleteParams): Promise<RatingCriterionDeleteResult> {
    if (Number.isNaN(Date.parse(params.expectedUpdatedAt))) {
      return { userErrors: invalidDate("expectedUpdatedAt") };
    }
    try {
      const result = await this.repository.configuration.deleteCriterion({
        id: params.id,
        expectedUpdatedAt: params.expectedUpdatedAt,
        permanent: params.permanent ?? false,
      });
      if (result.status === "not_found") return { userErrors: notFound("Rating criterion") };
      if (result.status === "conflict") return { userErrors: conflict("expectedUpdatedAt") };
      this.logger.info({ criterionId: result.value.id, permanent: params.permanent ?? false }, "Review rating criterion deleted");
      return { deletedCriterionId: result.value.id, permanent: params.permanent ?? false, userErrors: [] };
    } catch (error) {
      if (getPgErrorInfo(error)?.code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
        return { userErrors: [{ message: "The rating criterion is in use and cannot be permanently deleted", field: ["id"], code: "CRITERION_IN_USE" }] };
      }
      throw error;
    }
  }

  protected handleError(): RatingCriterionDeleteResult {
    return { userErrors: internalError() };
  }
}
