import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { encodeGlobalId } from '@utils/globalid';

test.describe('Pricing & Cost API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  /**
   * Helper to create a product and get the default variant ID + inventoryItem ID
   */
  async function createProductWithVariant(api: any, title = 'Test Product') {
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

  test.describe('Variant Pricing', () => {
    test('should set variant price in UAH', async ({ api }) => {
      const { product, variantId } = await createProductWithVariant(api);

      expect(product).toBeTruthy();

      if (!variantId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory-api/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '10000', // 100.00 UAH
          },
        },
      });

      const result = data.catalogMutation.variantUpdatePricing;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant?.price).toBeTruthy();
      expect(result.variant?.price?.currency).toBe('UAH');
      expect(result.variant?.price?.amountMinor).toBe(10000);
    });

    test('should set variant price with compare-at price', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory-api/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '8000', // 80.00 UAH (sale price)
            compareAtMinor: '10000', // 100.00 UAH (original price)
          },
        },
      });

      const result = data.catalogMutation.variantUpdatePricing;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant?.price).toBeTruthy();
      expect(result.variant?.price?.amountMinor).toBe(8000);
      expect(result.variant?.price?.compareAtMinor).toBe(10000);
    });

    test('should update price (temporal pattern)', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      // Set initial price
      await api.admin.mutation('inventory-api/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '10000',
          },
        },
      });

      // Update price
      const { data } = await api.admin.mutation('inventory-api/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '15000', // new price
          },
        },
      });

      const result = data.catalogMutation.variantUpdatePricing;
      expect(result.userErrors).toHaveLength(0);
      expect(result.variant?.price?.amountMinor).toBe(15000);
    });

    test('should set prices in different currencies', async ({ api }) => {
      const { variantId } = await createProductWithVariant(api);

      if (!variantId) {
        test.skip();
        return;
      }

      // Set UAH price
      const { data: uahData } = await api.admin.mutation('inventory-api/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '10000',
          },
        },
      });

      expect(uahData.catalogMutation.variantUpdatePricing.userErrors).toHaveLength(0);
      expect(uahData.catalogMutation.variantUpdatePricing.variant).toBeTruthy();

      // Set USD price
      const { data: usdData } = await api.admin.mutation('inventory-api/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'USD',
            amountMinor: '2500', // $25.00
          },
        },
      });

      expect(usdData.catalogMutation.variantUpdatePricing.userErrors).toHaveLength(0);
      expect(usdData.catalogMutation.variantUpdatePricing.variant).toBeTruthy();
    });

    test('should return error for invalid variant ID', async ({ api }) => {
      const missingVariantId = encodeGlobalId(
        'Variant',
        '00000000-0000-0000-0000-000000000000',
      );

      const { data } = await api.admin.mutation('inventory-api/VariantSetPricing', {
        variables: {
          input: {
            variantId: missingVariantId,
            currency: 'UAH',
            amountMinor: '10000',
          },
        },
        throwOnError: false,
      });

      const result = data?.catalogMutation?.variantUpdatePricing;
      expect(result).toBeTruthy();
      expect(result.variant).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
    });
  });

  test.describe('Variant Cost', () => {
    test('should set variant cost in UAH', async ({ api }) => {
      const { product, inventoryItemId } = await createProductWithVariant(api);

      expect(product).toBeTruthy();

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      const { data } = await api.admin.mutation('inventory-api/VariantSetCost', {
        variables: {
          input: {
            id: inventoryItemId,
            unitCost: {
              currency: 'UAH',
              amountMinor: '5000', // 50.00 UAH cost
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(0);
      expect(result.inventoryItem?.unitCost).toBeTruthy();
      expect(result.inventoryItem?.unitCost?.currency).toBe('UAH');
      expect(result.inventoryItem?.unitCost?.amountMinor).toBe(5000);
    });

    test('should update cost (temporal pattern)', async ({ api }) => {
      const { inventoryItemId } = await createProductWithVariant(api);

      if (!inventoryItemId) {
        test.skip();
        return;
      }

      // Set initial cost
      await api.admin.mutation('inventory-api/VariantSetCost', {
        variables: {
          input: {
            id: inventoryItemId,
            unitCost: {
              currency: 'UAH',
              amountMinor: '5000',
            },
          },
        },
      });

      // Update cost
      const { data } = await api.admin.mutation('inventory-api/VariantSetCost', {
        variables: {
          input: {
            id: inventoryItemId,
            unitCost: {
              currency: 'UAH',
              amountMinor: '6000', // new cost
            },
          },
        },
      });

      const result = data.inventoryMutation.inventoryItemUpdate;
      expect(result.userErrors).toHaveLength(0);
      expect(result.inventoryItem?.unitCost?.amountMinor).toBe(6000);
    });

    test('should return error for non-existent global inventory item ID', async ({ api }) => {
      const missingInventoryItemId = encodeGlobalId(
        'InventoryItem',
        '00000000-0000-0000-0000-000000000000',
      );

      const { data } = await api.admin.mutation('inventory-api/VariantSetCost', {
        variables: {
          input: {
            id: missingInventoryItemId,
            unitCost: {
              currency: 'UAH',
              amountMinor: '5000',
            },
          },
        },
        throwOnError: false,
      });

      const result = data?.inventoryMutation?.inventoryItemUpdate;
      expect(result).toBeTruthy();
      expect(result.inventoryItem).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
      expect(result.userErrors[0].code).toBe('NOT_FOUND');
    });
  });

  test.describe('Combined Pricing & Cost', () => {
    test('should set both price and cost on same variant', async ({ api }) => {
      const { variantId, inventoryItemId } = await createProductWithVariant(api);

      if (!variantId || !inventoryItemId) {
        test.skip();
        return;
      }

      // Set price
      const { data: priceData } = await api.admin.mutation('inventory-api/VariantSetPricing', {
        variables: {
          input: {
            variantId,
            currency: 'UAH',
            amountMinor: '10000', // 100.00 UAH price
          },
        },
      });

      expect(priceData.catalogMutation.variantUpdatePricing.userErrors).toHaveLength(0);

      // Set cost
      const { data: costData } = await api.admin.mutation('inventory-api/VariantSetCost', {
        variables: {
          input: {
            id: inventoryItemId,
            unitCost: {
              currency: 'UAH',
              amountMinor: '5000', // 50.00 UAH cost
            },
          },
        },
      });

      expect(costData.inventoryMutation.inventoryItemUpdate.userErrors).toHaveLength(0);

      // Verify margin: price (100) - cost (50) = 50 UAH margin
      const price = priceData.catalogMutation.variantUpdatePricing.variant?.price?.amountMinor ?? 0;
      const cost =
        costData.inventoryMutation.inventoryItemUpdate.inventoryItem?.unitCost?.amountMinor ?? 0;
      expect(price - cost).toBe(5000); // 50.00 UAH margin
    });
  });
});
