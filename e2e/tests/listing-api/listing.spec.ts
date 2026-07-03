import { test } from '@fixtures/listing/base.extend';
import { expect } from '@playwright/test';
import type {
  ApiListingFacet,
  ApiListingFacetValue,
  ApiListingOrderByInput,
  ApiListingProductFilter,
  ApiProduct,
} from '@codegen/admin-gql';

test.describe('Listing API', () => {
  test.describe.configure({ timeout: 180_000 });

  test('paginates category listing products without filters', async ({ api, listingCatalog }) => {
    const { category, products, facets } = listingCatalog;
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

    expect(firstPage.totalCount).toBe(20);
    expectCatalogFacets(firstPage.facets, facets);
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

    expect(secondPage.totalCount).toBe(20);
    expect(secondPage.edges).toHaveLength(10);
    expect(secondPage.edges.every((edge) => Boolean(edge.cursor))).toBe(true);
    expect(secondPageNodes.map((node) => node.id)).toEqual(secondPageProducts.map((product) => product.id));
    expect([...firstPageNodes, ...secondPageNodes].map((node) => node.id)).toEqual(
      products.map((product) => product.id),
    );
    for (const [index, node] of secondPageNodes.entries()) {
      const product = secondPageProducts[index];
      expect(node.__typename).toBe('Product');
      expect(node.id).toBe(product.id);
      expect(node.title).toBe(product.title);
      expect(node.handle).toBe(product.handle);
      expect(node.isPublished).toBe(true);
    }
    expect(secondPage.pageInfo.hasNextPage).toBe(false);
    expect(secondPage.pageInfo.hasPreviousPage).toBe(false);
    expect(secondPage.pageInfo.startCursor).toBe(secondPage.edges[0].cursor);
    expect(secondPage.pageInfo.endCursor).toBe(secondPage.edges[secondPage.edges.length - 1].cursor);
  });

  test('paginates category listing products for every sort option', async ({ api, listingCatalog }) => {
    test.setTimeout(90_000);

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

      expect(firstPage.totalCount, sortCase.name).toBe(20);
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

      expect(secondPage.totalCount, sortCase.name).toBe(20);
      expect(secondPage.edges, sortCase.name).toHaveLength(10);
      expect(secondPage.edges.every((edge) => Boolean(edge.cursor)), sortCase.name).toBe(true);
      expect(secondPageNodes.map((node) => node.id), sortCase.name).toEqual(
        sortCase.expectedProducts.slice(10, 20).map((product) => product.id),
      );
      expect([...firstPageNodes, ...secondPageNodes].map((node) => node.id), sortCase.name).toEqual(
        sortCase.expectedProducts.map((product) => product.id),
      );
      expect(secondPage.pageInfo.hasNextPage, sortCase.name).toBe(false);
      expect(secondPage.pageInfo.startCursor, sortCase.name).toBe(secondPage.edges[0].cursor);
      expect(secondPage.pageInfo.endCursor, sortCase.name).toBe(
        secondPage.edges[secondPage.edges.length - 1].cursor,
      );
    }
  });

  test('returns category listing facets and applies facet filters', async ({ api, listingCatalog }) => {
    test.setTimeout(120_000);

    const { category, facets } = listingCatalog;
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
    expect(listing.totalCount).toBe(20);
    expectCatalogFacets(listing.facets, facets);

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

  test('filters category listing products by price range', async ({ api, listingCatalog }) => {
    test.setTimeout(90_000);

    const { category, expectedOrder } = listingCatalog;
    const listingScope = {
      kind: 'CATEGORY',
      categoryId: category.id,
    } as const;
    const expectedProducts = expectedOrder.priceAsc.slice(5, 15);
    const priceFilter = [{ price: { min: 600, max: 1500 } }];

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

function expectCatalogFacets(listingFacets: ApiListingFacet[], catalogFacets: { slug: string }[]) {
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
