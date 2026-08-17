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
import { OptionCategoryResolver } from "../../../resolvers/admin/OptionCategoryResolver.js";
import { OptionValueResolver } from "../../../resolvers/admin/OptionValueResolver.js";
import {
  ProductReferenceResolver,
  ProductResolver,
} from "../../../resolvers/admin/ProductResolver.js";
import { TagResolver } from "../../../resolvers/admin/TagResolver.js";
import { VariantResolver } from "../../../resolvers/admin/VariantResolver.js";
import { VendorResolver } from "../../../resolvers/admin/VendorResolver.js";
import { InventoryItemResolver } from "../../../resolvers/admin/InventoryItemResolver.js";
import { WarehouseResolver } from "../../../resolvers/admin/WarehouseResolver.js";
import { StockResolver } from "../../../resolvers/admin/StockResolver.js";
import { ProductComponentConfigurationResolver } from "../../../resolvers/admin/ProductComponentConfigurationResolver.js";
import { ProductComponentGroupResolver } from "../../../resolvers/admin/ProductComponentGroupResolver.js";
import { ProductComponentItemResolver } from "../../../resolvers/admin/ProductComponentItemResolver.js";
import {
  ProductComponentItemOptionSelectionResolver,
  ProductComponentItemOptionValueSelectionResolver,
} from "../../../resolvers/admin/ProductComponentOptionResolver.js";
import {
  ProductComponentAdjustmentPriceRuleResolver,
  ProductComponentBasePriceRuleResolver,
  ProductComponentFreePriceRuleResolver,
  ProductComponentOverridePriceRuleResolver,
  ProductComponentPricingTemplateResolver,
} from "../../../resolvers/admin/ProductComponentPriceRuleResolver.js";
import {
  ProductComponentConditionGroupResolver,
  ProductComponentConditionResolver,
  ProductComponentDependencyActionResolver,
  ProductComponentDependencyRuleResolver,
} from "../../../resolvers/admin/ProductComponentDependencyRuleResolver.js";

/**
 * Type resolvers for interfaces and scalars.
 */
