import { BaseScript, Transactional, type UserError } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { DiscountExternalReferencePatch } from "../../repositories/DiscountRepository.js";
import type {
  DiscountExternalReferenceCreateParams,
  DiscountExternalReferenceCreateResult,
  DiscountExternalReferenceDeleteParams,
  DiscountExternalReferenceDeleteResult,
  DiscountExternalReferenceUpdateParams,
  DiscountExternalReferenceUpdateResult,
} from "./dto/index.js";

const LOOKUP_UNIQUE = "discount_external_reference_lookup_unique";
const DISCOUNT_UNIQUE = "discount_external_reference_discount_unique";

export class DiscountExternalReferenceCreateScript extends BaseScript<
  DiscountExternalReferenceCreateParams,
  DiscountExternalReferenceCreateResult
> {
  @Transactional()
  protected async execute(
    params: DiscountExternalReferenceCreateParams,
  ): Promise<DiscountExternalReferenceCreateResult> {
    const input = params.input;
    const errors: UserError[] = [];
    const externalSystem = requiredText(
      input.externalSystem,
      64,
      ["input", "externalSystem"],
      "External system",
      errors,
    );
    const externalType = requiredText(
      input.externalType ?? "discount",
      64,
      ["input", "externalType"],
      "External type",
      errors,
    );
    const externalId = requiredText(
      input.externalId,
      255,
      ["input", "externalId"],
      "External ID",
      errors,
    );
    const metadata = input.metadata ?? {};
    if (!isRecord(metadata)) {
      errors.push({
        message: "Metadata must be an object",
        code: "INVALID_METADATA",
        field: ["input", "metadata"],
      });
    }
    if (!(await this.repository.discount.getByIds([input.discountId])).length) {
      errors.push({
        message: "Discount not found",
        code: "NOT_FOUND",
        field: ["input", "discountId"],
      });
    }
    if (errors.length > 0 || !externalSystem || !externalType || !externalId) {
      return { userErrors: errors };
    }

    try {
      const created = await this.repository.discount.createExternalReference({
        id: params.externalReferenceId,
        discountId: input.discountId,
        externalSystem,
        externalType,
        externalId,
        externalUrl: input.externalUrl?.trim() || null,
        direction: input.direction,
        syncStatus: "PENDING",
        etag: null,
        contentChecksum: null,
        lastSyncedAt: null,
        lastError: null,
        metadata,
      });
      this.logger.info(
        { externalReferenceId: created.id, discountId: created.discountId },
        "Discount external reference created",
      );
      return {
        externalReference: {
          id: created.id,
          discountId: created.discountId,
        },
        userErrors: [],
      };
    } catch (error) {
      if (isDuplicate(error)) return duplicateResult(["input", "externalId"]);
      throw error;
    }
  }

  protected handleError(): DiscountExternalReferenceCreateResult {
    return internalErrorResult();
  }
}

export class DiscountExternalReferenceUpdateScript extends BaseScript<
  DiscountExternalReferenceUpdateParams,
  DiscountExternalReferenceUpdateResult
