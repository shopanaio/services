import {
  CollectionContractValidationError,
  hashCanonicalCollectionRulesV1,
  normalizeCanonicalCollectionRulesV1,
} from "@shopana/broker-types";
import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { CollectionResult, CollectionUpdateRulesParams } from "./dto/index.js";

export class CollectionUpdateRulesScript extends BaseScript<
  CollectionUpdateRulesParams,
  CollectionResult
> {
  @Transactional()
  protected async execute(params: CollectionUpdateRulesParams): Promise<CollectionResult> {
    const collection = await this.repository.collection.findByIdForUpdate(params.collectionId);
    if (!collection) {
      return {
        collection: undefined,
        userErrors: [
          { message: "Collection not found", field: ["collectionId"], code: "NOT_FOUND" },
        ],
      };
    }

    if (collection.type !== "rule") {
      return {
        collection: undefined,
        userErrors: [{ message: "Rules are supported only for rule collections", code: "INVALID" }],
      };
    }

    if (collection.publishedAt && params.rules.length === 0) {
      return {
        collection: undefined,
        userErrors: [
          {
            message: "A published rule collection must contain at least one rule",
            field: ["rules"],
            code: "RULES_REQUIRED",
          },
        ],
      };
    }
    let rules;
    try {
      rules = normalizeCanonicalCollectionRulesV1(params.rules);
    } catch (error) {
      return {
        collection: undefined,
        userErrors: [
          {
            message:
              error instanceof CollectionContractValidationError
                ? error.message
                : "Invalid collection rules",
            field:
              error instanceof CollectionContractValidationError
                ? ["rules", ...error.path.map(String)]
                : ["rules"],
            code: "INVALID_RULE",
          },
        ],
      };
    }
    const categoryIds = rules.flatMap((rule) =>
      rule.field === "category" ? [...rule.value.ids] : [],
    );
    const tagIds = rules.flatMap((rule) => (rule.field === "tag" ? [...rule.value.ids] : []));
    const vendorIds = rules.flatMap((rule) => (rule.field === "vendor" ? [...rule.value.ids] : []));
    const [categories, tags, vendors] = await Promise.all([
      this.repository.category.getByIds(categoryIds),
      this.repository.tag.getByIds(tagIds),
      this.repository.vendor.getByIds(vendorIds),
    ]);
    const missingType =
      new Set(categories.map((row) => row.id)).size !== new Set(categoryIds).size
        ? "category"
        : new Set(tags.map((row) => row.id)).size !== new Set(tagIds).size
          ? "tag"
          : new Set(vendors.map((row) => row.id)).size !== new Set(vendorIds).size
            ? "vendor"
            : null;
    if (missingType) {
      return {
        collection: undefined,
        userErrors: [
          {
            message: `One or more ${missingType} references were not found`,
            field: ["rules"],
            code: "REFERENCE_NOT_FOUND",
          },
        ],
      };
    }
    const currentRows = await this.repository.collectionRule.findByCollectionId(
      params.collectionId,
    );
    const currentRules = normalizeCanonicalCollectionRulesV1(
      currentRows.map((row) => ({
        field: row.field,
        operator: row.operator,
        value: row.value,
      })),
    );
    const listingChanged =
      hashCanonicalCollectionRulesV1(currentRules) !== hashCanonicalCollectionRulesV1(rules);
    if (
      collection.revision >= 2_147_483_646 ||
      (listingChanged && collection.listingRevision >= 2_147_483_646)
    ) {
      return {
        collection: undefined,
        userErrors: [
          { message: "Collection revision limit reached", code: "REVISION_LIMIT_EXCEEDED" },
        ],
      };
    }
    await this.repository.collectionRule.replaceRules(params.collectionId, rules);
    const refreshed = await this.repository.collection.bumpRevision(params.collectionId, {
      listingChanged,
    });
    if (!refreshed) {
      throw new Error("Collection disappeared while updating rules");
    }
    return { collection: refreshed, userErrors: [] };
  }

  protected handleError(_error: unknown): CollectionResult {
    return {
      collection: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
