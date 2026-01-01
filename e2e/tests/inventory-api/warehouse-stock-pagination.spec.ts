import { randomUUID } from 'node:crypto';
import type { ApiFixtures } from '@fixtures/api/api';
import type {
  ApiWarehouseStock,
  ApiInventoryMutation,
  ApiInventoryQuery,
} from '@codegen/admin-gql';
import { createConnectionPaginationTests, type Connection } from '@utils/connectionPaginationBuilder';

// Helper to access inventory API data
const inv = (data: unknown) =>
  data as { inventoryMutation: ApiInventoryMutation; inventoryQuery: ApiInventoryQuery };

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

  for (const item of stockData) {
    // Create product (which creates default variant)
    const { data: productData } = await api.admin.mutation('inventory-api/ProductCreate', {
      variables: {},
    });

    const product = inv(productData).inventoryMutation.productCreate.product;
    const variantId = product?.variants?.edges?.[0]?.node?.id;

    if (!variantId) {
      throw new Error('Failed to create product with variant');
    }

    // Set stock for this variant
    await api.admin.mutation('inventory-api/VariantSetStock', {
      variables: {
        input: {
          variantId,
          warehouseId: warehouse.id,
          quantity: item.quantity,
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
      sortExpected: (items) => [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    },
    {
      name: 'createdAt DESC',
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      sortExpected: (items) => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
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
  pageSize: 2,
  apiClient: 'admin',
});
