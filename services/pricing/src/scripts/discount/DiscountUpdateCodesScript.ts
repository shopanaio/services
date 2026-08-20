import type { UserError } from "../../kernel/BaseScript.js";
import { getPgErrorInfo, isUniqueViolation, PG_ERROR_CODES } from "../../kernel/types.js";
import {
  DiscountCodeRevisionConflictError,
  type DiscountAggregate,
  type DiscountCodeCreateWriteInput,
  type DiscountCodeDeleteWriteInput,
  type DiscountCodeUpdateWriteInput,
} from "../../repositories/DiscountRepository.js";
import type { DiscountUpdateCodesParams, DiscountUpdateCodesResult } from "./dto/index.js";
import { hasOwn, isRecord, parsePositiveBigInt } from "./shared.js";
import { BaseDiscountUpdateScript } from "./BaseDiscountUpdateScript.js";
import { sectionErrors, sectionSuccess } from "./types.js";

interface DiscountCodeChanges {
  create: DiscountCodeCreateWriteInput[];
  update: DiscountCodeUpdateWriteInput[];
  delete: DiscountCodeDeleteWriteInput[];
}

export class DiscountUpdateCodesScript extends BaseDiscountUpdateScript<DiscountUpdateCodesParams> {
  protected async update(
    aggregate: DiscountAggregate,
    params: DiscountUpdateCodesParams,
  ): Promise<DiscountUpdateCodesResult> {
    if (aggregate.discount.method !== "CODE") {
      return sectionErrors([
        {
          message: "Automatic discounts cannot have redeem codes",
          code: "CODES_NOT_ALLOWED",
        },
      ]);
    }
    const mapped = mapCodeChanges(aggregate, params.codes);
    if (mapped.errors.length > 0 || !mapped.value) {
      return sectionErrors(mapped.errors);
    }
    await this.repository.discount.applyCodeChanges(aggregate.discount.id, mapped.value);
    return sectionSuccess(
      mapped.value.create.length > 0 ||
        mapped.value.update.length > 0 ||
        mapped.value.delete.length > 0,
    );
  }

  protected handleError(error: unknown): DiscountUpdateCodesResult {
    if (error instanceof DiscountCodeRevisionConflictError) {
      return sectionErrors([
        {
          message: "Discount code was modified by another user",
          code: "REVISION_CONFLICT",
          field: ["update"],
        },
      ]);
    }
    if (isUniqueViolation(error, "discount_code_store_normalized_unique")) {
      return sectionErrors([
        {
          message: "A discount code with this value already exists",
          code: "DUPLICATE_CODE",
        },
      ]);
    }
    const pgError = getPgErrorInfo(error);
    if (pgError?.code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
      return sectionErrors([
        {
          message: "A discount code with usage history cannot be deleted",
          code: "CODE_IN_USE",
          field: ["delete"],
        },
      ]);
    }
    return super.handleError(error);
  }
}

