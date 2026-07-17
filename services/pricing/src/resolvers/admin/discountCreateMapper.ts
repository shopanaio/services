import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import type { UserError } from "../../kernel/BaseScript.js";
import type {
  DiscountCreateInput,
  DiscountTargetSelectionInput,
} from "./generated/types.js";

export interface DiscountCreateMappingResult {
  input: DiscountCreateInput;
  errors: UserError[];
}

export function mapDiscountCreateInput(
  input: DiscountCreateInput,
): DiscountCreateMappingResult {
  const errors: UserError[] = [];
  return {
    input: {
      ...input,
      targetSelections: input.targetSelections?.map((selection, index) => ({
        ...selection,
        targetIds: selection.targetIds.map(
          (targetId, targetIndex) =>
            decodeId(
              targetId,
              targetGlobalIdType(selection.targetType),
              [
                "input",
                "targetSelections",
                String(index),
                "targetIds",
                String(targetIndex),
              ],
              errors,
            ) ?? targetId,
        ),
      })),
      buyerContext:
        input.buyerContext == null
          ? input.buyerContext
          : {
              ...input.buyerContext,
              customerIds: input.buyerContext.customerIds?.map(
                (customerId, index) =>
                  decodeId(
                    customerId,
                    GlobalIdEntity.Customer,
                    ["input", "buyerContext", "customerIds", String(index)],
                    errors,
                  ) ?? customerId,
              ),
              segmentIds: input.buyerContext.segmentIds?.map(
                (segmentId, index) =>
                  decodeId(
                    segmentId,
                    GlobalIdEntity.CustomerSegment,
                    ["input", "buyerContext", "segmentIds", String(index)],
                    errors,
                  ) ?? segmentId,
              ),
            },
    },
    errors,
  };
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
