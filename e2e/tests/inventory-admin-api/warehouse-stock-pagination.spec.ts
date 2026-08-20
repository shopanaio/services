import { randomUUID } from 'node:crypto';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiFixtures } from '@fixtures/api/api';
import type { ApiWarehouseStock, ApiInventoryMutation, ApiInventoryQuery } from '@codegen/admin-gql';
import { encodeGlobalId, parseGlobalId } from '@utils/globalid';
import {
  createConnectionPaginationTests,
  type Connection,
} from '@utils/connectionPaginationBuilder';

// Helper to access inventory API data
const inv = (data: unknown) =>
  data as { inventoryMutation: ApiInventoryMutation; inventoryQuery: ApiInventoryQuery };

const getRawStockId = (stock: ApiWarehouseStock) => parseGlobalId(stock.id).id;
const compareStockId = (a: ApiWarehouseStock, b: ApiWarehouseStock) =>
  getRawStockId(a).localeCompare(getRawStockId(b));
const compareCreatedAtAsc = (a: ApiWarehouseStock, b: ApiWarehouseStock) =>
  a.createdAt.localeCompare(b.createdAt) || compareStockId(a, b);
const compareCreatedAtDesc = (a: ApiWarehouseStock, b: ApiWarehouseStock) =>
  b.createdAt.localeCompare(a.createdAt) || compareStockId(a, b);

interface PrepareResult {
  expectedItems: ApiWarehouseStock[];
  baseVariables: { warehouseId: string };
  whereFilter?: Record<string, unknown>;
}

async function prepareWarehouseStocks(api: ApiFixtures['api']): Promise<PrepareResult> {
  const prefix = `WH-STOCK-${randomUUID().slice(0, 8)}`;

  await api.session.setupUserAndStore();

  // Create a warehouse
  const { data: warehouseData } = await api.admin.mutation('inventory-api/WarehouseCreate', {
    variables: {
      input: {
        code: prefix,
        name: `Stock Pagination Warehouse ${prefix}`,
        isDefault: false,
      },
    },
  });

  const warehouse = inv(warehouseData).inventoryMutation.warehouseCreate.warehouse;
  if (!warehouse) {
    throw new Error('Failed to create warehouse');
  }

  // Create 5 products with variants and set stock with different quantities
  const stockData = [
    { quantity: 10 },
    { quantity: 25 },
    { quantity: 50 },
    { quantity: 75 },
    { quantity: 100 },
  ];

  for (let i = 0; i < stockData.length; i++) {
    const item = stockData[i];
    // Create product with tracked inventory (which creates default variant with inventoryItem)
    const { data: productData } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title: `Stock Product ${prefix}-${i}`,
          handle: `stock-product-${prefix}-${i}`,
          inventoryItem: { tracked: true },
        },
      },
    });

    const product = (productData as { catalogMutation: { productCreate: { product: any } } })
      .catalogMutation.productCreate.product;
    const inventoryItemId = product?.variants?.edges?.[0]?.node?.inventoryItem?.id;

    if (!inventoryItemId) {
      throw new Error('Failed to create product with inventory item');
    }

    // Set stock for this inventory item via inventoryItemUpdate
    await api.admin.mutation('inventory-api/VariantSetStock', {
      variables: {
        input: {
          id: inventoryItemId,
          stock: {
            warehouseId: warehouse.id,
            onHand: item.quantity,
          },
        },
      },
    });
  }

  // Query all stocks from the warehouse to get the expected items
  const { data: stockQueryData } = await api.admin.query('inventory-api/WarehouseStockFindMany', {
    variables: {
      warehouseId: warehouse.id,
      first: 100,
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
    },
  });

  const stockConnection = inv(stockQueryData).inventoryQuery.warehouse?.stock;
  const expectedItems = stockConnection?.edges?.map((e) => e.node) ?? [];

  return {
    expectedItems: expectedItems as ApiWarehouseStock[],
    baseVariables: { warehouseId: warehouse.id },
  };
}

