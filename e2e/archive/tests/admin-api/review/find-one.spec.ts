import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

// e2e test: find one review

test.describe('ReviewFindOne', () => {
  test('should return a single review', async ({ api }) => {
    await api.session.setupUserAndProject();

    const product = await api.admin.product.create();
    const { id: customerId } = await api.admin.customer.create();
    const reviewId = await api.admin.review.create({
      productId: product.id,
      rating: 5,
      title: 'Great!',
      message: 'Amazing',
      customerId: customerId,
      displayName: 'John Doe',
    });

    const found = await api.admin.review.findOne(reviewId);
    expect(found?.id).toBe(reviewId);
  });
});
