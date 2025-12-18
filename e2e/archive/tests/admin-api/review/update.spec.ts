import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('ReviewUpdate', () => {
  test('update rating', async ({ api }) => {
    await api.session.setupUserAndProject();

    const product = await api.admin.product.create();
    const { id: customerId } = await api.admin.customer.create();

    const reviewId = await api.admin.review.create({
      productId: product.id,
      rating: 2,
      title: 'Ok',
      message: 'ok',
      customerId: customerId,
      displayName: 'John Doe',
    });

    const ok = await api.admin.review.update({
      input: {
        id: reviewId,
        rating: 5,
      },
    });

    expect(ok).toBe(true);
    const fetched = await api.admin.review.findOne(reviewId);
    expect(fetched?.rating).toBe(5);
  });
});
