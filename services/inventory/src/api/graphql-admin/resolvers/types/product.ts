import type { GraphQLResolveInfo } from "graphql";
import type { Resolvers } from "../../generated/types.js";
import type { GraphQLContext } from "../../server.js";
import { requireKernel } from "../utils.js";
import { parseGraphQLInfoDeep } from "../graphqlArgsParser.js";
import { ProductView } from "../../../../views/admin/index.js";
import type { ProductFieldArgs } from "../../../../repositories/ProductTypeRepository.js";

/**
 * Symbol to mark a product as already resolved by executor
 * When this is present, field resolvers just return parent properties
 */
const RESOLVED_BY_EXECUTOR = Symbol.for("resolvedByExecutor");

/**
 * Checks if product was already resolved by executor
 */
function isResolvedByExecutor(parent: unknown): parent is Record<string, unknown> {
  return (
    typeof parent === "object" &&
    parent !== null &&
    RESOLVED_BY_EXECUTOR in parent
  );
}

/**
 * Resolves product using executor with GraphQL field arguments
 */
async function resolveProductWithExecutor(
  productId: string,
  ctx: GraphQLContext,
  info: GraphQLResolveInfo
): Promise<Record<string, unknown> | null> {
  const kernel = requireKernel(ctx);
  const services = kernel.getServices();

  // Parse GraphQL selection set to get field arguments tree
  const fieldArgs = parseGraphQLInfoDeep(info, ProductView) as ProductFieldArgs;

  // Resolve using executor with arguments
  const resolved = await services.repository.productType.resolveById(productId, {
    fieldArgs,
  });

  if (!resolved) return null;

  // Mark as resolved by executor so field resolvers just pass through
  return {
    ...resolved,
    [RESOLVED_BY_EXECUTOR]: true,
  };
}

/**
 * Wraps variant connection in Relay-style pagination format
 */
function wrapVariantsConnection(
  variants: unknown[],
  args: { first?: number | null }
): {
  edges: Array<{ node: unknown; cursor: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
} {
  const first = args.first ?? 10;
  const hasNextPage = variants.length > first;
  const resultVariants = hasNextPage ? variants.slice(0, first) : variants;

  const edges = resultVariants.map((variant: unknown) => {
    const v = variant as { id: string };
    return {
      node: variant,
      cursor: Buffer.from(v.id).toString("base64"),
    };
  });

  return {
    edges,
    pageInfo: {
      hasNextPage,
      hasPreviousPage: false,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
    },
    totalCount: variants.length,
  };
}

export const productTypeResolvers: Resolvers = {
  Product: {
    /**
     * Federation reference resolver - resolves Product by ID
     * Uses executor to resolve all requested fields in a single call
     */
    __resolveReference: async (reference, ctx: GraphQLContext, info) => {
      return resolveProductWithExecutor(reference.id, ctx, info);
    },

    /**
     * Product ID - always available from parent
     */
    id: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return parent.id as string;
      }
      return (parent as { id: string }).id;
    },

    /**
     * Product handle
     */
    handle: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return (parent.handle as string) ?? null;
      }
      return (parent as { handle?: string }).handle ?? null;
    },

    /**
     * Product title from translations
     */
    title: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return (parent.title as string) ?? "";
      }
      return (parent as { title?: string }).title ?? "";
    },

    /**
     * Product description in multiple formats
     */
    description: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return parent.description as { text: string; html: string; json: unknown } | null;
      }
      return null;
    },

    /**
     * Short excerpt
     */
    excerpt: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return (parent.excerpt as string) ?? null;
      }
      return null;
    },

    /**
     * SEO title
     */
    seoTitle: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return (parent.seoTitle as string) ?? null;
      }
      return null;
    },

    /**
     * SEO description
     */
    seoDescription: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return (parent.seoDescription as string) ?? null;
      }
      return null;
    },

    /**
     * Published date
     */
    publishedAt: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return parent.publishedAt as Date | null;
      }
      return (parent as { publishedAt?: Date }).publishedAt ?? null;
    },

    /**
     * Whether product is published
     */
    isPublished: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return (parent.isPublished as boolean) ?? false;
      }
      return (parent as { publishedAt?: Date }).publishedAt != null;
    },

    /**
     * Created date
     */
    createdAt: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return parent.createdAt as Date;
      }
      return (parent as { createdAt: Date }).createdAt;
    },

    /**
     * Updated date
     */
    updatedAt: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return parent.updatedAt as Date;
      }
      return (parent as { updatedAt: Date }).updatedAt;
    },

    /**
     * Deleted date (soft delete)
     */
    deletedAt: (parent) => {
      if (isResolvedByExecutor(parent)) {
        return parent.deletedAt as Date | null;
      }
      return (parent as { deletedAt?: Date }).deletedAt ?? null;
    },

    /**
     * Product variants with pagination
     * When resolved by executor, variants are already loaded
     * Otherwise, queries from database
     */
    variants: async (parent, args, ctx: GraphQLContext) => {
      // If resolved by executor, variants are already in parent as an array
      if (isResolvedByExecutor(parent) && parent.variants) {
        const variants = parent.variants as unknown as unknown[];
        return wrapVariantsConnection(variants, args);
      }

      // Fallback: use _variants from mutation or query from DB
      const parentWithVariants = parent as { _variants?: unknown[]; id: string };
      if (parentWithVariants._variants) {
        return wrapVariantsConnection(parentWithVariants._variants, args);
      }

      // Query from database
      const kernel = requireKernel(ctx);
      const services = kernel.getServices();
      const productId = parentWithVariants.id;
      const first = args.first ?? 10;

      const variants = await services.repository.variantQuery.getByProductId(
        productId,
        { limit: first + 1 }
      );

      return wrapVariantsConnection(variants, args);
    },

    /**
     * Product options
     */
    options: async (parent) => {
      if (isResolvedByExecutor(parent) && parent.options) {
        return parent.options as unknown[];
      }
      return [];
    },

    /**
     * Product features
     */
    features: async (parent) => {
      if (isResolvedByExecutor(parent) && parent.features) {
        return parent.features as unknown[];
      }
      return [];
    },

    /**
     * Total variants count
     */
    variantsCount: async (parent, _args, ctx: GraphQLContext) => {
      if (isResolvedByExecutor(parent) && parent.variants) {
        return (parent.variants as unknown as unknown[]).length;
      }

      const parentWithVariants = parent as { _variants?: unknown[]; id: string };
      if (parentWithVariants._variants) {
        return parentWithVariants._variants.length;
      }

      const kernel = requireKernel(ctx);
      const services = kernel.getServices();
      return services.repository.variantQuery.countByProductId(parentWithVariants.id);
    },
  },
};
