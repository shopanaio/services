import type { Catalog } from "@shopana/broker-types";
import type { ContextStore } from "@shopana/shared-context";
import { CheckoutMerchandiseService } from "../CheckoutMerchandiseService.js";
import type { CheckoutCatalogRow, CheckoutMerchandiseSourceReader } from "../contracts.js";
import { CheckoutMerchandiseInfrastructureError, toCheckoutMerchandiseFailure } from "../errors.js";

const effectiveAt = "2026-08-02T12:00:00.000Z";
const store = {
  id: "store-a",
  currencyCode: "USD",
  defaultLocale: "en",
} as ContextStore;

describe("CheckoutMerchandiseService", () => {
  it("returns stable empty snapshots without reading Catalog", async () => {
    const reader = sourceReader(new Map());
    const result = await service(reader).resolve(params([]), store);

    expect(result).toMatchObject({ ok: true, lines: [] });
    expect(result.ok && result.merchandiseRevision).toMatch(/^catalog-merchandise:v1:/);
    expect(result.ok && result.availabilityRevision).toMatch(/^catalog-availability:v1:/);
    expect(reader.read).not.toHaveBeenCalled();
  });

  it("resolves a simple tracked product", async () => {
    const reader = sourceReader(new Map([["variant-a", catalogRow("variant-a", { sellable: 3 })]]));
    const result = await service(reader).resolve(params([line("line-a", "variant-a", 2)]), store);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({
      status: "RESOLVED",
      line: {
        lineId: "line-a",
        availability: { available: true, availableQuantity: 3 },
      },
    });
  });

  it("returns an explicit disposition for unpublished merchandise", async () => {
    const result = await service(
      sourceReader(
        new Map([["unpublished", catalogRow("unpublished", { sellable: 1, publishedAt: null })]]),
      ),
    ).resolve(params([line("line-a", "unpublished", 1)]), store);

    expect(result).toMatchObject({
      ok: true,
      lines: [
        {
          status: "REJECTED",
          lineId: "line-a",
          code: "PRODUCT_NOT_PUBLISHED",
        },
      ],
    });
  });

  it("materializes nested demand before evaluating child availability", async () => {
    const parent = catalogRow("parent", {
      configuration: configuration("component-item", "child"),
      sellable: 10,
    });
    const child = catalogRow("child", { sellable: 5 });
    const nested = line("parent-line", "parent", 2, [
      line("child-line", "child", 3, [], "component-item"),
    ]);
    const result = await service(
      sourceReader(
        new Map([
          ["parent", parent],
          ["child", child],
        ]),
      ),
    ).resolve(params([nested]), store);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0]).toMatchObject({ status: "RESOLVED" });
    expect(result.lines[1]).toMatchObject({
      status: "RESOLVED",
      line: {
        lineId: "child-line",
        availability: {
          available: false,
          unavailabilityReason: "INSUFFICIENT_STOCK",
        },
      },
    });
  });

  it("excludes rejected component branches from aggregate variant demand", async () => {
    const parent = catalogRow("parent", {
      configuration: configuration("expected-item", "different-variant"),
      sellable: 10,
    });
    const shared = catalogRow("shared", { sellable: 1 });
    const invalidTree = line("parent-line", "parent", 1, [
      line("rejected-child", "shared", 5, [], "expected-item"),
    ]);
    const independent = line("independent-line", "shared", 1);
    const result = await service(
      sourceReader(
        new Map([
          ["parent", parent],
          ["shared", shared],
        ]),
      ),
    ).resolve(params([invalidTree, independent]), store);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines.slice(0, 2)).toEqual([
      expect.objectContaining({
        status: "REJECTED",
        lineId: "parent-line",
        code: "INVALID_COMPONENT_SELECTION",
      }),
      expect.objectContaining({
        status: "REJECTED",
        lineId: "rejected-child",
        code: "INVALID_COMPONENT_SELECTION",
      }),
    ]);
    expect(result.lines[2]).toMatchObject({
      status: "RESOLVED",
      line: {
        lineId: "independent-line",
        availability: { available: true, availableQuantity: 1 },
      },
    });
  });

  it("marks every occurrence unavailable when aggregate stock is insufficient", async () => {
    const result = await service(
      sourceReader(new Map([["shared", catalogRow("shared", { sellable: 1 })]])),
    ).resolve(params([line("first", "shared", 1), line("second", "shared", 1)]), store);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.lines.map((resolution) =>
        resolution.status === "RESOLVED" ? resolution.line.availability : null,
      ),
    ).toEqual([
      expect.objectContaining({
        available: false,
        unavailabilityReason: "INSUFFICIENT_STOCK",
      }),
      expect.objectContaining({
        available: false,
        unavailabilityReason: "INSUFFICIENT_STOCK",
      }),
    ]);
  });

  it("uses only the trusted Store ID and treats an absent cross-tenant row as missing", async () => {
    const reader = sourceReader(new Map());
    const result = await service(reader).resolve(
      params([line("foreign-line", "foreign-variant", 1)]),
      store,
    );

    expect(reader.read).toHaveBeenCalledWith(expect.objectContaining({ storeId: "store-a" }));
    expect(result).toMatchObject({
      ok: true,
      lines: [
        {
          status: "REJECTED",
          lineId: "foreign-line",
          code: "VARIANT_NOT_FOUND",
        },
      ],
    });
  });

  it("wraps source failures and never marks unknown errors retryable", async () => {
    const reader: CheckoutMerchandiseSourceReader = {
      read: jest.fn(async () => {
        throw new Error("database unavailable");
      }),
    };

    await expect(
      service(reader).resolve(params([line("line-a", "variant-a", 1)]), store),
    ).rejects.toMatchObject({
      name: "CheckoutMerchandiseInfrastructureError",
      retryable: true,
    });
    expect(
      toCheckoutMerchandiseFailure(new CheckoutMerchandiseInfrastructureError("unavailable")),
    ).toMatchObject({ retryable: true });
    expect(toCheckoutMerchandiseFailure(new Error("unknown"))).toMatchObject({
      retryable: false,
    });
  });

  it("classifies overlapping active prices as a retryable data invariant", async () => {
    const row = catalogRow("variant-a", { sellable: 1 });
    row.prices.push({ ...row.prices[0]!, id: "overlapping-price" });

    await expect(
      service(sourceReader(new Map([["variant-a", row]]))).resolve(
        params([line("line-a", "variant-a", 1)]),
        store,
      ),
    ).rejects.toMatchObject({
      name: "CheckoutMerchandiseInvariantError",
      code: "CATALOG_CHECKOUT_DATA_INVARIANT",
      retryable: true,
    });
  });
});

