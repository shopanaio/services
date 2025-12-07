import type { Resolvers } from "../../generated/types.js";
import type { GraphQLContext } from "../../server.js";
import { dummyVariants } from "../dummy.js";
import { requireKernel } from "../utils.js";

export const productTypeResolvers: Resolvers = {
  Product: {
    __resolveReference: async (reference, ctx: GraphQLContext) => {
      const kernel = requireKernel(ctx);
      return kernel.services.repository.productQuery.getOne(reference.id);
    },

    // Return title from parent if available, otherwise empty string
    // TODO: Load from translations table when implemented
    title: (parent) => {
      return (parent as any).title ?? "";
    },

    isPublished: (parent) => {
      return (parent as any).publishedAt != null;
    },

    variants: async (parent, args) => {
      const productId = (parent as { id: string }).id;

      // Use _variants from productCreate script if available, else fallback to dummy
      const parentWithVariants = parent as any;
      const variants = parentWithVariants._variants
        ? parentWithVariants._variants
        : Array.from(dummyVariants.values()).filter((v) => v.productId === productId);

      const first = args.first ?? 10;
      const edges = variants.slice(0, first).map((variant: any) => ({
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

    options: async () => {
      return [];
    },

    features: async () => {
      return [];
    },

    variantsCount: async (parent) => {
      const parentWithVariants = parent as any;
      if (parentWithVariants._variants) {
        return parentWithVariants._variants.length;
      }
      const productId = (parent as { id: string }).id;
      return Array.from(dummyVariants.values()).filter(
        (v) => v.productId === productId
      ).length;
    },
  },
};
