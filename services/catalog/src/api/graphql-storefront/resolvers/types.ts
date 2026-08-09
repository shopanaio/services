import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { parseGraphqlInfo } from "@shopana/type-resolver";
import type { GraphQLResolveInfo } from "graphql";
import type { ServiceContext } from "../../../context/types.js";
import { CategoryResolver } from "../../../resolvers/storefront/CategoryResolver.js";
import {
  InventoryItemResolver,
  ProductFeatureGroupResolver,
  ProductFeatureResolver,
  ProductFeatureValueResolver,
  ProductOptionResolver,
  ProductOptionCategoryResolver,
  ProductOptionValueResolver,
  TagResolver,
  VendorResolver,
} from "../../../resolvers/storefront/CatalogEntityResolvers.js";
import { CategoryConnectionResolver } from "../../../resolvers/storefront/CategoryConnectionResolver.js";
import { MediaConnectionResolver } from "../../../resolvers/storefront/MediaConnectionResolver.js";
import { ProductResolver } from "../../../resolvers/storefront/ProductResolver.js";
import { ProductVariantConnectionResolver } from "../../../resolvers/storefront/ProductVariantConnectionResolver.js";
import { ProductVariantResolver } from "../../../resolvers/storefront/ProductVariantResolver.js";
import type { Resolvers } from "../../../resolvers/storefront/generated/types.js";

export const typeResolvers: Partial<Resolvers> = {
  Node: {
    __resolveType: (value) => {
      if (value instanceof ProductResolver) return "Product";
      if (value instanceof ProductVariantResolver) return "ProductVariant";
      if (value instanceof CategoryResolver) return "Category";
      if (value instanceof ProductOptionResolver) return "ProductOption";
      if (value instanceof ProductOptionCategoryResolver)
        return "ProductOptionCategory";
      if (value instanceof ProductOptionValueResolver)
        return "ProductOptionValue";
      if (value instanceof ProductFeatureResolver) return "ProductFeature";
      if (value instanceof ProductFeatureGroupResolver)
        return "ProductFeatureGroup";
      if (value instanceof ProductFeatureValueResolver)
        return "ProductFeatureValue";
      if (value instanceof VendorResolver) return "Vendor";
      if (value instanceof TagResolver) return "Tag";
      if (value instanceof InventoryItemResolver) return "InventoryItem";
      return null;
    },
  },

  Connection: {
    __resolveType: (value) => {
      if (value instanceof CategoryConnectionResolver)
        return "CategoryConnection";
      if (value instanceof ProductVariantConnectionResolver)
        return "ProductVariantConnection";
      if (value instanceof MediaConnectionResolver) {
        switch (value.$props.ownerType) {
          case "product":
            return "ProductMediaConnection";
          case "variant":
            return "ProductVariantMediaConnection";
          case "category":
            return "CategoryMediaConnection";
        }
      }
      return null;
    },
  },

  Media: {
    __resolveType: (value) => {
      const typeName = (value as { __typename?: unknown }).__typename;
      return typeName === "MediaImage" ||
        typeName === "Video" ||
        typeName === "ExternalVideo" ||
        typeName === "Model3d"
        ? typeName
        : null;
    },
  },

  DisplayableError: {
    __resolveType: () => "UserError",
  },

  Product: {
    __resolveReference: (reference, ctx, info) =>
      ProductResolver.load(
        decodeGlobalIdByType(reference.id, GlobalIdEntity.Product),
        parseGraphqlInfo(info),
        ctx,
      ),
  },

  ProductVariant: {
    __resolveReference: (reference, ctx, info) =>
      ProductVariantResolver.load(
        decodeGlobalIdByType(reference.id, GlobalIdEntity.ProductVariant),
        parseGraphqlInfo(info),
        ctx,
      ),
  },

  Category: referenceResolver(CategoryResolver, GlobalIdEntity.Category),
  Vendor: referenceResolver(VendorResolver, GlobalIdEntity.Vendor),
  Tag: referenceResolver(TagResolver, GlobalIdEntity.Tag),
  ProductOption: referenceResolver(ProductOptionResolver, GlobalIdEntity.Option),
  ProductOptionCategory: referenceResolver(
    ProductOptionCategoryResolver,
    GlobalIdEntity.OptionCategory,
  ),
  ProductOptionValue: referenceResolver(
    ProductOptionValueResolver,
    GlobalIdEntity.OptionValue,
  ),
  ProductFeature: referenceResolver(
    ProductFeatureResolver,
    GlobalIdEntity.Feature,
  ),
  ProductFeatureGroup: referenceResolver(
    ProductFeatureGroupResolver,
    GlobalIdEntity.Feature,
  ),
  ProductFeatureValue: referenceResolver(
    ProductFeatureValueResolver,
    GlobalIdEntity.FeatureValue,
  ),
  InventoryItem: referenceResolver(
    InventoryItemResolver,
    GlobalIdEntity.InventoryItem,
  ),
};

function referenceResolver(
  ResolverClass: {
    load(
      value: string,
      info: ReturnType<typeof parseGraphqlInfo>,
      ctx: ServiceContext,
    ): any;
  },
  entity: GlobalIdEntity,
) {
  return {
    __resolveReference: (
      reference: { id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      ResolverClass.load(
        decodeGlobalIdByType(reference.id, entity),
        parseGraphqlInfo(info),
        ctx,
      ),
  };
}
