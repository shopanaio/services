import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Stock API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  /**
   * Helper to create a product and get the default variant ID + inventoryItem ID
   */
  async function createProductWithVariant(api: any, title = 'Stock Test Product') {
    const handle = title.toLowerCase().replace(/\s+/g, '-');
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: {
        input: {
          title,
          handle,
          inventoryItem: { tracked: true },
        },
      },
    });

    const product = data.catalogMutation.productCreate.product;
    const variantEdges = product?.variants?.edges ?? [];
    const variant = variantEdges[0]?.node ?? null;
    const variantId = variant?.id ?? null;
    const inventoryItemId = variant?.inventoryItem?.id ?? null;

    return { product, variantId, inventoryItemId };
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
      const { product, inventoryItemId } = await createProductWithVariant(api);
      expect(product).toBeTruthy();

      if (!inventoryItemId) {
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
            id: inventoryItemId,
            stock: {
              warehouseId: warehouse.id,
              onHand: 100,
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(0);
      expect(result.inventoryItem).toBeTruthy();

      const stockRecord = result.inventoryItem.stock.find(
        (s: { warehouse: { id: string } }) => s.warehouse.id === warehouse.id,
      );
      expect(stockRecord).toBeTruthy();
      expect(stockRecord.quantityOnHand).toBe(100);
    });

    test('should update stock quantity', async ({ api }) => {
      // Create product with variant
      const { inventoryItemId } = await createProductWithVariant(api);

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      // Create warehouse
      const warehouse = await createWarehouse(api, 'WH-002', 'Update Test Warehouse');

      // Set initial stock
      await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: inventoryItemId,
            stock: {
              warehouseId: warehouse.id,
              onHand: 50,
            },
          },
        },
      });

      // Update stock
      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: inventoryItemId,
            stock: {
              warehouseId: warehouse.id,
              onHand: 75,
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(0);

      const stockRecord = result.inventoryItem.stock.find(
        (s: { warehouse: { id: string } }) => s.warehouse.id === warehouse.id,
      );
      expect(stockRecord).toBeTruthy();
      expect(stockRecord.quantityOnHand).toBe(75);
    });

    test('should set zero stock', async ({ api }) => {
      // Create product with variant
      const { inventoryItemId } = await createProductWithVariant(api);

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      // Create warehouse
      const warehouse = await createWarehouse(api, 'WH-003', 'Zero Stock Warehouse');

      // Set stock to 0
      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: inventoryItemId,
            stock: {
              warehouseId: warehouse.id,
              onHand: 0,
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(0);

      const stockRecord = result.inventoryItem.stock.find(
        (s: { warehouse: { id: string } }) => s.warehouse.id === warehouse.id,
      );
      expect(stockRecord).toBeTruthy();
      expect(stockRecord.quantityOnHand).toBe(0);
    });

    test('should return error for invalid inventory item ID', async ({ api }) => {
      // Create warehouse first
      const warehouse = await createWarehouse(api, 'WH-004', 'Error Test Warehouse');

      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: '00000000-0000-0000-0000-000000000000',
            stock: {
              warehouseId: warehouse.id,
              onHand: 10,
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(1);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
      expect(result.inventoryItem).toBeNull();
    });

    test('should return error for invalid warehouse ID', async ({ api }) => {
      // Create product with variant
      const { inventoryItemId } = await createProductWithVariant(api);

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: inventoryItemId,
            stock: {
              warehouseId: '00000000-0000-0000-0000-000000000000',
              onHand: 10,
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(1);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
      expect(result.inventoryItem).toBeNull();
    });

    test('should return error for negative quantity', async ({ api }) => {
      // Create product with variant
      const { inventoryItemId } = await createProductWithVariant(api);

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      // Create warehouse
      const warehouse = await createWarehouse(api, 'WH-005', 'Negative Test Warehouse');

      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: inventoryItemId,
            stock: {
              warehouseId: warehouse.id,
              onHand: -10,
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(1);
      expect(result.userErrors[0].code).toBe('INVALID_QUANTITY');
      expect(result.inventoryItem).toBeNull();
    });

    test('should set stock in multiple warehouses', async ({ api }) => {
      // Create product with variant
      const { inventoryItemId } = await createProductWithVariant(api);

      if (!inventoryItemId) {
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
            id: inventoryItemId,
            stock: {
              warehouseId: warehouse1.id,
              onHand: 100,
            },
          },
        },
      });

      expect(data1.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);
      const stock1 = data1.inventoryMutation.inventoryItemUpdate.inventoryItem.stock.find(
        (s: { warehouse: { id: string } }) => s.warehouse.id === warehouse1.id,
      );
      expect(stock1?.quantityOnHand).toBe(100);

      // Set stock in second warehouse
      const { data: data2 } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: inventoryItemId,
            stock: {
              warehouseId: warehouse2.id,
              onHand: 50,
            },
          },
        },
      });

      expect(data2.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);
      const stock2 = data2.inventoryMutation.inventoryItemUpdate.inventoryItem.stock.find(
        (s: { warehouse: { id: string } }) => s.warehouse.id === warehouse2.id,
      );
      expect(stock2?.quantityOnHand).toBe(50);
    });
  });
});
