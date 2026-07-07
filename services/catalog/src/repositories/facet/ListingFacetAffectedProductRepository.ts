import { and, asc, eq, gt, isNull } from "drizzle-orm";
import type { Catalog } from "@shopana/broker-types";
import { BaseRepository } from "../BaseRepository.js";
import {
  product,
  productFeature,
  productFeatureValue,
  productOption,
  productOptionValue,
  productOptionVariantLink,
  productTag,
  tag,
  variant,
} from "../models/index.js";

interface AffectedProductRefQuery {
  storeId: string;
  ref: Catalog.ListingFacetAffectedProductRef;
  afterProductId?: string;
  limit: number;
}

export class ListingFacetAffectedProductRepository extends BaseRepository {
  async findListingFacetAffectedProducts(
    params: Catalog.FindListingFacetAffectedProductsParams
  ): Promise<Catalog.FindListingFacetAffectedProductsResult> {
    const refs = normalizeAffectedProductRefs(params.refs);
    const limit = normalizeLimit(params.limit);
    if (refs.length === 0) {
      return { productIds: [] };
    }

    const pageLimit = limit + 1;
    const productIds = new Set<string>();
    for (const ref of refs) {
      const rows = await this.findAffectedProductIdsForRef({
        storeId: params.storeId,
        ref,
        afterProductId: params.afterProductId,
        limit: pageLimit,
      });
      for (const productId of rows) {
        productIds.add(productId);
      }
    }

    const pageWithLookahead = [...productIds].sort().slice(0, pageLimit);
    const pageProductIds = pageWithLookahead.slice(0, limit);

    return {
      productIds: pageProductIds,
      nextCursor:
        pageWithLookahead.length > limit
          ? pageProductIds[pageProductIds.length - 1]
          : undefined,
    };
  }

  private async findAffectedProductIdsForRef(
    params: AffectedProductRefQuery
  ): Promise<string[]> {
    if (params.ref.facetType === "TAG") {
      return this.findTagAffectedProductIds(params);
    }

    if (params.ref.facetType === "FEATURE") {
      return this.findFeatureAffectedProductIds(params);
    }

    return this.findOptionAffectedProductIds(params);
  }

  private async findTagAffectedProductIds(
    params: AffectedProductRefQuery
  ): Promise<string[]> {
    const predicates = baseProductPredicates(params.storeId, params.afterProductId);
    if (params.ref.sourceValueHandle) {
      predicates.push(eq(tag.handle, params.ref.sourceValueHandle));
    }

    const rows = await this.connection
      .selectDistinct({ productId: product.id })
      .from(product)
      .innerJoin(
        productTag,
        and(
          eq(productTag.productId, product.id),
          eq(productTag.storeId, product.storeId)
        )
      )
      .innerJoin(
        tag,
        and(eq(tag.id, productTag.tagId), eq(tag.storeId, product.storeId))
      )
      .where(and(...predicates))
      .orderBy(asc(product.id))
      .limit(params.limit);

    return rows.map((row) => row.productId);
  }

  private async findFeatureAffectedProductIds(
    params: AffectedProductRefQuery
  ): Promise<string[]> {
    const predicates = [
      ...baseProductPredicates(params.storeId, params.afterProductId),
      eq(productFeature.slug, params.ref.sourceHandle),
      eq(productFeature.isGroup, false),
    ];
    const valueHandle = sourceValueHandleTail(
      params.ref.sourceHandle,
      params.ref.sourceValueHandle
    );
    if (valueHandle) {
      predicates.push(eq(productFeatureValue.slug, valueHandle));
    }

    const rows = await this.connection
      .selectDistinct({ productId: product.id })
      .from(product)
      .innerJoin(
        productFeature,
        and(
          eq(productFeature.productId, product.id),
          eq(productFeature.storeId, product.storeId)
        )
      )
      .innerJoin(
        productFeatureValue,
        and(
          eq(productFeatureValue.featureId, productFeature.id),
          eq(productFeatureValue.storeId, product.storeId)
        )
      )
      .where(and(...predicates))
      .orderBy(asc(product.id))
      .limit(params.limit);

    return rows.map((row) => row.productId);
  }

  private async findOptionAffectedProductIds(
    params: AffectedProductRefQuery
  ): Promise<string[]> {
    const predicates = [
      ...baseProductPredicates(params.storeId, params.afterProductId),
      eq(productOption.slug, params.ref.sourceHandle),
      isNull(variant.deletedAt),
    ];
    const valueHandle = sourceValueHandleTail(
      params.ref.sourceHandle,
      params.ref.sourceValueHandle
    );
    if (valueHandle) {
      predicates.push(eq(productOptionValue.slug, valueHandle));
    }

    const rows = await this.connection
      .selectDistinct({ productId: product.id })
      .from(product)
      .innerJoin(
        productOption,
        and(
          eq(productOption.productId, product.id),
          eq(productOption.storeId, product.storeId)
        )
      )
      .innerJoin(
        productOptionVariantLink,
        and(
          eq(productOptionVariantLink.optionId, productOption.id),
          eq(productOptionVariantLink.storeId, product.storeId)
        )
      )
      .innerJoin(
        variant,
        and(
          eq(variant.id, productOptionVariantLink.variantId),
          eq(variant.storeId, product.storeId)
        )
      )
      .innerJoin(
        productOptionValue,
        and(
          eq(productOptionValue.id, productOptionVariantLink.optionValueId),
          eq(productOptionValue.storeId, product.storeId)
        )
      )
      .where(and(...predicates))
      .orderBy(asc(product.id))
      .limit(params.limit);

    return rows.map((row) => row.productId);
  }
}

function normalizeLimit(limit?: number): number {
  if (!Number.isInteger(limit) || limit === undefined) return 100;
  return Math.min(Math.max(limit, 1), 500);
}

function normalizeAffectedProductRefs(
  refs: readonly Catalog.ListingFacetAffectedProductRef[]
): Catalog.ListingFacetAffectedProductRef[] {
  const normalized = new Map<string, Catalog.ListingFacetAffectedProductRef>();
  for (const ref of refs) {
    const facetType = ref.facetType;
    const sourceHandle = ref.sourceHandle.trim();
    const sourceValueHandle = ref.sourceValueHandle?.trim();
    if (!sourceHandle) continue;
    if (facetType !== "TAG" && facetType !== "FEATURE" && facetType !== "OPTION") {
      continue;
    }
    const value = {
      facetType,
      sourceHandle,
      ...(sourceValueHandle ? { sourceValueHandle } : {}),
    };
    normalized.set(
      `${value.facetType}\0${value.sourceHandle}\0${value.sourceValueHandle ?? ""}`,
      value
    );
  }
  return [...normalized.values()];
}

function baseProductPredicates(storeId: string, afterProductId?: string) {
  return [
    eq(product.storeId, storeId),
    isNull(product.deletedAt),
    ...(afterProductId ? [gt(product.id, afterProductId)] : []),
  ];
}

function sourceValueHandleTail(
  sourceHandle: string,
  sourceValueHandle?: string
): string | null {
  const handle = sourceValueHandle?.trim();
  if (!handle) return null;
  const prefix = `${sourceHandle}:`;
  return handle.startsWith(prefix) ? handle.slice(prefix.length) : handle;
}
