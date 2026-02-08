import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  facet,
  facetValue,
  facetValueTranslation,
  facetValueSourceHandle,
  type FacetValue,
  type NewFacetValue,
  type FacetValueTranslation,
  type FacetValueSourceHandle,
} from "../models/index.js";

export class FacetValueRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? "uk";
  }

  async findById(id: string): Promise<FacetValue | null> {
    const rows = await this.connection
      .select()
      .from(facetValue)
      .where(and(eq(facetValue.projectId, this.storeId), eq(facetValue.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByFacetId(facetId: string): Promise<FacetValue[]> {
    return this.connection
      .select()
      .from(facetValue)
      .where(and(eq(facetValue.projectId, this.storeId), eq(facetValue.facetId, facetId)))
      .orderBy(asc(facetValue.sortIndex), asc(facetValue.id));
  }

  async create(data: {
    facetId: string;
    slug: string;
    label: string;
    sourceHandles?: string[];
    swatchId?: string | null;
    sortIndex?: number;
    enabled?: boolean;
  }): Promise<FacetValue> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const insert: NewFacetValue = {
      id,
      projectId: this.storeId,
      facetId: data.facetId,
      slug: data.slug,
      swatchId: data.swatchId ?? null,
      sortIndex: data.sortIndex ?? 0,
      enabled: data.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const rows = await this.connection.insert(facetValue).values(insert).returning();

    await this.connection.insert(facetValueTranslation).values({
      facetValueId: id,
      locale: this.locale,
      projectId: this.storeId,
      label: data.label,
    });

    if (data.sourceHandles && data.sourceHandles.length > 0) {
      await this.replaceSourceHandles(id, data.sourceHandles);
    }

    return rows[0];
  }

  async update(
    id: string,
    data: {
      slug?: string;
      label?: string;
      sourceHandles?: string[];
      swatchId?: string | null;
      sortIndex?: number;
      enabled?: boolean;
    }
  ): Promise<FacetValue | null> {
    const updates: Partial<NewFacetValue> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.slug !== undefined) updates.slug = data.slug;
    if (data.swatchId !== undefined) updates.swatchId = data.swatchId;
    if (data.sortIndex !== undefined) updates.sortIndex = data.sortIndex;
    if (data.enabled !== undefined) updates.enabled = data.enabled;

    const rows = await this.connection
      .update(facetValue)
      .set(updates)
      .where(and(eq(facetValue.projectId, this.storeId), eq(facetValue.id, id)))
      .returning();

    if (data.label !== undefined) {
      await this.connection
        .insert(facetValueTranslation)
        .values({
          facetValueId: id,
          locale: this.locale,
          projectId: this.storeId,
          label: data.label,
        })
        .onConflictDoUpdate({
          target: [facetValueTranslation.facetValueId, facetValueTranslation.locale],
          set: { label: data.label },
        });
    }

    if (data.sourceHandles !== undefined) {
      await this.replaceSourceHandles(id, data.sourceHandles);
    }

    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(facetValue)
      .where(and(eq(facetValue.projectId, this.storeId), eq(facetValue.id, id)))
      .returning({ id: facetValue.id });
    return rows.length > 0;
  }

  async getByIds(valueIds: readonly string[]): Promise<FacetValue[]> {
    if (valueIds.length === 0) return [];
    return this.connection
      .select()
      .from(facetValue)
      .where(and(eq(facetValue.projectId, this.storeId), inArray(facetValue.id, [...valueIds])));
  }

  async getTranslationsByValueIds(
    valueIds: readonly string[]
  ): Promise<FacetValueTranslation[]> {
    if (valueIds.length === 0) return [];
    return this.connection
      .select()
      .from(facetValueTranslation)
      .where(
        and(
          eq(facetValueTranslation.projectId, this.storeId),
          eq(facetValueTranslation.locale, this.locale),
          inArray(facetValueTranslation.facetValueId, [...valueIds])
        )
      );
  }

  async getSourceHandlesByValueIds(
    valueIds: readonly string[]
  ): Promise<FacetValueSourceHandle[]> {
    if (valueIds.length === 0) return [];
    return this.connection
      .select()
      .from(facetValueSourceHandle)
      .where(
        and(
          eq(facetValueSourceHandle.projectId, this.storeId),
          inArray(facetValueSourceHandle.facetValueId, [...valueIds])
        )
      );
  }

  async replaceSourceHandles(
    facetValueId: string,
    sourceHandles: string[]
  ): Promise<void> {
    const facetValueRow = await this.findById(facetValueId);
    if (!facetValueRow) {
      return;
    }

    const facetRows = await this.connection
      .select({ id: facet.id, facetType: facet.facetType })
      .from(facet)
      .where(and(eq(facet.projectId, this.storeId), eq(facet.id, facetValueRow.facetId)))
      .limit(1);

    if (!facetRows[0]) {
      return;
    }

    await this.connection
      .delete(facetValueSourceHandle)
      .where(
        and(
          eq(facetValueSourceHandle.projectId, this.storeId),
          eq(facetValueSourceHandle.facetValueId, facetValueId)
        )
      );

    if (sourceHandles.length === 0) {
      return;
    }

    const uniqueSourceHandles = Array.from(new Set(sourceHandles));

    await this.connection.insert(facetValueSourceHandle).values(
      uniqueSourceHandles.map((sourceHandle) => ({
        id: randomUUID(),
        projectId: this.storeId,
        facetId: facetRows[0].id,
        facetValueId,
        facetType: facetRows[0].facetType,
        sourceHandle,
      }))
    );
  }
}
