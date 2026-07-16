import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { UserError } from "../../kernel/BaseScript.js";
import { internalError } from "./content.js";
import type {
  ContentExternalReferenceCreateParams,
  ContentExternalReferenceCreateResult,
} from "./types.js";

export class ContentExternalReferenceCreateScript extends BaseScript<
  ContentExternalReferenceCreateParams,
  ContentExternalReferenceCreateResult
> {
  @Transactional()
  protected async execute(
    params: ContentExternalReferenceCreateParams
  ): Promise<ContentExternalReferenceCreateResult> {
    const externalSystem = params.externalSystem.trim();
    const externalType = params.externalType.trim();
    const externalId = params.externalId.trim();
    const metadata = params.metadata ?? {};
    const errors: UserError[] = [];
    if (!externalSystem) errors.push({ message: "External system cannot be empty", code: "INVALID_EXTERNAL_SYSTEM", field: ["externalSystem"] });
    if (!externalType) errors.push({ message: "External type cannot be empty", code: "INVALID_EXTERNAL_TYPE", field: ["externalType"] });
    if (!externalId) errors.push({ message: "External ID cannot be empty", code: "INVALID_EXTERNAL_ID", field: ["externalId"] });
    if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
      errors.push({ message: "Metadata must be an object", code: "INVALID_METADATA", field: ["metadata"] });
    }
    if (!(await this.repository.content.findById(params.contentId))) {
      errors.push({ message: "Content was not found", code: "CONTENT_NOT_FOUND", field: ["contentId"] });
    }
    if (errors.length > 0) return { userErrors: errors };

    try {
      const created = await this.repository.externalReference.create({
        contentId: params.contentId,
        externalSystem,
        externalType,
        externalId,
        externalUrl: params.externalUrl?.trim() || null,
        direction: params.direction,
        syncStatus: "PENDING",
        etag: null,
        contentChecksum: null,
        lastSyncedAt: null,
        lastError: null,
        metadata: metadata as Record<string, unknown>,
      });
      this.logger.info({ externalReferenceId: created.id }, "Review content external reference created");
      return { externalReference: { id: created.id, contentId: created.contentId }, userErrors: [] };
    } catch (error) {
      if (
        isUniqueViolation(error, "content_external_reference_lookup_unique") ||
        isUniqueViolation(error, "content_external_reference_content_unique")
      ) {
        return { userErrors: [{ message: "This external reference already exists", code: "DUPLICATE_EXTERNAL_REFERENCE", field: ["externalId"] }] };
      }
      throw error;
    }
  }

  protected handleError(): ContentExternalReferenceCreateResult {
    return { userErrors: internalError() };
  }
}
