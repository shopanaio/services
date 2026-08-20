import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { conflict, internalError, invalidDate, notFound } from "./errors.js";
import type {
  ContentExternalReferenceDeleteParams,
  ContentExternalReferenceDeleteResult,
} from "./types.js";

export class ContentExternalReferenceDeleteScript extends BaseScript<
  ContentExternalReferenceDeleteParams,
  ContentExternalReferenceDeleteResult
> {
  @Transactional()
  protected async execute(
    params: ContentExternalReferenceDeleteParams,
  ): Promise<ContentExternalReferenceDeleteResult> {
    if (Number.isNaN(Date.parse(params.expectedUpdatedAt))) {
      return { userErrors: invalidDate("expectedUpdatedAt") };
    }
    const result = await this.repository.externalReference.delete({
      id: params.id,
      expectedUpdatedAt: params.expectedUpdatedAt,
      permanent: params.permanent ?? false,
    });
    if (result.status === "not_found")
      return { userErrors: notFound("Content external reference") };
    if (result.status === "conflict") return { userErrors: conflict("expectedUpdatedAt") };
    this.logger.info(
      { externalReferenceId: result.value.id, permanent: params.permanent ?? false },
      "Review content external reference deleted",
    );
    return {
      deletedExternalReferenceId: result.value.id,
      contentId: result.value.contentId,
      permanent: params.permanent ?? false,
      userErrors: [],
    };
  }

  protected handleError(): ContentExternalReferenceDeleteResult {
    return { userErrors: internalError() };
  }
}
