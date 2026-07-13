import type {
  ApiFacet,
  ApiListingFacet,
  ApiListingOrderByInput,
  ApiListingProductFilter,
  ApiProduct,
} from '@codegen/admin-gql';
import type { CategoryData } from '@fixtures/admin/category';
import type { ApiFixtures } from '@fixtures/api/api';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

type Api = ApiFixtures['api'];
type OptionValues = Record<string, string>;

interface FacetDefinition {
  sourceSlug: string;
  facetSlug: string;
  label: string;
  values: { handle: string; label: string }[];
}

interface ProductDefinition {
  title: string;
  handle: string;
  options: OptionValues;
  priceMinor: number;
  stock: number;
}

interface ListingSnapshot {
  totalCount: number;
  productIds: string[];
  facets: ApiListingFacet[];
}

interface ListingComparison {
  totalCount: number;
  productIds: string[];
  facetCounts: Record<string, Record<string, number | null>>;
  availableCount: number | null;
  selectedFacetValues: Record<string, string[]>;
}

interface SearchListingComparison extends ListingComparison {
  pageSizes: number[];
  totalCounts: number[];
  hasNextPages: boolean[];
  hasPreviousPages: boolean[];
  cursorCount: number;
  uniqueCursorCount: number;
  pageCursorBoundsMatch: boolean;
}

