import { parseGraphqlInfo } from "@shopana/type-resolver";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { GraphQLResolveInfo } from "graphql";
import type { Resolvers } from "../../../resolvers/admin/generated/types.js";
import type { ServiceContext } from "../../../context/types.js";
import { CategoryResolver } from "../../../resolvers/admin/CategoryResolver.js";
import { CollectionResolver } from "../../../resolvers/admin/CollectionResolver.js";
import { FeatureResolver } from "../../../resolvers/admin/FeatureResolver.js";
import { FeatureValueResolver } from "../../../resolvers/admin/FeatureValueResolver.js";
import { OptionResolver } from "../../../resolvers/admin/OptionResolver.js";
import { OptionValueResolver } from "../../../resolvers/admin/OptionValueResolver.js";
import { BundleResolver } from "../../../resolvers/admin/BundleResolver.js";
import { ProductResolver } from "../../../resolvers/admin/ProductResolver.js";
import { TagResolver } from "../../../resolvers/admin/TagResolver.js";
import { VariantResolver } from "../../../resolvers/admin/VariantResolver.js";
import { VendorResolver } from "../../../resolvers/admin/VendorResolver.js";
import { InventoryItemResolver } from "../../../resolvers/admin/InventoryItemResolver.js";
import { WarehouseResolver } from "../../../resolvers/admin/WarehouseResolver.js";
import { StockResolver } from "../../../resolvers/admin/StockResolver.js";

async function resolveProductBackedType(
  obj: unknown,
): Promise<"Bundle" | "Product" | null> {
  if (obj instanceof BundleResolver) return "Bundle";
  if (obj instanceof ProductResolver) {
    const product = await obj.$ctx.loaders.product.load(obj.$props);
    if (!product) return null;
    return product.kind === "BUNDLE" ? "Bundle" : "Product";
  }

  const record = obj as Record<string, unknown>;
  if (record.kind === "BUNDLE") return "Bundle";
  if (record.kind === "BASE") return "Product";

  return null;
}

/**
 * Type resolvers for interfaces and scalars.
 */
export const typeResolvers: Partial<Resolvers> = {
  // Interface resolvers
  Node: {
    __resolveType: async (obj: unknown) => {
      const record = obj as Record<string, unknown>;
      const productBackedType = await resolveProductBackedType(obj);
      if (productBackedType) return productBackedType;
      if (obj instanceof StockResolver) return "WarehouseStock";
      if (obj instanceof WarehouseResolver) return "Warehouse";
      if (obj instanceof InventoryItemResolver) return "InventoryItem";
      if ("quantityOnHand" in record) return "WarehouseStock";
      if ("code" in record && "isDefault" in record) return "Warehouse";
      if ("variantId" in record && "trackInventory" in record)
        return "InventoryItem";
      if ("variants" in record) return "Product";
      if ("productId" in record && "optionValueIds" in record) return "Variant";
      if ("displayType" in record) return "ProductOption";
      if ("swatchType" in record) return "ProductOptionSwatch";
      if ("amountMinor" in record) return "VariantPrice";
      if ("unitCostMinor" in record) return "VariantCost";
      if ("isGroup" in record) return "ProductFeature";
      if ("featureId" in record) return "ProductFeatureValue";
      if ("facetType" in record && "selectionMode" in record) return "Facet";
      if ("enabled" in record && "facetId" in record && "slug" in record)
        return "FacetValue";
      if ("swatchType" in record && "colorOne" in record && !("displayType" in record))
        return "FacetSwatch";
      if ("effectiveFrom" in record && "defaultSort" in record) return "Collection";
      if ("name" in record && !("handle" in record) && !("path" in record))
        return "Vendor";
      if ("handle" in record && "path" in record) return "Category";
      if ("handle" in record && !("path" in record)) return "Tag";
      if ("optionId" in record) return "ProductOptionValue";
      return null;
    },
  },

  Listing: {
    __resolveType: resolveProductBackedType,
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },

  // Federation reference resolvers
  Product: {
    __resolveReference: async (
      reference: { __typename: "Product"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const productId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.Product,
      );
      return ProductResolver.load(productId, fieldInfo, ctx);
    },
  },

  Bundle: {
    __resolveReference: async (
      reference: { __typename: "Bundle"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const productId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.Product,
      );
      return BundleResolver.load(productId, fieldInfo, ctx);
    },
  },

  Variant: {
    __resolveReference: async (
      reference: { __typename: "Variant"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const variantId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.Variant,
      );
      return VariantResolver.load(variantId, fieldInfo, ctx);
    },
  },

  Category: {
    __resolveReference: async (
      reference: { __typename: "Category"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const categoryId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.Category,
      );
      return CategoryResolver.load(categoryId, fieldInfo, ctx);
    },
  },

  Collection: {
    __resolveReference: async (
      reference: { __typename: "Collection"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const collectionId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.Collection,
      );
      return CollectionResolver.load(collectionId, fieldInfo, ctx);
    },
  },

  ProductFeature: {
    __resolveReference: async (
      reference: { __typename: "ProductFeature"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const featureId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.Feature,
      );
      return FeatureResolver.load(featureId, fieldInfo, ctx);
    },
  },

  ProductFeatureValue: {
    __resolveReference: async (
      reference: { __typename: "ProductFeatureValue"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const valueId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.FeatureValue,
      );
      return FeatureValueResolver.load(valueId, fieldInfo, ctx);
    },
  },

  ProductOption: {
    __resolveReference: async (
      reference: { __typename: "ProductOption"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const optionId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.Option,
      );
      return OptionResolver.load(optionId, fieldInfo, ctx);
    },
  },

  ProductOptionValue: {
    __resolveReference: async (
      reference: { __typename: "ProductOptionValue"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const valueId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.OptionValue,
      );
      return OptionValueResolver.load(valueId, fieldInfo, ctx);
    },
  },

  Tag: {
    __resolveReference: async (
      reference: { __typename: "Tag"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const tagId = decodeGlobalIdByType(reference.id, GlobalIdEntity.Tag);
      return TagResolver.load(tagId, fieldInfo, ctx);
    },
  },

  Vendor: {
    __resolveReference: async (
      reference: { __typename: "Vendor"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const vendorId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.Vendor,
      );
      return VendorResolver.load(vendorId, fieldInfo, ctx);
    },
  },

  InventoryItem: {
    __resolveReference: async (
      reference: { __typename: "InventoryItem"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const itemId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.InventoryItem,
      );
      const item = await ctx.loaders.inventoryItem.load(itemId);
      if (!item) return null;
      return InventoryItemResolver.load(itemId, fieldInfo, ctx);
    },
  },

  Warehouse: {
    __resolveReference: async (
      reference: { __typename: "Warehouse"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const warehouseId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.Warehouse,
      );
      return WarehouseResolver.load(warehouseId, fieldInfo, ctx);
    },
  },
};