export const typeResolvers: Partial<Resolvers> = {
  // Interface resolvers
  Node: {
    __resolveType: async (obj: unknown) => {
      const record = obj as Record<string, unknown>;
      if (obj instanceof ProductResolver) return "Product";
      if (obj instanceof OptionCategoryResolver) return "ProductOptionCategory";
      if (obj instanceof ProductComponentConfigurationResolver)
        return "ProductComponentConfiguration";
      if (obj instanceof ProductComponentGroupResolver)
        return "ProductComponentGroup";
      if (obj instanceof ProductComponentItemResolver)
        return "ProductComponentItem";
      if (obj instanceof ProductComponentItemOptionSelectionResolver)
        return "ProductComponentItemOptionSelection";
      if (obj instanceof ProductComponentItemOptionValueSelectionResolver)
        return "ProductComponentItemOptionValueSelection";
      if (obj instanceof ProductComponentBasePriceRuleResolver)
        return "ProductComponentBasePriceRule";
      if (obj instanceof ProductComponentAdjustmentPriceRuleResolver)
        return "ProductComponentAdjustmentPriceRule";
      if (obj instanceof ProductComponentOverridePriceRuleResolver)
        return "ProductComponentOverridePriceRule";
      if (obj instanceof ProductComponentFreePriceRuleResolver)
        return "ProductComponentFreePriceRule";
      if (obj instanceof ProductComponentPricingTemplateResolver)
        return "ProductComponentPricingTemplate";
      if (obj instanceof ProductComponentDependencyRuleResolver)
        return "ProductComponentDependencyRule";
      if (obj instanceof ProductComponentConditionGroupResolver)
        return "ProductComponentConditionGroup";
      if (obj instanceof ProductComponentConditionResolver)
        return "ProductComponentCondition";
      if (obj instanceof ProductComponentDependencyActionResolver)
        return "ProductComponentDependencyAction";
      if (obj instanceof StockResolver) return "WarehouseStock";
      if (obj instanceof WarehouseResolver) return "Warehouse";
      if (obj instanceof InventoryItemResolver) return "InventoryItem";
      if ("quantityOnHand" in record) return "WarehouseStock";
      if ("code" in record && "isDefault" in record) return "Warehouse";
      if ("variantId" in record && "trackInventory" in record)
        return "InventoryItem";
      if ("variants" in record) return "Product";
      if ("productId" in record && "optionValueIds" in record) return "Variant";
      if ("productId" in record && "categoryId" in record) return "ProductOption";
      if ("swatchType" in record) return "ProductOptionSwatch";
      if ("amountMinor" in record) return "VariantPrice";
      if ("unitCostMinor" in record) return "VariantCost";
      if ("isGroup" in record) return "ProductFeature";
      if ("featureId" in record) return "ProductFeatureValue";
      if ("effectiveFrom" in record && "defaultSort" in record)
        return "Collection";
      if ("name" in record && !("handle" in record) && !("path" in record))
        return "Vendor";
      if ("handle" in record && "path" in record) return "Category";
      if ("handle" in record && !("path" in record)) return "Tag";
      if ("optionId" in record) return "ProductOptionValue";
      return null;
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },

  ProductComponentPriceRule: {
    __resolveType: (obj: unknown) => {
      if (obj instanceof ProductComponentBasePriceRuleResolver)
        return "ProductComponentBasePriceRule";
      if (obj instanceof ProductComponentAdjustmentPriceRuleResolver)
        return "ProductComponentAdjustmentPriceRule";
      if (obj instanceof ProductComponentOverridePriceRuleResolver)
        return "ProductComponentOverridePriceRule";
      if (obj instanceof ProductComponentFreePriceRuleResolver)
        return "ProductComponentFreePriceRule";

      const typeName = (obj as { __typename?: unknown })?.__typename;
      if (
        typeName === "ProductComponentBasePriceRule" ||
        typeName === "ProductComponentAdjustmentPriceRule" ||
        typeName === "ProductComponentOverridePriceRule" ||
        typeName === "ProductComponentFreePriceRule"
      ) {
        return typeName;
      }

      switch ((obj as { strategy?: unknown })?.strategy) {
        case "BASE":
          return "ProductComponentBasePriceRule";
        case "ADJUSTMENT":
          return "ProductComponentAdjustmentPriceRule";
        case "OVERRIDE":
          return "ProductComponentOverridePriceRule";
        case "FREE":
          return "ProductComponentFreePriceRule";
        default:
          return null;
      }
    },
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
      if (!(await ctx.loaders.productReference.load(productId))) return null;
      return ProductReferenceResolver.load(productId, fieldInfo, ctx);
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
      if (!(await ctx.loaders.variant.load(variantId))) return null;
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

  ProductOptionCategory: {
    __resolveReference: async (
      reference: { __typename: "ProductOptionCategory"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const categoryId = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.OptionCategory,
      );
      return OptionCategoryResolver.load(categoryId, fieldInfo, ctx);
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

  ProductComponentConfiguration: {
    __resolveReference: async (
      reference: { __typename: "ProductComponentConfiguration"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const id = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.ProductComponentConfiguration,
      );
      return ProductComponentConfigurationResolver.load(id, fieldInfo, ctx);
    },
  },

  ProductComponentGroup: {
    __resolveReference: async (
      reference: { __typename: "ProductComponentGroup"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const id = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.ProductComponentGroup,
      );
      return ProductComponentGroupResolver.load(id, fieldInfo, ctx);
    },
  },

  ProductComponentItem: {
    __resolveReference: async (
      reference: { __typename: "ProductComponentItem"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const id = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.ProductComponentItem,
      );
      return ProductComponentItemResolver.load(id, fieldInfo, ctx);
    },
  },

  ProductComponentItemOptionSelection: {
    __resolveReference: async (
      reference: {
        __typename: "ProductComponentItemOptionSelection";
        id: string;
      },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const id = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.ProductComponentItemOptionSelection,
      );
      return ProductComponentItemOptionSelectionResolver.load(
        id,
        fieldInfo,
        ctx,
      );
    },
  },

  ProductComponentItemOptionValueSelection: {
    __resolveReference: async (
      reference: {
        __typename: "ProductComponentItemOptionValueSelection";
        id: string;
      },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const fieldInfo = parseGraphqlInfo(info);
      const id = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.ProductComponentItemOptionValueSelection,
      );
      return ProductComponentItemOptionValueSelectionResolver.load(
        id,
        fieldInfo,
        ctx,
      );
    },
  },

  ProductComponentBasePriceRule: {
    __resolveReference: (
      reference: { __typename: "ProductComponentBasePriceRule"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      ProductComponentBasePriceRuleResolver.load(
        decodeGlobalIdByType(
          reference.id,
          GlobalIdEntity.ProductComponentPriceRule,
        ),
        parseGraphqlInfo(info),
        ctx,
      ),
  },

  ProductComponentAdjustmentPriceRule: {
    __resolveReference: (
      reference: {
        __typename: "ProductComponentAdjustmentPriceRule";
        id: string;
      },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      ProductComponentAdjustmentPriceRuleResolver.load(
        decodeGlobalIdByType(
          reference.id,
          GlobalIdEntity.ProductComponentPriceRule,
        ),
        parseGraphqlInfo(info),
        ctx,
      ),
  },

  ProductComponentOverridePriceRule: {
    __resolveReference: (
      reference: {
        __typename: "ProductComponentOverridePriceRule";
        id: string;
      },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      ProductComponentOverridePriceRuleResolver.load(
        decodeGlobalIdByType(
          reference.id,
          GlobalIdEntity.ProductComponentPriceRule,
        ),
        parseGraphqlInfo(info),
        ctx,
      ),
  },

  ProductComponentFreePriceRule: {
    __resolveReference: (
      reference: { __typename: "ProductComponentFreePriceRule"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) =>
      ProductComponentFreePriceRuleResolver.load(
        decodeGlobalIdByType(
          reference.id,
          GlobalIdEntity.ProductComponentPriceRule,
        ),
        parseGraphqlInfo(info),
        ctx,
      ),
  },

  ProductComponentPricingTemplate: {
    __resolveReference: async (
      reference: { __typename: "ProductComponentPricingTemplate"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const id = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.ProductComponentPricingTemplate,
      );
      return ProductComponentPricingTemplateResolver.load(
        id,
        parseGraphqlInfo(info),
        ctx,
      );
    },
  },

  ProductComponentDependencyRule: {
    __resolveReference: async (
      reference: { __typename: "ProductComponentDependencyRule"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const id = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.ProductComponentDependencyRule,
      );
      return ProductComponentDependencyRuleResolver.load(
        id,
        parseGraphqlInfo(info),
        ctx,
      );
    },
  },

  ProductComponentConditionGroup: {
    __resolveReference: async (
      reference: { __typename: "ProductComponentConditionGroup"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const id = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.ProductComponentConditionGroup,
      );
      return ProductComponentConditionGroupResolver.load(
        id,
        parseGraphqlInfo(info),
        ctx,
      );
    },
  },

  ProductComponentCondition: {
    __resolveReference: async (
      reference: { __typename: "ProductComponentCondition"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const id = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.ProductComponentCondition,
      );
      return ProductComponentConditionResolver.load(
        id,
        parseGraphqlInfo(info),
        ctx,
      );
    },
  },

  ProductComponentDependencyAction: {
    __resolveReference: async (
      reference: { __typename: "ProductComponentDependencyAction"; id: string },
      ctx: ServiceContext,
      info: GraphQLResolveInfo,
    ) => {
      const id = decodeGlobalIdByType(
        reference.id,
        GlobalIdEntity.ProductComponentDependencyAction,
      );
      return ProductComponentDependencyActionResolver.load(
        id,
        parseGraphqlInfo(info),
        ctx,
      );
    },
  },
};
