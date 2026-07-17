import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { UserError } from "../../kernel/BaseScript.js";
import type { DiscountUpdateOperation } from "../../workflows/dto/index.js";
import type {
  DiscountOperationType,
  DiscountTargetSelectionInput,
  DiscountUpdateInput,
} from "./generated/types.js";

export interface DiscountUpdateMappedEntry {
  type: DiscountUpdateOperation["type"];
  operation?: DiscountUpdateOperation;
  errors: UserError[];
}

export interface DiscountUpdateMappingResult {
  operations: DiscountUpdateOperation[];
  entries: DiscountUpdateMappedEntry[];
  errors: UserError[];
}

export function mapDiscountUpdateInput(
  input: DiscountUpdateInput,
): DiscountUpdateMappingResult {
  const entries: DiscountUpdateMappedEntry[] = [];

  if (input.definition != null) {
    entries.push(
      validEntry({
        type: "discountDefinitionUpdate",
        params: input.definition,
        meta: { fieldPrefix: ["operations", "definition"] },
      }),
    );
  }
  if (input.rule != null) {
    entries.push(
      validEntry({
        type: "discountRuleUpdate",
        params: input.rule,
        meta: { fieldPrefix: ["operations", "rule"] },
      }),
    );
  }
  if (input.minimumRequirement != null) {
    entries.push(
      validEntry({
        type: "discountMinimumRequirementUpdate",
        params: input.minimumRequirement,
        meta: { fieldPrefix: ["operations", "minimumRequirement"] },
      }),
    );
  }
  if (input.targetSelections != null) {
    entries.push(mapTargets(input.targetSelections));
  }
  if (input.eligibility != null) {
    entries.push(mapEligibility(input.eligibility));
  }
  if (input.codes != null) {
    entries.push(mapCodes(input.codes));
  }
  if (input.tags != null) {
    entries.push(
      validEntry({
        type: "discountTagsUpdate",
        params: { items: input.tags },
        meta: { fieldPrefix: ["operations", "tags"] },
      }),
    );
  }
  if (input.channels != null) {
    entries.push(
      validEntry({
        type: "discountChannelsUpdate",
        params: { items: input.channels },
        meta: { fieldPrefix: ["operations", "channels"] },
      }),
    );
  }
  if (input.combinesWith != null) {
    entries.push(
      validEntry({
        type: "discountCombinationsUpdate",
        params: { items: input.combinesWith },
        meta: { fieldPrefix: ["operations", "combinesWith"] },
      }),
    );
  }
  if (input.lifecycle != null) {
    entries.push(
      validEntry({
        type: "discountLifecycleUpdate",
        params: input.lifecycle,
        meta: { fieldPrefix: ["operations", "lifecycle"] },
      }),
    );
  }
  if (hasOwn(input, "metadata")) {
    const errors: UserError[] = [];
    const metadata = input.metadata ?? {};
    if (!isRecord(metadata)) {
      errors.push({
        message: "Metadata must be a JSON object",
        code: "INVALID_METADATA",
        field: ["operations", "metadata"],
      });
    }
    const operation: DiscountUpdateOperation = {
      type: "discountMetadataUpdate",
      params: { metadata: isRecord(metadata) ? metadata : {} },
      meta: { fieldPrefix: ["operations", "metadata"] },
    };
    entries.push(mappedEntry(operation, errors));
  }

  return {
    operations: entries.flatMap((entry) =>
      entry.operation ? [entry.operation] : [],
    ),
    entries,
    errors: entries.flatMap((entry) => entry.errors),
  };
}

export function mapPreflightDiscountOperationResult(
  entry: DiscountUpdateMappedEntry,
) {
  return {
    type: toGraphqlDiscountOperationType(entry.type),
    applied: false,
    errors: entry.errors,
  };
}

