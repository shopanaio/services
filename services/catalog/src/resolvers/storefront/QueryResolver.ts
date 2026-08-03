import {
  GLOBAL_ID_NAMESPACE,
  GlobalIdEntity,
  parseGlobalId,
} from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import type {
  QueryCategoriesArgs,
  QueryCategoryArgs,
  QueryCategoryByHandleArgs,
  QueryNodeArgs,
  QueryNodesArgs,
  QueryProductArgs,
  QueryProductByHandleArgs,
  QueryProductVariantArgs,
} from "./generated/types.js";
import { CatalogType } from "./CatalogType.js";
import { isPublishedAt, isPublishedProduct, loadPublishedVariant } from "./helpers.js";

@ApolloQuery
export class QueryResolver extends CatalogType<Record<string, never>> {
  async node(args: QueryNodeArgs) {
    let decoded: ReturnType<typeof parseGlobalId>;
    try {
      decoded = parseGlobalId(args.id);
    } catch {
      return null;
    }
    if (decoded.namespace !== GLOBAL_ID_NAMESPACE) return null;

    switch (decoded.typeName) {
      case GlobalIdEntity.Product:
        return this.product({ id: args.id });
      case GlobalIdEntity.ProductVariant:
        return this.productVariant({ id: args.id });
      case GlobalIdEntity.Category:
        return this.category({ id: args.id });
      case GlobalIdEntity.Option:
        return (await this.$ctx.loaders.productOption.load(decoded.id))
          ? this.resolvers.productOption(decoded.id)
          : null;
      case GlobalIdEntity.OptionValue:
        return (await this.$ctx.loaders.optionValue.load(decoded.id))
          ? this.resolvers.productOptionValue(decoded.id)
          : null;
      case GlobalIdEntity.Feature: {
        const feature = await this.$ctx.loaders.productFeature.load(decoded.id);
        if (!feature) return null;
        return feature.isGroup
          ? this.resolvers.productFeatureGroup(decoded.id)
          : this.resolvers.productFeature(decoded.id);
      }
      case GlobalIdEntity.FeatureValue:
        return (await this.$ctx.loaders.featureValue.load(decoded.id))
          ? this.resolvers.productFeatureValue(decoded.id)
          : null;
      case GlobalIdEntity.Vendor:
        return (await this.$ctx.loaders.vendor.load(decoded.id))
          ? this.resolvers.vendor(decoded.id)
          : null;
      case GlobalIdEntity.Tag:
        return (await this.$ctx.loaders.tag.load(decoded.id))
          ? this.resolvers.tag(decoded.id)
          : null;
      case GlobalIdEntity.InventoryItem: {
        const item = await this.$ctx.loaders.inventoryItem.load(decoded.id);
        return item && (await loadPublishedVariant(this.$ctx, item.variantId))
          ? this.resolvers.inventoryItem(decoded.id)
          : null;
      }
      default:
        return null;
    }
  }

  nodes(args: QueryNodesArgs) {
    return Promise.all(args.ids.map((id) => this.node({ id })));
  }

  async product(args: QueryProductArgs) {
    let id: string;
    try {
      id = this.decodeId(args.id, GlobalIdEntity.Product);
    } catch {
      return null;
    }
    const product = await this.$ctx.loaders.product.load(id);
    return isPublishedProduct(product) ? this.resolvers.product(id) : null;
  }

  async productByHandle(args: QueryProductByHandleArgs) {
    const product = await this.$ctx.kernel.repository.product.findByHandle(
      args.handle,
    );
    return isPublishedProduct(product)
      ? this.resolvers.product(product.id)
      : null;
  }

  async productVariant(args: QueryProductVariantArgs) {
    let id: string;
    try {
      id = this.decodeId(args.id, GlobalIdEntity.ProductVariant);
    } catch {
      return null;
    }
    return (await loadPublishedVariant(this.$ctx, id))
      ? this.resolvers.productVariant(id)
      : null;
  }

  async category(args: QueryCategoryArgs) {
    let id: string;
    try {
      id = this.decodeId(args.id, GlobalIdEntity.Category);
    } catch {
      return null;
    }
    const category = await this.$ctx.loaders.category.load(id);
    return category && isPublishedAt(category.publishedAt)
      ? this.resolvers.category(id)
      : null;
  }

  async categoryByHandle(args: QueryCategoryByHandleArgs) {
    const category = await this.$ctx.kernel.repository.category.findByHandle(
      args.handle,
    );
    return category && isPublishedAt(category.publishedAt)
      ? this.resolvers.category(category.id)
      : null;
  }

  categories(args: QueryCategoriesArgs) {
    return this.resolvers.categoryConnection(args);
  }
}
