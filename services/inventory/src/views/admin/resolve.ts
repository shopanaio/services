import type { GraphQLResolveInfo } from "graphql";
import { parseGraphQLInfoDeep, executor } from "@shopana/type-executor";
import type { ViewContext } from "./context.js";
import { ProductView } from "./ProductView.js";
import { VariantView } from "./VariantView.js";

/**
 * Resolve a product by ID from GraphQL query
 */
export function resolveProduct(
  id: string,
  info: GraphQLResolveInfo,
  ctx: ViewContext
): Promise<Record<string, unknown>> {
  const fieldArgs = parseGraphQLInfoDeep(info, ProductView);
  return executor.resolve(ProductView, id, fieldArgs, ctx);
}

/**
 * Resolve multiple products by IDs from GraphQL query
 */
export function resolveProducts(
  ids: string[],
  info: GraphQLResolveInfo,
  ctx: ViewContext
): Promise<Record<string, unknown>[]> {
  const fieldArgs = parseGraphQLInfoDeep(info, ProductView);
  return executor.resolveMany(ProductView, ids, fieldArgs, ctx);
}

/**
 * Resolve a variant by ID from GraphQL query
 */
export function resolveVariant(
  id: string,
  info: GraphQLResolveInfo,
  ctx: ViewContext
): Promise<Record<string, unknown>> {
  const fieldArgs = parseGraphQLInfoDeep(info, VariantView);
  return executor.resolve(VariantView, id, fieldArgs, ctx);
}

/**
 * Resolve multiple variants by IDs from GraphQL query
 */
export function resolveVariants(
  ids: string[],
  info: GraphQLResolveInfo,
  ctx: ViewContext
): Promise<Record<string, unknown>[]> {
  const fieldArgs = parseGraphQLInfoDeep(info, VariantView);
  return executor.resolveMany(VariantView, ids, fieldArgs, ctx);
}
