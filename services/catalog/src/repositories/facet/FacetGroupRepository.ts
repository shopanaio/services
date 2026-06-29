import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  facetGroup,
  facetGroupTranslation,
  type FacetGroup,
  type NewFacetGroup,
  type FacetGroupTranslation,
} from "../models/index.js";

export class FacetGroupRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? this.ctx.store.defaultLocale;
  }

  async findById(id: string): Promise<FacetGroup | null> {
    const rows = await this.connection
      .select()
      .from(facetGroup)
      .where(and(eq(facetGroup.projectId, this.storeId), eq(facetGroup.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findAll(): Promise<FacetGroup[]> {
    return this.connection
      .select()
      .from(facetGroup)
      .where(eq(facetGroup.projectId, this.storeId))
      .orderBy(asc(facetGroup.sortIndex), asc(facetGroup.id));
  }

  async create(data: {
    name: string;
    sortIndex?: number;
  }): Promise<FacetGroup> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const insert: NewFacetGroup = {
      id,
      projectId: this.storeId,
      sortIndex: data.sortIndex ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    const rows = await this.connection.insert(facetGroup).values(insert).returning();

    await this.connection.insert(facetGroupTranslation).values({
      groupId: id,
      locale: this.locale,
      projectId: this.storeId,
      name: data.name,
    });

    return rows[0];
  }

  async update(
    id: string,
    data: {
      name?: string;
      sortIndex?: number;
    }
  ): Promise<FacetGroup | null> {
    const updates: Partial<NewFacetGroup> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.sortIndex !== undefined) updates.sortIndex = data.sortIndex;

    const rows = await this.connection
      .update(facetGroup)
      .set(updates)
      .where(and(eq(facetGroup.projectId, this.storeId), eq(facetGroup.id, id)))
      .returning();

    if (data.name !== undefined) {
      await this.connection
        .insert(facetGroupTranslation)
        .values({
          groupId: id,
          locale: this.locale,
          projectId: this.storeId,
          name: data.name,
        })
        .onConflictDoUpdate({
          target: [facetGroupTranslation.groupId, facetGroupTranslation.locale],
          set: { name: data.name },
        });
    }

    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(facetGroup)
      .where(and(eq(facetGroup.projectId, this.storeId), eq(facetGroup.id, id)))
      .returning({ id: facetGroup.id });
    return rows.length > 0;
  }

  async getByIds(groupIds: readonly string[]): Promise<FacetGroup[]> {
    if (groupIds.length === 0) return [];
    return this.connection
      .select()
      .from(facetGroup)
      .where(
        and(
          eq(facetGroup.projectId, this.storeId),
          inArray(facetGroup.id, [...groupIds])
        )
      );
  }

  async getTranslationsByGroupIds(
    groupIds: readonly string[]
  ): Promise<FacetGroupTranslation[]> {
    if (groupIds.length === 0) return [];
    return this.connection
      .select()
      .from(facetGroupTranslation)
      .where(
        and(
          eq(facetGroupTranslation.projectId, this.storeId),
          eq(facetGroupTranslation.locale, this.locale),
          inArray(facetGroupTranslation.groupId, [...groupIds])
        )
      );
  }
}
