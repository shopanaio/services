import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  facetSwatch,
  type FacetSwatch,
  type NewFacetSwatch,
} from "../models/index.js";

export class FacetSwatchRepository extends BaseRepository {
  async findById(id: string): Promise<FacetSwatch | null> {
    const rows = await this.connection
      .select()
      .from(facetSwatch)
      .where(and(eq(facetSwatch.projectId, this.storeId), eq(facetSwatch.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findAll(): Promise<FacetSwatch[]> {
    return this.connection
      .select()
      .from(facetSwatch)
      .where(eq(facetSwatch.projectId, this.storeId))
      .orderBy(asc(facetSwatch.id));
  }

  async getByIds(ids: readonly string[]): Promise<FacetSwatch[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(facetSwatch)
      .where(
        and(eq(facetSwatch.projectId, this.storeId), inArray(facetSwatch.id, [...ids]))
      );
  }

  async create(data: {
    swatchType: string;
    colorOne?: string | null;
    colorTwo?: string | null;
    imageId?: string | null;
    metadata?: unknown;
  }): Promise<FacetSwatch> {
    const insert: NewFacetSwatch = {
      id: randomUUID(),
      projectId: this.storeId,
      swatchType: data.swatchType,
      colorOne: data.colorOne ?? null,
      colorTwo: data.colorTwo ?? null,
      imageId: data.imageId ?? null,
      metadata: data.metadata ?? null,
    };

    const rows = await this.connection.insert(facetSwatch).values(insert).returning();
    return rows[0];
  }

  async update(
    id: string,
    data: {
      swatchType?: string;
      colorOne?: string | null;
      colorTwo?: string | null;
      imageId?: string | null;
      metadata?: unknown;
    }
  ): Promise<FacetSwatch | null> {
    const updates: Partial<NewFacetSwatch> = {};
    if (data.swatchType !== undefined) updates.swatchType = data.swatchType;
    if (data.colorOne !== undefined) updates.colorOne = data.colorOne;
    if (data.colorTwo !== undefined) updates.colorTwo = data.colorTwo;
    if (data.imageId !== undefined) updates.imageId = data.imageId;
    if (data.metadata !== undefined) updates.metadata = data.metadata;

    const rows = await this.connection
      .update(facetSwatch)
      .set(updates)
      .where(and(eq(facetSwatch.projectId, this.storeId), eq(facetSwatch.id, id)))
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(facetSwatch)
      .where(and(eq(facetSwatch.projectId, this.storeId), eq(facetSwatch.id, id)))
      .returning({ id: facetSwatch.id });
    return rows.length > 0;
  }
}