export function toGraphqlDiscountOperationType(
  type: DiscountUpdateOperation["type"],
): DiscountOperationType {
  const types: Record<
    DiscountUpdateOperation["type"],
    DiscountOperationType
  > = {
    discountDefinitionUpdate: "DEFINITION_UPDATE" as DiscountOperationType,
    discountRuleUpdate: "RULE_UPDATE" as DiscountOperationType,
    discountMinimumRequirementUpdate:
      "MINIMUM_REQUIREMENT_UPDATE" as DiscountOperationType,
    discountTargetsUpdate: "TARGETS_UPDATE" as DiscountOperationType,
    discountEligibilityUpdate: "ELIGIBILITY_UPDATE" as DiscountOperationType,
    discountCodesUpdate: "CODES_UPDATE" as DiscountOperationType,
    discountTagsUpdate: "TAGS_UPDATE" as DiscountOperationType,
    discountChannelsUpdate: "CHANNELS_UPDATE" as DiscountOperationType,
    discountCombinationsUpdate:
      "COMBINATIONS_UPDATE" as DiscountOperationType,
    discountLifecycleUpdate: "LIFECYCLE_UPDATE" as DiscountOperationType,
    discountMetadataUpdate: "METADATA_UPDATE" as DiscountOperationType,
  };
  return types[type];
}

function mapTargets(
  inputs: DiscountTargetSelectionInput[],
): DiscountUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "targetSelections"];
  const items = inputs.map((input, index) => ({
    ...input,
    targetIds: input.targetIds.map((targetId, targetIndex) =>
      decodeId(
        targetId,
        targetGlobalIdType(input.targetType),
        [...fieldPrefix, String(index), "targetIds", String(targetIndex)],
        errors,
      ) ?? targetId,
    ),
  }));
  return mappedEntry(
    {
      type: "discountTargetsUpdate",
      params: { items },
      meta: { fieldPrefix },
    },
    errors,
  );
}

function mapEligibility(
  input: NonNullable<DiscountUpdateInput["eligibility"]>,
): DiscountUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "eligibility"];
  const params = {
    ...input,
    customerIds: input.customerIds?.map((id, index) =>
      decodeId(
        id,
        GlobalIdEntity.Customer,
        [...fieldPrefix, "customerIds", String(index)],
        errors,
      ) ?? id,
    ),
    segmentIds: input.segmentIds?.map((id, index) =>
      decodeId(
        id,
        GlobalIdEntity.CustomerSegment,
        [...fieldPrefix, "segmentIds", String(index)],
        errors,
      ) ?? id,
    ),
  };
  return mappedEntry(
    {
      type: "discountEligibilityUpdate",
      params,
      meta: { fieldPrefix },
    },
    errors,
  );
}

function mapCodes(
  input: NonNullable<DiscountUpdateInput["codes"]>,
): DiscountUpdateMappedEntry {
  const errors: UserError[] = [];
  const fieldPrefix = ["operations", "codes"];
  const params = {
    ...input,
    update: input.update?.map((item, index) => ({
      ...item,
      codeId:
        decodeId(
          item.codeId,
          GlobalIdEntity.DiscountCode,
          [...fieldPrefix, "update", String(index), "codeId"],
          errors,
        ) ?? item.codeId,
    })),
    delete: input.delete?.map((item, index) => ({
      ...item,
      codeId:
        decodeId(
          item.codeId,
          GlobalIdEntity.DiscountCode,
          [...fieldPrefix, "delete", String(index), "codeId"],
          errors,
        ) ?? item.codeId,
    })),
  };
  return mappedEntry(
    {
      type: "discountCodesUpdate",
      params,
      meta: { fieldPrefix },
    },
    errors,
  );
}

function targetGlobalIdType(
  type: DiscountTargetSelectionInput["targetType"],
): GlobalIdType {
  switch (type) {
    case "PRODUCTS":
      return GlobalIdEntity.Product;
    case "VARIANTS":
      return GlobalIdEntity.Variant;
    case "CATEGORIES":
      return GlobalIdEntity.Category;
    case "ALL_PRODUCTS":
      return GlobalIdEntity.Product;
  }
  throw new Error(`Unsupported discount target type: ${String(type)}`);
}

function validEntry(
  operation: DiscountUpdateOperation,
): DiscountUpdateMappedEntry {
  return { type: operation.type, operation, errors: [] };
}

function mappedEntry(
  operation: DiscountUpdateOperation,
  errors: UserError[],
): DiscountUpdateMappedEntry {
  return {
    type: operation.type,
    operation: errors.length === 0 ? operation : undefined,
    errors,
  };
}

function decodeId(
  globalId: string,
  expectedType: GlobalIdType,
  field: string[],
  errors: UserError[],
): string | undefined {
  try {
    return decodeGlobalIdByType(globalId, expectedType);
  } catch {
    errors.push({
      message: "Invalid ID format",
      code: "INVALID_ID",
      field,
    });
    return undefined;
  }
}

function hasOwn(input: object, field: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(input, field);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
