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
          productUpdate: [{ id: productId, title: 'Bulk Updated Title' }],
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Types not generated yet
    const result = (data as any).inventoryMutation.productBulkUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.job).toBeTruthy();
    expect(result.job?.id).toBeTruthy();
  });

  test('should cancel bulk edit job', async ({ api }) => {
    const productId = await createProduct(api, 'Bulk Edit Cancel Product');

    const { data: createData } = await api.admin.mutation(
      'inventory-api/ProductBulkUpdate',
      {
        variables: {
          input: {
            productUpdate: [{ id: productId, title: 'Cancel Bulk Update' }],
          },
        },
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Types not generated yet
    const createResult = (createData as any).inventoryMutation.productBulkUpdate;
    const jobId = createResult.job?.id;
    expect(jobId).toBeTruthy();

    const { data: cancelData } = await api.admin.mutation(
      'inventory-api/ProductBulkUpdateCancel',
      {
        variables: { jobId },
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Types not generated yet
    const cancelResult = (cancelData as any).inventoryMutation.productBulkUpdateCancel;
    expect(cancelResult.job).toBeTruthy();
  });

  test('should reject empty input', async ({ api }) => {
    const { data } = await api.admin.mutation('inventory-api/ProductBulkUpdate', {
      variables: {
        input: {},
      },
      throwOnError: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Types not generated yet
    const result = (data as any).inventoryMutation.productBulkUpdate;
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('should reject >500 operations', async ({ api }) => {
    const productId = await createProduct(api, 'Bulk Edit Limit Product');
    const updates = Array.from({ length: 501 }, (_, index) => ({
      id: productId,
      title: `Bulk Update ${index}`,
    }));

    const { data } = await api.admin.mutation('inventory-api/ProductBulkUpdate', {
      variables: {
        input: {
          productUpdate: updates,
        },
      },
      throwOnError: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Types not generated yet
    const result = (data as any).inventoryMutation.productBulkUpdate;
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});
