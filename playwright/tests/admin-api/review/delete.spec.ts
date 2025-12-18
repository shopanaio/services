import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('ReviewDelete', () => {
  test('delete review', async ({ api }) => {
    await api.session.setupUserAndProject();

    const product = await api.admin.product.create();
    const { id: customerId } = await api.admin.customer.create();

    const reviewId = await api.admin.review.create({
      productId: product.id,
      customerId: customerId,
      rating: 3,
      title: 'Delete',
      message: 'delete',
      displayName: 'John Doe',
    });

    const ok = await api.admin.review.delete(reviewId);
    expect(ok).toBe(true);

    const maybe = await api.admin.review.findOne(reviewId);
    expect(maybe).toBeNull();
  });
});