function service(reader: CheckoutMerchandiseSourceReader) {
  return new CheckoutMerchandiseService(reader);
}

function sourceReader(rows: Map<string, CheckoutCatalogRow>) {
  return {
    read: jest.fn(async () => rows),
  } satisfies CheckoutMerchandiseSourceReader;
}

function params(
  lines: Catalog.ResolveCheckoutMerchandiseLineInput[],
): Catalog.ResolveCheckoutMerchandiseParams {
  return {
    storeId: store.id,
    currencyCode: store.currencyCode,
    localeCode: "en",
    effectiveAt,
    lines,
  };
}

function line(
  lineId: string,
  variantId: string,
  quantity: number,
  children: Catalog.ResolveCheckoutMerchandiseLineInput[] = [],
  componentItemId: string | null = null,
): Catalog.ResolveCheckoutMerchandiseLineInput {
  return {
    lineId,
    variantId,
    componentSelection: componentItemId === null ? null : { componentItemId },
    purchase: { type: "ONE_TIME", sellingPlanId: null },
    quantity,
    children,
  };
}

function catalogRow(
  variantId: string,
  options: {
    sellable: number;
    configuration?: CheckoutCatalogRow["configuration"];
    publishedAt?: string | null;
  },
): CheckoutCatalogRow {
  const productId = `product-${variantId}`;
  return {
    variant: { id: variantId, productId, sku: `sku-${variantId}` },
    product: {
      id: productId,
      publishedAt: options.publishedAt === undefined ? effectiveAt : options.publishedAt,
    },
    prices: [
      {
        id: `price-${variantId}`,
        variantId,
        amountMinor: 100,
        compareAtMinor: null,
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        effectiveTo: null,
      },
    ],
    supportsCurrency: true,
    inventory: {
      id: `inventory-${variantId}`,
      variantId,
      sku: null,
      trackInventory: true,
      continueSellingWhenOutOfStock: false,
      requiresShipping: true,
    },
    stocks: [
      {
        id: `stock-${variantId}`,
        warehouseId: "warehouse-a",
        variantId,
        quantityOnHand: options.sellable,
        reservedQty: 0,
        unavailableQty: 0,
      },
    ],
    titles: {
      requestedVariant: `Title ${variantId}`,
      defaultVariant: null,
      requestedProduct: null,
      defaultProduct: null,
    },
    targeting: {
      categoryIds: [],
      tagIds: [],
      featureIds: [],
      optionValueIds: [],
    },
    firstMediaId: null,
    configuration: options.configuration ?? null,
  } as unknown as CheckoutCatalogRow;
}

function configuration(
  componentItemId: string,
  refVariantId: string,
): NonNullable<CheckoutCatalogRow["configuration"]> {
  return {
    id: "configuration-a",
    updatedAt: effectiveAt,
    groups: [{ id: "group-a", minSelection: 1, maxSelection: 1, sortIndex: 0 }],
    items: [
      {
        id: componentItemId,
        groupId: "group-a",
        itemType: "VARIANT",
        refProductId: null,
        refVariantId,
        minQty: 1,
        maxQty: 10,
        visible: true,
        sortIndex: 0,
        updatedAt: effectiveAt,
        rule: { strategy: "BASE" },
      },
    ],
    dependencyRules: [],
  };
}
