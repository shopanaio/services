import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
  createQuery,
  createRelayQuery,
  type InferRelayInput,
  type PageInfo,
} from "@shopana/drizzle-query";
import { GraphQLError } from "graphql";
import { BaseRepository } from "../BaseRepository.js";
import {
  LexoRankRepository,
  type LexoRankMoveResult,
} from "../LexoRankRepository.js";
import {
  facet,
  facetFeatureValueCandidateView,
  facetOptionValueCandidateView,
  facetSource,
  facetSourceCandidateView,
  facetSourceTranslation,
  facetTagValueCandidateView,
  facetTranslation,
  facetValue,
  facetValueTranslation,
  type Facet,
  type FacetValue,
  type FacetFeatureValueCandidateView,
  type FacetOptionValueCandidateView,
  type FacetSourceCandidateView,
  type FacetTagValueCandidateView,
  type NewFacet,
  type NewFacetValue,
  type FacetTranslation,
} from "../models/index.js";

export interface ResolvedFacetFilterValue {
  facetSlug: string;
  valueHandle: string;
  facetId: string;
  facetType: string;
  resolvedSourceHandles: string[];
}

export interface FacetSourceInput {
  handle: string;
  name: string;
}

export interface FacetSourceWithName {
  facetId: string;
  handle: string;
  name: string | null;
}

export const facetSourceCandidateRelayQuery = createRelayQuery(
  createQuery(facetSourceCandidateView)
    .include(["id", "projectId", "locale", "facetType", "handle"])
    .maxLimit(100)
    .defaultLimit(30),
  { name: "facetSourceCandidate", tieBreaker: "id" }
);

export type FacetSourceCandidateRelayInput = InferRelayInput<
  typeof facetSourceCandidateRelayQuery
>;

export interface FacetSourceCandidateConnectionResult {
  edges: Array<{ cursor: string; node: FacetSourceCandidateView }>;
  pageInfo: PageInfo;
  totalCount: number;
}

const FACET_VALUE_CANDIDATE_TYPES = new Set(["TAG", "OPTION", "FEATURE"]);

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
        "projectId",
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

export const facetValueCandidateFilterRelayQuery =
  facetTagValueCandidateRelayQuery;

export const facetValueCandidateRelayQueries = {
  TAG: facetTagValueCandidateRelayQuery,
  OPTION: facetOptionValueCandidateRelayQuery,
  FEATURE: facetFeatureValueCandidateRelayQuery,
} as const;

export type FacetValueCandidateRelayInput = InferRelayInput<
  typeof facetTagValueCandidateRelayQuery
>;

export type FacetValueCandidateArgs = FacetValueCandidateRelayInput & {
  meta: {
    candidateType: FacetValueCandidateType;
    sourceHandles?: string[];
    facetId?: string;
  };
};

export interface FacetValueCandidateConnectionResult {
  edges: Array<{ cursor: string; node: FacetValueCandidateView }>;
  pageInfo: PageInfo;
  totalCount: number;
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

function throwBadUserInput(message: string): never {
  throw new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT" },
  });
}

function normalizeSourceHandles(sourceHandles?: readonly string[]): string[] {
  if (!sourceHandles) return [];
  return [
    ...new Set(
      sourceHandles
        .map((handle) => handle.trim())
        .filter((handle) => handle.length > 0)
    ),
  ];
}

function isFacetValueCandidateType(
  value: string
): value is FacetValueCandidateType {
  return FACET_VALUE_CANDIDATE_TYPES.has(value);
}

export class FacetRepository extends BaseRepository {
  private get facetRankRepository(): LexoRankRepository<Facet> {
    return new LexoRankRepository<Facet>({
      findOrderedItems: () => this.findAll(),
      findItem: ({ itemId }) => this.findById(itemId),
      updateRank: ({ itemId, lexoRank }) => this.updateFacetRank(itemId, lexoRank),
      getItemId: (item) => item.id,
      getLexoRank: (item) => item.lexoRank,
    });
  }

  private get locale(): string {
    return this.ctx.locale ?? this.ctx.store.defaultLocale;
  }

