import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Pricing & Cost API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndProject();
  });

  /**
   * Helper to create a product and get the default variant ID
   */
  async function createProductWithVariant(api: any, title = 'Test Product') {
    const { data } = await api.admin.mutation('inventory/ProductCreate', {
      variables: { input: { title } },
    });

    const product = data.inventoryMutation.productCreate.product;
    const variantEdges = product?.variants?.edges ?? [];
    const variantId = variantEdges[0]?.node?.id ?? null;

    return { product, variantId };
  }

  test.describe('Variant Pricing', () => {
    test('should set variant price in UAH', async ({ api }) => {
      const { product, variantId } = await createProductWithVariant(api);

      expect(product).toBeTruthy();

      if (!variantId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '10000', // 100.00 UAH
          },
        },
      });

      const result = data.inventoryMutation.variantSetPricing;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant?.price).toBeTruthy();
      expect(result.variant.price.currency).toBe('UAH');
      expect(result.variant.price.amountMinor).toBe(10000);
    });

    test('should set variant price with compare-at price', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '8000', // 80.00 UAH (sale price)
            compareAtMinor: '10000', // 100.00 UAH (original price)
          },
        },
      });

      const result = data.inventoryMutation.variantSetPricing;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant?.price).toBeTruthy();
      expect(result.variant.price.amountMinor).toBe(8000);
      expect(result.variant.price.compareAtMinor).toBe(10000);
    });

    test('should update price (temporal pattern)', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      // Set initial price
      await api.admin.mutation('inventory/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '10000',
          },
        },
      });

      // Update price
      const { data } = await api.admin.mutation('inventory/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '15000', // new price
          },
        },
      });

      const result = data.inventoryMutation.variantSetPricing;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant.price.amountMinor).toBe(15000);
    });

    test('should set prices in different currencies', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      // Set UAH price
      const { data: uahData } = await api.admin.mutation('inventory/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '10000',
          },
        },
      });

      expect(uahData.inventoryMutation.variantSetPricing.userErrors).toHaveLength(0);
      expect(uahData.inventoryMutation.variantSetPricing.variant).toBeTruthy();

      // Set USD price
      const { data: usdData } = await api.admin.mutation('inventory/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'USD',
            amountMinor: '2500', // $25.00
          },
        },
      });

      expect(usdData.inventoryMutation.variantSetPricing.userErrors).toHaveLength(0);
      expect(usdData.inventoryMutation.variantSetPricing.variant).toBeTruthy();
    });

    test('should return error for invalid variant ID', async ({ api }) => {
      const { data } = await api.admin.mutation('inventory/VariantSetPricing', {
        variables: {
          input: {
            variantId: '00000000-0000-0000-0000-000000000000',
            currency: 'UAH',
            amountMinor: '10000',
          },
        },
        throwOnError: false,
      });

      const result = data?.inventoryMutation?.variantSetPricing;
      expect(result).toBeTruthy();
      expect(result.variant).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
    });
  });

  test.describe('Variant Cost', () => {
    test('should set variant cost in UAH', async ({ api }) => {
      const { product, variantId } = await createProductWithVariant(api);

      expect(product).toBeTruthy();

      if (!variantId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory/VariantSetCost', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            unitCostMinor: '5000', // 50.00 UAH cost
          },
        },
      });

      const result = data.inventoryMutation.variantSetCost;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant?.cost).toBeTruthy();
      expect(result.variant.cost.currency).toBe('UAH');
      expect(result.variant.cost.unitCostMinor).toBe(5000);
    });

    test('should update cost (temporal pattern)', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      // Set initial cost
      await api.admin.mutation('inventory/VariantSetCost', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            unitCostMinor: '5000',
          },
        },
      });

      // Update cost
      const { data } = await api.admin.mutation('inventory/VariantSetCost', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            unitCostMinor: '6000', // new cost
          },
        },
      });

      const result = data.inventoryMutation.variantSetCost;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant.cost.unitCostMinor).toBe(6000);
    });

    test('should return error for invalid variant ID', async ({ api }) => {
      const { data } = await api.admin.mutation('inventory/VariantSetCost', {
        variables: {
          input: {
            variantId: '00000000-0000-0000-0000-000000000000',
            currency: 'UAH',
            unitCostMinor: '5000',
          },
        },
        throwOnError: false,
      });

      const result = data?.inventoryMutation?.variantSetCost;
      expect(result).toBeTruthy();
      expect(result.variant).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
    });
  });

  test.describe('Combined Pricing & Cost', () => {
    test('should set both price and cost on same variant', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      // Set price
      const { data: priceData } = await api.admin.mutation('inventory/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '10000', // 100.00 UAH price
          },
        },
      });

      expect(priceData.inventoryMutation.variantSetPricing.userErrors).toHaveLength(0);

      // Set cost
      const { data: costData } = await api.admin.mutation('inventory/VariantSetCost', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            unitCostMinor: '5000', // 50.00 UAH cost
          },
        },
      });

      expect(costData.inventoryMutation.variantSetCost.userErrors).toHaveLength(0);

      // Verify margin: price (100) - cost (50) = 50 UAH margin
      const price = priceData.inventoryMutation.variantSetPricing.variant.price.amountMinor;
      const cost = costData.inventoryMutation.variantSetCost.variant.cost.unitCostMinor;
      expect(price - cost).toBe(5000); // 50.00 UAH margin
    });
  });
});
