import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { ContentExternalReferencePatch } from "../../repositories/integration/ExternalReferenceRepository.js";
import {
  conflictError,
  hasOwn,
  internalError,
  notFoundError,
} from "./StoreConfigurationUpdateScript.js";
import type {
  ContentExternalReferenceUpdateParams,
  ContentExternalReferenceUpdateResult,
} from "./types.js";

export class ContentExternalReferenceUpdateScript extends BaseScript<
  ContentExternalReferenceUpdateParams,
  ContentExternalReferenceUpdateResult
> {
  @Transactional()
  protected async execute(
    params: ContentExternalReferenceUpdateParams,
  ): Promise<ContentExternalReferenceUpdateResult> {
    const input = params.operations ?? {};
    const patch: ContentExternalReferencePatch = {};
    const errors: UserError[] = [];

    if (input.identity) {
      validateRequiredText(input.identity, "externalSystem", 64, patch, errors);
      validateRequiredText(input.identity, "externalType", 64, patch, errors);
      validateRequiredText(input.identity, "externalId", 255, patch, errors);
      if (hasOwn(input.identity, "externalUrl")) {
        patch.externalUrl = input.identity.externalUrl?.trim() || null;
      }
    }
    if (input.sync) {
      if (hasOwn(input.sync, "direction")) {
        if (input.sync.direction == null) errors.push(nullError("direction"));
        else patch.direction = input.sync.direction;
      }
      if (hasOwn(input.sync, "status")) {
        if (input.sync.status == null) {
          errors.push(nullError("status"));
        } else {
          patch.syncStatus = input.sync.status;
          if (input.sync.status === "SYNCED") {
            patch.lastSyncedAt = new Date().toISOString();
            patch.lastError = null;
          } else if (input.sync.status === "PENDING") {
            patch.lastError = null;
          }
        }
      }
      if (hasOwn(input.sync, "etag")) {
        patch.etag = input.sync.etag?.trim() || null;
      }
      if (hasOwn(input.sync, "contentChecksum")) {
        const checksum = input.sync.contentChecksum?.trim() || null;
        if (checksum && checksum.length > 128) {
          errors.push({
            message: "Content checksum cannot exceed 128 characters",
            code: "INVALID_CHECKSUM",
            field: ["operations", "sync", "contentChecksum"],
          });
        } else {
          patch.contentChecksum = checksum;
        }
      }
      if (hasOwn(input.sync, "metadata")) {
        const metadata = input.sync.metadata;
        if (!isRecord(metadata)) {
          errors.push({
            message: "Metadata must be an object",
            code: "INVALID_METADATA",
            field: ["operations", "sync", "metadata"],
          });
        } else {
          patch.metadata = metadata;
        }
      }
    }
    if (errors.length > 0) return { userErrors: errors };

    try {
      const updated = await this.repository.externalReference.update(
        params.externalReferenceId,
        params.expectedUpdatedAt,
        patch,
      );
      if (updated.status === "applied") {
        return {
          externalReference: {
            id: updated.value.id,
            contentId: updated.value.contentId,
          },
          userErrors: [],
        };
      }
      return updated.status === "conflict"
        ? { userErrors: [conflictError("External reference", "expectedUpdatedAt")] }
        : { userErrors: [notFoundError("External reference", "externalReferenceId")] };
    } catch (error) {
      if (
        isUniqueViolation(error, "content_external_reference_lookup_unique") ||
        isUniqueViolation(error, "content_external_reference_content_unique")
      ) {
        return {
          userErrors: [
            {
              message: "This external reference already exists",
              code: "DUPLICATE_EXTERNAL_REFERENCE",
              field: ["operations", "identity", "externalId"],
            },
          ],
        };
      }
      throw error;
    }
  }

  protected handleError(): ContentExternalReferenceUpdateResult {
    return { userErrors: [internalError()] };
  }
}

function validateRequiredText(
  input: NonNullable<ContentExternalReferenceUpdateParams["operations"]>["identity"],
  field: "externalSystem" | "externalType" | "externalId",
  maxLength: number,
  patch: ContentExternalReferencePatch,
  errors: UserError[],
) {
  if (!input || !hasOwn(input, field)) return;
  const value = input[field]?.trim();
  if (!value || value.length > maxLength) {
    errors.push({
      message: `${field} must contain between 1 and ${maxLength} characters`,
      code: "INVALID_VALUE",
      field: ["operations", "identity", field],
    });
  } else {
    Object.assign(patch, { [field]: value });
  }
}

function nullError(field: string): UserError {
  return {
    message: `${field} cannot be null`,
    code: "INVALID_VALUE",
    field: ["operations", "sync", field],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