function mapCodeChanges(
  aggregate: DiscountAggregate,
  input: DiscountUpdateCodesParams["codes"],
): { value?: DiscountCodeChanges; errors: UserError[] } {
  const errors: UserError[] = [];
  const currentById = new Map(aggregate.codes.map((code) => [code.id, code]));
  const touchedIds = new Set<string>();
  const deletedIds = new Set((input.delete ?? []).map((item) => item.codeId));
  const renamedIds = new Set(
    (input.update ?? []).filter((item) => item.code != null).map((item) => item.codeId),
  );
  const normalizedCodes = new Map<string, string>();

  for (const code of aggregate.codes) {
    if (!deletedIds.has(code.id) && !renamedIds.has(code.id)) {
      normalizedCodes.set(code.normalizedCode ?? normalizeCode(code.code), code.id);
    }
  }

  const create = (input.create ?? []).map((item, index) => {
    const field = ["create", String(index)];
    const code = validateCode(item.code, [...field, "code"], errors);
    const usageLimit = parsePositiveBigInt(item.usageLimit, [...field, "usageLimit"], errors);
    const metadata = item.metadata ?? {};
    if (!isRecord(metadata)) {
      errors.push({
        message: "Code metadata must be a JSON object",
        code: "INVALID_METADATA",
        field: [...field, "metadata"],
      });
    }
    registerNormalizedCode(normalizedCodes, code, `create:${index}`, field, errors);
    return {
      code,
      usageLimit,
      metadata: isRecord(metadata) ? metadata : {},
    };
  });

  const update = (input.update ?? []).map((item, index) => {
    const field = ["update", String(index)];
    const current = currentById.get(item.codeId);
    validateTouchedCode(item.codeId, current, touchedIds, field, errors);
    if (current && current.updatedAt !== item.expectedUpdatedAt) {
      errors.push({
        message: "Discount code was modified by another user",
        code: "REVISION_CONFLICT",
        field: [...field, "expectedUpdatedAt"],
      });
    }
    const patch: DiscountCodeUpdateWriteInput["patch"] = {};
    if (hasOwn(item, "code")) {
      if (item.code == null) {
        errors.push({
          message: "Discount code cannot be null",
          code: "INVALID_CODE",
          field: [...field, "code"],
        });
      } else {
        const code = validateCode(item.code, [...field, "code"], errors);
        patch.code = code;
        if (current) {
          normalizedCodes.delete(current.normalizedCode ?? normalizeCode(current.code));
        }
        registerNormalizedCode(normalizedCodes, code, item.codeId, field, errors);
      }
    }
    if (hasOwn(item, "status")) {
      if (item.status == null) {
        errors.push({
          message: "Code status cannot be null",
          code: "INVALID_CODE_STATUS",
          field: [...field, "status"],
        });
      } else {
        patch.status = item.status;
        patch.disabledAt =
          item.status === "DISABLED"
            ? current?.status === "DISABLED"
              ? current.disabledAt
              : new Date().toISOString()
            : null;
      }
    }
    if (hasOwn(item, "usageLimit")) {
      const usageLimit = parsePositiveBigInt(item.usageLimit, [...field, "usageLimit"], errors);
      const counter = aggregate.codeUsageCounters.find((value) => value.codeId === item.codeId);
      const consumed = counter
        ? counter.reservedCount + counter.committedCount - counter.reversedCount
        : 0n;
      if (usageLimit !== null && usageLimit < consumed) {
        errors.push({
          message: "Code usage limit cannot be lower than current reserved and consumed usage",
          code: "USAGE_LIMIT_BELOW_USAGE",
          field: [...field, "usageLimit"],
        });
      }
      patch.usageLimit = usageLimit;
    }
    if (hasOwn(item, "metadata")) {
      const metadata = item.metadata ?? {};
      if (!isRecord(metadata)) {
        errors.push({
          message: "Code metadata must be a JSON object",
          code: "INVALID_METADATA",
          field: [...field, "metadata"],
        });
      } else {
        patch.metadata = metadata;
      }
    }
    return {
      codeId: item.codeId,
      expectedUpdatedAt: item.expectedUpdatedAt,
      patch,
    };
  });

  const deleteItems = (input.delete ?? []).map((item, index) => {
    const field = ["delete", String(index)];
    const current = currentById.get(item.codeId);
    validateTouchedCode(item.codeId, current, touchedIds, field, errors);
    if (current && current.updatedAt !== item.expectedUpdatedAt) {
      errors.push({
        message: "Discount code was modified by another user",
        code: "REVISION_CONFLICT",
        field: [...field, "expectedUpdatedAt"],
      });
    }
    const counter = aggregate.codeUsageCounters.find((value) => value.codeId === item.codeId);
    if (
      counter &&
      (counter.reservedCount > 0n || counter.committedCount > 0n || counter.reversedCount > 0n)
    ) {
      errors.push({
        message: "A discount code with usage history cannot be deleted",
        code: "CODE_IN_USE",
        field: [...field, "codeId"],
      });
    }
    return item;
  });

  return { value: { create, update, delete: deleteItems }, errors };
}

function validateTouchedCode(
  codeId: string,
  current: DiscountAggregate["codes"][number] | undefined,
  touchedIds: Set<string>,
  field: string[],
  errors: UserError[],
): void {
  if (!current) {
    errors.push({
      message: "Discount code not found",
      code: "CODE_NOT_FOUND",
      field: [...field, "codeId"],
    });
  }
  if (touchedIds.has(codeId)) {
    errors.push({
      message: "A discount code may only be changed once per request",
      code: "DUPLICATE_CODE_OPERATION",
      field: [...field, "codeId"],
    });
  }
  touchedIds.add(codeId);
}

function validateCode(value: string, field: string[], errors: UserError[]): string {
  const code = value.trim();
  if (!code || code.length > 255) {
    errors.push({
      message: "Discount codes must contain between 1 and 255 characters",
      code: "INVALID_CODE",
      field,
    });
  }
  return code;
}

function registerNormalizedCode(
  values: Map<string, string>,
  code: string,
  owner: string,
  field: string[],
  errors: UserError[],
): void {
  const normalized = normalizeCode(code);
  const existingOwner = values.get(normalized);
  if (existingOwner && existingOwner !== owner) {
    errors.push({
      message: "A discount code with this value already exists",
      code: "DUPLICATE_CODE",
      field: [...field, "code"],
    });
  }
  values.set(normalized, owner);
}

function normalizeCode(code: string): string {
  return code.trim().toLocaleUpperCase("en-US");
}
