import { and, eq, inArray } from "drizzle-orm";
import type { Catalog } from "@shopana/broker-types";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
} from "@shopana/drizzle-query";
import { BaseRepository } from "../BaseRepository.js";
import {
  facetFeatureValueCandidateView,
  facetOptionValueCandidateView,
  facetSourceCandidateView,
  facetTagValueCandidateView,
  type FacetFeatureValueCandidateView,
  type FacetOptionValueCandidateView,
  type FacetTagValueCandidateView,
} from "../models/index.js";

const FACET_VALUE_CANDIDATE_TYPES = new Set<string>([
  "TAG",
  "OPTION",
  "FEATURE",
]);

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

export type FacetValueCandidateType = Catalog.FacetValueCandidateType;
export type FacetSourceCandidateView = Catalog.FacetSourceCandidateView;
export type FacetValueCandidateView = Catalog.FacetValueCandidateView;

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

const facetValueCandidateViews = {
  TAG: facetTagValueCandidateView,
  OPTION: facetOptionValueCandidateView,
  FEATURE: facetFeatureValueCandidateView,
} as const;

export type FacetValueCandidateRelayInput = InferRelayInput<
  typeof facetTagValueCandidateRelayQuery
>;

export type FacetSourceCandidateConnectionResult =
  Catalog.FacetSourceCandidateConnectionResult;

export type FacetValueCandidateConnectionResult =
  Catalog.FacetValueCandidateConnectionResult;

export interface FacetSourceCandidateQueryParams {
  storeId: string;
  locale: string;
  excludedSources?: FacetSourceCandidateRef[];
  input: FacetSourceCandidateRelayInput;
}

export type FacetSourceCandidateRef = Catalog.FacetSourceCandidateRef;

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

export class FacetCandidateRepository extends BaseRepository {
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

    const relayQuery = getFacetValueCandidateRelayQuery(params.candidateType);

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

    const view = getFacetValueCandidateView(params.candidateType);

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

    return rows.map(toFacetValueCandidateView);
  }
}

function getFacetValueCandidateRelayQuery(type: FacetValueCandidateType) {
  return facetValueCandidateRelayQueries[
    type
  ] as typeof facetTagValueCandidateRelayQuery;
}

function getFacetValueCandidateView(type: FacetValueCandidateType) {
  return facetValueCandidateViews[type] as typeof facetTagValueCandidateView;
}

function toFacetValueCandidateView(
  row:
    | FacetTagValueCandidateView
    | FacetOptionValueCandidateView
    | FacetFeatureValueCandidateView
): FacetValueCandidateView {
  return row as FacetValueCandidateView;
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
