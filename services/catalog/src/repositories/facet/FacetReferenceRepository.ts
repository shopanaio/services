import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import type {
  FacetReferenceChange,
  FacetSourceRef,
  ReferenceStatus,
  ReferenceStatusDelta,
} from "@shopana/events";
import { BaseRepository } from "../BaseRepository.js";
import {
  facet,
  facetSource,
  facetValue,
  product,
  productFeature,
  productFeatureValue,
  productOption,
  productOptionValue,
  productOptionVariantLink,
  productTag,
  tag,
  type FacetSource,
  type FacetValue,
} from "../models/index.js";

export type FacetReferenceSourceRow = Pick<
  FacetSource,
  "id" | "facetId" | "facetType" | "handle" | "referenceStatus"
>;

export type FacetReferenceValueRow = Pick<
  FacetValue,
  "id" | "facetId" | "parentId" | "handle" | "referenceStatus"
>;

export type FacetReferenceDisplayParentRow = Pick<
  FacetValue,
  "id" | "facetId" | "handle" | "referenceStatus"
>;

export class FacetReferenceRepository extends BaseRepository {
  async hydrateProductSnapshotRefs(
    storeId: string,
    productId: string,
    reason: FacetReferenceChange["reason"] = "assignmentChanged"
  ): Promise<FacetReferenceChange[]> {
    const [tagRefs, optionRefs, featureRefs] = await Promise.all([
      this.hydrateProductTagRefs(storeId, productId, reason),
      this.hydrateProductOptionRefs(storeId, productId, reason),
      this.hydrateProductFeatureRefs(storeId, productId, reason),
    ]);

    return [...tagRefs, ...optionRefs, ...featureRefs];
  }

  async hydrateTagRefsByIds(
    storeId: string,
    tagIds: readonly string[],
    reason: FacetReferenceChange["reason"] = "assignmentChanged"
  ): Promise<FacetReferenceChange[]> {
    const ids = unique(tagIds);
    if (ids.length === 0) return [];

    const rows = await this.connection
      .select({ handle: tag.handle })
      .from(tag)
      .where(and(eq(tag.projectId, storeId), inArray(tag.id, ids)));

    return rows.map((row) => ({
      after: tagRef(row.handle),
      reason,
    }));
  }

  async hydrateOptionValueRefsByLinks(
    storeId: string,
    links: ReadonlyArray<{ optionId: string; valueId: string }>
  ): Promise<FacetReferenceChange[]> {
    const optionIds = unique(links.map((link) => link.optionId));
    const valueIds = unique(links.map((link) => link.valueId));
    if (optionIds.length === 0 || valueIds.length === 0) return [];

    const rows = await this.connection
      .select({
        sourceHandle: productOption.slug,
        valueHandle: productOptionValue.slug,
      })
      .from(productOptionValue)
      .innerJoin(
        productOption,
        and(
          eq(productOption.projectId, productOptionValue.projectId),
          eq(productOption.id, productOptionValue.optionId)
        )
      )
      .where(
        and(
          eq(productOptionValue.projectId, storeId),
          inArray(productOption.id, optionIds),
          inArray(productOptionValue.id, valueIds)
        )
      );

    return rows.map((row) => ({
      after: optionRef(row.sourceHandle, row.valueHandle),
      reason: "assignmentChanged",
    }));
  }

  async findAllPersistedSourceRefs(
    storeId: string
  ): Promise<FacetReferenceChange[]> {
    const sourceRows = await this.connection
      .select({
        facetId: facetSource.facetId,
        facetType: facetSource.facetType,
        sourceHandle: facetSource.handle,
      })
      .from(facetSource)
      .where(
        and(
          eq(facetSource.projectId, storeId),
          inArray(facetSource.facetType, ["TAG", "OPTION", "FEATURE"])
        )
      );

    const valueRows = await this.connection
      .select({
        facetId: facetValue.facetId,
        facetType: facetSource.facetType,
        sourceHandle: facetSource.handle,
        valueHandle: facetValue.handle,
      })
      .from(facetValue)
      .innerJoin(
        facetSource,
        and(
          eq(facetSource.projectId, facetValue.projectId),
          eq(facetSource.facetId, facetValue.facetId)
        )
      )
      .where(
        and(
          eq(facetValue.projectId, storeId),
          eq(facetValue.kind, "source"),
          inArray(facetSource.facetType, ["TAG", "OPTION", "FEATURE"])
        )
      );

    return [
      ...sourceRows.map((row) => ({
        after: {
          facetType: normalizeFacetType(row.facetType),
          sourceHandle: row.sourceHandle,
        },
        reason: "sourceUpdated" as const,
      })),
      ...valueRows.flatMap((row) => {
        const ref = persistedValueRef(
          normalizeFacetType(row.facetType),
          row.sourceHandle,
          row.valueHandle
        );
        return ref ? [{ after: ref, reason: "sourceValueUpdated" as const }] : [];
      }),
    ];
  }

