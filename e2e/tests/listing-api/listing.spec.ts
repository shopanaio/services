import { test } from '@fixtures/listing/base.extend';
import { expect } from '@playwright/test';
import type { ApiListingOrderByInput, ApiProduct } from '@codegen/admin-gql';

test.describe('Listing API', () => {
  test('paginates category listing products without filters', async ({ api, listingCatalog }) => {
    const { category, products } = listingCatalog;
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
});
