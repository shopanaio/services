import { randomUUID } from 'node:crypto';
import type { ApiFixtures } from '@fixtures/api/api';
import type { ApiWarehouse, ApiInventoryMutation, ApiInventoryQuery } from '@codegen/admin-gql-v2';
import { createConnectionPaginationTests } from '@utils/connectionPaginationBuilder';

// Helper to access inventory API data
const inv = (data: unknown) =>
  data as { inventoryMutation: ApiInventoryMutation; inventoryQuery: ApiInventoryQuery };

async function prepareWarehouses(api: ApiFixtures['api']) {
  const prefix = `WH-PAG-${randomUUID().slice(0, 8)}`;
  const expectedItems: ApiWarehouse[] = [];

  await api.session.setupUserAndProject();

  // Create 5 warehouses with predictable data for sorting and filtering
  const warehouseData = [
    { codeSuffix: 'A', name: 'Alpha Storage', isDefault: true },
    { codeSuffix: 'B', name: 'Beta Center', isDefault: false },
    { codeSuffix: 'C', name: 'Charlie Depot', isDefault: false },
    { codeSuffix: 'D', name: 'Delta Storage', isDefault: false },
    { codeSuffix: 'E', name: 'Echo Warehouse', isDefault: false },
  ];

  for (const item of warehouseData) {
    const code = `${prefix}-${item.codeSuffix}`;

    const { data } = await api.admin.mutation('inventory/WarehouseCreate', {
      variables: {
        input: {
          code,
          name: item.name,
          isDefault: item.isDefault,
        },
      },
    });

    const warehouse = inv(data).inventoryMutation.warehouseCreate.warehouse;
    if (warehouse) {
      expectedItems.push(warehouse);
    }
  }

  return {
    expectedItems,
    whereFilter: { code: { _startsWith: prefix } },
  };
}

createConnectionPaginationTests<ApiWarehouse>({
  queryName: 'inventory/WarehouseFindMany',
  suiteName: 'Warehouse cursor pagination',
  prepare: prepareWarehouses,
  sortCases: [
    {
      name: 'code ASC',
      orderBy: [{ field: 'code', direction: 'asc' }],
      sortExpected: (items) => [...items].sort((a, b) => a.code.localeCompare(b.code)),
    },
    {
      name: 'code DESC',
      orderBy: [{ field: 'code', direction: 'desc' }],
      sortExpected: (items) => [...items].sort((a, b) => b.code.localeCompare(a.code)),
    },
    {
      name: 'name ASC',
      orderBy: [{ field: 'name', direction: 'asc' }],
      sortExpected: (items) => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    },
    {
      name: 'name DESC',
      orderBy: [{ field: 'name', direction: 'desc' }],
      sortExpected: (items) => [...items].sort((a, b) => b.name.localeCompare(a.name)),
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
      name: 'by code with _endsWith',
      where: { code: { _endsWith: '-A' } },
      filterExpected: (items) => items.filter((i) => i.code.endsWith('-A')),
    },
    {
      name: 'by name with _contains',
      where: { name: { _contains: 'Storage' } },
      filterExpected: (items) => items.filter((i) => i.name.includes('Storage')),
    },
    {
      // cspell:ignore containsi
      name: 'by name with _containsi (case-insensitive)',
      where: { name: { _containsi: 'storage' } },
      filterExpected: (items) => items.filter((i) => i.name.toLowerCase().includes('storage')),
    },
    {
      name: 'by isDefault true',
      where: { isDefault: { _eq: true } },
      filterExpected: (items) => items.filter((i) => i.isDefault === true),
    },
    {
      name: 'by isDefault false',
      where: { isDefault: { _eq: false } },
      filterExpected: (items) => items.filter((i) => i.isDefault === false),
    },
    {
      name: 'with _or condition',
      where: {
        _or: [{ name: { _contains: 'Alpha' } }, { name: { _contains: 'Echo' } }],
      },
      filterExpected: (items) =>
        items.filter((i) => i.name.includes('Alpha') || i.name.includes('Echo')),
    },
    {
      name: 'with _not condition',
      where: {
        _not: { name: { _contains: 'Storage' } },
      },
      filterExpected: (items) => items.filter((i) => !i.name.includes('Storage')),
    },
    {
      name: 'with _and condition',
      where: {
        _and: [{ name: { _contains: 'Storage' } }, { isDefault: { _eq: false } }],
      },
      filterExpected: (items) =>
        items.filter((i) => i.name.includes('Storage') && i.isDefault === false),
    },
  ],
  getConnection: (data) => inv(data).inventoryQuery.warehouses,
  getNodeIdentifier: (node) => node.id,
  pageSize: 2,
  apiClient: 'admin',
});
