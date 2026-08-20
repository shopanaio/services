import { randomUUID } from 'node:crypto';
import type { ApiFixtures } from '@fixtures/api/api';
import { test } from '@fixtures/base.extend';
import type {
  ApiCatalogMutation,
  ApiCatalogQuery,
  ApiInventoryMutation,
  ApiVariant,
} from '@codegen/admin-gql';
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
  price?: { amountMinor: unknown; currency: string } | null;
  inventoryItem?: { id: string; sku?: string | null; totalAvailable: number } | null;
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

const inventory = (data: unknown) => data as { inventoryMutation: ApiInventoryMutation };

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

async function createProductWithVariants(
  api: ApiFixtures['api'],
  productHandle: string,
  variantHandles: string[],
) {
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title: productHandle,
        handle: productHandle,
        inventoryItem: { tracked: true },
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
    price: edge.node.price ?? null,
    inventoryItem: edge.node.inventoryItem
      ? {
          id: edge.node.inventoryItem.id,
          sku: edge.node.inventoryItem.sku,
          totalAvailable: edge.node.inventoryItem.totalAvailable,
        }
      : null,
  }));

  expect(expectedItems).toHaveLength(variantHandles.length);

  return {
    product,
    expectedItems,
  };
}

async function createWarehouse(api: ApiFixtures['api'], suffix: string) {
  const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: {
      input: {
        code: `VAR-SORT-${suffix}`,
        name: `Variant Sort ${suffix}`,
        isDefault: false,
      },
    },
  });

  const result = inventory(data).inventoryMutation.warehouseCreate;
  expect(result.userErrors).toHaveLength(0);
  if (!result.warehouse) {
    throw new Error('Warehouse was not returned');
  }

  return result.warehouse;
}

async function updateVariantMerchandisingData(
  api: ApiFixtures['api'],
  warehouseId: string,
  item: VariantListItem,
  data: {
    priceAmountMinor: number;
    sku: string;
    availableQuantity: number;
  },
): Promise<VariantListItem> {
  if (!item.inventoryItem?.id) {
    throw new Error(`Variant ${item.id} does not have an inventory item`);
  }

  const { data: pricingData } = await api.admin.mutation('inventory-api/VariantSetPricing', {
    variables: {
      input: {
        variantId: item.id,
        currency: 'UAH',
        amountMinor: String(data.priceAmountMinor),
      },
    },
  });
  expect(catalog(pricingData).catalogMutation.variantUpdatePricing.userErrors).toHaveLength(0);

  const { data: stockData } = await api.admin.mutation('inventory-api/VariantSetStock', {
    variables: {
      input: {
        id: item.inventoryItem.id,
        sku: data.sku,
        trackInventory: true,
        stock: {
          warehouseId,
          onHand: data.availableQuantity,
        },
      },
    },
  });

  const stockResult = inventory(stockData).inventoryMutation.inventoryItemUpdate;
  expect(stockResult.userErrors).toHaveLength(0);
  expect(stockResult.inventoryItem?.sku).toBe(data.sku);
  expect(stockResult.inventoryItem?.totalAvailable).toBe(data.availableQuantity);

  return {
    ...item,
    price: {
      amountMinor: data.priceAmountMinor,
      currency: 'UAH',
    },
    inventoryItem: {
      id: item.inventoryItem.id,
      sku: data.sku,
      totalAvailable: data.availableQuantity,
    },
  };
}

async function prepareVariants(api: ApiFixtures['api']) {
  const suffix = randomUUID().slice(0, 8);
  const productHandle = `variant-pagination-${suffix}`;
  const variantHandles = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];

  await api.session.setupUserAndStore();

  const { product, expectedItems } = await createProductWithVariants(
    api,
    productHandle,
    variantHandles,
  );

  return {
    expectedItems,
    whereFilter: { productId: { _eq: product.id } },
  };
}

