import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  LexoRankRepository,
  type LexoRankMoveResult,
} from "../LexoRankRepository.js";
import {
  facet,
  facetSource,
  facetSourceTranslation,
  facetTranslation,
  facetValue,
  facetValueSourceHandle,
  type Facet,
  type NewFacet,
  type FacetTranslation,
} from "../models/index.js";

export interface ResolvedFacetFilterValue {
  facetSlug: string;
  valueSlug: string;
  facetId: string;
  facetType: string;
  sourceHandles: string[];
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
    const resolved: ResolvedFacetFilterValue[] = [];

    for (const raw of rawFilters) {
      const separator = raw.indexOf(":");
      if (separator <= 0 || separator === raw.length - 1) {
        continue;
      }

      const facetSlug = raw.slice(0, separator);
      const valueSlug = raw.slice(separator + 1);
      const rows = await this.connection
        .select({
          facetId: facet.id,
          facetType: facet.facetType,
          sourceHandle: facetValueSourceHandle.sourceHandle,
        })
        .from(facet)
        .innerJoin(
          facetValue,
          and(eq(facetValue.facetId, facet.id), eq(facetValue.projectId, facet.projectId))
        )
        .innerJoin(
          facetValueSourceHandle,
          and(
            eq(facetValueSourceHandle.facetValueId, facetValue.id),
            eq(facetValueSourceHandle.facetId, facet.id),
            eq(facetValueSourceHandle.projectId, facet.projectId),
            eq(facetValueSourceHandle.facetType, facet.facetType)
          )
        )
        .where(
          and(
            eq(facet.projectId, this.storeId),
            eq(facet.slug, facetSlug),
            eq(facetValue.slug, valueSlug),
            eq(facetValue.enabled, true)
          )
        );

      if (rows.length === 0) continue;

      resolved.push({
        facetSlug,
        valueSlug,
        facetId: rows[0].facetId,
        facetType: rows[0].facetType,
        sourceHandles: Array.from(new Set(rows.map((row) => row.sourceHandle))).sort(),
      });
    }

    return resolved;
  }

  private async getNextFacetRank(): Promise<string> {
    return this.facetRankRepository.getNextRank();
  }
}