  async findAffectedSources(
    storeId: string,
    refs: readonly FacetSourceRef[]
  ): Promise<FacetReferenceSourceRow[]> {
    const sourceRefs = uniqueSourceRefs(refs);
    if (sourceRefs.length === 0) return [];

    const sourceHandles = unique(sourceRefs.map((ref) => ref.sourceHandle));
    const facetTypes = unique(sourceRefs.map((ref) => ref.facetType));
    const sourceKeys = new Set(sourceRefs.map(sourceKey));

    const rows = await this.connection
      .select({
        id: facetSource.id,
        facetId: facetSource.facetId,
        facetType: facetSource.facetType,
        handle: facetSource.handle,
        referenceStatus: facetSource.referenceStatus,
      })
      .from(facetSource)
      .where(
        and(
          eq(facetSource.projectId, storeId),
          inArray(facetSource.facetType, facetTypes),
          inArray(facetSource.handle, sourceHandles)
        )
      )
      .orderBy(asc(facetSource.facetId), asc(facetSource.handle));

    return rows.filter((row) =>
      sourceKeys.has(sourceKey({
        facetType: normalizeFacetType(row.facetType),
        sourceHandle: row.handle,
      }))
    );
  }

  async findAffectedSourceValues(
    storeId: string,
    refs: readonly FacetSourceRef[],
    sources: readonly FacetReferenceSourceRow[]
  ): Promise<FacetReferenceValueRow[]> {
    const valueRefs = refs.filter((ref) => ref.facetValueHandle);
    if (valueRefs.length === 0 || sources.length === 0) return [];

    const sourceByKey = new Map(
      sources.map((source) => [
        sourceKey({
          facetType: normalizeFacetType(source.facetType),
          sourceHandle: source.handle,
        }),
        source,
      ])
    );
    const facetIds = unique(
      valueRefs.flatMap((ref) => {
        const source = sourceByKey.get(sourceKey(ref));
        return source ? [source.facetId] : [];
      })
    );
    const handles = unique(
      valueRefs.flatMap((ref) => ref.facetValueHandle ?? [])
    );
    if (facetIds.length === 0 || handles.length === 0) return [];

    const allowed = new Set(
      valueRefs.flatMap((ref) => {
        const source = sourceByKey.get(sourceKey(ref));
        return source && ref.facetValueHandle
          ? [`${source.facetId}\0${ref.facetValueHandle}`]
          : [];
      })
    );

    const rows = await this.connection
      .select({
        id: facetValue.id,
        facetId: facetValue.facetId,
        parentId: facetValue.parentId,
        handle: facetValue.handle,
        referenceStatus: facetValue.referenceStatus,
      })
      .from(facetValue)
      .where(
        and(
          eq(facetValue.projectId, storeId),
          eq(facetValue.kind, "source"),
          inArray(facetValue.facetId, facetIds),
          inArray(facetValue.handle, handles)
        )
      )
      .orderBy(asc(facetValue.facetId), asc(facetValue.handle));

    return rows.filter((row) => allowed.has(`${row.facetId}\0${row.handle}`));
  }