test.describe('CatalogQuery.variants productId ordering', () => {
  test('sorts by productId first and handle second across products with merchandising data', async ({
    api,
  }) => {
    const suffix = randomUUID().slice(0, 8);
    const variantHandles = ['alpha', 'mango', 'zulu'];

    await api.session.setupUserAndStore();

    const warehouse = await createWarehouse(api, suffix);
    const products: Array<{ product: { id: string }; expectedItems: VariantListItem[] }> = [];
    const expectedItems: VariantListItem[] = [];
    for (const productIndex of [0, 1, 2]) {
      const product = await createProductWithVariants(
        api,
        `variant-product-order-${productIndex}-${suffix}`,
        variantHandles,
      );
      products.push(product);

      for (const item of product.expectedItems) {
        const handleIndex = variantHandles.indexOf(item.handle);
        expectedItems.push(
          await updateVariantMerchandisingData(api, warehouse.id, item, {
            priceAmountMinor: 10_000 + productIndex * 1_000 + handleIndex * 100,
            sku: `VAR-SORT-${suffix}-${productIndex}-${handleIndex}`,
            availableQuantity: 20 + productIndex * 10 + handleIndex,
          }),
        );
      }
    }

    const orderBy: VariantOrder[] = [
      { field: 'productId', direction: 'asc' },
      { field: 'handle', direction: 'desc' },
    ];

    const { data } = await api.admin.query('catalog-api/VariantFindMany', {
      variables: {
        first: expectedItems.length,
        where: {
          productId: { _in: products.map((product) => product.product.id) },
        },
        orderBy,
      },
    });

    const connection = catalog(data).catalogQuery
      .variants as unknown as Connection<VariantListItem>;
    const productIdByVariantId = new Map(
      expectedItems.map((item) => [item.id, item.productId] as const),
    );

    const returnedItems = connection.edges.map((edge) => {
      const productId = productIdByVariantId.get(edge.node.id);
      if (!productId) {
        throw new Error(`Unexpected variant returned: ${edge.node.id}`);
      }

      return {
        ...edge.node,
        productId,
      };
    });
    const sortedExpected = [...expectedItems].sort(compareVariantOrders(orderBy));

    expect(returnedItems.map((item) => item.id)).toEqual(sortedExpected.map((item) => item.id));
    expect(returnedItems.map((item) => item.productId)).toEqual(
      sortedExpected.map((item) => item.productId),
    );
    expect(returnedItems.map((item) => item.handle)).toEqual(
      sortedExpected.map((item) => item.handle),
    );

    const productOrder = products.map((product) => product.product.id).sort((a, b) =>
      rawId(a).localeCompare(rawId(b)),
    );
    expect(returnedItems.map((item) => item.productId)).toEqual(
      productOrder.flatMap((productId) => [productId, productId, productId]),
    );
    for (const productId of productOrder) {
      expect(
        returnedItems.filter((item) => item.productId === productId).map((item) => item.handle),
      ).toEqual(['zulu', 'mango', 'alpha']);
    }

    const expectedById = new Map(sortedExpected.map((item) => [item.id, item] as const));
    for (const item of returnedItems) {
      const expected = expectedById.get(item.id);
      expect(expected).toBeTruthy();
      expect(Number(item.price?.amountMinor)).toBe(Number(expected?.price?.amountMinor));
      expect(item.price?.currency).toBe(expected?.price?.currency);
      expect(item.inventoryItem?.sku).toBe(expected?.inventoryItem?.sku);
      expect(item.inventoryItem?.totalAvailable).toBe(expected?.inventoryItem?.totalAvailable);
    }
  });

  test('rejects price sku and available quantity as catalog variant order fields', async ({
    api,
  }) => {
    await api.session.setupUserAndStore();

    for (const field of ['price', 'sku', 'availableQuantity', 'totalAvailable']) {
      const { errors } = await api.admin.query('catalog-api/VariantFindMany', {
        throwOnError: false,
        variables: {
          first: 1,
          orderBy: [{ field, direction: 'asc' }],
        },
      });

      expect(errors?.length ?? 0).toBeGreaterThan(0);
      expect(errors.map((error) => error.message).join('\n')).toContain('VariantOrderField');
    }
  });
});

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
