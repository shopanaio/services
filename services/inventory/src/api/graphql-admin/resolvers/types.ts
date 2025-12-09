import type { GraphQLResolveInfo } from "graphql";
import type { Resolvers } from "../generated/types.js";
import type { GraphQLContext } from "../server.js";
import { requireKernel } from "./utils.js";
import { parseGraphQLInfoDeep } from "@shopana/type-executor/graphql";
import { ProductView, VariantView } from "../../../views/admin/index.js";
import type {
  ProductFieldArgs,
  VariantFieldArgs,
} from "../../../repositories/ProductTypeRepository.js";

/**
 * Resolves product using executor with GraphQL field arguments
 */
async function resolveProductWithExecutor(
  productId: string,
  ctx: GraphQLContext,
  info: GraphQLResolveInfo
) {
  const kernel = requireKernel(ctx);
  const services = kernel.getServices();

  const fieldArgs = parseGraphQLInfoDeep(info, ProductView) as ProductFieldArgs;

  const resolved = await services.repository.productType.resolveById(productId, {
    fieldArgs,
  });

  return resolved ?? null;
}

/**
 * Resolves variant using executor with GraphQL field arguments
 */
async function resolveVariantWithExecutor(
  variantId: string,
  ctx: GraphQLContext,
  info: GraphQLResolveInfo
) {
  const kernel = requireKernel(ctx);
  const services = kernel.getServices();

  const fieldArgs = parseGraphQLInfoDeep(info, VariantView) as VariantFieldArgs;

  const resolved = await services.repository.productType.resolveVariantById(
    variantId,
    { fieldArgs }
  );

  return resolved ?? null;
}

/**
 * Resolves warehouse by ID
 */
async function resolveWarehouseById(warehouseId: string, ctx: GraphQLContext) {
  const kernel = requireKernel(ctx);
  const services = kernel.getServices();
  return services.repository.warehouse.findById(warehouseId);
}

export const typeResolvers: Resolvers = {
  // Interface resolvers
  Node: {
    __resolveType: (obj: unknown) => {
      const record = obj as Record<string, unknown>;
      if ("variants" in record) return "Product";
      if ("productId" in record) return "Variant";
      if ("displayType" in record) return "ProductOption";
      if ("swatchType" in record) return "ProductOptionSwatch";
      if ("quantityOnHand" in record) return "WarehouseStock";
      if ("code" in record) return "Warehouse";
      if ("amountMinor" in record) return "VariantPrice";
      if ("unitCostMinor" in record) return "VariantCost";
      return null;
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },

  // Product resolvers
  Product: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __resolveReference: async (reference, ctx: GraphQLContext, info): Promise<any> => {
      return resolveProductWithExecutor(reference.id, ctx, info);
    },

    variants: (parent) => parent.variants,
  },

  // Variant resolvers
  Variant: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __resolveReference: async (reference, ctx: GraphQLContext, info): Promise<any> => {
      return resolveVariantWithExecutor(reference.id, ctx, info);
    },

    // Field resolvers that load data when parent only has id
    productId: async (parent, _, ctx, info) => {
      if ("productId" in parent && parent.productId) return parent.productId;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.productId ?? null;
    },
    isDefault: async (parent, _, ctx, info) => {
      if ("isDefault" in parent) return parent.isDefault;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.isDefault ?? false;
    },
    handle: async (parent, _, ctx, info) => {
      if ("handle" in parent && parent.handle) return parent.handle;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.handle ?? "";
    },
    sku: async (parent, _, ctx, info) => {
      if ("sku" in parent) return parent.sku;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.sku ?? null;
    },
    title: async (parent, _, ctx, info) => {
      if ("title" in parent) return parent.title;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.title ?? null;
    },
    dimensions: async (parent, _, ctx, info) => {
      if ("dimensions" in parent) return parent.dimensions;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.dimensions ?? null;
    },
    weight: async (parent, _, ctx, info) => {
      if ("weight" in parent) return parent.weight;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.weight ?? null;
    },
    price: async (parent, _, ctx, info) => {
      if ("price" in parent) return parent.price;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.price ?? null;
    },
    stock: async (parent, _, ctx, info) => {
      if ("stock" in parent) return parent.stock;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.stock ?? [];
    },
    inStock: async (parent, _, ctx, info) => {
      if ("inStock" in parent) return parent.inStock;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.inStock ?? false;
    },
    media: async (parent, _, ctx, info) => {
      if ("media" in parent) return parent.media;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.media ?? [];
    },
    selectedOptions: async (parent, _, ctx, info) => {
      if ("selectedOptions" in parent) return parent.selectedOptions;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.selectedOptions ?? [];
    },
    createdAt: async (parent, _, ctx, info) => {
      if ("createdAt" in parent && parent.createdAt) return parent.createdAt;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.createdAt;
    },
    updatedAt: async (parent, _, ctx, info) => {
      if ("updatedAt" in parent && parent.updatedAt) return parent.updatedAt;
      const variant = await resolveVariantWithExecutor(parent.id, ctx, info);
      return variant?.updatedAt;
    },
    priceHistory: (parent) => parent.priceHistory,
    costHistory: (parent) => parent.costHistory,
  },

  // Warehouse resolvers
  Warehouse: {
    __resolveReference: async (
      reference: { id: string },
      ctx: GraphQLContext
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<any> => {
      return resolveWarehouseById(reference.id, ctx);
    },
  },
};
