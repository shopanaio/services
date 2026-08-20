import { PreloadNotFoundError } from "@shopana/type-resolver";
import {
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { RichText } from "./interfaces/index.js";
import type { Collection } from "../../repositories/models/index.js";
import { toRichText } from "./helpers/richText.js";
import { normalizeCanonicalCollectionRuleV1 } from "@shopana/broker-types";

export class CollectionResolver extends CatalogType<string, Collection> {
  async $preload() {
    const collection = await this.$ctx.loaders.collection.load(this.$props);
    if (!collection) {
      throw new PreloadNotFoundError(
        `Collection with ID ${this.$props} not found`
      );
    }
    return collection;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Collection);
  }

  async handle() {
    return this.$get("handle");
  }

  async type() {
    return ((await this.$get("type")) ?? "manual").toUpperCase();
  }

  async name() {
    const translation = await this.$ctx.loaders.collectionTranslation.load(this.$props);
    return translation?.name ?? "";
  }

  async description(): Promise<RichText | null> {
    const translation = await this.$ctx.loaders.collectionTranslation.load(this.$props);
    return toRichText(translation && {
      text: translation.descriptionText,
      html: translation.descriptionHtml,
      json: translation.descriptionJson,
    });
  }

  async excerpt(): Promise<RichText | null> {
    const translation = await this.$ctx.loaders.collectionTranslation.load(this.$props);
    return toRichText(translation && {
      text: translation.excerptText,
      html: translation.excerptHtml,
      json: translation.excerptJson,
    });
  }

  async media() {
    const rows = await this.$ctx.loaders.collectionMedia.load(this.$props);
    return rows.map((row) => ({
      file: { __typename: "File" as const, id: row.fileId },
      sortIndex: row.sortIndex,
    }));
  }

  async seo() {
    const seo = await this.$ctx.loaders.collectionSeo.load(this.$props);
    if (!seo) return null;
    return this.resolvers.seo(seo);
  }

  async defaultSort() {
    return ((await this.$get("defaultSort")) ?? "newest").toUpperCase();
  }

  async defaultSortDirection() {
    return (await this.$get("defaultSortDirection")) ?? "asc";
  }

  async activeFrom() {
    return this.$get("effectiveFrom");
  }

  async activeTo() {
    return this.$get("effectiveTo");
  }

  async isActive() {
    const now = new Date();
    const from = await this.$get("effectiveFrom");
    const to = await this.$get("effectiveTo");
    if (from && new Date(from) > now) return false;
    if (to && new Date(to) <= now) return false;
    return true;
  }

  async publishedAt() {
    return this.$get("publishedAt");
  }

  async isPublished() {
    const publishedAt = await this.$get("publishedAt");
    if (!publishedAt) return false;
    return new Date(publishedAt) <= new Date();
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }

  async revision() {
    return this.$get("revision");
  }

  async listingRevision() {
    return this.$get("listingRevision");
  }

  async rules() {
    const rows = await this.$ctx.kernel.repository.collectionRule.findByCollectionId(
      this.$props
    );
    const normalized = rows.map((row) => ({
      row,
      rule: normalizeCanonicalCollectionRuleV1({
        field: row.field,
        operator: row.operator,
        value: row.value,
      }),
    }));
    const idsByType = {
      category: normalized.flatMap(({ rule }) =>
        rule.field === "category" ? [...rule.value.ids] : []
      ),
      tag: normalized.flatMap(({ rule }) =>
        rule.field === "tag" ? [...rule.value.ids] : []
      ),
      vendor: normalized.flatMap(({ rule }) =>
        rule.field === "vendor" ? [...rule.value.ids] : []
      ),
    };
    const [categories, tags, vendors] = await Promise.all([
      this.$ctx.kernel.repository.category.getByIds(idsByType.category),
      this.$ctx.kernel.repository.tag.getByIds(idsByType.tag),
      this.$ctx.kernel.repository.vendor.getByIds(idsByType.vendor),
    ]);
    const existingIds = {
      category: new Set(categories.map((item) => item.id)),
      tag: new Set(tags.map((item) => item.id)),
      vendor: new Set(vendors.map((item) => item.id)),
    };
    const result = normalized.map(({ row, rule }) => {
      let referenceStatus = "NOT_APPLICABLE";
      if (
        rule.field === "category" ||
        rule.field === "tag" ||
        rule.field === "vendor"
      ) {
        referenceStatus = rule.value.ids.every((id) =>
          existingIds[rule.field].has(id)
        )
          ? "VALID"
          : "STALE";
      }
      const common = {
        id: row.id,
        field: rule.field.toUpperCase(),
        sortIndex: row.sortIndex,
        referenceStatus,
      };
      if (rule.field === "category") {
        return {
          __typename: "CollectionCategoryRule" as const,
          ...common,
          operator: rule.operator.toUpperCase(),
          categoryIds: rule.value.ids.map((id) =>
            this.encodeId(id, GlobalIdEntity.Category)
          ),
        };
      }
      if (rule.field === "tag") {
        return {
          __typename: "CollectionTagRule" as const,
          ...common,
          operator: rule.operator.toUpperCase(),
          tagIds: rule.value.ids.map((id) =>
            this.encodeId(id, GlobalIdEntity.Tag)
          ),
        };
      }
      if (rule.field === "vendor") {
        return {
          __typename: "CollectionVendorRule" as const,
          ...common,
          vendorIds: rule.value.ids.map((id) =>
            this.encodeId(id, GlobalIdEntity.Vendor)
          ),
        };
      }
      if (rule.field === "feature") {
        return {
          __typename: "CollectionFeatureRule" as const,
          ...common,
          operator: rule.operator.toUpperCase(),
          values: rule.value.values,
        };
      }
      if (rule.field === "option") {
        return {
          __typename: "CollectionOptionRule" as const,
          ...common,
          operator: rule.operator.toUpperCase(),
          values: rule.value.values,
        };
      }
      if (rule.field === "price") {
        if (rule.operator === "between") {
          return {
            __typename: "CollectionPriceRangeRule" as const,
            ...common,
            currencyCode: rule.value.currencyCode,
            minAmountMinor: rule.value.minAmountMinor,
            maxAmountMinor: rule.value.maxAmountMinor,
          };
        }
        return {
          __typename: "CollectionPriceComparisonRule" as const,
          ...common,
          operator: rule.operator.toUpperCase(),
          currencyCode: rule.value.currencyCode,
          amountMinor: rule.value.amountMinor,
        };
      }
      if (rule.field === "in_stock") {
        return {
          __typename: "CollectionInStockRule" as const,
          ...common,
          value: rule.value.value,
        };
      }
      if (rule.operator === "between") {
        return {
          __typename: "CollectionCreatedAtRangeRule" as const,
          ...common,
          from: rule.value.from,
          to: rule.value.to,
        };
      }
      return {
        __typename: "CollectionCreatedAtComparisonRule" as const,
        ...common,
        operator: rule.operator.toUpperCase(),
        instant: rule.value.instant,
      };
    });
    const staleCount = result.filter(
      (item) => item.referenceStatus === "STALE",
    ).length;
    if (staleCount > 0) {
      this.$ctx.kernel.getServices().logger.warn(
        { collectionId: this.$props, staleCount },
        "Collection contains stale rule references",
      );
    }
    return result;
  }

}
