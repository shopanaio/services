import { randomUUID } from 'node:crypto';
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { encodeGlobalId, parseGlobalId } from '@utils/globalid';

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

      const stockRecord = result.inventoryItem!.stock.find((s) => s.warehouse.id === warehouse.id);
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

      const stockRecord = result.inventoryItem!.stock.find((s) => s.warehouse.id === warehouse.id);
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

    test('should expose warehouse-scoped stock fields with global warehouse and variant IDs', async ({
      api,
    }) => {
      const { product, variantId, inventoryItemId } = await createProductWithVariant(api);
      expect(product).toBeTruthy();

      if (!variantId || !inventoryItemId) {
        test.skip();
        return;
      }

      const warehouse = await createWarehouse(api, 'WH-FIELDS-001', 'Stock Fields Warehouse');
      expect(warehouse).toBeTruthy();

      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: inventoryItemId,
            stock: {
              warehouseId: warehouse.id,
              onHand: 100,
              unavailable: 25,
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(0);

      const stockRecord = result.inventoryItem!.stock.find((s) => s.warehouse.id === warehouse.id);
      expect(stockRecord).toBeTruthy();
      expect(stockRecord.warehouseId).toBe(warehouse.id);
      expect(stockRecord.variantId).toBe(variantId);
      expect(stockRecord.quantityOnHand).toBe(100);
      expect(stockRecord.reservedQuantity).toBe(0);
      expect(stockRecord.unavailableQuantity).toBe(25);
      expect(stockRecord.availableForSale).toBe(75);
      expect(parseGlobalId(stockRecord.id).typeName).toBe('WarehouseStock');
      expect(parseGlobalId(stockRecord.warehouseId).typeName).toBe('Warehouse');
      expect(parseGlobalId(stockRecord.variantId).typeName).toBe('Variant');

      const { data: nodeData } = await api.admin.query('inventory-api/InventoryNodeFindOne', {
        variables: { id: stockRecord.id },
      });

      const node = nodeData.inventoryQuery.node as any;
      expect(node).toBeTruthy();
      expect(node.__typename).toBe('WarehouseStock');
      expect(node.id).toBe(stockRecord.id);
      expect(node.warehouseId).toBe(warehouse.id);
      expect(node.variantId).toBe(variantId);
      expect(node.quantityOnHand).toBe(100);
      expect(node.unavailableQuantity).toBe(25);
      expect(node.availableForSale).toBe(75);
    });

    test('should resolve inventory item through inventory node by global id', async ({ api }) => {
      const { variantId, inventoryItemId } = await createProductWithVariant(api);

      if (!variantId || !inventoryItemId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.query('inventory-api/InventoryNodeFindOne', {
        variables: { id: inventoryItemId },
      });

      const node = data.inventoryQuery.node as any;
      expect(node).toBeTruthy();
      expect(node.__typename).toBe('InventoryItem');
      expect(node.id).toBe(inventoryItemId);
      expect(node.variantId).toBe(variantId);
    });

    test('should update sku without requiring stock branch', async ({ api }) => {
      const { inventoryItemId } = await createProductWithVariant(api);

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      const sku = `SKU-ONLY-${randomUUID().slice(0, 8)}`;
      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: inventoryItemId,
            sku,
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(0);
      expect(result.inventoryItem?.sku).toBe(sku);
    });

    test('should not partially update sku when stock input is rejected', async ({ api }) => {
      const { variantId, inventoryItemId } = await createProductWithVariant(api);

      if (!variantId || !inventoryItemId) {
        test.skip();
        return;
      }

      const warehouse = await createWarehouse(api, 'WH-ATOMIC-001', 'Atomic Stock Warehouse');
      const originalSku = `SKU-ORIGINAL-${randomUUID().slice(0, 8)}`;
      const rejectedSku = `SKU-REJECTED-${randomUUID().slice(0, 8)}`;

      const { data: seedData } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: inventoryItemId,
            sku: originalSku,
            stock: {
              warehouseId: warehouse.id,
              onHand: 10,
              unavailable: 0,
            },
          },
        },
      });

      expect(seedData.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);

      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: inventoryItemId,
            sku: rejectedSku,
            stock: {
              warehouseId: warehouse.id,
              onHand: 5,
              unavailable: 7,
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(1);
      expect(result.userErrors[0].code).toBe('INVALID_QUANTITY');
      expect(result.inventoryItem).toBeNull();

      const { data: itemData } = await api.admin.query('inventory-api/InventoryItemByVariant', {
        variables: { variantId },
      });

      const item = itemData.inventoryQuery.inventoryItemByVariant;
      expect(item).toBeTruthy();
      expect(item?.sku).toBe(originalSku);

      const stockRecord = item?.stock.find((s) => s.warehouse.id === warehouse.id);
      expect(stockRecord).toBeTruthy();
      expect(stockRecord.quantityOnHand).toBe(10);
      expect(stockRecord.unavailableQuantity).toBe(0);
    });

    test('should return error for non-existent global inventory item ID', async ({ api }) => {
      // Create warehouse first
      const warehouse = await createWarehouse(api, 'WH-004', 'Error Test Warehouse');

      const missingInventoryItemId = encodeGlobalId(
        'InventoryItem',
        '00000000-0000-0000-0000-000000000000',
      );

      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: missingInventoryItemId,
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

    test('should return error for non-existent global warehouse ID', async ({ api }) => {
      // Create product with variant
      const { inventoryItemId } = await createProductWithVariant(api);

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      const missingWarehouseId = encodeGlobalId(
        'Warehouse',
        '00000000-0000-0000-0000-000000000000',
      );

      const { data } = await api.admin.mutation('inventory-api/VariantSetStock', {
        variables: {
          input: {
            id: inventoryItemId,
            stock: {
              warehouseId: missingWarehouseId,
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
