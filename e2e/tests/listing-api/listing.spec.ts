import { test } from '@fixtures/listing/base.extend';
import { expect } from '@playwright/test';
import type { ListingProductFacetAssignment } from '@fixtures/listing/seed';
import type {
  ApiListingFacet,
  ApiListingFacetValue,
  ApiListingOrderByInput,
  ApiListingProductFilter,
  ApiProduct,
} from '@codegen/admin-gql';

test.describe('Listing API', () => {
  test.describe.configure({ timeout: 240_000 });

  test('paginates category listing products without filters', async ({ api, listingCatalog }) => {
    const { category, products, facets, facetAssignments } = listingCatalog;
    const listingScope = {
      kind: 'CATEGORY',
      categoryId: category.id,
    } as const;

    const { data: firstPageData } = await api.admin.query('listing-api/Listing', {
      variables: {
        first: 10,
        locale: 'en',
        currency: 'USD',
        scope: listingScope,
      },
    });

    const firstPage = firstPageData.listingQuery.listing;
    const firstPageNodes = firstPage.edges.map((edge) => edge.node as ApiProduct);
    const firstPageProducts = products.slice(0, 10);

    expect(firstPage.totalCount).toBe(30);
    expectCatalogFacets(firstPage.facets, facets, facetAssignments);
    expect(firstPage.edges).toHaveLength(10);
    expect(firstPage.edges.every((edge) => Boolean(edge.cursor))).toBe(true);
    expect(firstPageNodes.map((node) => node.id)).toEqual(firstPageProducts.map((product) => product.id));
    for (const [index, node] of firstPageNodes.entries()) {
      const product = firstPageProducts[index];
      expect(node.__typename).toBe('Product');
      expect(node.id).toBe(product.id);
      expect(node.title).toBe(product.title);
      expect(node.handle).toBe(product.handle);
      expect(node.isPublished).toBe(true);
    }
    expect(firstPage.pageInfo.hasNextPage).toBe(true);
    expect(firstPage.pageInfo.hasPreviousPage).toBe(false);
    expect(firstPage.pageInfo.startCursor).toBe(firstPage.edges[0].cursor);
    expect(firstPage.pageInfo.endCursor).toBe(firstPage.edges[firstPage.edges.length - 1].cursor);

    const { data: secondPageData } = await api.admin.query('listing-api/Listing', {
      variables: {
        first: 10,
        after: firstPage.pageInfo.endCursor,
        locale: 'en',
        currency: 'USD',
        scope: listingScope,
      },
    });

    const secondPage = secondPageData.listingQuery.listing;
    const secondPageNodes = secondPage.edges.map((edge) => edge.node as ApiProduct);
    const secondPageProducts = products.slice(10, 20);

    expect(secondPage.totalCount).toBe(30);
    expect(secondPage.edges).toHaveLength(10);
    expect(secondPage.edges.every((edge) => Boolean(edge.cursor))).toBe(true);
    expect(secondPageNodes.map((node) => node.id)).toEqual(secondPageProducts.map((product) => product.id));
    expect([...firstPageNodes, ...secondPageNodes].map((node) => node.id)).toEqual(
      products.slice(0, 20).map((product) => product.id),
    );
    for (const [index, node] of secondPageNodes.entries()) {
      const product = secondPageProducts[index];
      expect(node.__typename).toBe('Product');
      expect(node.id).toBe(product.id);
      expect(node.title).toBe(product.title);
      expect(node.handle).toBe(product.handle);
      expect(node.isPublished).toBe(true);
    }
    expect(secondPage.pageInfo.hasNextPage).toBe(true);
    expect(secondPage.pageInfo.hasPreviousPage).toBe(false);
    expect(secondPage.pageInfo.startCursor).toBe(secondPage.edges[0].cursor);
    expect(secondPage.pageInfo.endCursor).toBe(secondPage.edges[secondPage.edges.length - 1].cursor);

    const { data: thirdPageData } = await api.admin.query('listing-api/Listing', {
      variables: {
        first: 10,
        after: secondPage.pageInfo.endCursor,
        locale: 'en',
        currency: 'USD',
        scope: listingScope,
      },
    });

    const thirdPage = thirdPageData.listingQuery.listing;
    const thirdPageNodes = thirdPage.edges.map((edge) => edge.node as ApiProduct);
    const thirdPageProducts = products.slice(20, 30);

    expect(thirdPage.totalCount).toBe(30);
    expect(thirdPage.edges).toHaveLength(10);
    expect(thirdPageNodes.map((node) => node.id)).toEqual(thirdPageProducts.map((product) => product.id));
    expect([...firstPageNodes, ...secondPageNodes, ...thirdPageNodes].map((node) => node.id)).toEqual(
      products.map((product) => product.id),
    );
    expect(thirdPage.pageInfo.hasNextPage).toBe(false);
    expect(thirdPage.pageInfo.hasPreviousPage).toBe(false);
    expect(thirdPage.pageInfo.startCursor).toBe(thirdPage.edges[0].cursor);
    expect(thirdPage.pageInfo.endCursor).toBe(thirdPage.edges[thirdPage.edges.length - 1].cursor);
  });

  test('keeps out of stock products last and excludes them from facets', async ({ api, listingCatalog }) => {
    const { category, products, facetAssignments } = listingCatalog;
    const listingScope = {
      kind: 'CATEGORY',
      categoryId: category.id,
    } as const;

    const { data } = await api.admin.query('listing-api/Listing', {
      variables: {
        first: 30,
        locale: 'en',
        currency: 'USD',
        scope: listingScope,
        orderBy: { by: 'PRICE', direction: 'asc' },
      },
    });

    const listing = data.listingQuery.listing;
    const nodes = listing.edges.map((edge) => edge.node as ApiProduct);
    const inStockProductIds = inStockAssignments(facetAssignments).map((assignment) => assignment.productId);
    const outOfStockProductIds = facetAssignments
      .filter((assignment) => !assignment.inStock)
      .map((assignment) => assignment.productId);

    expect(listing.totalCount).toBe(30);
    expect(nodes.slice(0, 20).every((node) => inStockProductIds.includes(node.id))).toBe(true);
    expect(nodes.slice(20, 30).map((node) => node.id)).toEqual(outOfStockProductIds.reverse());
    expect(listing.facets.find((facet) => facet.id === 'available')?.values[0]?.count).toBe(20);
    expect(sumFacetCounts(listing.facets, 'color')).toBe(20);
    expect(sumFacetCounts(listing.facets, 'size')).toBe(20);

    const colorFilter = facetInput(listing.facets, { facetId: 'color', valueId: 'black' });
    const { data: filteredData } = await api.admin.query('listing-api/Listing', {
      variables: {
        first: 30,
        locale: 'en',
        currency: 'USD',
        scope: listingScope,
        facets: [colorFilter],
        orderBy: { by: 'PRICE', direction: 'asc' },
      },
    });

    const filteredNodes = filteredData.listingQuery.listing.edges.map((edge) => edge.node as ApiProduct);
    expect(filteredNodes.every((node) => inStockProductIds.includes(node.id))).toBe(true);
    expect(filteredNodes.some((node) => outOfStockProductIds.includes(node.id))).toBe(false);
  });

  test('paginates category listing products for every sort option', async ({ api, listingCatalog }) => {
    test.setTimeout(240_000);

    const { category, expectedOrder } = listingCatalog;
    const categoryScope = {
      kind: 'CATEGORY',
      categoryId: category.id,
    } as const;

    const sortCases: {
      name: string;
      scope: { kind: 'CATEGORY'; categoryId: string };
      orderBy: ApiListingOrderByInput;
      expectedProducts: ApiProduct[];
    }[] = [
      {
        name: 'PRICE asc',
        scope: categoryScope,
        orderBy: { by: 'PRICE', direction: 'asc' },
        expectedProducts: expectedOrder.priceAsc,
      },
      {
        name: 'PRICE desc',
        scope: categoryScope,
        orderBy: { by: 'PRICE', direction: 'desc' },
        expectedProducts: expectedOrder.priceDesc,
      },
      {
        name: 'NAME',
        scope: categoryScope,
        orderBy: { by: 'NAME' },
        expectedProducts: expectedOrder.name,
      },
      {
        name: 'MANUAL',
        scope: categoryScope,
        orderBy: { by: 'MANUAL' },
        expectedProducts: expectedOrder.manual,
      },
      {
        name: 'NEWEST',
        scope: categoryScope,
        orderBy: { by: 'NEWEST' },
        expectedProducts: expectedOrder.newest,
      },
      {
        name: 'CREATED',
        scope: categoryScope,
        orderBy: { by: 'CREATED' },
        expectedProducts: expectedOrder.created,
      },
    ];

    for (const sortCase of sortCases) {
      const firstPageData = await api.admin
        .query('listing-api/Listing', {
          variables: {
            first: 10,
            locale: 'en',
            currency: 'USD',
            scope: sortCase.scope,
            orderBy: sortCase.orderBy,
          },
        })
        .then((response) => response.data)
        .catch((error) => {
          throw new Error(`${sortCase.name} first page failed: ${JSON.stringify(error, null, 2)}`);
        });

      const firstPage = firstPageData.listingQuery.listing;
      const firstPageNodes = firstPage.edges.map((edge) => edge.node as ApiProduct);

      expect(firstPage.totalCount, sortCase.name).toBe(30);
      expect(firstPage.edges, sortCase.name).toHaveLength(10);
      expect(firstPage.edges.every((edge) => Boolean(edge.cursor)), sortCase.name).toBe(true);
      expect(firstPageNodes.map((node) => node.id), sortCase.name).toEqual(
        sortCase.expectedProducts.slice(0, 10).map((product) => product.id),
      );
      expect(firstPage.pageInfo.hasNextPage, sortCase.name).toBe(true);
      expect(firstPage.pageInfo.startCursor, sortCase.name).toBe(firstPage.edges[0].cursor);
      expect(firstPage.pageInfo.endCursor, sortCase.name).toBe(firstPage.edges[firstPage.edges.length - 1].cursor);

      const secondPageData = await api.admin
        .query('listing-api/Listing', {
          variables: {
            first: 10,
            after: firstPage.pageInfo.endCursor,
            locale: 'en',
            currency: 'USD',
            scope: sortCase.scope,
            orderBy: sortCase.orderBy,
          },
        })
        .then((response) => response.data)
        .catch((error) => {
          throw new Error(`${sortCase.name} second page failed: ${JSON.stringify(error, null, 2)}`);
        });

      const secondPage = secondPageData.listingQuery.listing;
      const secondPageNodes = secondPage.edges.map((edge) => edge.node as ApiProduct);

      expect(secondPage.totalCount, sortCase.name).toBe(30);
      expect(secondPage.edges, sortCase.name).toHaveLength(10);
      expect(secondPage.edges.every((edge) => Boolean(edge.cursor)), sortCase.name).toBe(true);
      expect(secondPageNodes.map((node) => node.id), sortCase.name).toEqual(
        sortCase.expectedProducts.slice(10, 20).map((product) => product.id),
      );
      expect([...firstPageNodes, ...secondPageNodes].map((node) => node.id), sortCase.name).toEqual(
        sortCase.expectedProducts.slice(0, 20).map((product) => product.id),
      );
      expect(secondPage.pageInfo.hasNextPage, sortCase.name).toBe(true);
      expect(secondPage.pageInfo.startCursor, sortCase.name).toBe(secondPage.edges[0].cursor);
      expect(secondPage.pageInfo.endCursor, sortCase.name).toBe(
        secondPage.edges[secondPage.edges.length - 1].cursor,
      );

      const thirdPageData = await api.admin
        .query('listing-api/Listing', {
          variables: {
            first: 10,
            after: secondPage.pageInfo.endCursor,
            locale: 'en',
            currency: 'USD',
            scope: sortCase.scope,
            orderBy: sortCase.orderBy,
          },
        })
        .then((response) => response.data)
        .catch((error) => {
          throw new Error(`${sortCase.name} third page failed: ${JSON.stringify(error, null, 2)}`);
        });

      const thirdPage = thirdPageData.listingQuery.listing;
      const thirdPageNodes = thirdPage.edges.map((edge) => edge.node as ApiProduct);

      expect(thirdPage.totalCount, sortCase.name).toBe(30);
      expect(thirdPage.edges, sortCase.name).toHaveLength(10);
      expect(thirdPageNodes.map((node) => node.id), sortCase.name).toEqual(
        sortCase.expectedProducts.slice(20, 30).map((product) => product.id),
      );
      expect([...firstPageNodes, ...secondPageNodes, ...thirdPageNodes].map((node) => node.id), sortCase.name).toEqual(
        sortCase.expectedProducts.map((product) => product.id),
      );
      expect(thirdPage.pageInfo.hasNextPage, sortCase.name).toBe(false);
      expect(thirdPage.pageInfo.startCursor, sortCase.name).toBe(thirdPage.edges[0].cursor);
      expect(thirdPage.pageInfo.endCursor, sortCase.name).toBe(thirdPage.edges[thirdPage.edges.length - 1].cursor);
    }
  });

  test('returns category listing facets and applies facet filters', async ({ api, listingCatalog }) => {
    test.setTimeout(240_000);

    const { category, facets, facetAssignments } = listingCatalog;
    const listingScope = {
      kind: 'CATEGORY',
      categoryId: category.id,
    } as const;

    const { data: facetData } = await api.admin
      .query('listing-api/Listing', {
        variables: {
          first: 10,
          locale: 'en',
          currency: 'USD',
          scope: listingScope,
        },
      })
      .catch((error) => {
        throw new Error(`Facet listing query failed: ${JSON.stringify(error, null, 2)}`);
      });

    const listing = facetData.listingQuery.listing;
    expect(listing.totalCount).toBe(30);
    expectCatalogFacets(listing.facets, facets, facetAssignments);

    const filterCases = [
      { name: 'option color facet', facetId: 'color' },
      { name: 'feature facet', facetId: 'feature-01' },
      { name: 'tag facet', facetId: 'tag' },
    ];

    for (const filterCase of filterCases) {
      const value = facetValueWithCount(listing.facets, filterCase.facetId);

      const { data: filteredData } = await api.admin
        .query('listing-api/Listing', {
          variables: {
            first: 10,
            locale: 'en',
            currency: 'USD',
            scope: listingScope,
            facets: [value.input as ApiListingProductFilter],
          },
        })
        .catch((error) => {
          throw new Error(`${filterCase.name} listing query failed: ${JSON.stringify(error, null, 2)}`);
        });

      const filteredListing = filteredData.listingQuery.listing;
      const filteredFacet = filteredListing.facets.find((facet) => facet.id === filterCase.facetId);
      const selectedValue = filteredFacet?.values.find((candidate) => candidate.id === value.id);

      expect(filteredListing.totalCount, filterCase.name).toBe(value.count);
      expect(filteredListing.edges, filterCase.name).toHaveLength(Math.min(10, value.count));
      expect(selectedValue?.selected, filterCase.name).toBe(true);
      expect(selectedValue?.input, filterCase.name).toEqual(value.input);
    }
  });

  test('applies combined facet filters with sorting and recalculates facet counts', async ({ api, listingCatalog }) => {
    test.setTimeout(240_000);

    const { category, expectedOrder, facetAssignments } = listingCatalog;
    const listingScope = {
      kind: 'CATEGORY',
      categoryId: category.id,
    } as const;

    const { data: facetData } = await api.admin
      .query('listing-api/Listing', {
        variables: {
          first: 20,
          locale: 'en',
          currency: 'USD',
          scope: listingScope,
        },
      })
      .catch((error) => {
        throw new Error(`Combined facets baseline query failed: ${JSON.stringify(error, null, 2)}`);
      });

    const baselineFacets = facetData.listingQuery.listing.facets;
    const tagValue = facetValueWithCount(baselineFacets, 'tag');
    const cases = [
      {
        name: 'color + size with PRICE asc',
        filters: [
          { facetId: 'color', valueId: 'black' },
          { facetId: 'size', valueId: 'm' },
        ],
        orderBy: { by: 'PRICE', direction: 'asc' } satisfies ApiListingOrderByInput,
        expectedOrder: expectedOrder.priceAsc,
      },
      {
        name: 'color + feature + tag with NAME',
        filters: [
          { facetId: 'color', valueId: 'black' },
          { facetId: 'feature-01', valueId: 'feature-01-a' },
          { facetId: 'tag', valueId: tagValue.id },
        ],
        orderBy: { by: 'NAME' } satisfies ApiListingOrderByInput,
        expectedOrder: expectedOrder.name,
      },
      {
        name: 'material + style + feature with CREATED',
        filters: [
          { facetId: 'material', valueId: 'linen' },
          { facetId: 'style', valueId: 'modern' },
          { facetId: 'feature-02', valueId: 'feature-02-b' },
        ],
        orderBy: { by: 'CREATED' } satisfies ApiListingOrderByInput,
        expectedOrder: expectedOrder.created,
      },
    ];

    for (const testCase of cases) {
      const filters = testCase.filters.map((filter) => facetInput(baselineFacets, filter));
      const expectedProducts = filterExpectedProducts(testCase.expectedOrder, facetAssignments, testCase.filters);

      const { data } = await api.admin
        .query('listing-api/Listing', {
          variables: {
            first: 20,
            locale: 'en',
            currency: 'USD',
            scope: listingScope,
            facets: filters,
            orderBy: testCase.orderBy,
          },
        })
        .catch((error) => {
          throw new Error(`${testCase.name} query failed: ${JSON.stringify(error, null, 2)}`);
        });

      const listing = data.listingQuery.listing;
      const nodes = listing.edges.map((edge) => edge.node as ApiProduct);

      expect(listing.totalCount, testCase.name).toBe(expectedProducts.length);
      expect(nodes.map((node) => node.id), testCase.name).toEqual(expectedProducts.map((product) => product.id));
      expectSelectedFacetValues(listing.facets, testCase.filters);
      expectFacetCounts(listing.facets, facetAssignments, testCase.filters, ['color', 'size']);
    }
  });

  test('filters category listing products by price range', async ({ api, listingCatalog }) => {
    test.setTimeout(240_000);

    const { category, expectedOrder, facetAssignments } = listingCatalog;
    const listingScope = {
      kind: 'CATEGORY',
      categoryId: category.id,
    } as const;
    const expectedProducts = filterExpectedProductsByPrice(expectedOrder.priceAsc, facetAssignments, 1_100, 2_000);
    const priceFilter = [{ price: { min: 1100, max: 2000 } }];

    const { data: firstPageData } = await api.admin.query('listing-api/Listing', {
      variables: {
        first: 5,
        locale: 'en',
        currency: 'USD',
        scope: listingScope,
        facets: priceFilter,
        orderBy: { by: 'PRICE', direction: 'asc' },
      },
    });

    const firstPage = firstPageData.listingQuery.listing;
    const firstPageNodes = firstPage.edges.map((edge) => edge.node as ApiProduct);

    expect(firstPage.totalCount).toBe(10);
    expect(firstPage.edges).toHaveLength(5);
    expect(firstPage.edges.every((edge) => Boolean(edge.cursor))).toBe(true);
    expect(firstPageNodes.map((node) => node.id)).toEqual(expectedProducts.slice(0, 5).map((product) => product.id));
    expect(firstPage.pageInfo.hasNextPage).toBe(true);
    expect(firstPage.pageInfo.hasPreviousPage).toBe(false);
    expect(firstPage.pageInfo.startCursor).toBe(firstPage.edges[0].cursor);
    expect(firstPage.pageInfo.endCursor).toBe(firstPage.edges[firstPage.edges.length - 1].cursor);

    const { data: secondPageData } = await api.admin.query('listing-api/Listing', {
      variables: {
        first: 5,
        after: firstPage.pageInfo.endCursor,
        locale: 'en',
        currency: 'USD',
        scope: listingScope,
        facets: priceFilter,
        orderBy: { by: 'PRICE', direction: 'asc' },
      },
    });

    const secondPage = secondPageData.listingQuery.listing;
    const secondPageNodes = secondPage.edges.map((edge) => edge.node as ApiProduct);

    expect(secondPage.totalCount).toBe(10);
    expect(secondPage.edges).toHaveLength(5);
    expect(secondPage.edges.every((edge) => Boolean(edge.cursor))).toBe(true);
    expect(secondPageNodes.map((node) => node.id)).toEqual(expectedProducts.slice(5, 10).map((product) => product.id));
    expect([...firstPageNodes, ...secondPageNodes].map((node) => node.id)).toEqual(
      expectedProducts.map((product) => product.id),
    );
    expect(secondPage.pageInfo.hasNextPage).toBe(false);
    expect(secondPage.pageInfo.hasPreviousPage).toBe(false);
    expect(secondPage.pageInfo.startCursor).toBe(secondPage.edges[0].cursor);
    expect(secondPage.pageInfo.endCursor).toBe(secondPage.edges[secondPage.edges.length - 1].cursor);
  });
});

