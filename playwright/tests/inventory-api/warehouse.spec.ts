import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiInventoryMutation, ApiInventoryQuery } from '@codegen/admin-gql-v2';

// Helper to access inventory API data
const inv = (data: unknown) =>
  data as { inventoryMutation: ApiInventoryMutation; inventoryQuery: ApiInventoryQuery };

test.describe('Warehouse API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndProject();
  });

  test('should create a warehouse', async ({ api }) => {
    const { data } = await api.admin.mutation('inventory/WarehouseCreate', {
      variables: {
        input: {
          code: 'WH-001',
          name: 'Main Warehouse',
          isDefault: true,
        },
      },
    });

    const result = inv(data).inventoryMutation.warehouseCreate;
    expect(result.userErrors).toHaveLength(0);
    expect(result.warehouse).toBeTruthy();
    expect(result.warehouse?.code).toBe('WH-001');
    expect(result.warehouse?.name).toBe('Main Warehouse');
    expect(result.warehouse?.isDefault).toBe(true);
  });

  test('should update a warehouse', async ({ api }) => {
    // Create warehouse first
    const { data: createData } = await api.admin.mutation('inventory/WarehouseCreate', {
      variables: {
        input: {
          code: 'WH-002',
          name: 'Secondary Warehouse',
        },
      },
    });

    const warehouseId = inv(createData).inventoryMutation.warehouseCreate.warehouse?.id;

    // Update warehouse
    const { data } = await api.admin.mutation('inventory/WarehouseUpdate', {
      variables: {
        input: {
          id: warehouseId,
          name: 'Updated Warehouse Name',
          code: 'WH-002-UPDATED',
        },
      },
    });

    const result = inv(data).inventoryMutation.warehouseUpdate;
    expect(result.userErrors).toHaveLength(0);
    expect(result.warehouse).toBeTruthy();
    expect(result.warehouse?.name).toBe('Updated Warehouse Name');
    expect(result.warehouse?.code).toBe('WH-002-UPDATED');
  });

  test('should set warehouse as default', async ({ api }) => {
    // Create first warehouse as default
    const { data: firstData } = await api.admin.mutation('inventory/WarehouseCreate', {
      variables: {
        input: {
          code: 'WH-DEFAULT-1',
          name: 'First Default',
          isDefault: true,
        },
      },
    });

    expect(inv(firstData).inventoryMutation.warehouseCreate.warehouse?.isDefault).toBe(true);

    // Create second warehouse as default - should clear first
    const { data: secondData } = await api.admin.mutation('inventory/WarehouseCreate', {
      variables: {
        input: {
          code: 'WH-DEFAULT-2',
          name: 'Second Default',
          isDefault: true,
        },
      },
    });

    expect(inv(secondData).inventoryMutation.warehouseCreate.warehouse?.isDefault).toBe(true);
  });

  test('should delete a warehouse', async ({ api }) => {
    // Create warehouse first
    const { data: createData } = await api.admin.mutation('inventory/WarehouseCreate', {
      variables: {
        input: {
          code: 'WH-TO-DELETE',
          name: 'Warehouse to Delete',
        },
      },
    });

    const warehouseId = inv(createData).inventoryMutation.warehouseCreate.warehouse?.id;

    // Delete warehouse
    const { data } = await api.admin.mutation('inventory/WarehouseDelete', {
      variables: {
        input: {
          id: warehouseId,
        },
      },
    });

    expect(inv(data).inventoryMutation.warehouseDelete.userErrors).toHaveLength(0);
    expect(inv(data).inventoryMutation.warehouseDelete.deletedWarehouseId).toBe(warehouseId);
  });

  test('should return error for duplicate warehouse code', async ({ api }) => {
    // Create first warehouse
    await api.admin.mutation('inventory/WarehouseCreate', {
      variables: {
        input: {
          code: 'WH-DUPLICATE',
          name: 'Original Warehouse',
        },
      },
    });

    // Try to create warehouse with same code
    const { data } = await api.admin.mutation('inventory/WarehouseCreate', {
      variables: {
        input: {
          code: 'WH-DUPLICATE',
          name: 'Duplicate Warehouse',
        },
      },
      throwOnError: false,
    });

    const result = inv(data).inventoryMutation.warehouseCreate;
    expect(result.warehouse).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should get warehouse by id', async ({ api }) => {
    // Create warehouse first
    const { data: createData } = await api.admin.mutation('inventory/WarehouseCreate', {
      variables: {
        input: {
          code: 'WH-QUERY-001',
          name: 'Query Test Warehouse',
          isDefault: false,
        },
      },
    });

    const warehouseId = inv(createData).inventoryMutation.warehouseCreate.warehouse?.id;

    // Query warehouse by id
    const { data } = await api.admin.query('inventory/WarehouseFindOne', {
      variables: { id: warehouseId },
    });

    expect(inv(data).inventoryQuery.warehouse).toBeTruthy();
    expect(inv(data).inventoryQuery.warehouse?.id).toBe(warehouseId);
    expect(inv(data).inventoryQuery.warehouse?.code).toBe('WH-QUERY-001');
    expect(inv(data).inventoryQuery.warehouse?.name).toBe('Query Test Warehouse');
    expect(inv(data).inventoryQuery.warehouse?.isDefault).toBe(false);
  });

  test('should return null for non-existent warehouse', async ({ api }) => {
    // Use a valid UUID format that doesn't exist
    const { data } = await api.admin.query('inventory/WarehouseFindOne', {
      variables: { id: '00000000-0000-0000-0000-000000000000' },
    });

    expect(inv(data).inventoryQuery.warehouse).toBeNull();
  });

});
