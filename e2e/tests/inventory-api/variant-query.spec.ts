import { randomUUID } from 'node:crypto';
import type { ApiFixtures } from '@fixtures/api/api';
import type { ApiCatalogMutation, ApiCatalogQuery, ApiVariant } from '@codegen/admin-gql';
import { expect } from '@playwright/test';
import {
  createConnectionPaginationTests,
  type Connection,
} from '@utils/connectionPaginationBuilder';
import { parseGlobalId } from '@utils/globalid';

type VariantListItem = Pick<
  ApiVariant,
  'id' | 'handle' | 'isDefault' | 'createdAt' | 'updatedAt'
> & {
  productId: string;
};

type VariantOrderField =
  | 'productId'
  | 'handle'
  | 'isDefault'
  | 'createdAt'
  | 'updatedAt'
  | 'id';

type VariantOrder = {
  field: VariantOrderField;
  direction: 'asc' | 'desc';
};

const catalog = (data: unknown) =>
  data as { catalogMutation: ApiCatalogMutation; catalogQuery: ApiCatalogQuery };

const rawId = (globalId: string) => parseGlobalId(globalId).id;

function compareValues(a: string | number | boolean, b: string | number | boolean): number {
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  return String(a).localeCompare(String(b));
}

function getVariantOrderValue(
  item: VariantListItem,
  field: VariantOrderField,
): string | number | boolean {
  switch (field) {
    case 'createdAt':
      return new Date(item.createdAt).getTime();
    case 'updatedAt':
      return new Date(item.updatedAt).getTime();
    case 'id':
      return rawId(item.id);
    case 'productId':
      return rawId(item.productId);
    default:
      return item[field];
  }
}

function compareVariantOrders(
  orderBy: VariantOrder[],
): (a: VariantListItem, b: VariantListItem) => number {
  return (a, b) => {
    for (const order of orderBy) {
      const result = compareValues(
        getVariantOrderValue(a, order.field),
        getVariantOrderValue(b, order.field),
      );

      if (result !== 0) {
        return order.direction === 'asc' ? result : -result;
      }
    }

    const tieBreakerDirection = orderBy[orderBy.length - 1]?.direction ?? 'asc';
    const tieBreaker = rawId(a.id).localeCompare(rawId(b.id));
    return tieBreakerDirection === 'asc' ? tieBreaker : -tieBreaker;
  };
}

function compareVariants(
  field: VariantOrderField,
  direction: 'asc' | 'desc',
): (a: VariantListItem, b: VariantListItem) => number {
  return compareVariantOrders([{ field, direction }]);
}

async function prepareVariants(api: ApiFixtures['api']) {
  const suffix = randomUUID().slice(0, 8);
  const productHandle = `variant-pagination-${suffix}`;
  const variantHandles = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];

  await api.session.setupUserAndStore();

  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title: `Variant Pagination ${suffix}`,
        handle: productHandle,
        options: [
          {
            name: 'Variant Code',
            slug: 'variant-code',
            values: variantHandles.map((handle) => ({
              name: handle,
              slug: handle,
            })),
          },
        ],
        variants: variantHandles.map((handle) => ({ handle })),
      },
    },
  });

  const result = catalog(data).catalogMutation.productCreate;
  expect(result.userErrors).toHaveLength(0);

  const product = result.product;
  if (!product) {
    throw new Error('Created product was not returned');
  }

  const expectedItems: VariantListItem[] = (product.variants?.edges ?? []).map((edge) => ({
    id: edge.node.id,
    handle: edge.node.handle,
    isDefault: edge.node.isDefault,
    createdAt: edge.node.createdAt,
    updatedAt: edge.node.updatedAt,
    productId: product.id,
  }));

  expect(expectedItems).toHaveLength(variantHandles.length);

  return {
    expectedItems,
    whereFilter: { productId: { _eq: product.id } },
  };
}