createConnectionPaginationTests<ApiWarehouseStock>({
  queryName: 'inventory-api/WarehouseStockFindMany',
  suiteName: 'Warehouse Stock cursor pagination',
  prepare: prepareWarehouseStocks,
  sortCases: [
    {
      name: 'quantityOnHand ASC',
      orderBy: [{ field: 'quantityOnHand', direction: 'asc' }],
      sortExpected: (items) => [...items].sort((a, b) => a.quantityOnHand - b.quantityOnHand),
    },
    {
      name: 'quantityOnHand DESC',
      orderBy: [{ field: 'quantityOnHand', direction: 'desc' }],
      sortExpected: (items) => [...items].sort((a, b) => b.quantityOnHand - a.quantityOnHand),
    },
    {
      name: 'createdAt ASC',
      orderBy: [{ field: 'createdAt', direction: 'asc' }],
      sortExpected: (items) => [...items].sort(compareCreatedAtAsc),
    },
    {
      name: 'createdAt DESC',
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      sortExpected: (items) => [...items].sort(compareCreatedAtDesc),
    },
  ],
  filterCases: [
    {
      name: 'by quantityOnHand _gte',
      where: { quantityOnHand: { _gte: 50 } },
      filterExpected: (items) => items.filter((i) => i.quantityOnHand >= 50),
    },
    {
      name: 'by quantityOnHand _lte',
      where: { quantityOnHand: { _lte: 50 } },
      filterExpected: (items) => items.filter((i) => i.quantityOnHand <= 50),
    },
    {
      name: 'by quantityOnHand _eq',
      where: { quantityOnHand: { _eq: 50 } },
      filterExpected: (items) => items.filter((i) => i.quantityOnHand === 50),
    },
    {
      name: 'with _or condition',
      where: {
        _or: [{ quantityOnHand: { _eq: 10 } }, { quantityOnHand: { _eq: 100 } }],
      },
      filterExpected: (items) =>
        items.filter((i) => i.quantityOnHand === 10 || i.quantityOnHand === 100),
    },
    {
      name: 'with _and condition',
      where: {
        _and: [{ quantityOnHand: { _gte: 25 } }, { quantityOnHand: { _lte: 75 } }],
      },
      filterExpected: (items) =>
        items.filter((i) => i.quantityOnHand >= 25 && i.quantityOnHand <= 75),
    },
    {
      name: 'with _not condition',
      where: {
        _not: { quantityOnHand: { _eq: 50 } },
      },
      filterExpected: (items) => items.filter((i) => i.quantityOnHand !== 50),
    },
  ],
  getConnection: (data) => {
    const stock = inv(data).inventoryQuery.warehouse?.stock;
    if (!stock) {
      throw new Error('Warehouse stock connection not found');
    }
    return stock as Connection<ApiWarehouseStock>;
  },
  getNodeIdentifier: (node) => node.id,
  emptyWhere: {
    id: {
      _eq: encodeGlobalId('WarehouseStock', '00000000-0000-0000-0000-000000000000'),
    },
  },
  pageSize: 2,
  apiClient: 'admin',
});

test.describe('Warehouse Stock API contracts', () => {
  test('should filter nested warehouse stock by global warehouse and variant ids', async ({ api }) => {
    const { expectedItems, baseVariables } = await prepareWarehouseStocks(api);
    const target = expectedItems[0] as ApiWarehouseStock & {
      warehouseId: string;
      variantId: string;
      unavailableQuantity: number;
      reservedQuantity: number;
      availableForSale: number;
    };

    expect(parseGlobalId(target.id).typeName).toBe('WarehouseStock');
    expect(parseGlobalId(target.warehouseId).typeName).toBe('Warehouse');
    expect(parseGlobalId(target.variantId).typeName).toBe('Variant');

    const { data } = await api.admin.query('inventory-api/WarehouseStockFindMany', {
      variables: {
        ...baseVariables,
        first: 10,
        where: {
          _and: [
            { warehouseId: { _eq: target.warehouseId } },
            { variantId: { _eq: target.variantId } },
            { id: { _eq: target.id } },
          ],
        },
      },
    });

    const stock = inv(data).inventoryQuery.warehouse?.stock;
    expect(stock?.edges).toHaveLength(1);

    const returned = stock?.edges[0].node as typeof target;
    expect(returned.id).toBe(target.id);
    expect(returned.warehouseId).toBe(baseVariables.warehouseId);
    expect(returned.variantId).toBe(target.variantId);
    expect(returned.reservedQuantity).toBe(0);
    expect(returned.unavailableQuantity).toBe(0);
    expect(returned.availableForSale).toBe(returned.quantityOnHand);
  });
});