function expectCatalogFacets(
  listingFacets: ApiListingFacet[],
  catalogFacets: { slug: string }[],
  assignments: ListingProductFacetAssignment[],
) {
  const catalogFacetSlugs = catalogFacets.map((facet) => facet.slug).sort();
  const returnedCatalogFacets = listingFacets
    .filter((facet) => catalogFacetSlugs.includes(facet.id))
    .sort((left, right) => left.id.localeCompare(right.id));

  expect(returnedCatalogFacets.map((facet) => facet.id)).toEqual(catalogFacetSlugs);
  expect(returnedCatalogFacets).toHaveLength(20);
  expect(
    returnedCatalogFacets.filter((facet) => ['color', 'material', 'size', 'style'].includes(facet.id)),
  ).toHaveLength(4);
  expect(returnedCatalogFacets.find((facet) => facet.id === 'color')?.values).toHaveLength(5);
  expect(returnedCatalogFacets.find((facet) => facet.id === 'size')?.values).toHaveLength(5);
  expect(returnedCatalogFacets.every((facet) => facet.values.length > 0)).toBe(true);
  expect(returnedCatalogFacets.every((facet) => facet.values.every((value) => value.count > 0))).toBe(true);
  expect(sumFacetCounts(returnedCatalogFacets, 'color')).toBe(inStockAssignments(assignments).length);
  expect(sumFacetCounts(returnedCatalogFacets, 'size')).toBe(inStockAssignments(assignments).length);
  expect(listingFacets.find((facet) => facet.id === 'available')?.values[0]?.count).toBe(
    inStockAssignments(assignments).length,
  );
}

