import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('Product Create API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndProject();
  });

  test('should create product with default empty variant', async ({ api }) => {
    const { data } = await api.admin.mutation('inventory/ProductCreate', {});

    const result = data.inventoryMutation.productCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.product).toBeTruthy();

    const product = result.product;
    expect(product.id).toBeTruthy();
    expect(product.title).toBeNull();
    expect(product.handle).toBeNull();
    expect(product.isPublished).toBe(false);

    const variantEdges = product.variants?.edges ?? [];
    expect(variantEdges).toHaveLength(1);

    const defaultVariant = variantEdges[0].node;
    expect(defaultVariant.id).toBeTruthy();
    expect(defaultVariant.isDefault).toBe(true);
    expect(defaultVariant.handle).toBe('');
    expect(defaultVariant.sku).toBeNull();
  });
});
