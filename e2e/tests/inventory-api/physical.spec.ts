import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { encodeGlobalId } from '@utils/globalid';

test.describe('Physical Attributes API (Dimensions & Weight)', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  /**
   * Helper to create a product and get the default variant ID + inventoryItem ID
   */
  async function createProductWithVariant(api: any, title: string) {
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

  test.describe('Variant Dimensions', () => {
    test('should set variant dimensions', async ({ api }) => {
      const { product, inventoryItemId } = await createProductWithVariant(
        api,
        'Dimensions Test Product',
      );

      expect(product).toBeTruthy();

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory-api/VariantSetDimensions', {
        variables: {
          input: {
            id: inventoryItemId,
            dimensions: {
              widthMm: 100,
              lengthMm: 200,
              heightMm: 50,
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(0);
      expect(result.inventoryItem).toBeTruthy();
      expect(result.inventoryItem?.variant?.dimensions?.width).toBe(100);
      expect(result.inventoryItem?.variant?.dimensions?.length).toBe(200);
      expect(result.inventoryItem?.variant?.dimensions?.height).toBe(50);
    });

    test('should update variant dimensions', async ({ api }) => {
      const { inventoryItemId } = await createProductWithVariant(api, 'Dimensions Update Test');

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      // Set initial dimensions
      await api.admin.mutation('inventory-api/VariantSetDimensions', {
        variables: {
          input: {
            id: inventoryItemId,
            dimensions: {
              widthMm: 100,
              lengthMm: 100,
              heightMm: 100,
            },
          },
        },
      });

      // Update dimensions
      const { data } = await api.admin.mutation('inventory-api/VariantSetDimensions', {
        variables: {
          input: {
            id: inventoryItemId,
            dimensions: {
              widthMm: 150,
              lengthMm: 250,
              heightMm: 75,
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(0);
      expect(result.inventoryItem?.variant?.dimensions?.width).toBe(150);
      expect(result.inventoryItem?.variant?.dimensions?.length).toBe(250);
      expect(result.inventoryItem?.variant?.dimensions?.height).toBe(75);
    });

    test('should return error for non-existent global inventory item ID', async ({ api }) => {
      const missingInventoryItemId = encodeGlobalId(
        'InventoryItem',
        '00000000-0000-0000-0000-000000000000',
      );

      const { data } = await api.admin.mutation('inventory-api/VariantSetDimensions', {
        variables: {
          input: {
            id: missingInventoryItemId,
            dimensions: {
              widthMm: 100,
              lengthMm: 100,
              heightMm: 100,
            },
          },
        },
        throwOnError: false,
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.inventoryItem).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    });
  });

  test.describe('Variant Weight', () => {
    test('should set variant weight', async ({ api }) => {
      const { product, inventoryItemId } = await createProductWithVariant(
        api,
        'Weight Test Product',
      );

      expect(product).toBeTruthy();

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory-api/VariantSetWeight', {
        variables: {
          input: {
            id: inventoryItemId,
            weight: {
              weightGrams: 500,
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(0);
      expect(result.inventoryItem).toBeTruthy();
      expect(result.inventoryItem?.variant?.weight?.value).toBe(500);
    });

    test('should update variant weight', async ({ api }) => {
      const { inventoryItemId } = await createProductWithVariant(api, 'Weight Update Test');

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      // Set initial weight
      await api.admin.mutation('inventory-api/VariantSetWeight', {
        variables: {
          input: {
            id: inventoryItemId,
            weight: {
              weightGrams: 500,
            },
          },
        },
      });

      // Update weight
      const { data } = await api.admin.mutation('inventory-api/VariantSetWeight', {
        variables: {
          input: {
            id: inventoryItemId,
            weight: {
              weightGrams: 1000, // 1kg
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(0);
      expect(result.inventoryItem?.variant?.weight?.value).toBe(1000);
    });

    test('should return error for non-existent global inventory item ID', async ({ api }) => {
      const missingInventoryItemId = encodeGlobalId(
        'InventoryItem',
        '00000000-0000-0000-0000-000000000000',
      );

      const { data } = await api.admin.mutation('inventory-api/VariantSetWeight', {
        variables: {
          input: {
            id: missingInventoryItemId,
            weight: {
              weightGrams: 500,
            },
          },
        },
        throwOnError: false,
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.inventoryItem).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    });
  });

  test.describe('Combined Physical Attributes', () => {
    test('should set both dimensions and weight on same variant', async ({ api }) => {
      const { inventoryItemId } = await createProductWithVariant(api, 'Combined Physical Test');

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      // Set dimensions
      const { data: dimData } = await api.admin.mutation('inventory-api/VariantSetDimensions', {
        variables: {
          input: {
            id: inventoryItemId,
            dimensions: {
              widthMm: 300,
              lengthMm: 400,
              heightMm: 200,
            },
          },
        },
      });

      expect(dimData.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);

      // Set weight
      const { data: weightData } = await api.admin.mutation('inventory-api/VariantSetWeight', {
        variables: {
          input: {
            id: inventoryItemId,
            weight: {
              weightGrams: 2500, // 2.5kg
            },
          },
        },
      });

      expect(weightData.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);
      expect(
        weightData.inventoryMutation.inventoryItemUpdate.inventoryItem?.variant?.weight?.value,
      ).toBe(2500);
    });
  });
});