function facetValueWithCount(facets: ApiListingFacet[], facetId: string): ApiListingFacetValue {
  const facet = facets.find((candidate) => candidate.id === facetId);
  expect(facet, facetId).toBeTruthy();

  const value = facet?.values.find((candidate) => candidate.count > 0);
  expect(value, facetId).toBeTruthy();

  if (!value) {
    throw new Error(`Missing facet value with count for ${facetId}`);
  }

  return value;
}

function facetInput(
  facets: ApiListingFacet[],
  filter: { facetId: string; valueId: string },
): ApiListingProductFilter {
  return facetValue(facets, filter).input as ApiListingProductFilter;
}

function facetValue(facets: ApiListingFacet[], filter: { facetId: string; valueId: string }): ApiListingFacetValue {
  const facet = facets.find((candidate) => candidate.id === filter.facetId);
  expect(facet, filter.facetId).toBeTruthy();

  const value = facet?.values.find((candidate) => candidate.id === filter.valueId);
  expect(value, `${filter.facetId}:${filter.valueId}`).toBeTruthy();

  if (!value) {
    throw new Error(`Missing facet value ${filter.facetId}:${filter.valueId}`);
  }

  return value;
}

function filterExpectedProducts(
  orderedProducts: ApiProduct[],
  assignments: ListingProductFacetAssignment[],
  filters: { facetId: string; valueId: string }[],
): ApiProduct[] {
  const assignmentByProductId = new Map(assignments.map((assignment) => [assignment.productId, assignment]));

  return orderedProducts.filter((product) => {
    const assignment = assignmentByProductId.get(product.id);
    if (!assignment) {
      return false;
    }
    if (!assignment.inStock) {
      return false;
    }
    return filters.every((filter) => assignmentMatches(assignment, filter));
  });
}

