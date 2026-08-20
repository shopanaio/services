import type { Catalog } from "@shopana/broker-types";
import type { ContextStore } from "@shopana/shared-context";
import { aggregateResolvedDemand, buildCheckoutAvailability } from "./availability.js";
import { contentRevision } from "./canonicalJson.js";
import {
  validateComponentSelections,
  type SelectedComponentItem,
} from "./ComponentSelectionValidator.js";
import type {
  CheckoutMerchandiseSourceReader,
  CheckoutCatalogRow,
  FlatCheckoutMerchandiseLine,
  ResolvedCheckoutMerchandiseEntry,
} from "./contracts.js";
import {
  CheckoutMerchandiseInfrastructureError,
  CheckoutMerchandiseInvariantError,
} from "./errors.js";

interface PreparedLine {
  source: FlatCheckoutMerchandiseLine;
  row: CheckoutCatalogRow | null;
  rejection: Catalog.CheckoutMerchandiseLineRejectionCode | null;
  selectedItem: SelectedComponentItem | undefined;
}

export class CheckoutMerchandiseService {
  constructor(private readonly repository: CheckoutMerchandiseSourceReader) {}

  async resolve(
    params: Catalog.ResolveCheckoutMerchandiseParams,
    store: ContextStore,
  ): Promise<Catalog.ResolveCheckoutMerchandiseResult> {
    if (params.currencyCode !== store.currencyCode) {
      return {
        ok: false,
        code: "CHECKOUT_MERCHANDISE_RESOLUTION_FAILED",
        message: "Checkout currency must match store currency",
        retryable: false,
      };
    }

    const flat = flattenCheckoutLines(params.lines);
    if (flat.length === 0) {
      return {
        ok: true,
        merchandiseRevision: contentRevision("catalog-merchandise", []),
        availabilityRevision: contentRevision("catalog-availability", []),
        lines: [],
      };
    }

    let source: Map<string, CheckoutCatalogRow>;
    try {
      source = await this.repository.read({
        storeId: store.id,
        variantIds: [...new Set(flat.map((row) => row.input.variantId))],
        currencyCode: params.currencyCode,
        requestedLocale: params.localeCode ?? store.defaultLocale,
        defaultLocale: store.defaultLocale,
        effectiveAt: params.effectiveAt,
      });
    } catch (cause) {
      if (cause instanceof CheckoutMerchandiseInvariantError) throw cause;
      throw new CheckoutMerchandiseInfrastructureError(
        "Catalog checkout source snapshot could not be read",
        cause,
      );
    }

    const componentValidation = validateComponentSelections(flat, source);
    const prepared = prepareLines(
      flat,
      source,
      componentValidation.invalidParentLineIds,
      componentValidation.selectedItemsByLineId,
      params.effectiveAt,
    );
    const resolvedEntries: ResolvedCheckoutMerchandiseEntry[] = prepared.flatMap(
      ({ source: sourceLine, row, rejection }) =>
        rejection === null && row !== null ? [{ source: sourceLine, row }] : [],
    );
    const aggregateDemand = aggregateResolvedDemand(resolvedEntries);
    const lines = prepared.map((entry) =>
      buildLineResolution(entry, aggregateDemand, params.currencyCode),
    );

    return {
      ok: true,
      merchandiseRevision: contentRevision(
        "catalog-merchandise",
        lines.map((row) =>
          row.status === "RESOLVED"
            ? {
                status: row.status,
                lineId: row.line.lineId,
                revision: row.line.revision,
                price: row.line.price,
                component: row.line.componentSelection,
              }
            : row,
        ),
      ),
      availabilityRevision: contentRevision(
        "catalog-availability",
        lines.map((row) =>
          row.status === "RESOLVED"
            ? { lineId: row.line.lineId, availability: row.line.availability }
            : { lineId: row.lineId, status: row.status },
        ),
      ),
      lines,
    };
  }
}

export function flattenCheckoutLines(
  lines: readonly Catalog.ResolveCheckoutMerchandiseLineInput[],
  parentLineId: string | null = null,
  multiplier = 1,
): FlatCheckoutMerchandiseLine[] {
  const result: FlatCheckoutMerchandiseLine[] = [];
  for (const input of lines) {
    const absoluteQuantity = multiplier * input.quantity;
    result.push({ input, parentLineId, absoluteQuantity });
    result.push(...flattenCheckoutLines(input.children, input.lineId, absoluteQuantity));
  }
  return result;
}

function prepareLines(
  flat: readonly FlatCheckoutMerchandiseLine[],
  rows: ReadonlyMap<string, CheckoutCatalogRow>,
  invalidParentLineIds: ReadonlySet<string>,
  selectedItemsByLineId: ReadonlyMap<string, SelectedComponentItem>,
  effectiveAt: string,
): PreparedLine[] {
  const rejectedLineIds = new Set<string>();
  return flat.map((source) => {
    const parentRejected = source.parentLineId !== null && rejectedLineIds.has(source.parentLineId);
    const row = rows.get(source.input.variantId) ?? null;
    const rejection =
      parentRejected || invalidParentLineIds.has(source.input.lineId)
        ? "INVALID_COMPONENT_SELECTION"
        : merchandiseRejectionCode(row, effectiveAt);
    if (rejection !== null) rejectedLineIds.add(source.input.lineId);
    return {
      source,
      row,
      rejection,
      selectedItem: selectedItemsByLineId.get(source.input.lineId),
    };
  });
}