> {
  @Transactional()
  protected async execute(
    params: DiscountExternalReferenceUpdateParams,
  ): Promise<DiscountExternalReferenceUpdateResult> {
    if (!isDateTime(params.expectedUpdatedAt)) {
      return errorResult({
        message: "Expected updated time must be a valid date",
        code: "INVALID_DATE",
        field: ["expectedUpdatedAt"],
      });
    }

    const current = await this.repository.discount.findExternalReferenceById(
      params.externalReferenceId,
    );
    if (!current) {
      return errorResult({
        message: "External reference not found",
        code: "NOT_FOUND",
        field: ["externalReferenceId"],
      });
    }
    if (current.updatedAt !== params.expectedUpdatedAt) {
      return versionConflict("expectedUpdatedAt");
    }

    const patch: DiscountExternalReferencePatch = {};
    const errors: UserError[] = [];
    const { identity, sync } = params.operations;
    if (identity) {
      mapRequiredText(identity, "externalSystem", 64, patch, errors);
      mapRequiredText(identity, "externalType", 64, patch, errors);
      mapRequiredText(identity, "externalId", 255, patch, errors);
      if (hasOwn(identity, "externalUrl")) {
        patch.externalUrl = identity.externalUrl?.trim() || null;
      }
    }
    if (sync) {
      if (hasOwn(sync, "direction")) {
        if (sync.direction == null) errors.push(nullSyncError("direction"));
        else patch.direction = sync.direction;
      }
      if (hasOwn(sync, "status")) {
        if (sync.status == null) errors.push(nullSyncError("status"));
        else patch.syncStatus = sync.status;
      }
      if (hasOwn(sync, "etag")) patch.etag = sync.etag?.trim() || null;
      if (hasOwn(sync, "contentChecksum")) {
        const checksum = sync.contentChecksum?.trim() || null;
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
      if (hasOwn(sync, "lastSyncedAt")) {
        if (sync.lastSyncedAt != null && !isDateTime(sync.lastSyncedAt)) {
          errors.push({
            message: "Last synced time must be a valid date",
            code: "INVALID_DATE",
            field: ["operations", "sync", "lastSyncedAt"],
          });
        } else {
          patch.lastSyncedAt = sync.lastSyncedAt ?? null;
        }
      }
      if (hasOwn(sync, "lastError")) {
        patch.lastError = sync.lastError?.trim() || null;
      }
      if (hasOwn(sync, "metadata")) {
        if (!isRecord(sync.metadata)) {
          errors.push({
            message: "Metadata must be an object",
            code: "INVALID_METADATA",
            field: ["operations", "sync", "metadata"],
          });
        } else {
          patch.metadata = sync.metadata;
        }
      }
    }

    const finalStatus = patch.syncStatus ?? current.syncStatus;
    const finalLastSyncedAt = hasOwn(patch, "lastSyncedAt")
      ? patch.lastSyncedAt
      : current.lastSyncedAt;
    const finalLastError = hasOwn(patch, "lastError") ? patch.lastError : current.lastError;
    if (finalStatus === "SYNCED" && !finalLastSyncedAt) {
      errors.push({
        message: "A synced external reference requires lastSyncedAt",
        code: "LAST_SYNCED_AT_REQUIRED",
        field: ["operations", "sync", "lastSyncedAt"],
      });
    }
    if (finalStatus === "FAILED" && !finalLastError) {
      errors.push({
        message: "A failed external reference requires lastError",
        code: "LAST_ERROR_REQUIRED",
        field: ["operations", "sync", "lastError"],
      });
    }
    if (errors.length > 0) return { userErrors: errors };

    try {
      const updated = await this.repository.discount.updateExternalReference(
        params.externalReferenceId,
        params.expectedUpdatedAt,
        patch,
      );
      if (updated.status === "applied") {
        this.logger.info(
          { externalReferenceId: updated.value.id },
          "Discount external reference updated",
        );
        return {
          externalReference: {
            id: updated.value.id,
            discountId: updated.value.discountId,
          },
          userErrors: [],
        };
      }
      return updated.status === "conflict"
        ? versionConflict("expectedUpdatedAt")
        : errorResult({
            message: "External reference not found",
            code: "NOT_FOUND",
            field: ["externalReferenceId"],
          });
    } catch (error) {
      if (isDuplicate(error)) {
        return duplicateResult(["operations", "identity", "externalId"]);
      }
      throw error;
    }
  }

  protected handleError(): DiscountExternalReferenceUpdateResult {
    return internalErrorResult();
  }
}

export class DiscountExternalReferenceDeleteScript extends BaseScript<
  DiscountExternalReferenceDeleteParams,
  DiscountExternalReferenceDeleteResult
> {
  @Transactional()
  protected async execute(
    params: DiscountExternalReferenceDeleteParams,
  ): Promise<DiscountExternalReferenceDeleteResult> {
    if (!isDateTime(params.expectedUpdatedAt)) {
      return errorResult({
        message: "Expected updated time must be a valid date",
        code: "INVALID_DATE",
        field: ["input", "expectedUpdatedAt"],
      });
    }
    const deleted = await this.repository.discount.deleteExternalReference(params);
    if (deleted.status === "not_found") {
      return errorResult({
        message: "External reference not found",
        code: "NOT_FOUND",
        field: ["input", "id"],
      });
    }
    if (deleted.status === "conflict") {
      return versionConflict("input", "expectedUpdatedAt");
    }
    this.logger.info(
      {
        externalReferenceId: deleted.value.id,
        permanent: params.permanent,
      },
      "Discount external reference deleted",
    );
    return {
      deletedExternalReferenceId: deleted.value.id,
      discountId: deleted.value.discountId,
      permanent: params.permanent,
      userErrors: [],
    };
  }

  protected handleError(): DiscountExternalReferenceDeleteResult {
    return internalErrorResult();
  }
}

function mapRequiredText(
  input: NonNullable<DiscountExternalReferenceUpdateParams["operations"]["identity"]>,
  field: "externalSystem" | "externalType" | "externalId",
  maxLength: number,
  patch: DiscountExternalReferencePatch,
  errors: UserError[],
): void {
  if (!hasOwn(input, field)) return;
  const value = requiredText(
    input[field],
    maxLength,
    ["operations", "identity", field],
    field,
    errors,
  );
  if (value) Object.assign(patch, { [field]: value });
}

function requiredText(
  input: string | null | undefined,
  maxLength: number,
  field: string[],
  label: string,
  errors: UserError[],
): string | undefined {
  const value = input?.trim();
  if (!value || value.length > maxLength) {
    errors.push({
      message: `${label} must contain between 1 and ${maxLength} characters`,
      code: "INVALID_VALUE",
      field,
    });
    return undefined;
  }
  return value;
}

function nullSyncError(field: string): UserError {
  return {
    message: `${field} cannot be null`,
    code: "INVALID_VALUE",
    field: ["operations", "sync", field],
  };
}

function versionConflict(...field: string[]): {
  userErrors: UserError[];
} {
  return errorResult({
    message: "External reference was modified by another operation",
    code: "VERSION_CONFLICT",
    field,
  });
}

function duplicateResult(field: string[]): { userErrors: UserError[] } {
  return errorResult({
    message: "This external reference already exists",
    code: "DUPLICATE_EXTERNAL_REFERENCE",
    field,
  });
}

function internalErrorResult(): { userErrors: UserError[] } {
  return errorResult({ message: "Internal error", code: "INTERNAL_ERROR" });
}

function errorResult(error: UserError): { userErrors: UserError[] } {
  return { userErrors: [error] };
}

function isDuplicate(error: unknown): boolean {
  return isUniqueViolation(error, LOOKUP_UNIQUE) || isUniqueViolation(error, DISCOUNT_UNIQUE);
}

function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateTime(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}
