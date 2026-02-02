import { eq, and, inArray } from "drizzle-orm";
import type { Database } from "../../../infrastructure/db/database.js";
import {
  productOptionVariantLink,
  productOptionValue,
  productOption,
} from "../../../repositories/models/index.js";

/**
 * Builds a variant handle from its linked option values.
 *
 * Handle format: sorted option value slugs joined by "-"
 * Example: For a variant with options {Color: "red", Size: "large"}
 *          Handle would be "large-red" (alphabetically sorted)
 *
 * @param db - Database connection (may be transaction)
 * @param variantId - Variant ID to build handle for
 * @param projectId - Project ID for filtering
 * @returns Handle string, or empty string if no options linked
 */
export async function buildVariantHandle(
  db: Database,
  variantId: string,
  projectId: string
): Promise<string> {
  // Get all option-value links for this variant
  const links = await db
    .select({
      optionId: productOptionVariantLink.optionId,
      optionValueId: productOptionVariantLink.optionValueId,
    })
    .from(productOptionVariantLink)
    .where(
      and(
        eq(productOptionVariantLink.projectId, projectId),
        eq(productOptionVariantLink.variantId, variantId)
      )
    );

  if (links.length === 0) {
    return "";
  }

  // Get value IDs that are not null
  const valueIds = links
    .map((l) => l.optionValueId)
    .filter((id): id is string => id !== null);

  if (valueIds.length === 0) {
    return "";
  }

  // Get the slugs for each value
  const values = await db
    .select({
      id: productOptionValue.id,
      slug: productOptionValue.slug,
    })
    .from(productOptionValue)
    .where(
      and(
        eq(productOptionValue.projectId, projectId),
        inArray(productOptionValue.id, valueIds)
      )
    );

  // Sort slugs alphabetically and join
  const slugs = values.map((v) => v.slug).sort();
  return slugs.join("-");
}

/**
 * Builds a variant handle from a list of option value links.
 * This is useful when you already have the links and values loaded.
 *
 * @param links - Array of {optionId, optionValueId} pairs
 * @param valueMap - Map of optionValueId to slug
 * @returns Handle string, or empty string if no options
 */
export function buildVariantHandleFromValues(
  links: Array<{ optionId: string; optionValueId: string | null }>,
  valueMap: Map<string, string>
): string {
  const slugs: string[] = [];

  for (const link of links) {
    if (link.optionValueId !== null) {
      const slug = valueMap.get(link.optionValueId);
      if (slug) {
        slugs.push(slug);
      }
    }
  }

  return slugs.sort().join("-");
}

/**
 * Builds handles for multiple variants in a batch.
 * More efficient than calling buildVariantHandle for each variant.
 *
 * @param db - Database connection (may be transaction)
 * @param variantIds - Variant IDs to build handles for
 * @param projectId - Project ID for filtering
 * @returns Map of variantId to handle
 */
export async function buildVariantHandlesBatch(
  db: Database,
  variantIds: string[],
  projectId: string
): Promise<Map<string, string>> {
  if (variantIds.length === 0) {
    return new Map();
  }

  // Get all option-value links for these variants
  const links = await db
    .select({
      variantId: productOptionVariantLink.variantId,
      optionId: productOptionVariantLink.optionId,
      optionValueId: productOptionVariantLink.optionValueId,
    })
    .from(productOptionVariantLink)
    .where(
      and(
        eq(productOptionVariantLink.projectId, projectId),
        inArray(productOptionVariantLink.variantId, variantIds)
      )
    );

  // Collect all value IDs
  const allValueIds = links
    .map((l) => l.optionValueId)
    .filter((id): id is string => id !== null);

  // Get slugs for all values in one query
  const values =
    allValueIds.length > 0
      ? await db
          .select({
            id: productOptionValue.id,
            slug: productOptionValue.slug,
          })
          .from(productOptionValue)
          .where(
            and(
              eq(productOptionValue.projectId, projectId),
              inArray(productOptionValue.id, allValueIds)
            )
          )
      : [];

  // Build value ID to slug map
  const slugMap = new Map<string, string>();
  for (const v of values) {
    slugMap.set(v.id, v.slug);
  }

  // Group links by variant
  const linksByVariant = new Map<
    string,
    Array<{ optionId: string; optionValueId: string | null }>
  >();
  for (const link of links) {
    const existing = linksByVariant.get(link.variantId) ?? [];
    existing.push({ optionId: link.optionId, optionValueId: link.optionValueId });
    linksByVariant.set(link.variantId, existing);
  }

  // Build handles for each variant
  const result = new Map<string, string>();
  for (const variantId of variantIds) {
    const variantLinks = linksByVariant.get(variantId) ?? [];
    const handle = buildVariantHandleFromValues(variantLinks, slugMap);
    result.set(variantId, handle);
  }

  return result;
}
