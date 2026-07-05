import { and, eq, inArray } from "drizzle-orm";
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

export interface GetFacetSourceCandidateParams {
  storeId: string;
  locale: string;
  facetType: string;
  handle: string;
}

export interface GetFacetValueCandidatesByHandlesParams {
  storeId: string;
  locale: string;
  candidateType: FacetValueCandidateType;
  sourceHandles: string[];
  handles: string[];
}

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

  async getSourceCandidate(
    params: GetFacetSourceCandidateParams
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

  async getValueCandidatesByHandles(
    params: GetFacetValueCandidatesByHandlesParams
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
