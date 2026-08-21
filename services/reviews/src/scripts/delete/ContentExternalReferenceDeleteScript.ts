import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { internalError, notFound } from "./errors.js";
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
    const result = await this.repository.externalReference.delete({
      id: params.id,
      permanent: params.permanent ?? false,
    });
    if (result.status === "not_found")
      return { userErrors: notFound("Content external reference") };
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
