import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

// DISABLED: This test relies on removed FeatureGroup API and complex UI interactions

test.describe('Product Options Updating', () => {
  test('Updating specific variant data via API', async ({ api }) => {
    await test.step('Create a user and project', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create product with options and update variants', async () => {
      // Create a product with color and size options
      const product = await api.admin.product.createWithOptions({
        title: 'Variant Update Test Product',
        options: [
          {
            title: 'Color',
            slug: 'color',
            values: ['Red', 'Blue'],
          },
          {
            title: 'Size',
            slug: 'size',
            values: ['M', 'L'],
          },
        ],
        status: 'DRAFT',
      });


      expect(product.variants?.length).toBe(4);

      // Update specific variants with different prices and SKUs
      const updatedProduct = await api.admin.product.update({
        input: {
          id: product.id,
          variants: {
            update: [
              {
                id: product.variants[0].id,
                price: 2500,
                sku: 'RED-M-001',
                title: 'Premium Red M',
              },
              {
                id: product.variants[1].id,
                price: 2700,
                sku: 'RED-L-002',
                title: 'Premium Red L',
              },
              {
                id: product.variants[2].id,
                price: 2400,
                sku: 'BLUE-M-003',
                title: 'Classic Blue M',
              },
              {
                id: product.variants[3].id,
                price: 2600,
                sku: 'BLUE-L-004',
                title: 'Classic Blue L',
              },
            ],
          },
        },
      });

      expect(updatedProduct.variants?.length).toBe(4);

      // Verify the updates
      const redMVariant = updatedProduct.variants.find(v => v.sku === 'RED-M-001');
      expect(redMVariant?.price).toBe(2500);
      expect(redMVariant?.title).toBe('Premium Red M');

      const blueLVariant = updatedProduct.variants.find(v => v.sku === 'BLUE-L-004');
      expect(blueLVariant?.price).toBe(2600);
      expect(blueLVariant?.title).toBe('Classic Blue L');
    });

    await test.step('Test individual variant operations', async () => {
      // Create simple product for individual variant testing
      const product = await api.admin.product.create({
        input: {
          title: 'Simple Product',
        },
      });

      // Update the single variant
      const updatedProduct = await api.admin.product.update({
        input: {
          id: product.id,
          variants: {
            update: [
              {
                id: product.variants[0].id,
                price: 1500,
                sku: 'SIMPLE-001',
                weight: 250,
                stockStatus: 'IN_STOCK',
              },
            ],
          },
        },
      });

      const variant = updatedProduct.variants[0];
      expect(variant.price).toBe(1500);
      expect(variant.sku).toBe('SIMPLE-001');
      expect(variant.weight).toBe(250);
      expect(variant.stockStatus).toBe('IN_STOCK');
    });
  });
});