  async findById(id: string): Promise<Facet | null> {
    const rows = await this.connection
      .select()
      .from(facet)
      .where(and(eq(facet.projectId, this.storeId), eq(facet.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findBySlug(slug: string): Promise<Facet | null> {
    const rows = await this.connection
      .select()
      .from(facet)
      .where(and(eq(facet.projectId, this.storeId), eq(facet.slug, slug)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findAll(): Promise<Facet[]> {
    return this.connection
      .select()
      .from(facet)
      .where(eq(facet.projectId, this.storeId))
      .orderBy(asc(facet.lexoRank), asc(facet.id));
  }

  async create(data: {
    facetType: string;
    slug: string;
    label: string;
    uiType?: string;
    selectionMode?: string;
    lexoRank?: string;
    sources?: FacetSourceInput[];
  }): Promise<Facet> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const lexoRank = data.lexoRank ?? (await this.getNextFacetRank());

    const insert: NewFacet = {
      id,
      projectId: this.storeId,
      facetType: data.facetType,
      slug: data.slug,
      uiType: data.uiType ?? "checkbox",
      selectionMode: data.selectionMode ?? "multi",
      lexoRank,
      createdAt: now,
      updatedAt: now,
    };

    const rows = await this.connection.insert(facet).values(insert).returning();
    await this.connection.insert(facetTranslation).values({
      facetId: id,
      locale: this.locale,
      projectId: this.storeId,
      label: data.label,
    });

    if (data.sources && data.sources.length > 0) {
      await this.replaceSources(id, data.sources);
    }

    return rows[0];
  }

  async update(
    id: string,
    data: {
      slug?: string;
      label?: string;
      uiType?: string;
      selectionMode?: string;
      lexoRank?: string;
      sources?: FacetSourceInput[];
    }
  ): Promise<Facet | null> {
    const updates: Partial<NewFacet> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.slug !== undefined) updates.slug = data.slug;
    if (data.uiType !== undefined) updates.uiType = data.uiType;
    if (data.selectionMode !== undefined) updates.selectionMode = data.selectionMode;
    if (data.lexoRank !== undefined) updates.lexoRank = data.lexoRank;

    const rows = await this.connection
      .update(facet)
      .set(updates)
      .where(and(eq(facet.projectId, this.storeId), eq(facet.id, id)))
      .returning();

    if (data.label !== undefined) {
      await this.connection
        .insert(facetTranslation)
        .values({
          facetId: id,
          locale: this.locale,
          projectId: this.storeId,
          label: data.label,
        })
        .onConflictDoUpdate({
          target: [facetTranslation.facetId, facetTranslation.locale],
          set: { label: data.label },
        });
    }

    if (data.sources !== undefined) {
      await this.replaceSources(id, data.sources);
    }

    return rows[0] ?? null;
  }

  async updateFacetRank(id: string, lexoRank: string): Promise<Facet | null> {
    const rows = await this.connection
      .update(facet)
      .set({ lexoRank, updatedAt: new Date().toISOString() })
      .where(and(eq(facet.projectId, this.storeId), eq(facet.id, id)))
      .returning();

    return rows[0] ?? null;
  }

  async moveFacetRank(
    id: string,
    afterFacetId?: string | null,
    beforeFacetId?: string | null
  ): Promise<LexoRankMoveResult<Facet>> {
    return this.facetRankRepository.move({
      itemId: id,
      afterItemId: afterFacetId,
      beforeItemId: beforeFacetId,
    });
  }

  async rebalanceFacetRanks(): Promise<void> {
    await this.facetRankRepository.rebalance();
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(facet)
      .where(and(eq(facet.projectId, this.storeId), eq(facet.id, id)))
      .returning({ id: facet.id });
    return rows.length > 0;
  }

  async getByIds(facetIds: readonly string[]): Promise<Facet[]> {
    if (facetIds.length === 0) return [];
    return this.connection
      .select()
      .from(facet)
      .where(and(eq(facet.projectId, this.storeId), inArray(facet.id, [...facetIds])));
  }

  async getTranslationsByFacetIds(
    facetIds: readonly string[]
  ): Promise<FacetTranslation[]> {
    if (facetIds.length === 0) return [];
    return this.connection
      .select()
      .from(facetTranslation)
      .where(
        and(
          eq(facetTranslation.projectId, this.storeId),
          eq(facetTranslation.locale, this.locale),
          inArray(facetTranslation.facetId, [...facetIds])
        )
      );
  }

  async getSourcesByFacetIds(
    facetIds: readonly string[]
  ): Promise<FacetSourceWithName[]> {
    if (facetIds.length === 0) return [];
    return this.connection
      .select({
        facetId: facetSource.facetId,
        handle: facetSource.handle,
        name: facetSourceTranslation.name,
      })
      .from(facetSource)
      .leftJoin(
        facetSourceTranslation,
        and(
          eq(facetSourceTranslation.facetSourceId, facetSource.id),
          eq(facetSourceTranslation.projectId, facetSource.projectId),
          eq(facetSourceTranslation.locale, this.locale)
        )
      )
      .where(
        and(
          eq(facetSource.projectId, this.storeId),
          inArray(facetSource.facetId, [...facetIds])
        )
      );
  }

  async getAvailableFacetSourceCandidates(
    args: FacetSourceCandidateRelayInput
  ): Promise<FacetSourceCandidateConnectionResult> {
    const { where, orderBy, ...paginationArgs } = args;
    const mergedWhere: FacetSourceCandidateRelayInput["where"] = {
      _and: [
        { projectId: { _eq: this.storeId } },
        { locale: { _eq: this.locale } },
        ...(where ? [where] : []),
      ],
    };

    const executeInput: FacetSourceCandidateRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "sourceSortBucket", direction: "asc" },
        { field: "sortName", direction: "asc", nulls: "last" },
        { field: "id", direction: "asc" },
      ],
    };

    const [result, totalCount] = await Promise.all([
      facetSourceCandidateRelayQuery.execute(this.connection, executeInput),
      facetSourceCandidateRelayQuery.count(this.connection, {
        where: mergedWhere,
      }),
    ]);

    return {
      edges: result.edges.map((edge) => ({
        cursor: edge.cursor,
        node: edge.node,
      })),
      pageInfo: result.pageInfo,
      totalCount,
    };
  }

  async getFacetValueCandidates(
    args: FacetValueCandidateArgs
  ): Promise<FacetValueCandidateConnectionResult> {
    const candidateType = args.meta.candidateType;
    if (!isFacetValueCandidateType(candidateType)) {
      throwBadUserInput("Invalid candidateType");
    }

    const { where, orderBy, meta, ...paginationArgs } = args;
    const existingSourceValueHandles: string[] = [];
    let sourceHandles: string[];

    if (meta.facetId) {
      const facetRow = await this.findById(meta.facetId);
      if (!facetRow) {
        throwBadUserInput("Facet not found");
      }

      if (facetRow.facetType !== candidateType) {
        throwBadUserInput("Facet type does not match candidateType");
      }

      const sourceRows = await this.connection
        .select({ handle: facetSource.handle })
        .from(facetSource)
        .where(
          and(
            eq(facetSource.projectId, this.storeId),
            eq(facetSource.facetId, meta.facetId)
          )
        );

      sourceHandles = normalizeSourceHandles(
        sourceRows.map((source) => source.handle)
      );

      if (meta.sourceHandles !== undefined) {
        const requestedHandles = new Set(normalizeSourceHandles(meta.sourceHandles));
        sourceHandles = sourceHandles.filter((handle) =>
          requestedHandles.has(handle)
        );
      }

      if (sourceHandles.length === 0) {
        return emptyFacetValueCandidateConnection();
      }

      const existingValueRows = await this.connection
        .select({ handle: facetValue.handle })
        .from(facetValue)
        .where(
          and(
            eq(facetValue.projectId, this.storeId),
            eq(facetValue.facetId, meta.facetId),
            eq(facetValue.kind, "source")
          )
        );

      existingSourceValueHandles.push(
        ...normalizeSourceHandles(existingValueRows.map((value) => value.handle))
      );
    } else {
      sourceHandles = normalizeSourceHandles(meta.sourceHandles);
      if (sourceHandles.length === 0) {
        throwBadUserInput("sourceHandles are required");
      }
    }

    const mergedWhere: FacetValueCandidateRelayInput["where"] = {
      _and: [
        { projectId: { _eq: this.storeId } },
        { locale: { _eq: this.locale } },
        { facetType: { _eq: candidateType } },
        { sourceHandle: { _in: sourceHandles } },
        ...(existingSourceValueHandles.length
          ? [{ handle: { _notIn: existingSourceValueHandles } }]
          : []),
        ...(where ? [where] : []),
      ],
    };

    const executeInput: FacetValueCandidateRelayInput = {
      ...paginationArgs,
      where: mergedWhere,
      orderBy: orderBy ?? [
        { field: "label", direction: "asc" },
        { field: "id", direction: "asc" },
      ],
    };

    const relayQuery = facetValueCandidateRelayQueries[
      candidateType
    ] as typeof facetTagValueCandidateRelayQuery;

    const [result, totalCount] = await Promise.all([
      relayQuery.execute(this.connection, executeInput),
      relayQuery.count(this.connection, {
        where: mergedWhere,
      }),
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

  async findFacetValueCandidatesByHandles(args: {
    candidateType: FacetValueCandidateType;
    sourceHandles: string[];
    handles: string[];
  }): Promise<FacetValueCandidateView[]> {
    const candidateType = args.candidateType;
    if (!isFacetValueCandidateType(candidateType)) {
      throwBadUserInput("Invalid candidateType");
    }

    const sourceHandles = normalizeSourceHandles(args.sourceHandles);
    const handles = normalizeSourceHandles(args.handles);
    if (sourceHandles.length === 0 || handles.length === 0) {
      return [];
    }

    const view = {
      TAG: facetTagValueCandidateView,
      OPTION: facetOptionValueCandidateView,
      FEATURE: facetFeatureValueCandidateView,
    }[candidateType] as typeof facetTagValueCandidateView;

    const rows = await this.connection
      .select()
      .from(view)
      .where(
        and(
          eq(view.projectId, this.storeId),
          eq(view.locale, this.locale),
          eq(view.facetType, candidateType),
          inArray(view.sourceHandle, sourceHandles),
          inArray(view.handle, handles)
        )
      );

    return rows as FacetValueCandidateView[];
  }

  async createSourceFacetValues(args: {
    facetId: string;
    values: Array<{
      handle: string;
      label: string;
      sortIndex: number;
      enabled: boolean;
    }>;
  }): Promise<FacetValue[]> {
    if (args.values.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const inserts: NewFacetValue[] = args.values.map((value) => ({
      id: randomUUID(),
      projectId: this.storeId,
      facetId: args.facetId,
      parentId: null,
      kind: "source",
      handle: value.handle,
      swatchId: null,
      sortIndex: value.sortIndex,
      enabled: value.enabled,
      createdAt: now,
      updatedAt: now,
    }));

    const rows = await this.connection.insert(facetValue).values(inserts).returning();

    await this.connection.insert(facetValueTranslation).values(
      rows.map((row, index) => ({
        facetValueId: row.id,
        locale: this.locale,
        projectId: this.storeId,
        label: args.values[index]?.label ?? row.handle,
      }))
    );

    return rows;
  }

  async findAvailableFacetSourceCandidate(args: {
    facetType: string;
    handle: string;
  }): Promise<FacetSourceCandidateView | null> {
    const rows = await this.connection
      .select()
      .from(facetSourceCandidateView)
      .where(
        and(
          eq(facetSourceCandidateView.projectId, this.storeId),
          eq(facetSourceCandidateView.locale, this.locale),
          eq(facetSourceCandidateView.facetType, args.facetType),
          eq(facetSourceCandidateView.handle, args.handle)
        )
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async replaceSources(
    facetId: string,
    sources: FacetSourceInput[]
  ): Promise<void> {
    const facetRow = await this.findById(facetId);
    if (!facetRow) {
      return;
    }

    await this.connection
      .delete(facetSource)
      .where(
        and(
          eq(facetSource.projectId, this.storeId),
          eq(facetSource.facetId, facetId)
        )
      );

    if (sources.length === 0) {
      return;
    }

    const uniqueSources = Array.from(
      new Map(
        sources.map((source) => [
          source.handle.trim(),
          { handle: source.handle.trim(), name: source.name.trim() },
        ])
      ).values()
    );

    const inserted = await this.connection.insert(facetSource).values(
      uniqueSources.map((source) => ({
        id: randomUUID(),
        projectId: this.storeId,
        facetId,
        facetType: facetRow.facetType,
        handle: source.handle,
      }))
    ).returning({ id: facetSource.id, handle: facetSource.handle });

    await this.connection.insert(facetSourceTranslation).values(
      inserted.map((source) => ({
        facetSourceId: source.id,
        locale: this.locale,
        projectId: this.storeId,
        name: uniqueSources.find((item) => item.handle === source.handle)?.name ?? source.handle,
      }))
    );
  }

  async resolveFacetFilterValues(
    rawFilters: readonly string[]
  ): Promise<ResolvedFacetFilterValue[]> {
    const tokens: Array<{ facetSlug: string; valueHandle: string }> = [];
    for (const raw of rawFilters) {
      const separator = raw.indexOf(":");
      if (separator <= 0 || separator === raw.length - 1) {
        continue;
      }

      const facetSlug = raw.slice(0, separator);
      const valueHandle = raw.slice(separator + 1);
      tokens.push({ facetSlug, valueHandle });
    }

    if (tokens.length === 0) {
      return [];
    }

    const facetSlugs = [...new Set(tokens.map((token) => token.facetSlug))];
    const valueHandles = [...new Set(tokens.map((token) => token.valueHandle))];

    const visibleRows = await this.connection
      .select({
        facetSlug: facet.slug,
        valueId: facetValue.id,
        valueHandle: facetValue.handle,
        valueKind: facetValue.kind,
        facetId: facet.id,
        facetType: facet.facetType,
      })
      .from(facet)
      .innerJoin(
        facetValue,
        and(eq(facetValue.facetId, facet.id), eq(facetValue.projectId, facet.projectId))
      )
      .where(
        and(
          eq(facet.projectId, this.storeId),
          inArray(facet.slug, facetSlugs),
          inArray(facetValue.handle, valueHandles),
          isNull(facetValue.parentId),
          eq(facetValue.enabled, true)
        )
      );

    const displayValueIds = visibleRows
      .filter((row) => row.valueKind === "display")
      .map((row) => row.valueId);

    const childRows =
      displayValueIds.length > 0
        ? await this.connection
            .select({
              parentId: facetValue.parentId,
              handle: facetValue.handle,
            })
            .from(facetValue)
            .where(
              and(
                eq(facetValue.projectId, this.storeId),
                inArray(facetValue.parentId, displayValueIds),
                eq(facetValue.kind, "source"),
                eq(facetValue.enabled, true)
              )
            )
            .orderBy(asc(facetValue.handle))
        : [];

    const resolvedSourceHandlesByDisplayId = new Map<string, Set<string>>();
    for (const child of childRows) {
      if (!child.parentId) continue;
      const handles =
        resolvedSourceHandlesByDisplayId.get(child.parentId) ?? new Set<string>();
      handles.add(child.handle);
      resolvedSourceHandlesByDisplayId.set(child.parentId, handles);
    }

    const resolvedByToken = new Map<string, ResolvedFacetFilterValue>();
    for (const row of visibleRows) {
      const resolvedSourceHandles =
        row.valueKind === "source"
          ? [row.valueHandle]
          : [...(resolvedSourceHandlesByDisplayId.get(row.valueId) ?? [])].sort();

      if (resolvedSourceHandles.length === 0) {
        continue;
      }

      resolvedByToken.set(`${row.facetSlug}\0${row.valueHandle}`, {
        facetSlug: row.facetSlug,
        valueHandle: row.valueHandle,
        facetId: row.facetId,
        facetType: row.facetType,
        resolvedSourceHandles,
      });
    }

    const resolved: ResolvedFacetFilterValue[] = [];
    for (const token of tokens) {
      const item = resolvedByToken.get(`${token.facetSlug}\0${token.valueHandle}`);
      if (item) {
        resolved.push(item);
      }
    }
    return resolved;
  }

  private async getNextFacetRank(): Promise<string> {
    return this.facetRankRepository.getNextRank();
  }
}
