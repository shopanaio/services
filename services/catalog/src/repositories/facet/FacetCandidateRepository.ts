import { and, asc, eq, gt, inArray, isNull } from "drizzle-orm";
import type { Catalog } from "@shopana/broker-types";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import {
  facetFeatureValueCandidateView,
  facetOptionValueCandidateView,
  facetSourceCandidateView,
  facetTagValueCandidateView,
  product,
  productFeature,
  productFeatureValue,
  productOption,
  productOptionValue,
  productOptionVariantLink,
  productTag,
  tag,
  variant,
  type FacetFeatureValueCandidateView,
  type FacetOptionValueCandidateView,
  type FacetSourceCandidateView,
  type FacetTagValueCandidateView,
} from "../models/index.js";

const FACET_VALUE_CANDIDATE_TYPES = new Set(["TAG", "OPTION", "FEATURE"]);

export const facetSourceCandidateRelayQuery = createRelayQuery(
  createQuery(facetSourceCandidateView)
    .include(["id", "storeId", "locale", "facetType", "handle"])
    .maxLimit(100)
    .defaultLimit(30),
  { name: "facetSourceCandidate", tieBreaker: "id" }
);

export type FacetSourceCandidateRelayInput = InferRelayInput<
  typeof facetSourceCandidateRelayQuery
>;

export type FacetValueCandidateType = "TAG" | "OPTION" | "FEATURE";
export type FacetValueCandidateView =
  | FacetTagValueCandidateView
  | FacetOptionValueCandidateView
  | FacetFeatureValueCandidateView;

const createFacetValueCandidateRelayQuery = (
  view:
    | typeof facetTagValueCandidateView
    | typeof facetOptionValueCandidateView
    | typeof facetFeatureValueCandidateView
) =>
  createRelayQuery(
    createQuery(view)
      .include([
        "id",
        "storeId",
        "locale",
        "facetType",
        "sourceHandle",
        "handle",
        "label",
      ])
      .maxLimit(100)
      .defaultLimit(30),
    { name: "facetValueCandidate", tieBreaker: "id" }
  );

export const facetTagValueCandidateRelayQuery =
  createFacetValueCandidateRelayQuery(facetTagValueCandidateView);

export const facetOptionValueCandidateRelayQuery =
  createFacetValueCandidateRelayQuery(facetOptionValueCandidateView);

export const facetFeatureValueCandidateRelayQuery =
  createFacetValueCandidateRelayQuery(facetFeatureValueCandidateView);

export const facetValueCandidateRelayQueries = {
  TAG: facetTagValueCandidateRelayQuery,
  OPTION: facetOptionValueCandidateRelayQuery,
  FEATURE: facetFeatureValueCandidateRelayQuery,
} as const;

export type FacetValueCandidateRelayInput = InferRelayInput<
  typeof facetTagValueCandidateRelayQuery
>;

export interface FacetSourceCandidateConnectionResult {
  edges: Array<{ cursor: string; node: FacetSourceCandidateView }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface FacetValueCandidateConnectionResult {
  edges: Array<{ cursor: string; node: FacetValueCandidateView }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface FacetSourceCandidateQueryParams {
  storeId: string;
  locale: string;
  excludedSources?: FacetSourceCandidateRef[];
  input: FacetSourceCandidateRelayInput;
}

export interface FacetSourceCandidateRef {
  facetType: string;
  handle: string;
}

export interface FacetValueCandidateQueryParams {
  storeId: string;
  locale: string;
  candidateType: FacetValueCandidateType;
  sourceHandles: string[];
  existingSourceValueHandles?: string[];
  input: FacetValueCandidateRelayInput;
}

export interface FindFacetSourceCandidateByRefParams {
  storeId: string;
  locale: string;
  facetType: string;
  handle: string;
}

export interface FindFacetValueCandidatesByHandlesParams {
  storeId: string;
  locale: string;
  candidateType: FacetValueCandidateType;
  sourceHandles: string[];
  handles: string[];
}

export type FindListingFacetAffectedProductsParams =
  Catalog.FindListingFacetAffectedProductsParams;

export type FindListingFacetAffectedProductsResult =
  Catalog.FindListingFacetAffectedProductsResult;

export class FacetCandidateRepository {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>
  ) {}

  private get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  async getSourceCandidates(
    params: FacetSourceCandidateQueryParams
  ): Promise<FacetSourceCandidateConnectionResult> {
    const { where, orderBy, ...paginationArgs } = params.input;
    const excludedSources = normalizeSourceCandidateRefs(params.excludedSources);
    const mergedWhere: FacetSourceCandidateRelayInput["where"] = {
      _and: [
        { storeId: { _eq: params.storeId } },
        { locale: { _eq: params.locale } },
        ...excludedSources.map((source) => ({
          _not: {
            _and: [
              { facetType: { _eq: source.facetType } },
              { handle: { _eq: source.handle } },
            ],
          },
        })),
        ...(where ? [where] : []),
      ],
    };

    const input: FacetSourceCandidateRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "sourceSortBucket", direction: "asc" },
        { field: "sortName", direction: "asc", nulls: "last" },
        { field: "id", direction: "asc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      facetSourceCandidateRelayQuery.execute(this.connection, input),
      facetSourceCandidateRelayQuery.count(this.connection, { where: mergedWhere }),
    ]);