  async findDisplayParents(
    storeId: string,
    sourceValueIds: readonly string[]
  ): Promise<Map<string, FacetReferenceDisplayParentRow>> {
    const ids = unique(sourceValueIds);
    if (ids.length === 0) return new Map();

    const sourceRows = await this.connection
      .select({
        id: facetValue.id,
        parentId: facetValue.parentId,
      })
      .from(facetValue)
      .where(and(eq(facetValue.projectId, storeId), inArray(facetValue.id, ids)));

    const parentIds = unique(
      sourceRows.flatMap((row) => (row.parentId ? [row.parentId] : []))
    );
    if (parentIds.length === 0) return new Map();

    const parents = await this.connection
      .select({
        id: facetValue.id,
        facetId: facetValue.facetId,
        handle: facetValue.handle,
        referenceStatus: facetValue.referenceStatus,
      })
      .from(facetValue)
      .where(
        and(
          eq(facetValue.projectId, storeId),
          inArray(facetValue.id, parentIds),
          eq(facetValue.kind, "display"),
          isNull(facetValue.parentId)
        )
      );

    const parentById = new Map(parents.map((row) => [row.id, row]));
    const result = new Map<string, FacetReferenceDisplayParentRow>();
    for (const source of sourceRows) {
      const parent = source.parentId ? parentById.get(source.parentId) : undefined;
      if (parent) {
        result.set(source.id, parent);
      }
    }
    return result;
  }

  async findExistingTagHandles(
    storeId: string,
    handles: readonly string[]
  ): Promise<Set<string>> {
    const uniqueHandles = unique(handles);
    if (uniqueHandles.length === 0) return new Set();

    const rows = await this.connection
      .select({ handle: tag.handle })
      .from(tag)
      .where(and(eq(tag.projectId, storeId), inArray(tag.handle, uniqueHandles)));

    return new Set(rows.map((row) => row.handle));
  }

  async findExistingOptionSourceHandles(
    storeId: string,
    sourceHandles: readonly string[]
  ): Promise<Set<string>> {
    const handles = unique(sourceHandles);
    if (handles.length === 0) return new Set();

    const rows = await this.connection
      .select({ sourceHandle: productOption.slug })
      .from(productOption)
      .innerJoin(
        product,
        and(
          eq(product.projectId, productOption.projectId),
          eq(product.id, productOption.productId),
          isNull(product.deletedAt)
        )
      )
      .where(
        and(
          eq(productOption.projectId, storeId),
          inArray(productOption.slug, handles)
        )
      );

    return new Set(rows.map((row) => row.sourceHandle));
  }

  async findExistingOptionValueHandles(
    storeId: string,
    handles: readonly string[]
  ): Promise<Set<string>> {
    const parsed = parseCompositeHandles(handles);
    if (parsed.sourceHandles.length === 0 || parsed.valueHandles.length === 0) {
      return new Set();
    }

    const rows = await this.connection
      .select({
        sourceHandle: productOption.slug,
        valueHandle: productOptionValue.slug,
      })
      .from(productOptionValue)
      .innerJoin(
        productOption,
        and(
          eq(productOption.projectId, productOptionValue.projectId),
          eq(productOption.id, productOptionValue.optionId)
        )
      )
      .innerJoin(
        product,
        and(
          eq(product.projectId, productOption.projectId),
          eq(product.id, productOption.productId),
          isNull(product.deletedAt)
        )
      )
      .where(
        and(
          eq(productOptionValue.projectId, storeId),
          inArray(productOption.slug, parsed.sourceHandles),
          inArray(productOptionValue.slug, parsed.valueHandles)
        )
      );

    return new Set(
      rows
        .map((row) => `${row.sourceHandle}:${row.valueHandle}`)
        .filter((handle) => parsed.fullHandles.has(handle))
    );
  }

  async findExistingFeatureSourceHandles(
    storeId: string,
    sourceHandles: readonly string[]
  ): Promise<Set<string>> {
    const handles = unique(sourceHandles);
    if (handles.length === 0) return new Set();

    const rows = await this.connection
      .select({ sourceHandle: productFeature.slug })
      .from(productFeature)
      .innerJoin(
        product,
        and(
          eq(product.projectId, productFeature.projectId),
          eq(product.id, productFeature.productId),
          isNull(product.deletedAt)
        )
      )
      .where(
        and(
          eq(productFeature.projectId, storeId),
          eq(productFeature.isGroup, false),
          inArray(productFeature.slug, handles)
        )
      );

    return new Set(rows.map((row) => row.sourceHandle));
  }