function filterExpectedProductsByPrice(
  orderedProducts: ApiProduct[],
  assignments: ListingProductFacetAssignment[],
  minPriceMinor: number,
  maxPriceMinor: number,
): ApiProduct[] {
  const assignmentByProductId = new Map(assignments.map((assignment) => [assignment.productId, assignment]));

  return orderedProducts.filter((product) => {
    const assignment = assignmentByProductId.get(product.id);
    return (
      assignment?.inStock === true &&
      assignment.priceMinor >= minPriceMinor &&
      assignment.priceMinor <= maxPriceMinor
    );
  });
}

function assignmentMatches(
  assignment: ListingProductFacetAssignment,
  filter: { facetId: string; valueId: string },
): boolean {
  if (filter.facetId === 'tag') {
    return assignment.tags.includes(filter.valueId);
  }

  return assignment.options[filter.facetId] === filter.valueId || assignment.features[filter.facetId] === filter.valueId;
}

function expectSelectedFacetValues(
  facets: ApiListingFacet[],
  filters: { facetId: string; valueId: string }[],
) {
  for (const filter of filters) {
    expect(facetValue(facets, filter).selected, `${filter.facetId}:${filter.valueId}`).toBe(true);
  }
}

function expectFacetCounts(
  facets: ApiListingFacet[],
  assignments: ListingProductFacetAssignment[],
  activeFilters: { facetId: string; valueId: string }[],
  facetIds: string[],
) {
  for (const facetId of facetIds) {
    const facet = facets.find((candidate) => candidate.id === facetId);
    expect(facet, facetId).toBeTruthy();

    for (const value of facet?.values ?? []) {
      const expectedCount = assignments.filter((assignment) =>
        assignment.inStock &&
        [
          ...activeFilters.filter((filter) => filter.facetId !== facetId),
          { facetId, valueId: value.id },
        ].every((filter) => assignmentMatches(assignment, filter)),
      ).length;
      expect(value.count, `${facetId}:${value.id}`).toBe(expectedCount);
    }
  }
}

function inStockAssignments(assignments: ListingProductFacetAssignment[]): ListingProductFacetAssignment[] {
  return assignments.filter((assignment) => assignment.inStock);
}

function sumFacetCounts(facets: ApiListingFacet[], facetId: string): number {
  return facets
    .find((facet) => facet.id === facetId)
    ?.values.reduce((sum, value) => sum + value.count, 0) ?? 0;
}