createConnectionPaginationTests<VariantListItem, VariantOrderField>({
  queryName: 'catalog-api/VariantFindMany',
  suiteName: 'CatalogQuery.variants cursor pagination',
  prepare: prepareVariants,
  sortCases: [
    {
      name: 'handle ASC',
      orderBy: [{ field: 'handle', direction: 'asc' }],
      sortExpected: (items) => [...items].sort(compareVariants('handle', 'asc')),
    },
    {
      name: 'handle DESC',
      orderBy: [{ field: 'handle', direction: 'desc' }],
      sortExpected: (items) => [...items].sort(compareVariants('handle', 'desc')),
    },
    {
      name: 'createdAt ASC',
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
      sortExpected: (items) => [...items].sort(compareVariants('createdAt', 'asc')),
    },
    {
      name: 'createdAt DESC',
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      sortExpected: (items) => [...items].sort(compareVariants('createdAt', 'desc')),
    },
    {
      name: 'isDefault ASC',
      orderBy: [{ field: 'isDefault', direction: 'asc' }],
      sortExpected: (items) => [...items].sort(compareVariants('isDefault', 'asc')),
    },
    {
      name: 'isDefault DESC',
      orderBy: [{ field: 'isDefault', direction: 'desc' }],
      sortExpected: (items) => [...items].sort(compareVariants('isDefault', 'desc')),
    },
    {
      name: 'productId ASC, handle ASC',
      orderBy: [
        { field: 'productId', direction: 'asc' },
        { field: 'handle', direction: 'asc' },
      ],
      sortExpected: (items) =>
        [...items].sort(
          compareVariantOrders([
            { field: 'productId', direction: 'asc' },
            { field: 'handle', direction: 'asc' },
          ]),
        ),
    },
    {
      name: 'productId ASC, handle DESC',
      orderBy: [
        { field: 'productId', direction: 'asc' },
        { field: 'handle', direction: 'desc' },
      ],
      sortExpected: (items) =>
        [...items].sort(
          compareVariantOrders([
            { field: 'productId', direction: 'asc' },
            { field: 'handle', direction: 'desc' },
          ]),
        ),
    },
  ],
  filterCases: [
    {
      name: 'by handle with _contains',
      where: { handle: { _contains: 'a' } },
      filterExpected: (items) => items.filter((item) => item.handle.includes('a')),
    },
    {
      // cspell:ignore containsi
      name: 'by handle with _containsi',
      where: { handle: { _containsi: 'AL' } },
      filterExpected: (items) => items.filter((item) => item.handle.toLowerCase().includes('al')),
    },
    {
      name: 'by isDefault true',
      where: { isDefault: { _eq: true } },
      filterExpected: (items) => items.filter((item) => item.isDefault),
    },
    {
      name: 'by isDefault false',
      where: { isDefault: { _eq: false } },
      filterExpected: (items) => items.filter((item) => !item.isDefault),
    },
    {
      name: 'with _or condition',
      where: {
        _or: [{ handle: { _eq: 'alpha' } }, { handle: { _eq: 'echo' } }],
      },
      filterExpected: (items) =>
        items.filter((item) => item.handle === 'alpha' || item.handle === 'echo'),
    },
    {
      name: 'with _not condition',
      where: {
        _not: { handle: { _contains: 'a' } },
      },
      filterExpected: (items) => items.filter((item) => !item.handle.includes('a')),
    },
    {
      name: 'with _and condition',
      where: {
        _and: [{ handle: { _contains: 'a' } }, { isDefault: { _eq: false } }],
      },
      filterExpected: (items) =>
        items.filter((item) => item.handle.includes('a') && !item.isDefault),
    },
  ],
  getConnection: (data) =>
    catalog(data).catalogQuery.variants as unknown as Connection<VariantListItem>,
  getNodeIdentifier: (node) => node.id,
  emptyWhere: { handle: { _eq: 'missing-variant-handle' } },
  pageSize: 2,
  apiClient: 'admin',
});
