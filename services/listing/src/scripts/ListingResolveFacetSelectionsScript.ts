import type { Listing } from "@shopana/broker-types";
import { BaseScript } from "../kernel/BaseScript.js";
import type { ListingIndexHydratedSyncAction } from "./listingIndexActionTypes.js";
import { buildListingIndexPayloadHash } from "../workflows/listingIndexWorkflowHelpers.js";

type ListingFacetType = "TAG" | "FEATURE" | "OPTION";

type SourceValueRef = {
  facetType: ListingFacetType;
  sourceHandle: string;
  sourceValueHandle: string;
};

type ResolvedValueRef = {
  facetId: string;
  valueId: string;
};

type ResolveResult = {
  action: ListingIndexHydratedSyncAction;
  warnings: Listing.ListingUpdateWarning[];
};

export class ListingResolveFacetSelectionsScript extends BaseScript<
  ListingIndexHydratedSyncAction,
  ResolveResult
> {
  protected async execute(
    action: ListingIndexHydratedSyncAction
  ): Promise<ResolveResult> {
    const refs = collectSourceValueRefs(action.params.item);
    if (refs.length === 0) {
      return {
        action,
        warnings: action.warnings ? [...action.warnings] : [],
      };
    }

    const sourceValues =
      await this.repository.facetValue.getValidSourceValuesByHandles(
        refs.map((ref) => ref.sourceValueHandle)
      );
    const displayParents =
      await this.repository.facetValue.getDisplayParentsBySourceValueIds(
        sourceValues.map((value) => value.id)
      );

    const displayParentById = new Map(
      displayParents.map((value) => [value.id, value])
    );
    const sourceValueByHandle = new Map(
      sourceValues.map((value) => [value.handle, value])
    );
    const resolved = new Map<string, ResolvedValueRef>();
    const warnings = action.warnings ? [...action.warnings] : [];

    for (const ref of refs) {
      const sourceValue = sourceValueByHandle.get(ref.sourceValueHandle);
      if (!sourceValue) {
        warnings.push(buildWarning("LISTING_FACET_VALUE_NOT_CONFIGURED", ref));
        continue;
      }

      const displayParent = sourceValue.parentId
        ? displayParentById.get(sourceValue.parentId)
        : null;
      if (
        sourceValue.parentId &&
        (!displayParent ||
          !displayParent.enabled ||
          displayParent.referenceStatus !== "VALID")
      ) {
        warnings.push(buildWarning("LISTING_FACET_VALUE_NOT_CONFIGURED", ref));
        continue;
      }

      resolved.set(sourceValueRefKey(ref), {
        facetId: displayParent?.facetId ?? sourceValue.facetId,
        valueId: displayParent?.id ?? sourceValue.id,
      });
    }

    const item = resolveItem(action.params.item, resolved);
    const nextAction: ListingIndexHydratedSyncAction = {
      ...action,
      params: {
        ...action.params,
        item,
      },
      payloadHash: buildListingIndexPayloadHash({
        type: "syncSellableItem",
        params: {
          ...action.params,
          item,
        },
      }),
      warnings: dedupeWarnings(warnings),
    };

    this.logWarnings(nextAction);

    return {
      action: nextAction,
      warnings: nextAction.warnings ?? [],
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }

  private logWarnings(action: ListingIndexHydratedSyncAction): void {
    if (!action.warnings || action.warnings.length === 0) {
      return;
    }

    this.logger.warn(
      {
        storeId: action.params.storeId,
        itemId: action.params.item.id,
        warningCount: action.warnings.length,
        warningCodes: [...new Set(action.warnings.map((warning) => warning.code))],
      },
      "Listing facet selections were partially resolved"
    );
  }
}

function collectSourceValueRefs(
  item: Listing.ListingSellableItemSnapshot
): SourceValueRef[] {
  return uniqueRefs([
    ...item.productFacets.flatMap(facetSelectionRefs),
    ...item.variants.flatMap((variant) =>
      variant.facets.flatMap(facetSelectionRefs)
    ),
  ]);
}

function facetSelectionRefs(
  selection: Listing.ListingFacetSelectionSnapshot
): SourceValueRef[] {
  const facetType = normalizeFacetType(selection.facet.type);
  if (!facetType) {
    return [];
  }

  const sourceHandle =
    facetType === "TAG" ? "tags" : selection.facet.handle.trim();
  if (!sourceHandle) {
    return [];
  }

  return selection.values
    .map((value) => {
      const valueHandle = value.handle.trim();
      if (!valueHandle) return null;
      return {
        facetType,
        sourceHandle,
        sourceValueHandle: toSourceValueHandle(
          facetType,
          sourceHandle,
          valueHandle
        ),
      };
    })
    .filter((ref): ref is SourceValueRef => ref !== null);
}

function resolveItem(
  item: Listing.ListingSellableItemSnapshot,
  resolved: ReadonlyMap<string, ResolvedValueRef>
): Listing.ListingSellableItemSnapshot {
  return {
    ...item,
    productFacets: resolveSelections(item.productFacets, resolved),
    variants: item.variants.map((variant) => ({
      ...variant,
      facets: resolveSelections(variant.facets, resolved),
    })),
  };
}

function resolveSelections(
  selections: readonly Listing.ListingFacetSelectionSnapshot[],
  resolved: ReadonlyMap<string, ResolvedValueRef>
): Listing.ListingFacetSelectionSnapshot[] {
  return selections
    .map((selection) => resolveSelection(selection, resolved))
    .filter(
      (selection): selection is Listing.ListingFacetSelectionSnapshot =>
        selection !== null
    );
}

function resolveSelection(
  selection: Listing.ListingFacetSelectionSnapshot,
  resolved: ReadonlyMap<string, ResolvedValueRef>
): Listing.ListingFacetSelectionSnapshot | null {
  const facetType = normalizeFacetType(selection.facet.type);
  if (!facetType) {
    return selection;
  }

  const sourceHandle =
    facetType === "TAG" ? "tags" : selection.facet.handle.trim();
  const valuesById = new Map<string, Listing.ListingFacetValueRef>();
  let facetId: string | null = null;

  for (const value of selection.values) {
    const valueHandle = value.handle.trim();
    const item = resolved.get(
      sourceValueRefKey({
        facetType,
        sourceHandle,
        sourceValueHandle: toSourceValueHandle(
          facetType,
          sourceHandle,
          valueHandle
        ),
      })
    );
    if (!item) {
      continue;
    }

    facetId = item.facetId;
    valuesById.set(item.valueId, {
      ...value,
      id: item.valueId,
    });
  }

  const values = [...valuesById.values()];
  if (!facetId || values.length === 0) {
    return null;
  }

  return {
    ...selection,
    facet: {
      ...selection.facet,
      id: facetId,
    },
    values,
  };
}

function normalizeFacetType(
  type: Listing.ListingFacetRef["type"]
): ListingFacetType | null {
  if (type === "tag") return "TAG";
  if (type === "feature") return "FEATURE";
  if (type === "option") return "OPTION";
  return null;
}

function toSourceValueHandle(
  facetType: ListingFacetType,
  sourceHandle: string,
  valueHandle: string
): string {
  if (facetType === "TAG") {
    return valueHandle;
  }

  const prefix = `${sourceHandle}:`;
  return valueHandle.startsWith(prefix) ? valueHandle : `${prefix}${valueHandle}`;
}

function sourceValueRefKey(ref: SourceValueRef): string {
  return `${ref.facetType}:${ref.sourceHandle}:${ref.sourceValueHandle}`;
}

function uniqueRefs(refs: SourceValueRef[]): SourceValueRef[] {
  return [...new Map(refs.map((ref) => [sourceValueRefKey(ref), ref])).values()];
}

function buildWarning(
  code: "LISTING_FACET_VALUE_NOT_CONFIGURED",
  ref: SourceValueRef
): Listing.ListingUpdateWarning {
  return {
    code,
    field: ["item", "facets"],
    message: `${ref.facetType} source facet value is not configured or not valid in listing: ${ref.sourceValueHandle}`,
  };
}

function dedupeWarnings(
  warnings: readonly Listing.ListingUpdateWarning[]
): Listing.ListingUpdateWarning[] {
  return [
    ...new Map(
      warnings.map((warning) => [
        JSON.stringify([warning.code, warning.field ?? [], warning.message]),
        warning,
      ])
    ).values(),
  ];
}
