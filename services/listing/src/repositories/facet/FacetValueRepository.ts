import { and, asc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  facet,
  facetValue,
  facetValueTranslation,
  type FacetValue,
  type FacetValueKind,
  type FacetValueTranslation,
  type NewFacetValue,
} from "../models/index.js";

export interface FacetValueCreateData {
  facetId: string;
  kind: FacetValueKind;
  handle: string;
  label: string;
  swatchId?: string | null;
  sortIndex?: number;
  enabled?: boolean;
}

export interface FacetValueUpdateData {
  handle?: string;
  label?: string;
  swatchId?: string | null;
  sortIndex?: number;
  enabled?: boolean;
}

export interface FacetValueRef {
  facetId: string;
  handle: string;
}

export type FacetSourceValueFacetType = "TAG" | "OPTION" | "FEATURE";

export interface FacetSourceValueRef {
  facetType: FacetSourceValueFacetType;
  sourceHandle: string;
  valueHandle?: string;
}

const facetValueSelectColumns = {
  id: facetValue.id,
  storeId: facetValue.storeId,
  facetId: facetValue.facetId,
  parentId: facetValue.parentId,
  kind: facetValue.kind,
  handle: facetValue.handle,
  swatchId: facetValue.swatchId,
  sortIndex: facetValue.sortIndex,
  enabled: facetValue.enabled,
  referenceStatus: facetValue.referenceStatus,
  referenceStatusChangedAt: facetValue.referenceStatusChangedAt,
  referenceCheckedAt: facetValue.referenceCheckedAt,
  createdAt: facetValue.createdAt,
  updatedAt: facetValue.updatedAt,
};

function uniqueFacetSourceValueRefs(
  refs: readonly FacetSourceValueRef[]
): FacetSourceValueRef[] {
  return [
    ...new Map(
      refs
        .map((ref) => ({
          facetType: ref.facetType,
          sourceHandle: ref.sourceHandle.trim(),
          valueHandle: ref.valueHandle?.trim(),
        }))
        .filter((ref) => ref.sourceHandle.length > 0)
        .map((ref) => [
          `${ref.facetType}\0${ref.sourceHandle}\0${ref.valueHandle ?? ""}`,
          ref,
        ])
    ).values(),
  ];
}

function normalizeSourceValueHandle(ref: FacetSourceValueRef): string | null {
  const valueHandle = ref.valueHandle?.trim();
  if (!valueHandle) return null;

  if (ref.facetType === "TAG") {
    return valueHandle;
  }

  const sourceHandle = ref.sourceHandle.trim();
  const prefix = `${sourceHandle}:`;
  return valueHandle.startsWith(prefix) ? valueHandle : `${prefix}${valueHandle}`;
}

