import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
import { expect } from '@playwright/test';

const createProduct = async (api: ApiFixtures['api'], name: string) => {
  const { data } = await api.admin.mutation('inventory-api/ProductCreateSimple', {
    variables: {
      input: {
        title: name,
        handle: `bulk-${Date.now()}`,
      },
    },
  });

  const product = data.inventoryMutation.productCreate.product;
  if (!product) {
    throw new Error('Failed to create product');
  }

  return product.id as string;
};

test.describe('Product Bulk Edit API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUserAndStore();
  });

  test('should create bulk edit job', async ({ api }) => {
    const productId = await createProduct(api, 'Bulk Edit Product');

    const { data } = await api.admin.mutation('inventory-api/ProductBulkUpdate', {
      variables: {
        input: {
          products: [
            {
              productId,
              operations: {
                title: 'Bulk Updated Title',
              },
            },
          ],
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Types not generated yet
    const result = (data as any).inventoryMutation.productBulkUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.job).toBeTruthy();
    expect(result.job?.id).toBeTruthy();
  });

  test('should reject empty input', async ({ api }) => {
    const { data } = await api.admin.mutation('inventory-api/ProductBulkUpdate', {
      variables: {
        input: {
          products: [],
        },
      },
      throwOnError: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Types not generated yet
    const result = (data as any).inventoryMutation.productBulkUpdate;
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject >100 products in batch', async ({ api }) => {
    const productId = await createProduct(api, 'Bulk Edit Limit Product');
    const products = Array.from({ length: 101 }, () => ({
      productId,
      operations: {
        title: 'Bulk Update',
      },
    }));

    const { data } = await api.admin.mutation('inventory-api/ProductBulkUpdate', {
      variables: {
        input: {
          products,
        },
      },
      throwOnError: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Types not generated yet
    const result = (data as any).inventoryMutation.productBulkUpdate;
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should update multiple products in single batch', async ({ api }) => {
    const productId1 = await createProduct(api, 'Bulk Product 1');
    const productId2 = await createProduct(api, 'Bulk Product 2');

    const { data } = await api.admin.mutation('inventory-api/ProductBulkUpdate', {
      variables: {
        input: {
          products: [
            {
              productId: productId1,
              operations: {
                title: 'Updated Product 1',
              },
            },
            {
              productId: productId2,
              operations: {
                title: 'Updated Product 2',
              },
            },
          ],
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Types not generated yet
    const result = (data as any).inventoryMutation.productBulkUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.job).toBeTruthy();
    expect(result.job?.id).toBeTruthy();
  });
});
