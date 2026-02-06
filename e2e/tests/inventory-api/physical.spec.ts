import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Physical Attributes API (Dimensions & Weight)', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  /**
   * Helper to create a product and get the default variant ID
   */
  async function createProductWithVariant(api: any, title: string) {
    const handle = title.toLowerCase().replace(/\s+/g, '-');
    const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
      variables: { input: { title, handle } },
    });

    const product = data.catalogMutation.productCreate.product;
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

  test.describe('Variant Dimensions', () => {
    test('should set variant dimensions', async ({ api }) => {
      const { product, variantId } = await createProductWithVariant(api, 'Dimensions Test Product');

      expect(product).toBeTruthy();

      if (!variantId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory-api/VariantSetDimensions', {
        variables: {
          input: {
            variantId,
            width: 100, // 100mm
            length: 200, // 200mm
            height: 50, // 50mm
          },
        },
      });

      const result = data.inventoryMutation.variantUpdateDimensions;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant).toBeTruthy();
      expect(result.variant?.dimensions?.width).toBe(100);
      expect(result.variant?.dimensions?.length).toBe(200);
      expect(result.variant?.dimensions?.height).toBe(50);
    });

    test('should update variant dimensions', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api, 'Dimensions Update Test');

      if (!variantId) {
        test.skip();
        return;
      }

      // Set initial dimensions
      await api.admin.mutation('inventory-api/VariantSetDimensions', {
        variables: {
          input: {
            variantId,
            width: 100,
            length: 100,
            height: 100,
          },
        },
      });

      // Update dimensions
      const { data } = await api.admin.mutation('inventory-api/VariantSetDimensions', {
        variables: {
          input: {
            variantId,
            width: 150,
            length: 250,
            height: 75,
          },
        },
      });

      const result = data.inventoryMutation.variantUpdateDimensions;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant?.dimensions?.width).toBe(150);
      expect(result.variant?.dimensions?.length).toBe(250);
      expect(result.variant?.dimensions?.height).toBe(75);
    });

    test('should return error for invalid variant ID', async ({ api }) => {
      const { data } = await api.admin.mutation('inventory-api/VariantSetDimensions', {
        variables: {
          input: {
            variantId: 'invalid-variant-id',
            width: 100,
            length: 100,
            height: 100,
          },
        },
        throwOnError: false,
      });

      const result = data.inventoryMutation.variantUpdateDimensions;
      expect(result.variant).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    });
  });

  test.describe('Variant Weight', () => {
    test('should set variant weight', async ({ api }) => {
      const { product, variantId } = await createProductWithVariant(api, 'Weight Test Product');

      expect(product).toBeTruthy();

      if (!variantId) {
        test.skip();
        return;
      }

      // Create warehouse (required for variantUpdateInventory)
      const warehouse = await createWarehouse(api, 'WH-WEIGHT-1', 'Weight Test Warehouse');

      const { data } = await api.admin.mutation('inventory-api/VariantSetWeight', {
        variables: {
          input: {
            variantId,
            warehouseId: warehouse.id,
            onHand: 0, // Required field
            weight: 500, // 500 grams
          },
        },
      });

      const result = data.inventoryMutation.variantUpdateInventory;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant).toBeTruthy();
      expect(result.variant?.weight?.value).toBe(500);
    });

    test('should update variant weight', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api, 'Weight Update Test');

      if (!variantId) {
        test.skip();
        return;
      }

      // Create warehouse
      const warehouse = await createWarehouse(api, 'WH-WEIGHT-2', 'Weight Update Warehouse');

      // Set initial weight
      await api.admin.mutation('inventory-api/VariantSetWeight', {
        variables: {
          input: {
            variantId,
            warehouseId: warehouse.id,
            onHand: 0,
            weight: 500,
          },
        },
      });

      // Update weight
      const { data } = await api.admin.mutation('inventory-api/VariantSetWeight', {
        variables: {
          input: {
            variantId,
            warehouseId: warehouse.id,
            onHand: 0,
            weight: 1000, // 1kg
          },
        },
      });

      const result = data.inventoryMutation.variantUpdateInventory;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant?.weight?.value).toBe(1000);
    });

    test('should return error for invalid variant ID', async ({ api }) => {
      // Create warehouse
      const warehouse = await createWarehouse(api, 'WH-WEIGHT-3', 'Weight Error Warehouse');

      const { data } = await api.admin.mutation('inventory-api/VariantSetWeight', {
        variables: {
          input: {
            variantId: 'invalid-variant-id',
            warehouseId: warehouse.id,
            onHand: 0,
            weight: 500,
          },
        },
        throwOnError: false,
      });

      const result = data.inventoryMutation.variantUpdateInventory;
      expect(result.variant).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    });
  });

  test.describe('Combined Physical Attributes', () => {
    test('should set both dimensions and weight on same variant', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api, 'Combined Physical Test');

      if (!variantId) {
        test.skip();
        return;
      }

      // Create warehouse for weight
      const warehouse = await createWarehouse(api, 'WH-COMBINED', 'Combined Test Warehouse');

      // Set dimensions
      const { data: dimData } = await api.admin.mutation('inventory-api/VariantSetDimensions', {
        variables: {
          input: {
            variantId,
            width: 300,
            length: 400,
            height: 200,
          },
        },
      });

      expect(dimData.inventoryMutation.variantUpdateDimensions.userErrors).toHaveLength(0);

      // Set weight
      const { data: weightData } = await api.admin.mutation('inventory-api/VariantSetWeight', {
        variables: {
          input: {
            variantId,
            warehouseId: warehouse.id,
            onHand: 0,
            weight: 2500, // 2.5kg
          },
        },
      });

      expect(weightData.inventoryMutation.variantUpdateInventory.userErrors).toHaveLength(0);
      expect(weightData.inventoryMutation.variantUpdateInventory.variant?.weight?.value).toBe(2500);
    });
  });
});