  async findExistingFeatureValueHandles(
    storeId: string,
    handles: readonly string[]
  ): Promise<Set<string>> {
    const parsed = parseCompositeHandles(handles);
    if (parsed.sourceHandles.length === 0 || parsed.valueHandles.length === 0) {
      return new Set();
    }

    const rows = await this.connection
      .select({
        sourceHandle: productFeature.slug,
        valueHandle: productFeatureValue.slug,
      })
      .from(productFeatureValue)
      .innerJoin(
        productFeature,
        and(
          eq(productFeature.projectId, productFeatureValue.projectId),
          eq(productFeature.id, productFeatureValue.featureId)
        )
      )
      .innerJoin(
        product,
        and(
          eq(product.projectId, productFeature.projectId),
          eq(product.id, productFeature.productId),
          isNull(product.deletedAt)
        )
      )
      .where(
        and(
          eq(productFeatureValue.projectId, storeId),
          eq(productFeature.isGroup, false),
          inArray(productFeature.slug, parsed.sourceHandles),
          inArray(productFeatureValue.slug, parsed.valueHandles)
        )
      );

    return new Set(
      rows
        .map((row) => `${row.sourceHandle}:${row.valueHandle}`)
        .filter((handle) => parsed.fullHandles.has(handle))
    );
  }

  async refreshSourceStatus(input: {
    storeId: string;
    row: FacetReferenceSourceRow;
    nextStatus: ReferenceStatus;
    checkedAt: string;
  }): Promise<ReferenceStatusDelta | null> {
    const statusChanged = input.row.referenceStatus !== input.nextStatus;
    const updates: Partial<FacetSource> = {
      referenceStatus: input.nextStatus,
      referenceCheckedAt: input.checkedAt,
    };
    if (statusChanged) {
      updates.referenceStatusChangedAt = input.checkedAt;
    }

    await this.connection
      .update(facetSource)
      .set(updates)
      .where(
        and(
          eq(facetSource.projectId, input.storeId),
          eq(facetSource.id, input.row.id)
        )
      );

    return statusChanged
      ? {
          facetId: input.row.facetId,
          entityType: "facetSource",
          entityId: input.row.id,
          handle: input.row.handle,
          previousStatus: input.row.referenceStatus,
          nextStatus: input.nextStatus,
        }
      : null;
  }

  async refreshValueStatus(input: {
    storeId: string;
    row: FacetReferenceValueRow;
    nextStatus: ReferenceStatus;
    checkedAt: string;
    displayParentId?: string;
  }): Promise<ReferenceStatusDelta | null> {
    const statusChanged = input.row.referenceStatus !== input.nextStatus;
    const updates: Partial<FacetValue> = {
      referenceStatus: input.nextStatus,
      referenceCheckedAt: input.checkedAt,
    };
    if (statusChanged) {
      updates.referenceStatusChangedAt = input.checkedAt;
    }

    await this.connection
      .update(facetValue)
      .set(updates)
      .where(
        and(
          eq(facetValue.projectId, input.storeId),
          eq(facetValue.id, input.row.id),
          eq(facetValue.kind, "source")
        )
      );

    return statusChanged
      ? {
          facetId: input.row.facetId,
          entityType: "facetValue",
          entityId: input.row.id,
          handle: input.row.handle,
          previousStatus: input.row.referenceStatus,
          nextStatus: input.nextStatus,
          displayParentId: input.displayParentId,
        }
      : null;
  }

  private async hydrateProductTagRefs(
    storeId: string,
    productId: string,
    reason: FacetReferenceChange["reason"]
  ): Promise<FacetReferenceChange[]> {
    const rows = await this.connection
      .select({ handle: tag.handle })
      .from(productTag)
      .innerJoin(
        tag,
        and(eq(tag.projectId, productTag.projectId), eq(tag.id, productTag.tagId))
      )
      .where(
        and(
          eq(productTag.projectId, storeId),
          eq(productTag.productId, productId)
        )
      );

    return rows.map((row) => ({ after: tagRef(row.handle), reason }));
  }

  private async hydrateProductOptionRefs(
    storeId: string,
    productId: string,
    reason: FacetReferenceChange["reason"]
  ): Promise<FacetReferenceChange[]> {
    const rows = await this.connection
      .select({
        sourceHandle: productOption.slug,
        valueHandle: productOptionValue.slug,
      })
      .from(productOption)
      .leftJoin(
        productOptionValue,
        and(
          eq(productOptionValue.projectId, productOption.projectId),
          eq(productOptionValue.optionId, productOption.id)
        )
      )
      .where(
        and(
          eq(productOption.projectId, storeId),
          eq(productOption.productId, productId)
        )
      );

    return rows.flatMap((row) => [
      { after: optionSourceRef(row.sourceHandle), reason },
      ...(row.valueHandle
        ? [{ after: optionRef(row.sourceHandle, row.valueHandle), reason }]
        : []),
    ]);
  }

