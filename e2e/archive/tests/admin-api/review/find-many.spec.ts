import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiReviewQueryFindManyArgs } from '@codegen/admin-gql';

// e2e test: find many reviews

test.describe('ReviewFindMany', () => {
  test('should list reviews', async ({ api }) => {
    await api.session.setupUserAndProject();

    const product = await api.admin.product.create();

    for (let i = 0; i < 3; i++) {
      const { id: customerId } = await api.admin.customer.create({
        firstName: `User${i}`,
        email: `user${i}_${Date.now()}@ex.com`,
      });

      await api.admin.review.create({
        productId: product.id,
        customerId: customerId,
        rating: i + 1,
        title: `Review ${i}`,
        message: `Text ${i}`,
        displayName: `User${i}`,
      });
    }

    const { data } = await api.admin.query<ApiReviewQueryFindManyArgs>('admin/ReviewFindMany', {
      variables: { input: { page: 1, pageSize: 10 } },
    });

    expect(data.reviewQuery.findMany.data.length).toBeGreaterThanOrEqual(3);
  });
});