function sourceValueHandleStartsWith(sourceHandle: string): SQL {
  const pattern = `${escapeLikePattern(sourceHandle.trim())}:%`;
  return sql`${facetValue.handle} LIKE ${pattern} ESCAPE '\\'`;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export class FacetValueRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? this.ctx.store.defaultLocale;
  }

  async findById(id: string): Promise<FacetValue | null> {
    const rows = await this.connection
      .select()
      .from(facetValue)
      .where(and(eq(facetValue.storeId, this.storeId), eq(facetValue.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByFacetId(facetId: string): Promise<FacetValue[]> {
    return this.findVisibleByFacetId(facetId);
  }

  async findVisibleByFacetId(facetId: string): Promise<FacetValue[]> {
    return this.connection
      .select()
      .from(facetValue)
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          eq(facetValue.facetId, facetId),
          isNull(facetValue.parentId)
        )
      )
      .orderBy(asc(facetValue.sortIndex), asc(facetValue.id));
  }

  async findVisibleByFacetIds(facetIds: readonly string[]): Promise<FacetValue[]> {
    if (facetIds.length === 0) return [];
    return this.connection
      .select()
      .from(facetValue)
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          inArray(facetValue.facetId, [...facetIds]),
          isNull(facetValue.parentId)
        )
      )
      .orderBy(asc(facetValue.sortIndex), asc(facetValue.id));
  }

  async findAllByFacetId(facetId: string): Promise<FacetValue[]> {
    return this.connection
      .select()
      .from(facetValue)
      .where(and(eq(facetValue.storeId, this.storeId), eq(facetValue.facetId, facetId)))
      .orderBy(asc(facetValue.sortIndex), asc(facetValue.id));
  }

  async findRootByFacetIdAndHandle(
    facetId: string,
    handle: string
  ): Promise<FacetValue | null> {
    const rows = await this.connection
      .select()
      .from(facetValue)
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          eq(facetValue.facetId, facetId),
          eq(facetValue.handle, handle),
          isNull(facetValue.parentId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async getRootValuesByFacetIdAndHandles(
    facetId: string,
    handles: readonly string[]
  ): Promise<FacetValue[]> {
    const uniqueHandles = [...new Set(handles)];
    if (uniqueHandles.length === 0) return [];
    return this.connection
      .select()
      .from(facetValue)
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          eq(facetValue.facetId, facetId),
          inArray(facetValue.handle, uniqueHandles),
          isNull(facetValue.parentId)
        )
      );
  }

  async createValue(data: FacetValueCreateData): Promise<FacetValue> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const insert: NewFacetValue = {
      id,
      storeId: this.storeId,
      facetId: data.facetId,
      parentId: null,
      kind: data.kind,
      handle: data.handle,
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
      storeId: this.storeId,
      label: data.label,
    });

    return rows[0];
  }

  async updateValue(
    id: string,
    data: FacetValueUpdateData
  ): Promise<FacetValue | null> {
    const updates: Partial<NewFacetValue> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.handle !== undefined) updates.handle = data.handle;
    if (data.swatchId !== undefined) updates.swatchId = data.swatchId;
    if (data.sortIndex !== undefined) updates.sortIndex = data.sortIndex;
    if (data.enabled !== undefined) updates.enabled = data.enabled;

    const rows = await this.connection
      .update(facetValue)
      .set(updates)
      .where(and(eq(facetValue.storeId, this.storeId), eq(facetValue.id, id)))
      .returning();

    if (data.label !== undefined) {
      await this.connection
        .insert(facetValueTranslation)
        .values({
          facetValueId: id,
          locale: this.locale,
          storeId: this.storeId,
          label: data.label,
        })
        .onConflictDoUpdate({
          target: [facetValueTranslation.facetValueId, facetValueTranslation.locale],
          set: { label: data.label },
        });
    }

    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(facetValue)
      .where(and(eq(facetValue.storeId, this.storeId), eq(facetValue.id, id)))
      .returning({ id: facetValue.id });
    return rows.length > 0;
  }

  async getByIds(valueIds: readonly string[]): Promise<FacetValue[]> {
    if (valueIds.length === 0) return [];
    return this.connection
      .select()
      .from(facetValue)
      .where(and(eq(facetValue.storeId, this.storeId), inArray(facetValue.id, [...valueIds])));
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
          eq(facetValueTranslation.storeId, this.storeId),
          eq(facetValueTranslation.locale, this.locale),
          inArray(facetValueTranslation.facetValueId, [...valueIds])
        )
      );
  }

  async getSourceChildrenByParentIds(
    parentIds: readonly string[]
  ): Promise<FacetValue[]> {
    const uniqueParentIds = [...new Set(parentIds)];
    if (uniqueParentIds.length === 0) return [];
    return this.connection
      .select()
      .from(facetValue)
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          inArray(facetValue.parentId, uniqueParentIds),
          eq(facetValue.kind, "source")
        )
      )
      .orderBy(asc(facetValue.handle), asc(facetValue.id));
  }

  async getSourceValuesByFacetIds(
    facetIds: readonly string[]
  ): Promise<FacetValue[]> {
    const uniqueFacetIds = [...new Set(facetIds)];
    if (uniqueFacetIds.length === 0) return [];

    return this.connection
      .select()
      .from(facetValue)
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          inArray(facetValue.facetId, uniqueFacetIds),
          eq(facetValue.kind, "source")
        )
      )
      .orderBy(asc(facetValue.facetId), asc(facetValue.handle), asc(facetValue.id));
  }

  async getSourceValuesByFacetTypes(
    facetTypes: readonly FacetSourceValueFacetType[]
  ): Promise<FacetValue[]> {
    const uniqueFacetTypes = [...new Set(facetTypes)];
    if (uniqueFacetTypes.length === 0) return [];

    return this.connection
      .select(facetValueSelectColumns)
      .from(facetValue)
      .innerJoin(
        facet,
        and(eq(facet.id, facetValue.facetId), eq(facet.storeId, facetValue.storeId))
      )
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          eq(facetValue.kind, "source"),
          inArray(facet.facetType, uniqueFacetTypes)
        )
      )
      .orderBy(asc(facetValue.facetId), asc(facetValue.handle), asc(facetValue.id));
  }

  async getSourceValuesByRefs(
    refs: readonly FacetValueRef[]
  ): Promise<FacetValue[]> {
    const uniqueRefs = [
      ...new Map(refs.map((ref) => [`${ref.facetId}:${ref.handle}`, ref])).values(),
    ];
    if (uniqueRefs.length === 0) return [];

    const predicates = uniqueRefs.map((ref) =>
      and(eq(facetValue.facetId, ref.facetId), eq(facetValue.handle, ref.handle))
    );

    return this.connection
      .select()
      .from(facetValue)
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          eq(facetValue.kind, "source"),
          or(...predicates)
        )
      )
      .orderBy(asc(facetValue.facetId), asc(facetValue.handle), asc(facetValue.id));
  }

  async getSourceValuesBySourceRefs(
    refs: readonly FacetSourceValueRef[]
  ): Promise<FacetValue[]> {
    const uniqueRefs = uniqueFacetSourceValueRefs(refs);
    if (uniqueRefs.length === 0) return [];

    const predicates: SQL[] = [];
    for (const ref of uniqueRefs) {
      if (ref.facetType === "TAG") {
        if (ref.sourceHandle !== "tags") continue;

        const valueHandle = normalizeSourceValueHandle(ref);
        predicates.push(
          valueHandle
            ? and(eq(facet.facetType, "TAG"), eq(facetValue.handle, valueHandle))!
            : eq(facet.facetType, "TAG")
        );
        continue;
      }

      const valueHandle = normalizeSourceValueHandle(ref);
      predicates.push(
        valueHandle
          ? and(eq(facet.facetType, ref.facetType), eq(facetValue.handle, valueHandle))!
          : and(
              eq(facet.facetType, ref.facetType),
              sourceValueHandleStartsWith(ref.sourceHandle)
            )!
      );
    }

    if (predicates.length === 0) return [];

    return this.connection
      .select(facetValueSelectColumns)
      .from(facetValue)
      .innerJoin(
        facet,
        and(eq(facet.id, facetValue.facetId), eq(facet.storeId, facetValue.storeId))
      )
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          eq(facetValue.kind, "source"),
          or(...predicates)
        )
      )
      .orderBy(asc(facetValue.facetId), asc(facetValue.handle), asc(facetValue.id));
  }

  async getValidSourceValuesByHandles(
    handles: readonly string[]
  ): Promise<FacetValue[]> {
    const uniqueHandles = [...new Set(handles)];
    if (uniqueHandles.length === 0) return [];

    return this.connection
      .select()
      .from(facetValue)
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          eq(facetValue.kind, "source"),
          inArray(facetValue.handle, uniqueHandles),
          eq(facetValue.enabled, true),
          eq(facetValue.referenceStatus, "VALID")
        )
      )
      .orderBy(asc(facetValue.handle), asc(facetValue.facetId), asc(facetValue.id));
  }

  async getGroupParentsBySourceValueIds(
    valueIds: readonly string[]
  ): Promise<FacetValue[]> {
    const sourceValues = await this.getByIds(valueIds);
    const parentIds = [
      ...new Set(
        sourceValues
          .map((value) => value.parentId)
          .filter((parentId): parentId is string => typeof parentId === "string")
      ),
    ];
    if (parentIds.length === 0) return [];

    return this.connection
      .select()
      .from(facetValue)
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          inArray(facetValue.id, parentIds),
          eq(facetValue.kind, "group")
        )
      );
  }

  async refreshValueStatus(
    id: string,
    referenceStatus: FacetValue["referenceStatus"]
  ): Promise<{
    id: string;
    previousStatus: FacetValue["referenceStatus"];
    nextStatus: FacetValue["referenceStatus"];
    changed: boolean;
  } | null> {
    const existing = await this.connection
      .select({
        id: facetValue.id,
        referenceStatus: facetValue.referenceStatus,
      })
      .from(facetValue)
      .where(and(eq(facetValue.storeId, this.storeId), eq(facetValue.id, id)))
      .limit(1);
    const row = existing[0];
    if (!row) return null;

    const now = new Date().toISOString();
    const updates: Partial<NewFacetValue> = {
      referenceCheckedAt: now,
      updatedAt: now,
    };
    if (row.referenceStatus !== referenceStatus) {
      updates.referenceStatus = referenceStatus;
      updates.referenceStatusChangedAt = now;
    }

    await this.connection
      .update(facetValue)
      .set(updates)
      .where(and(eq(facetValue.storeId, this.storeId), eq(facetValue.id, id)));

    return {
      id,
      previousStatus: row.referenceStatus,
      nextStatus: referenceStatus,
      changed: row.referenceStatus !== referenceStatus,
    };
  }

  async getVisibleValueSourceHandles(
    valueIds: readonly string[]
  ): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>();
    const values = await this.getByIds(valueIds);

    for (const id of valueIds) {
      result.set(id, []);
    }

    const groupIds: string[] = [];
    for (const value of values) {
      if (!value.enabled) {
        continue;
      }

      if (value.kind === "source") {
        result.set(value.id, [value.handle]);
      } else if (value.kind === "group") {
        groupIds.push(value.id);
      }
    }

    const children = await this.getSourceChildrenByParentIds(groupIds);
    const childHandlesByParentId = new Map<string, Set<string>>();
    for (const child of children) {
      if (!child.parentId || !child.enabled) {
        continue;
      }
      const handles = childHandlesByParentId.get(child.parentId) ?? new Set<string>();
      handles.add(child.handle);
      childHandlesByParentId.set(child.parentId, handles);
    }

    for (const groupId of groupIds) {
      result.set(groupId, [...(childHandlesByParentId.get(groupId) ?? [])].sort());
    }

    return result;
  }

  async attachSourcesToGroup(
    groupValueId: string,
    sourceValueIds: string[]
  ): Promise<void> {
    const uniqueSourceValueIds = [...new Set(sourceValueIds)];
    if (uniqueSourceValueIds.length === 0) return;

    await this.connection
      .update(facetValue)
      .set({
        parentId: groupValueId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          inArray(facetValue.id, uniqueSourceValueIds),
          eq(facetValue.kind, "source")
        )
      );
  }

  async detachSources(sourceValueIds: string[]): Promise<void> {
    const uniqueSourceValueIds = [...new Set(sourceValueIds)];
    if (uniqueSourceValueIds.length === 0) return;

    await this.connection
      .update(facetValue)
      .set({
        parentId: null,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(facetValue.storeId, this.storeId),
          inArray(facetValue.id, uniqueSourceValueIds),
          eq(facetValue.kind, "source")
        )
      );
  }
}