  private async hydrateProductFeatureRefs(
    storeId: string,
    productId: string,
    reason: FacetReferenceChange["reason"]
  ): Promise<FacetReferenceChange[]> {
    const rows = await this.connection
      .select({
        sourceHandle: productFeature.slug,
        valueHandle: productFeatureValue.slug,
      })
      .from(productFeature)
      .leftJoin(
        productFeatureValue,
        and(
          eq(productFeatureValue.projectId, productFeature.projectId),
          eq(productFeatureValue.featureId, productFeature.id)
        )
      )
      .where(
        and(
          eq(productFeature.projectId, storeId),
          eq(productFeature.productId, productId),
          eq(productFeature.isGroup, false)
        )
      );

    return rows.flatMap((row) => [
      { after: featureSourceRef(row.sourceHandle), reason },
      ...(row.valueHandle
        ? [{ after: featureRef(row.sourceHandle, row.valueHandle), reason }]
        : []),
    ]);
  }
}

function tagRef(handle: string): FacetSourceRef {
  return {
    facetType: "TAG",
    sourceHandle: "tags",
    valueHandle: handle,
    facetValueHandle: handle,
  };
}

function optionSourceRef(sourceHandle: string): FacetSourceRef {
  return { facetType: "OPTION", sourceHandle };
}

function optionRef(sourceHandle: string, valueHandle: string): FacetSourceRef {
  return {
    facetType: "OPTION",
    sourceHandle,
    valueHandle,
    facetValueHandle: `${sourceHandle}:${valueHandle}`,
  };
}

function featureSourceRef(sourceHandle: string): FacetSourceRef {
  return { facetType: "FEATURE", sourceHandle };
}

function featureRef(sourceHandle: string, valueHandle: string): FacetSourceRef {
  return {
    facetType: "FEATURE",
    sourceHandle,
    valueHandle,
    facetValueHandle: `${sourceHandle}:${valueHandle}`,
  };
}

function persistedValueRef(
  facetType: FacetSourceRef["facetType"],
  sourceHandle: string,
  persistedHandle: string
): FacetSourceRef | null {
  if (facetType === "TAG") {
    return {
      facetType,
      sourceHandle,
      valueHandle: persistedHandle,
      facetValueHandle: persistedHandle,
    };
  }

  const parsed = splitCompositeHandle(persistedHandle);
  if (!parsed || parsed.sourceHandle !== sourceHandle) {
    return null;
  }

  return {
    facetType,
    sourceHandle,
    valueHandle: parsed.valueHandle,
    facetValueHandle: persistedHandle,
  };
}

function normalizeFacetType(value: string): FacetSourceRef["facetType"] {
  return value as FacetSourceRef["facetType"];
}

function sourceKey(ref: Pick<FacetSourceRef, "facetType" | "sourceHandle">): string {
  return `${ref.facetType}\0${ref.sourceHandle}`;
}

function uniqueSourceRefs(
  refs: readonly FacetSourceRef[]
): Array<Pick<FacetSourceRef, "facetType" | "sourceHandle">> {
  const seen = new Set<string>();
  const result: Array<Pick<FacetSourceRef, "facetType" | "sourceHandle">> = [];
  for (const ref of refs) {
    const key = sourceKey(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ facetType: ref.facetType, sourceHandle: ref.sourceHandle });
  }
  return result;
}

function parseCompositeHandles(handles: readonly string[]): {
  sourceHandles: string[];
  valueHandles: string[];
  fullHandles: Set<string>;
} {
  const parsed = handles.flatMap((handle) => {
    const value = splitCompositeHandle(handle);
    return value ? [value] : [];
  });

  return {
    sourceHandles: unique(parsed.map((item) => item.sourceHandle)),
    valueHandles: unique(parsed.map((item) => item.valueHandle)),
    fullHandles: new Set(parsed.map((item) => `${item.sourceHandle}:${item.valueHandle}`)),
  };
}

function splitCompositeHandle(
  handle: string
): { sourceHandle: string; valueHandle: string } | null {
  const separator = handle.indexOf(":");
  if (separator <= 0 || separator === handle.length - 1) {
    return null;
  }
  return {
    sourceHandle: handle.slice(0, separator),
    valueHandle: handle.slice(separator + 1),
  };
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
