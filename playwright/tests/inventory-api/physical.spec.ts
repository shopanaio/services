import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Physical Attributes API (Dimensions & Weight)', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndProject();
  });

  /**
   * Helper to create a product and get the default variant ID
   */
  async function createProductWithVariant(api: any, title: string) {
    const { data } = await api.admin.mutation('inventory/ProductCreate', {
      variables: { input: { title } },
    });

    const product = data.inventoryMutation.productCreate.product;
    const variantEdges = product?.variants?.edges ?? [];
    const variantId = variantEdges[0]?.node?.id ?? null;

    return { product, variantId };
  }

  test.describe('Variant Dimensions', () => {
    test('should set variant dimensions', async ({ api }) => {
      const { product, variantId } = await createProductWithVariant(api, 'Dimensions Test Product');

      expect(product).toBeTruthy();

      if (!variantId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory/VariantSetDimensions', {
        variables: {
          input: {
            variantId,
            dimensions: {
              width: 100, // 100mm
              length: 200, // 200mm
              height: 50, // 50mm
            },
          },
        },
      });

      const result = data.inventoryMutation.variantSetDimensions;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant).toBeTruthy();
      expect(result.variant.dimensions.width).toBe(100);
      expect(result.variant.dimensions.length).toBe(200);
      expect(result.variant.dimensions.height).toBe(50);
    });

    test('should update variant dimensions', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api, 'Dimensions Update Test');

      if (!variantId) {
        test.skip();
        return;
      }

      // Set initial dimensions
      await api.admin.mutation('inventory/VariantSetDimensions', {
        variables: {
          input: {
            variantId,
            dimensions: { width: 100, length: 100, height: 100 },
          },
        },
      });

      // Update dimensions
      const { data } = await api.admin.mutation('inventory/VariantSetDimensions', {
        variables: {
          input: {
            variantId,
            dimensions: { width: 150, length: 250, height: 75 },
          },
        },
      });

      const result = data.inventoryMutation.variantSetDimensions;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant.dimensions.width).toBe(150);
      expect(result.variant.dimensions.length).toBe(250);
      expect(result.variant.dimensions.height).toBe(75);
    });

    test('should return error for invalid variant ID', async ({ api }) => {
      const { data } = await api.admin.mutation('inventory/VariantSetDimensions', {
        variables: {
          input: {
            variantId: 'invalid-variant-id',
            dimensions: { width: 100, length: 100, height: 100 },
          },
        },
        throwOnError: false,
      });

      const result = data.inventoryMutation.variantSetDimensions;
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

      const { data } = await api.admin.mutation('inventory/VariantSetWeight', {
        variables: {
          input: {
            variantId,
            weight: {
              value: 500, // 500 grams
            },
          },
        },
      });

      const result = data.inventoryMutation.variantSetWeight;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant).toBeTruthy();
      expect(result.variant.weight.value).toBe(500);
    });

    test('should update variant weight', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api, 'Weight Update Test');

      if (!variantId) {
        test.skip();
        return;
      }

      // Set initial weight
      await api.admin.mutation('inventory/VariantSetWeight', {
        variables: {
          input: {
            variantId,
            weight: { value: 500 },
          },
        },
      });

      // Update weight
      const { data } = await api.admin.mutation('inventory/VariantSetWeight', {
        variables: {
          input: {
            variantId,
            weight: { value: 1000 }, // 1kg
          },
        },
      });

      const result = data.inventoryMutation.variantSetWeight;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant.weight.value).toBe(1000);
    });

    test('should return error for invalid variant ID', async ({ api }) => {
      const { data } = await api.admin.mutation('inventory/VariantSetWeight', {
        variables: {
          input: {
            variantId: 'invalid-variant-id',
            weight: { value: 500 },
          },
        },
        throwOnError: false,
      });

      const result = data.inventoryMutation.variantSetWeight;
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

      // Set dimensions
      const { data: dimData } = await api.admin.mutation('inventory/VariantSetDimensions', {
        variables: {
          input: {
            variantId,
            dimensions: { width: 300, length: 400, height: 200 },
          },
        },
      });

      expect(dimData.inventoryMutation.variantSetDimensions.userErrors).toHaveLength(0);

      // Set weight
      const { data: weightData } = await api.admin.mutation('inventory/VariantSetWeight', {
        variables: {
          input: {
            variantId,
            weight: { value: 2500 }, // 2.5kg
          },
        },
      });

      expect(weightData.inventoryMutation.variantSetWeight.userErrors).toHaveLength(0);
      expect(weightData.inventoryMutation.variantSetWeight.variant.weight.value).toBe(2500);
    });
  });
});