function merchandiseRejectionCode(
  row: CheckoutCatalogRow | null,
  effectiveAt: string,
): Catalog.CheckoutMerchandiseLineRejectionCode | null {
  if (!row) return "VARIANT_NOT_FOUND";
  if (!row.product) return "PRODUCT_NOT_FOUND";
  if (
    row.product.publishedAt === null ||
    Date.parse(row.product.publishedAt) > Date.parse(effectiveAt)
  ) {
    return "PRODUCT_NOT_PUBLISHED";
  }
  if (!row.supportsCurrency) return "CURRENCY_NOT_SUPPORTED";
  if (row.prices.length === 0) return "PRICE_NOT_FOUND";
  if (row.prices.length !== 1) {
    throw new CheckoutMerchandiseInvariantError(
      `Multiple active prices for variant ${row.variant.id}`,
      { variantId: row.variant.id, activePriceIds: row.prices.map(({ id }) => id) },
    );
  }
  return null;
}

function buildLineResolution(
  prepared: PreparedLine,
  aggregateDemand: ReadonlyMap<string, number>,
  currencyCode: string,
): Catalog.ResolveCheckoutMerchandiseLineResolution {
  if (prepared.rejection !== null || prepared.row === null) {
    const rejection = prepared.rejection ?? "VARIANT_NOT_FOUND";
    return {
      status: "REJECTED",
      lineId: prepared.source.input.lineId,
      parentLineId: prepared.source.parentLineId,
      variantId: prepared.source.input.variantId,
      componentItemId: prepared.source.input.componentSelection?.componentItemId ?? null,
      code: rejection,
      message: rejection.replaceAll("_", " ").toLowerCase(),
    };
  }
  return {
    status: "RESOLVED",
    line: buildResolvedLine(
      prepared.source,
      prepared.row,
      aggregateDemand.get(prepared.source.input.variantId) ?? 0,
      currencyCode,
      prepared.selectedItem,
    ),
  };
}

function buildResolvedLine(
  source: FlatCheckoutMerchandiseLine,
  row: CheckoutCatalogRow,
  aggregateDemand: number,
  currencyCode: string,
  selectedItem?: SelectedComponentItem,
): Catalog.ResolvedCheckoutMerchandiseLine {
  const price = row.prices[0]!;
  const configuration = row.configuration;
  const selected = source.input.componentSelection
    ? (selectedItem ??
      configuration?.items.find(
        (item) => item.id === source.input.componentSelection!.componentItemId,
      ) ??
      null)
    : null;
  const title =
    row.titles.requestedVariant ??
    row.titles.defaultVariant ??
    row.titles.requestedProduct ??
    row.titles.defaultProduct;
  if (title === null) {
    throw new CheckoutMerchandiseInvariantError(
      `Missing checkout title for variant ${row.variant.id}`,
      { variantId: row.variant.id },
    );
  }

  return {
    lineId: source.input.lineId,
    parentLineId: source.parentLineId,
    variantId: row.variant.id,
    productId: row.variant.productId,
    quantity: source.input.quantity,
    purchase: source.input.purchase,
    revision: contentRevision("catalog-merchandise", {
      variant: row.variant,
      product: row.product,
      titles: row.titles,
      targeting: row.targeting,
      media: row.firstMediaId,
      inventoryPhysical: row.inventory?.requiresShipping ?? false,
      configuration,
      selected,
    }),
    title,
    sku: row.variant.sku ?? row.inventory?.sku ?? null,
    imageUrl: null,
    requiresShipping: row.inventory?.requiresShipping ?? false,
    requiresComponents: configuration
      ? configuration.groups.some((group) => (group.minSelection ?? 0) > 0) ||
        configuration.dependencyRules.some((rule) =>
          rule.actions.some(
            (action) => action.actionType === "SET_REQUIRED" && action.requiredValue === true,
          ),
        )
      : false,
    price: {
      price: { amountMinor: String(price.amountMinor), currencyCode },
      compareAtPrice:
        price.compareAtMinor === null
          ? null
          : { amountMinor: String(price.compareAtMinor), currencyCode },
      revision: contentRevision("catalog-merchandise", price),
    },
    availability: buildCheckoutAvailability(row, aggregateDemand),
    targeting: row.targeting,
    componentConfiguration: configuration
      ? {
          configurationId: configuration.id,
          revision: contentRevision("catalog-component", configuration),
        }
      : null,
    componentSelection:
      selected && configuration
        ? {
            configurationId: configuration.id,
            groupId: selected.groupId,
            componentItemId: selected.id,
            revision: contentRevision("catalog-component", selected),
            priceRule: selected.rule,
          }
        : null,
  };
}
