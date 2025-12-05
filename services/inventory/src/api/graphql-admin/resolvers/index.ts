import type { Resolvers, ProductCreateInput } from "../generated/types.js";
import { randomUUID } from "crypto";

// TODO: Use DataLoader for batching and caching database queries to avoid N+1 problem
// Create loaders in context (server.ts) and access via ctx.loaders
// Example:
//   const productLoader = new DataLoader((ids) => batchGetProducts(ids));
//   const variantLoader = new DataLoader((ids) => batchGetVariants(ids));
//   const variantsByProductLoader = new DataLoader((productIds) => batchGetVariantsByProductIds(productIds));

// TODO: Use @upstash/redis for caching complete Product and Variant objects
// Products and Variants should be cached as complete JSON objects in Redis
// Cache keys: product:{id}, variant:{id}
// Invalidate cache on mutations (create, update, delete)

// In-memory storage for dummy products (for testing purposes)
const dummyProducts = new Map<string, DummyProduct>();
const dummyVariants = new Map<string, DummyVariant>();

interface DummyProduct {
  id: string;
  title: string;
  description: { text: string; html: string; json: Record<string, unknown> } | null;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface DummyVariant {
  id: string;
  productId: string;
  title: string | null;
  sku: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function createDummyProduct(input: ProductCreateInput): DummyProduct {
  const now = new Date();
  return {
    id: randomUUID(),
    title: input.title,
    description: input.description ?? null,
    excerpt: input.excerpt ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    isPublished: input.publish ?? false,
    publishedAt: input.publish ? now : null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

function createDummyVariant(productId: string, input?: { title?: string | null; sku?: string | null }): DummyVariant {
  const now = new Date();
  return {
    id: randomUUID(),
    productId,
    title: input?.title ?? null,
    sku: input?.sku ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export const resolvers: Resolvers = {
  Query: {
    inventoryQuery: () => ({}),
  },

  Mutation: {
    inventoryMutation: () => ({}),
  },

  InventoryQuery: {
    node: async (_parent, { id }, _ctx) => {
      // Check products first
      const product = dummyProducts.get(id);
      if (product) return product;

      // Check variants
      const variant = dummyVariants.get(id);
      if (variant) return variant;

      return null;
    },
    nodes: async (_parent, { ids }, _ctx) => {
      return ids.map(id => {
        const product = dummyProducts.get(id);
        if (product) return product;
        const variant = dummyVariants.get(id);
        if (variant) return variant;
        return null;
      });
    },
    product: async (_parent, { id }, _ctx) => {
      return dummyProducts.get(id) ?? null;
    },
    products: async (_parent, args, _ctx) => {
      const products = Array.from(dummyProducts.values()).filter(p => !p.deletedAt);
      const first = args.first ?? 10;
      const edges = products.slice(0, first).map(product => ({
        node: product,
        cursor: Buffer.from(product.id).toString("base64"),
      }));
      return {
        edges,
        pageInfo: {
          hasNextPage: products.length > first,
          hasPreviousPage: false,
          startCursor: edges[0]?.cursor ?? null,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
        totalCount: products.length,
      };
    },
    variant: async (_parent, { id }, _ctx) => {
      return dummyVariants.get(id) ?? null;
    },
    variants: async (_parent, args, _ctx) => {
      const variants = Array.from(dummyVariants.values());
      const first = args.first ?? 10;
      const edges = variants.slice(0, first).map(variant => ({
        node: variant,
        cursor: Buffer.from(variant.id).toString("base64"),
      }));
      return {
        edges,
        pageInfo: {
          hasNextPage: variants.length > first,
          hasPreviousPage: false,
          startCursor: edges[0]?.cursor ?? null,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
        totalCount: variants.length,
      };
    },
    warehouse: async (_parent, { id }, _ctx) => {
      throw new Error("Not implemented");
    },
    warehouses: async (_parent, args, _ctx) => {
      throw new Error("Not implemented");
    },
  },

  InventoryMutation: {
    productCreate: async (_parent, { input }, _ctx) => {
      const product = createDummyProduct(input);
      dummyProducts.set(product.id, product);

      // Create default variant if variants provided or create one empty
      const variantInputs = input.variants ?? [{}];
      for (const variantInput of variantInputs) {
        const variant = createDummyVariant(product.id, variantInput);
        dummyVariants.set(variant.id, variant);
      }

      return {
        product,
        userErrors: [],
      };
    },
    productUpdate: async (_parent, { input }, _ctx) => {
      const product = dummyProducts.get(input.id);
      if (!product) {
        return {
          product: null,
          userErrors: [{ field: ["id"], message: "Product not found", code: "NOT_FOUND" }],
        };
      }

      if (input.title) product.title = input.title;
      if (input.description) product.description = input.description;
      if (input.excerpt !== undefined) product.excerpt = input.excerpt;
      if (input.seoTitle !== undefined) product.seoTitle = input.seoTitle;
      if (input.seoDescription !== undefined) product.seoDescription = input.seoDescription;
      product.updatedAt = new Date();

      return {
        product,
        userErrors: [],
      };
    },
    productDelete: async (_parent, { input }, _ctx) => {
      const product = dummyProducts.get(input.id);
      if (!product) {
        return {
          deletedProductId: null,
          userErrors: [{ field: ["id"], message: "Product not found", code: "NOT_FOUND" }],
        };
      }

      if (input.permanent) {
        dummyProducts.delete(input.id);
        // Delete associated variants
        for (const [variantId, variant] of dummyVariants) {
          if (variant.productId === input.id) {
            dummyVariants.delete(variantId);
          }
        }
      } else {
        product.deletedAt = new Date();
        product.updatedAt = new Date();
      }

      return {
        deletedProductId: input.id,
        userErrors: [],
      };
    },
    productPublish: async (_parent, { input }, _ctx) => {
      const product = dummyProducts.get(input.id);
      if (!product) {
        return {
          product: null,
          userErrors: [{ field: ["id"], message: "Product not found", code: "NOT_FOUND" }],
        };
      }

      product.isPublished = true;
      product.publishedAt = new Date();
      product.updatedAt = new Date();

      return {
        product,
        userErrors: [],
      };
    },
    productUnpublish: async (_parent, { input }, _ctx) => {
      const product = dummyProducts.get(input.id);
      if (!product) {
        return {
          product: null,
          userErrors: [{ field: ["id"], message: "Product not found", code: "NOT_FOUND" }],
        };
      }

      product.isPublished = false;
      product.publishedAt = null;
      product.updatedAt = new Date();

      return {
        product,
        userErrors: [],
      };
    },
    variantCreate: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    variantDelete: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    variantSetSku: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    variantSetDimensions: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    variantSetWeight: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    variantSetPricing: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    variantSetCost: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    productOptionCreate: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    productOptionUpdate: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    productOptionDelete: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    productFeatureCreate: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    productFeatureUpdate: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    productFeatureDelete: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    warehouseCreate: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    warehouseUpdate: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    warehouseDelete: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    variantSetStock: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
    variantSetMedia: async (_parent, { input }, _ctx) => {
      throw new Error("Not implemented");
    },
  },

  // Federation entities
  Product: {
    __resolveReference: async (reference, _ctx) => {
      return dummyProducts.get(reference.id) ?? null;
    },
    variants: async (parent, args, _ctx) => {
      const productId = (parent as DummyProduct).id;
      const variants = Array.from(dummyVariants.values()).filter(v => v.productId === productId);
      const first = args.first ?? 10;
      const edges = variants.slice(0, first).map(variant => ({
        node: variant,
        cursor: Buffer.from(variant.id).toString("base64"),
      }));
      return {
        edges,
        pageInfo: {
          hasNextPage: variants.length > first,
          hasPreviousPage: false,
          startCursor: edges[0]?.cursor ?? null,
          endCursor: edges[edges.length - 1]?.cursor ?? null,
        },
        totalCount: variants.length,
      };
    },
    options: async (_parent, _args, _ctx) => {
      return []; // No options for dummy products
    },
    features: async (_parent, _args, _ctx) => {
      return []; // No features for dummy products
    },
    variantsCount: async (parent, _args, _ctx) => {
      const productId = (parent as DummyProduct).id;
      return Array.from(dummyVariants.values()).filter(v => v.productId === productId).length;
    },
  },

  Variant: {
    __resolveReference: async (reference, _ctx) => {
      return dummyVariants.get(reference.id) ?? null;
    },
    product: async (parent, _args, _ctx) => {
      const productId = (parent as DummyVariant).productId;
      return dummyProducts.get(productId) ?? null;
    },
    price: async (_parent, _args, _ctx) => {
      return null; // No price for dummy variants
    },
    priceHistory: async (_parent, _args, _ctx) => {
      return {
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
        totalCount: 0,
      };
    },
    cost: async (_parent, _args, _ctx) => {
      return null; // No cost for dummy variants
    },
    costHistory: async (_parent, _args, _ctx) => {
      return {
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
        totalCount: 0,
      };
    },
    selectedOptions: async (_parent, _args, _ctx) => {
      return []; // No selected options for dummy variants
    },
    stock: async (_parent, _args, _ctx) => {
      return []; // No stock for dummy variants
    },
    inStock: async (_parent, _args, _ctx) => {
      return false; // Dummy variants not in stock
    },
    media: async (_parent, _args, _ctx) => {
      return []; // No media for dummy variants
    },
  },

  // Nested types with relations
  ProductOption: {
    values: async (parent, _args, _ctx) => {
      throw new Error("Not implemented");
    },
  },

  ProductOptionValue: {
    swatch: async (parent, _args, _ctx) => {
      throw new Error("Not implemented");
    },
  },

  ProductOptionSwatch: {
    file: async (parent, _args, _ctx) => {
      throw new Error("Not implemented");
    },
  },

  ProductFeature: {
    values: async (parent, _args, _ctx) => {
      throw new Error("Not implemented");
    },
  },

  Warehouse: {
    stock: async (parent, args, _ctx) => {
      throw new Error("Not implemented");
    },
    variantsCount: async (parent, _args, _ctx) => {
      throw new Error("Not implemented");
    },
  },

  WarehouseStock: {
    warehouse: async (parent, _args, _ctx) => {
      throw new Error("Not implemented");
    },
    variant: async (parent, _args, _ctx) => {
      throw new Error("Not implemented");
    },
  },

  // Interface resolvers
  Node: {
    __resolveType: (obj: Record<string, unknown>) => {
      if ("variants" in obj) return "Product";
      if ("productId" in obj) return "Variant";
      if ("displayType" in obj) return "ProductOption";
      if ("swatchType" in obj) return "ProductOptionSwatch";
      if ("quantityOnHand" in obj) return "WarehouseStock";
      if ("code" in obj) return "Warehouse";
      if ("amountMinor" in obj) return "VariantPrice";
      if ("unitCostMinor" in obj) return "VariantCost";
      return null;
    },
  },

  UserError: {
    __resolveType: () => "GenericUserError",
  },
};