test.describe('Listing and search lifecycle', () => {
  test.describe.configure({ timeout: 300_000 });

  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore({
      defaultCurrency: 'USD',
      locales: ['en'],
      currencies: ['USD'],
    });
  });

  test('keeps category listing and search results consistent across lifecycle changes with sorts, facets, and pagination', async ({
    api,
  }) => {
    const unique = crypto.randomUUID().slice(0, 8);
    const searchTerm = 'Voyager';
    const facets = facetDefinitions(unique);
    const category = await api.admin.category.create({
      handle: `search-lifecycle-category-${unique}`,
      name: 'Search Lifecycle Listing Category',
    });
    const warehouse = await createWarehouse(api, `SEARCH-LIFE-${unique}`);

    const { data: settingsData } = await api.admin.mutation(
      'listing-api/ListingSearchSettingsUpdate',
      {
        variables: {
          expectedVersion: 0,
          operations: {
            settings: {
              fields: [{ field: 'PRODUCT_TITLE', weight: 10 }],
              typoToleranceEnabled: true,
              outOfStockPolicy: 'PLACE_LAST',
            },
          },
        },
      },
    );
    expect(settingsData.listingMutation.search.settingsUpdate.userErrors).toHaveLength(0);

    await createSourceProducts(api, unique, facets);
    const createdFacets = await createOptionFacets(api, facets);
    const productDefinitions = productMatrix(unique, facets, 8);
    addSearchCohortToTitles(
      productDefinitions,
      searchTerm,
      productDefinitions.map((_product, index) => index),
    );

    const products: ApiProduct[] = [];
    for (const definition of productDefinitions) {
      products.push(
        await createListingProduct(api, {
          definition,
          category,
          warehouseId: warehouse.id,
        }),
      );
    }

    type ExpectedEntry = { product: ApiProduct; definition: ProductDefinition };
    const allEntries: ExpectedEntry[] = products.map((product, index) => ({
      product,
      definition: productDefinitions[index],
    }));
    const categoryEntries = [...allEntries];
    const searchEntries = [...allEntries];
    const removeEntry = (entries: ExpectedEntry[], productId: string) => {
      const index = entries.findIndex((entry) => entry.product.id === productId);
      if (index < 0) {
        throw new Error(`Product ${productId} is not tracked by search lifecycle expectations`);
      }
      entries.splice(index, 1);
    };
    const definitionsOf = (entries: ExpectedEntry[]) => entries.map((entry) => entry.definition);
    const productIdsOf = (entries: ExpectedEntry[]) => entries.map((entry) => entry.product.id);
    const priceAscendingIds = (entries: ExpectedEntry[], unavailableProductId?: string) =>
      [...entries]
        .sort((left, right) => {
          const leftUnavailable = left.product.id === unavailableProductId;
          const rightUnavailable = right.product.id === unavailableProductId;
          if (leftUnavailable !== rightUnavailable) {
            return leftUnavailable ? 1 : -1;
          }
          return left.definition.priceMinor - right.definition.priceMinor;
        })
        .map((entry) => entry.product.id);

    await expectCategoryListing(api, category, {
      productIds: productIdsOf(categoryEntries),
      facetCounts: expectedFacetCounts(createdFacets, facets, definitionsOf(categoryEntries)),
    });
    const searchSnapshot = await expectPaginatedSearchListing(api, {
      query: searchTerm,
      first: 3,
      productIds: priceAscendingIds(searchEntries),
      orderBy: { by: 'PRICE', direction: 'asc' },
      facetCounts: expectedFacetCounts(createdFacets, facets, definitionsOf(searchEntries)),
    });

    const sizeSFilter = facetValueInput(searchSnapshot.facets, facets[1].facetSlug, 's');
    const sizeSEntries = searchEntries.filter(
      (entry) => entry.definition.options[facets[1].sourceSlug] === 's',
    );
    const filteredFacetCounts = expectedFilteredFacetCounts(
      createdFacets,
      facets,
      definitionsOf(searchEntries),
      { [facets[1].sourceSlug]: 's' },
    );
    const sortCases: { orderBy: ApiListingOrderByInput; productIds: string[] }[] = [
      {
        orderBy: { by: 'PRICE', direction: 'asc' },
        productIds: priceAscendingIds(sizeSEntries),
      },
      {
        orderBy: { by: 'PRICE', direction: 'desc' },
        productIds: [...sizeSEntries]
          .sort((left, right) => right.definition.priceMinor - left.definition.priceMinor)
          .map((entry) => entry.product.id),
      },
      {
        orderBy: { by: 'NAME' },
        productIds: [...sizeSEntries]
          .sort((left, right) => left.definition.title.localeCompare(right.definition.title))
          .map((entry) => entry.product.id),
      },
    ];

    for (const sortCase of sortCases) {
      await expectPaginatedSearchListing(api, {
        query: searchTerm,
        first: 2,
        productIds: sortCase.productIds,
        facets: [sizeSFilter],
        orderBy: sortCase.orderBy,
        facetCounts: filteredFacetCounts,
        selectedFacetValues: { [facets[1].facetSlug]: ['s'] },
      });
    }

    products[0] = await updateProductStatus(api, products[0], 'DRAFT');
    removeEntry(categoryEntries, products[0].id);
    removeEntry(searchEntries, products[0].id);
    await expectCategoryListing(api, category, {
      productIds: productIdsOf(categoryEntries),
      facetCounts: expectedFacetCounts(createdFacets, facets, definitionsOf(categoryEntries)),
    });
    await expectPaginatedSearchListing(api, {
      query: searchTerm,
      first: 3,
      productIds: priceAscendingIds(searchEntries),
      orderBy: { by: 'PRICE', direction: 'asc' },
      facetCounts: expectedFacetCounts(createdFacets, facets, definitionsOf(searchEntries)),
    });

    products[1] = await removeProductFromCategory(api, products[1], category);
    await expectProductCategoryAssignment(api, products[1], category, false);
    removeEntry(categoryEntries, products[1].id);
    await expectCategoryListing(api, category, {
      productIds: productIdsOf(categoryEntries),
      facetCounts: expectedFacetCounts(createdFacets, facets, definitionsOf(categoryEntries)),
    });
    await expectPaginatedSearchListing(api, {
      query: searchTerm,
      first: 3,
      productIds: priceAscendingIds(searchEntries),
      orderBy: { by: 'PRICE', direction: 'asc' },
      facetCounts: expectedFacetCounts(createdFacets, facets, definitionsOf(searchEntries)),
    });

    products[3] = await updateProductVariantInventory(api, products[3], {
      warehouseId: warehouse.id,
      onHand: 0,
    });
    const unavailableProductId = products[3].id;
    await expectCategoryListing(api, category, {
      productIds: productIdsOf(categoryEntries),
      facetCounts: expectedFacetCounts(createdFacets, facets, definitionsOf(categoryEntries)),
      availableCount: categoryEntries.length - 1,
    });
    await expectPaginatedSearchListing(api, {
      query: searchTerm,
      first: 3,
      productIds: priceAscendingIds(searchEntries, unavailableProductId),
      orderBy: { by: 'PRICE', direction: 'asc' },
      facetCounts: expectedFacetCounts(createdFacets, facets, definitionsOf(searchEntries)),
      availableCount: searchEntries.length - 1,
    });

    await deleteProduct(api, products[2]);
    removeEntry(categoryEntries, products[2].id);
    removeEntry(searchEntries, products[2].id);
    await expectCategoryListing(api, category, {
      productIds: productIdsOf(categoryEntries),
      facetCounts: expectedFacetCounts(createdFacets, facets, definitionsOf(categoryEntries)),
      availableCount: categoryEntries.length - 1,
    });
    await expectPaginatedSearchListing(api, {
      query: searchTerm,
      first: 2,
      productIds: priceAscendingIds(searchEntries, unavailableProductId),
      orderBy: { by: 'PRICE', direction: 'asc' },
      facetCounts: expectedFacetCounts(createdFacets, facets, definitionsOf(searchEntries)),
      availableCount: searchEntries.length - 1,
    });
  });
});