    return {
      edges: result.edges.map((edge) => ({ cursor: edge.cursor, node: edge.node })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  async getValueCandidates(
    params: FacetValueCandidateQueryParams
  ): Promise<FacetValueCandidateConnectionResult> {
    if (!isFacetValueCandidateType(params.candidateType)) {
      throw new Error("Invalid candidateType");
    }

    const sourceHandles = normalizeHandles(params.sourceHandles);
    if (sourceHandles.length === 0) {
      return emptyFacetValueCandidateConnection();
    }

    const { where, orderBy, ...paginationArgs } = params.input;
    const excludedHandles = normalizeHandles(params.existingSourceValueHandles);
    const mergedWhere: FacetValueCandidateRelayInput["where"] = {
      _and: [
        { storeId: { _eq: params.storeId } },
        { locale: { _eq: params.locale } },
        { facetType: { _eq: params.candidateType } },
        { sourceHandle: { _in: sourceHandles } },
        ...(excludedHandles.length ? [{ handle: { _notIn: excludedHandles } }] : []),
        ...(where ? [where] : []),
      ],
    };

    const input: FacetValueCandidateRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "label", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    };

    const relayQuery = facetValueCandidateRelayQueries[
      params.candidateType
    ] as typeof facetTagValueCandidateRelayQuery;

    const [result, totalCount] = await Promise.all([
      relayQuery.execute(this.connection, input),
      relayQuery.count(this.connection, { where: mergedWhere }),
    ]);

    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        node: edge.node as FacetValueCandidateView,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  async findSourceCandidateByRef(
    params: FindFacetSourceCandidateByRefParams
  ): Promise<FacetSourceCandidateView | null> {
    const rows = await this.connection
      .select()
      .from(facetSourceCandidateView)
      .where(
        and(
          eq(facetSourceCandidateView.storeId, params.storeId),
          eq(facetSourceCandidateView.locale, params.locale),
          eq(facetSourceCandidateView.facetType, params.facetType),
          eq(facetSourceCandidateView.handle, params.handle)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async findValueCandidatesByHandles(
    params: FindFacetValueCandidatesByHandlesParams
  ): Promise<FacetValueCandidateView[]> {
    if (!isFacetValueCandidateType(params.candidateType)) {
      throw new Error("Invalid candidateType");
    }

    const sourceHandles = normalizeHandles(params.sourceHandles);
    const handles = normalizeHandles(params.handles);
    if (sourceHandles.length === 0 || handles.length === 0) {
      return [];
    }

    const view = {
      TAG: facetTagValueCandidateView,
      OPTION: facetOptionValueCandidateView,
      FEATURE: facetFeatureValueCandidateView,
    }[params.candidateType] as typeof facetTagValueCandidateView;

    const rows = await this.connection
      .select()
      .from(view)
      .where(
        and(
          eq(view.storeId, params.storeId),
          eq(view.locale, params.locale),
          eq(view.facetType, params.candidateType),
          inArray(view.sourceHandle, sourceHandles),
          inArray(view.handle, handles)
        )
      );

    return rows as FacetValueCandidateView[];
  }

  async findListingFacetAffectedProducts(
    params: FindListingFacetAffectedProductsParams
  ): Promise<FindListingFacetAffectedProductsResult> {
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

  private async findAffectedProductIdsForRef(params: {
    storeId: string;
    ref: Catalog.ListingFacetAffectedProductRef;
    afterProductId?: string;
    limit: number;
  }): Promise<string[]> {
    if (params.ref.facetType === "TAG") {
      return this.findTagAffectedProductIds(params);
    }

    if (params.ref.facetType === "FEATURE") {
      return this.findFeatureAffectedProductIds(params);
    }

    return this.findOptionAffectedProductIds(params);
  }

  private async findTagAffectedProductIds(params: {
    storeId: string;
    ref: Catalog.ListingFacetAffectedProductRef;
    afterProductId?: string;
    limit: number;
  }): Promise<string[]> {
    const predicates = baseProductPredicates(params.storeId, params.afterProductId);
    if (params.ref.sourceValueHandle) {
      predicates.push(eq(tag.handle, params.ref.sourceValueHandle));
    }

    const rows = await this.connection
      .selectDistinct({ productId: product.id })
      .from(product)
      .innerJoin(
        productTag,
        and(eq(productTag.productId, product.id), eq(productTag.storeId, product.storeId))
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

  private async findFeatureAffectedProductIds(params: {
    storeId: string;
    ref: Catalog.ListingFacetAffectedProductRef;
    afterProductId?: string;
    limit: number;
  }): Promise<string[]> {
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

  private async findOptionAffectedProductIds(params: {
    storeId: string;
    ref: Catalog.ListingFacetAffectedProductRef;
    afterProductId?: string;
    limit: number;
  }): Promise<string[]> {
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
        and(eq(variant.id, productOptionVariantLink.variantId), eq(variant.storeId, product.storeId))
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

function emptyFacetValueCandidateConnection(): FacetValueCandidateConnectionResult {
  return {
    edges: [],
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: null,
      endCursor: null,
    },
    totalCount: 0,
  };
}

function normalizeHandles(values?: readonly string[]): string[] {
  if (!values) return [];
  return [
    ...new Set(
      values.map((value) => value.trim()).filter((value) => value.length > 0)
    ),
  ];
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

function normalizeSourceCandidateRefs(
  values?: readonly FacetSourceCandidateRef[]
): FacetSourceCandidateRef[] {
  if (!values) return [];
  const refs = new Map<string, FacetSourceCandidateRef>();
  for (const value of values) {
    const facetType = value.facetType.trim();
    const handle = value.handle.trim();
    if (!facetType || !handle) continue;
    refs.set(`${facetType}\0${handle}`, { facetType, handle });
  }
  return [...refs.values()];
}

function isFacetValueCandidateType(
  value: string
): value is FacetValueCandidateType {
  return FACET_VALUE_CANDIDATE_TYPES.has(value);
}
