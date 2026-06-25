import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  facet,
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

export class FacetRepository extends BaseRepository {
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
      .orderBy(asc(facet.sortIndex), asc(facet.id));
  }

  async findByGroupIds(groupIds: readonly string[]): Promise<Facet[]> {
    if (groupIds.length === 0) return [];
    return this.connection
      .select()
      .from(facet)
      .where(
        and(eq(facet.projectId, this.storeId), inArray(facet.groupId, [...groupIds]))
      )
      .orderBy(asc(facet.sortIndex), asc(facet.id));
  }

  async create(data: {
    facetType: string;
    slug: string;
    label: string;
    uiType?: string;
    selectionMode?: string;
    groupId?: string | null;
    sortIndex?: number;
    minValues?: number;
    maxValuesVisible?: number;
    valueSort?: string;
    indexable?: boolean;
  }): Promise<Facet> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const insert: NewFacet = {
      id,
      projectId: this.storeId,
      groupId: data.groupId ?? null,
      facetType: data.facetType,
      slug: data.slug,
      uiType: data.uiType ?? "checkbox",
      selectionMode: data.selectionMode ?? "multi",
      sortIndex: data.sortIndex ?? 0,
      minValues: data.minValues ?? 1,
      maxValuesVisible: data.maxValuesVisible ?? 10,
      valueSort: data.valueSort ?? "count",
      indexable: data.indexable ?? false,
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

    return rows[0];
  }

  async update(
    id: string,
    data: {
      slug?: string;
      label?: string;
      uiType?: string;
      selectionMode?: string;
      groupId?: string | null;
      sortIndex?: number;
      minValues?: number;
      maxValuesVisible?: number;
      valueSort?: string;
      indexable?: boolean;
    }
  ): Promise<Facet | null> {
    const updates: Partial<NewFacet> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.slug !== undefined) updates.slug = data.slug;
    if (data.uiType !== undefined) updates.uiType = data.uiType;
    if (data.selectionMode !== undefined) updates.selectionMode = data.selectionMode;
    if (data.groupId !== undefined) updates.groupId = data.groupId;
    if (data.sortIndex !== undefined) updates.sortIndex = data.sortIndex;
    if (data.minValues !== undefined) updates.minValues = data.minValues;
    if (data.maxValuesVisible !== undefined)
      updates.maxValuesVisible = data.maxValuesVisible;
    if (data.valueSort !== undefined) updates.valueSort = data.valueSort;
    if (data.indexable !== undefined) updates.indexable = data.indexable;

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

    return rows[0] ?? null;
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
}
