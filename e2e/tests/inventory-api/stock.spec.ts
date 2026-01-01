import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Stock API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  /**
   * Helper to create a product and get the default variant ID
   */
  async function createProductWithVariant(api: any, title = 'Stock Test Product') {
    const { data } = await api.admin.mutation('inventory-api/ProductCreate', {
      variables: { input: { title } },
    });

    const product = data.inventoryMutation.productCreate.product;
    const variantEdges = product?.variants?.edges ?? [];
    const variantId = variantEdges[0]?.node?.id ?? null;

    return { product, variantId };
  }

  /**
   * Helper to create a warehouse
   */
  async function createWarehouse(api: any, code: string, name: string, isDefault = false) {
    const { data } = await api.admin.mutation('inventory-api/WarehouseCreate', {
      variables: { input: { code, name, isDefault } },
    });

    return data.inventoryMutation.warehouseCreate.warehouse;
  }

  test.describe('Variant Stock', () => {
    test('should set variant stock in warehouse', async ({ api }) => {
      // Create product with variant
      const { product, variantId } = await createProductWithVariant(api);
      expect(product).toBeTruthy();

      if (!variantId) {
        test.skip();
        return;
      }

      // Create warehouse
      const warehouse = await createWarehouse(api, 'WH-001', 'Main Warehouse');
      expect(warehouse).toBeTruthy();

      // Set stock
      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            variantId,
            warehouseId: warehouse.id,
            quantity: 100,
          },
        },
      });

      const result = data.inventoryMutation.variantSetStock;
      expect(result.userErrors).toHaveLength(0);
      expect(result.stock).toBeTruthy();
      expect(result.stock?.quantityOnHand).toBe(100);
    });

    test('should update stock quantity', async ({ api }) => {
      // Create product with variant
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      // Create warehouse
      const warehouse = await createWarehouse(api, 'WH-002', 'Update Test Warehouse');

      // Set initial stock
      await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            variantId,
            warehouseId: warehouse.id,
            quantity: 50,
          },
        },
      });

      // Update stock
      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            variantId,
            warehouseId: warehouse.id,
            quantity: 75,
          },
        },
      });

      const result = data.inventoryMutation.variantSetStock;
      expect(result.userErrors).toHaveLength(0);
      expect(result.stock?.quantityOnHand).toBe(75);
    });

    test('should set zero stock', async ({ api }) => {
      // Create product with variant
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      // Create warehouse
      const warehouse = await createWarehouse(api, 'WH-003', 'Zero Stock Warehouse');

      // Set stock to 0
      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            variantId,
            warehouseId: warehouse.id,
            quantity: 0,
          },
        },
      });

      const result = data.inventoryMutation.variantSetStock;
      expect(result.userErrors).toHaveLength(0);
      expect(result.stock?.quantityOnHand).toBe(0);
    });

    test('should return error for invalid variant ID', async ({ api }) => {
      // Create warehouse first
      const warehouse = await createWarehouse(api, 'WH-004', 'Error Test Warehouse');

      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            variantId: '00000000-0000-0000-0000-000000000000',
            warehouseId: warehouse.id,
            quantity: 10,
          },
        },
      });

      const result = data.inventoryMutation.variantSetStock;
      expect(result.userErrors).toHaveLength(1);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
      expect(result.stock).toBeNull();
    });

    test('should return error for invalid warehouse ID', async ({ api }) => {
      // Create product with variant
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            variantId,
            warehouseId: '00000000-0000-0000-0000-000000000000',
            quantity: 10,
          },
        },
      });

      const result = data.inventoryMutation.variantSetStock;
      expect(result.userErrors).toHaveLength(1);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
      expect(result.stock).toBeNull();
    });

    test('should return error for negative quantity', async ({ api }) => {
      // Create product with variant
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      // Create warehouse
      const warehouse = await createWarehouse(api, 'WH-005', 'Negative Test Warehouse');

      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            variantId,
            warehouseId: warehouse.id,
            quantity: -10,
          },
        },
      });

      const result = data.inventoryMutation.variantSetStock;
      expect(result.userErrors).toHaveLength(1);
      expect(result.userErrors[0].code).toBe('INVALID_QUANTITY');
      expect(result.stock).toBeNull();
    });

    test('should set stock in multiple warehouses', async ({ api }) => {
      // Create product with variant
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      // Create two warehouses
      const warehouse1 = await createWarehouse(api, 'WH-MULTI-1', 'Warehouse 1');
      const warehouse2 = await createWarehouse(api, 'WH-MULTI-2', 'Warehouse 2');

      // Set stock in first warehouse
      const { data: data1 } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            variantId,
            warehouseId: warehouse1.id,
            quantity: 100,
          },
        },
      });

      expect(data1.inventoryMutation.variantSetStock.userErrors).toHaveLength(0);
      expect(data1.inventoryMutation.variantSetStock.stock?.quantityOnHand).toBe(100);

      // Set stock in second warehouse
      const { data: data2 } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            variantId,
            warehouseId: warehouse2.id,
            quantity: 50,
          },
        },
      });

      expect(data2.inventoryMutation.variantSetStock.userErrors).toHaveLength(0);
      expect(data2.inventoryMutation.variantSetStock.stock?.quantityOnHand).toBe(50);
    });
  });
});