function facetDefinitions(unique: string): FacetDefinition[] {
  return [
    {
      sourceSlug: `search-lifecycle-color-${unique}`,
      facetSlug: `search-lifecycle-color-facet-${unique}`,
      label: 'Color',
      values: [
        { handle: 'red', label: 'Red' },
        { handle: 'blue', label: 'Blue' },
        { handle: 'green', label: 'Green' },
        { handle: 'black', label: 'Black' },
      ],
    },
    {
      sourceSlug: `search-lifecycle-size-${unique}`,
      facetSlug: `search-lifecycle-size-facet-${unique}`,
      label: 'Size',
      values: [
        { handle: 's', label: 'S' },
        { handle: 'm', label: 'M' },
        { handle: 'l', label: 'L' },
      ],
    },
  ];
}

function productMatrix(
  unique: string,
  facets: FacetDefinition[],
  count: number,
): ProductDefinition[] {
  const combinationCount = facets.reduce((acc, facet) => acc * facet.values.length, 1);

  return Array.from({ length: count }, (_, index) => {
    const ordinal = String(index + 1).padStart(2, '0');
    let combinationIndex = (index * 17) % combinationCount;

    return {
      title: `Search Lifecycle Product ${ordinal}`,
      handle: `search-lifecycle-product-${unique}-${ordinal}`,
      options: Object.fromEntries(
        facets.map((facet) => {
          const value = facet.values[combinationIndex % facet.values.length];
          combinationIndex = Math.floor(combinationIndex / facet.values.length);
          return [facet.sourceSlug, value.handle];
        }),
      ),
      priceMinor: 1_000 + index * 100,
      stock: 5 + index,
    };
  });
}

function addSearchCohortToTitles(
  products: ProductDefinition[],
  searchTerm: string,
  indexes: number[],
): void {
  for (const index of indexes) {
    const product = products[index];
    if (!product) {
      throw new Error(`Missing product definition at search cohort index ${index}`);
    }
    product.title = `${product.title} ${searchTerm}`;
  }
}

async function createSourceProducts(
  api: Api,
  unique: string,
  facets: FacetDefinition[],
): Promise<void> {
  for (const facet of facets) {
    await api.admin.product.createWithOptions({
      title: `Listing ${facet.label} Source Product ${unique}`,
      handle: `listing-${facet.sourceSlug}-source-${unique}`,
      options: [
        {
          name: facet.label,
          slug: facet.sourceSlug,
          values: facet.values.map((value) => value.label),
        },
      ],
    });
  }
}

async function createOptionFacets(api: Api, facets: FacetDefinition[]): Promise<ApiFacet[]> {
  const createdFacets: ApiFacet[] = [];

  for (const facet of facets) {
    const { data } = await api.admin.mutation('facet-api/FacetCreate', {
      variables: {
        input: {
          facetType: 'OPTION',
          slug: facet.facetSlug,
          label: facet.label,
          uiType: 'CHECKBOX',
          selectionMode: 'MULTI',
          sources: [{ handle: facet.sourceSlug, name: facet.label }],
          valueCandidates: facet.values.map((value) => ({
            handle: `${facet.sourceSlug}:${value.handle}`,
            label: value.label,
            sourceHandle: facet.sourceSlug,
          })),
        },
      },
    });
    const result = data.listingMutation.facetCreate;
    expect(result.userErrors).toHaveLength(0);
    if (!result.facet) {
      throw new Error(`Failed to create facet ${facet.facetSlug}`);
    }

    const sourceValueByHandle = new Map(
      result.facet.values.map((value) => [value.handle, value]),
    );
    const groupValues = [];
    for (const [index, value] of facet.values.entries()) {
      const sourceValue = sourceValueByHandle.get(`${facet.sourceSlug}:${value.handle}`);
      if (!sourceValue) {
        throw new Error(`Missing source value ${facet.sourceSlug}:${value.handle}`);
      }
      const { data: valueData } = await api.admin.mutation('facet-api/FacetValueCreate', {
        variables: {
          input: {
            facetId: result.facet.id,
            kind: 'GROUP',
            handle: value.handle,
            label: value.label,
            sortIndex: index,
            sourceValueIds: [sourceValue.id],
          },
        },
      });
      const valueResult = valueData.listingMutation.facetValueCreate;
      expect(valueResult.userErrors).toHaveLength(0);
      expect(valueResult.facetValue).toBeTruthy();
      groupValues.push(valueResult.facetValue);
    }
    createdFacets.push({
      ...result.facet,
      values: groupValues as ApiFacet['values'],
    });
  }

  return createdFacets;
}

