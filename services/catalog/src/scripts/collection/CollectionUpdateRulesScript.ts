import { BaseScript } from "../../kernel/BaseScript.js";
import type { CollectionResult, CollectionUpdateRulesParams } from "./dto/index.js";

const ALLOWED_OPERATORS: Record<string, Set<string>> = {
  tag: new Set(["in", "all", "contains"]),
  feature: new Set(["in", "all", "contains"]),
  category: new Set(["in", "all", "contains"]),
  option: new Set(["in", "all", "contains"]),
  price: new Set(["eq", "gt", "gte", "lt", "lte", "between"]),
  created_at: new Set(["eq", "gt", "gte", "lt", "lte", "between"]),
  in_stock: new Set(["eq"]),
};

export class CollectionUpdateRulesScript extends BaseScript<
  CollectionUpdateRulesParams,
  CollectionResult
> {
  protected async execute(params: CollectionUpdateRulesParams): Promise<CollectionResult> {
    const collection = await this.repository.collection.findById(params.collectionId);
    if (!collection) {
      return {
        collection: undefined,
        userErrors: [{ message: "Collection not found", field: ["collectionId"], code: "NOT_FOUND" }],
      };
    }

    if (collection.type !== "rule") {
      return {
        collection: undefined,
        userErrors: [{ message: "Rules are supported only for rule collections", code: "INVALID" }],
      };
    }

    for (let i = 0; i < params.rules.length; i++) {
      const rule = params.rules[i];
      const operators = ALLOWED_OPERATORS[rule.field];
      if (!operators) {
        return {
          collection: undefined,
          userErrors: [{ message: "Unsupported rule field", field: ["rules", String(i), "field"], code: "INVALID" }],
        };
      }
      if (!operators.has(rule.operator)) {
        return {
          collection: undefined,
          userErrors: [{ message: "Unsupported rule operator", field: ["rules", String(i), "operator"], code: "INVALID" }],
        };
      }
    }

    await this.repository.collectionRule.replaceRules(params.collectionId, params.rules);
    const refreshed = await this.repository.collection.findById(params.collectionId);
    return { collection: refreshed ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): CollectionResult {
    return {
      collection: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
