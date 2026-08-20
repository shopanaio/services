import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { UserError } from "../../kernel/BaseScript.js";
import type { RatingCriterionUpdateOperation } from "../../workflows/dto/index.js";
import type { ReviewRatingCriterionUpdateInput } from "./generated/types.js";

export interface RatingCriterionUpdateMappedEntry {
  type: RatingCriterionUpdateOperation["type"];
  operation?: RatingCriterionUpdateOperation;
  errors: UserError[];
}

export interface RatingCriterionUpdateMappingResult {
  operations: RatingCriterionUpdateOperation[];
  entries: RatingCriterionUpdateMappedEntry[];
  errors: UserError[];
}

export function mapRatingCriterionUpdateInput(
  input?: ReviewRatingCriterionUpdateInput | null,
): RatingCriterionUpdateMappingResult {
  const entries: RatingCriterionUpdateMappedEntry[] = [];

  if (input?.definition) {
    entries.push(
      validEntry({
        type: "ratingCriterionDefinitionUpdate",
        params: input.definition,
        meta: { fieldPrefix: ["operations", "definition"] },
      }),
    );
  }
  if (input?.applicability) {
    entries.push(
      validEntry({
        type: "ratingCriterionApplicabilityUpdate",
        params: input.applicability,
        meta: { fieldPrefix: ["operations", "applicability"] },
      }),
    );
  }
  if (input?.translations != null) {
    entries.push(
      validEntry({
        type: "ratingCriterionTranslationsSync",
        params: { items: input.translations },
        meta: { fieldPrefix: ["operations", "translations"] },
      }),
    );
  }
  if (input?.assignments != null) {
    const errors: UserError[] = [];
    const fieldPrefix = ["operations", "assignments"];
    const items = input.assignments.map((item, index) => ({
      ...item,
      targetId: decodeTargetId(item, index, fieldPrefix, errors),
    }));
    const operation: RatingCriterionUpdateOperation = {
      type: "ratingCriterionAssignmentsSync",
      params: { items },
      meta: { fieldPrefix },
    };
    entries.push({
      type: operation.type,
      operation: errors.length === 0 ? operation : undefined,
      errors,
    });
  }

  return {
    operations: entries.flatMap((entry) => (entry.operation ? [entry.operation] : [])),
    entries,
    errors: entries.flatMap((entry) => entry.errors),
  };
}

function decodeTargetId(
  item: NonNullable<ReviewRatingCriterionUpdateInput["assignments"]>[number],
  index: number,
  fieldPrefix: string[],
  errors: UserError[],
): string {
  try {
    return decodeGlobalIdByType(
      item.targetId,
      item.targetType === "PRODUCT" ? GlobalIdEntity.Product : GlobalIdEntity.Category,
    );
  } catch {
    errors.push({
      message: "Invalid ID format",
      code: "INVALID_ID",
      field: [...fieldPrefix, String(index), "targetId"],
    });
    return item.targetId;
  }
}

function validEntry(operation: RatingCriterionUpdateOperation): RatingCriterionUpdateMappedEntry {
  return { type: operation.type, operation, errors: [] };
}