async function createListingProduct(
  api: Api,
  input: {
    definition: ProductDefinition;
    category: CategoryData;
    warehouseId: string;
  },
): Promise<ApiProduct> {
  const product = await api.admin.product.createWithOptions({
    title: input.definition.title,
    handle: input.definition.handle,
    status: 'PUBLISHED',
    price: input.definition.priceMinor,
    options: Object.entries(input.definition.options).map(([sourceSlug, valueHandle]) => ({
      name: sourceSlug,
      slug: sourceSlug,
      values: [valueHandle],
    })),
  });
  const variant = product.variants.edges[0]?.node;
  if (!variant) {
    throw new Error(`Created product ${product.id} does not have a variant`);
  }

  await api.admin.product.update({
    productId: product.id,
    expectedRevision: product.revision,
    operations: {
      variants: [
        {
          action: 'UPDATE',
          variantId: variant.id,
          inventory: {
            warehouseId: input.warehouseId,
            onHand: input.definition.stock,
          },
        },
      ],
    },
  });
  await addProductToCategory(api, product.id, input.category.id);
  return product;
}

async function createWarehouse(api: Api, code: string): Promise<{ id: string }> {
  const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: { input: { code: code.toUpperCase(), name: 'Search Lifecycle Warehouse' } },
  });
  const result = data.inventoryMutation.warehouseCreate;
  expect(result.userErrors).toHaveLength(0);
  if (!result.warehouse?.id) {
    throw new Error('Failed to create warehouse for listing/search lifecycle test');
  }
  return { id: result.warehouse.id };
}

async function addProductToCategory(
  api: Api,
  productId: string,
  categoryId: string,
): Promise<void> {
  const { data } = await api.admin.mutation('category-api/CategoryAddProduct', {
    variables: { productId, categoryId },
  });
  expect(data.catalogMutation.productUpdate.userErrors).toHaveLength(0);
}

async function updateProductStatus(
  api: Api,
  product: ApiProduct,
  status: 'DRAFT' | 'PUBLISHED',
): Promise<ApiProduct> {
  return api.admin.product.update({ productId: product.id, operations: { status } });
}

async function removeProductFromCategory(
  api: Api,
  product: ApiProduct,
  category: CategoryData,
): Promise<ApiProduct> {
  return api.admin.product.update({
    productId: product.id,
    operations: { categories: [{ action: 'REMOVE', categoryId: category.id }] },
  });
}

async function expectProductCategoryAssignment(
  api: Api,
  product: ApiProduct,
  category: CategoryData,
  assigned: boolean,
): Promise<void> {
  const latestProduct = await api.admin.product.findOne(product.id);
  expect(
    latestProduct.categoryAssignments.some((assignment) => assignment.category.id === category.id),
  ).toBe(assigned);
}

async function updateProductVariantInventory(
  api: Api,
  product: ApiProduct,
  input: { warehouseId: string; onHand: number },
): Promise<ApiProduct> {
  const latestProduct = await api.admin.product.findOne(product.id);
  const variant = latestProduct.variants.edges[0]?.node;
  if (!variant) {
    throw new Error(`Product ${product.id} does not have a variant to update inventory`);
  }
  return api.admin.product.update({
    productId: latestProduct.id,
    expectedRevision: latestProduct.revision,
    operations: {
      variants: [
        {
          action: 'UPDATE',
          variantId: variant.id,
          inventory: { warehouseId: input.warehouseId, onHand: input.onHand },
        },
      ],
    },
  });
}

async function deleteProduct(api: Api, product: ApiProduct): Promise<void> {
  const { data } = await api.admin.mutation('inventory-api/ProductDelete', {
    variables: { input: { id: product.id } },
  });
  const result = data.catalogMutation.productDelete;
  expect(result.userErrors).toHaveLength(0);
  expect(result.deletedProductId).toBe(product.id);
}

function expectedFacetCounts(
  createdFacets: ApiFacet[],
  facets: FacetDefinition[],
  products: ProductDefinition[],
): Record<string, Record<string, number>> {
  return Object.fromEntries(
    facets.map((facet, index) => [
      createdFacets[index].slug,
      Object.fromEntries(
        facet.values.map((value) => [
          value.handle,
          products.filter((product) => product.options[facet.sourceSlug] === value.handle).length,
        ]),
      ),
    ]),
  );
}

function expectedFilteredFacetCounts(
  createdFacets: ApiFacet[],
  facets: FacetDefinition[],
  products: ProductDefinition[],
  selectedValues: OptionValues,
): Record<string, Record<string, number>> {
  return Object.fromEntries(
    facets.map((facet, index) => [
      createdFacets[index].slug,
      Object.fromEntries(
        facet.values.map((value) => [
          value.handle,
          products.filter(
            (product) =>
              product.options[facet.sourceSlug] === value.handle
              && Object.entries(selectedValues).every(
                ([sourceSlug, selectedValue]) =>
                  sourceSlug === facet.sourceSlug || product.options[sourceSlug] === selectedValue,
              ),
          ).length,
        ]),
      ),
    ]),
  );
}

async function expectCategoryListing(
  api: Api,
  category: CategoryData,
  expected: {
    productIds: string[];
    facetCounts: Record<string, Record<string, number>>;
    availableCount?: number;
  },
): Promise<void> {
  await expect
    .poll(
      async (): Promise<ListingComparison> => {
        const { data } = await api.admin.query('listing-api/Listing', {
          variables: {
            first: 50,
            locale: 'en',
            currency: 'USD',
            scope: { kind: 'CATEGORY', categoryId: category.id },
          },
        });
        const listing = data.listingQuery.listing;
        return {
          totalCount: listing.totalCount,
          productIds: listing.edges.map((edge) => edge.node.id).sort(),
          facetCounts: readFacetCounts(listing.facets, expected.facetCounts),
          availableCount: readAvailabilityCount(listing.facets),
          selectedFacetValues: {},
        };
      },
      { timeout: 60_000, intervals: [500, 1_000, 2_000, 5_000] },
    )
    .toEqual({
      totalCount: expected.productIds.length,
      productIds: [...expected.productIds].sort(),
      facetCounts: expected.facetCounts,
      availableCount: expected.availableCount ?? expected.productIds.length,
      selectedFacetValues: {},
    });
}

async function expectPaginatedSearchListing(
  api: Api,
  expected: {
    query: string;
    first: number;
    productIds: string[];
    orderBy: ApiListingOrderByInput;
    facetCounts: Record<string, Record<string, number>>;
    availableCount?: number;
    selectedFacetValues?: Record<string, string[]>;
    facets?: ApiListingProductFilter[];
  },
): Promise<ListingSnapshot> {
  let lastSnapshot: ListingSnapshot | null = null;
  const expectedPageSizes = Array.from(
    { length: Math.ceil(expected.productIds.length / expected.first) },
    (_value, index) =>
      Math.min(expected.first, expected.productIds.length - index * expected.first),
  );
  const expectedComparison: SearchListingComparison = {
    totalCount: expected.productIds.length,
    productIds: expected.productIds,
    facetCounts: expected.facetCounts,
    availableCount: expected.availableCount ?? expected.productIds.length,
    selectedFacetValues: expected.selectedFacetValues ?? {},
    pageSizes: expectedPageSizes,
    totalCounts: expectedPageSizes.map(() => expected.productIds.length),
    hasNextPages: expectedPageSizes.map((_size, index) => index < expectedPageSizes.length - 1),
    hasPreviousPages: expectedPageSizes.map(() => false),
    cursorCount: expected.productIds.length,
    uniqueCursorCount: expected.productIds.length,
    pageCursorBoundsMatch: true,
  };

  await expect
    .poll(
      async (): Promise<SearchListingComparison> => {
        let after: string | undefined;
        const productIds: string[] = [];
        const cursors: string[] = [];
        const pageSizes: number[] = [];
        const totalCounts: number[] = [];
        const hasNextPages: boolean[] = [];
        const hasPreviousPages: boolean[] = [];
        let pageCursorBoundsMatch = true;
        let listingFacets: ApiListingFacet[] = [];

        for (let pageIndex = 0; pageIndex < 50; pageIndex += 1) {
          const { data } = await api.admin.query('listing-api/Listing', {
            variables: {
              first: expected.first,
              after,
              locale: 'en',
              currency: 'USD',
              scope: { kind: 'SEARCH' },
              query: expected.query,
              facets: expected.facets,
              orderBy: expected.orderBy,
            },
          });
          const listing = data.listingQuery.listing;
          const pageCursors = listing.edges.map((edge) => edge.cursor);
          if (pageIndex === 0) {
            listingFacets = listing.facets;
          }
          productIds.push(...listing.edges.map((edge) => edge.node.id));
          cursors.push(...pageCursors);
          pageSizes.push(listing.edges.length);
          totalCounts.push(listing.totalCount);
          hasNextPages.push(listing.pageInfo.hasNextPage);
          hasPreviousPages.push(listing.pageInfo.hasPreviousPage);
          pageCursorBoundsMatch &&=
            listing.pageInfo.startCursor === (pageCursors[0] ?? null)
            && listing.pageInfo.endCursor === (pageCursors.at(-1) ?? null);

          if (!listing.pageInfo.hasNextPage) {
            break;
          }
          if (!listing.pageInfo.endCursor) {
            throw new Error('Search listing reported a next page without an end cursor');
          }
          after = listing.pageInfo.endCursor;
        }

        lastSnapshot = {
          totalCount: totalCounts[0] ?? 0,
          productIds,
          facets: listingFacets,
        };
        return {
          totalCount: lastSnapshot.totalCount,
          productIds,
          facetCounts: readFacetCounts(listingFacets, expected.facetCounts),
          availableCount: readAvailabilityCount(listingFacets),
          selectedFacetValues: readSelectedFacetValues(
            listingFacets,
            expected.selectedFacetValues,
          ),
          pageSizes,
          totalCounts,
          hasNextPages,
          hasPreviousPages,
          cursorCount: cursors.length,
          uniqueCursorCount: new Set(cursors).size,
          pageCursorBoundsMatch,
        };
      },
      { timeout: 60_000, intervals: [500, 1_000, 2_000, 5_000] },
    )
    .toEqual(expectedComparison);

  if (!lastSnapshot) {
    throw new Error(`Paginated search listing was not read for query: ${expected.query}`);
  }
  return lastSnapshot;
}

function readFacetCounts(
  facets: ApiListingFacet[],
  expected: Record<string, Record<string, number>>,
): Record<string, Record<string, number | null>> {
  return Object.fromEntries(
    Object.keys(expected).map((facetId) => {
      const facet = facets.find((candidate) => candidate.id === facetId);
      return [
        facetId,
        Object.fromEntries((facet?.values ?? []).map((value) => [value.id, value.count])),
      ];
    }),
  );
}

function readAvailabilityCount(facets: ApiListingFacet[]): number | null {
  return facets
    .find((facet) => facet.id === 'available')
    ?.values.find((value) => value.id === 'true')?.count ?? null;
}

function readSelectedFacetValues(
  facets: ApiListingFacet[],
  expected?: Record<string, string[]>,
): Record<string, string[]> {
  if (!expected) {
    return {};
  }
  return Object.fromEntries(
    Object.keys(expected).map((facetId) => {
      const facet = facets.find((candidate) => candidate.id === facetId);
      return [
        facetId,
        (facet?.values.filter((value) => value.selected).map((value) => value.id) ?? []).sort(),
      ];
    }),
  );
}

function facetValueInput(
  facets: ApiListingFacet[],
  facetId: string,
  valueId: string,
): ApiListingProductFilter {
  const value = facets
    .find((facet) => facet.id === facetId)
    ?.values.find((candidate) => candidate.id === valueId);
  const expectedInput: ApiListingProductFilter = {
    variantFacet: { facet: facetId, value: valueId },
  };
  expect(value?.input).toEqual(expectedInput);
  if (!value?.input) {
    throw new Error(`Missing listing facet value input for ${facetId}:${valueId}`);
  }
  return value.input as ApiListingProductFilter;
}
