import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('ReviewBulkUpdateStatus', () => {
  test('bulk approve reviews', async ({ api }) => {
    await api.session.setupUserAndProject();

    const product = await api.admin.product.create();
    const variantId = product.variants[0].id;

    const ids: string[] = [];

    for (let i = 0; i < 3; i++) {
      const { id: customerId } = await api.admin.customer.create({
        firstName: `User${i}`,
        email: `bulk_${i}_${Date.now()}@ex.com`,
      });
      const reviewId = await api.admin.review.create({
        rating: 2,
        title: 'Bulk',
        message: 'Bulk text',
        displayName: 'John Doe',
      });
      await api.admin.review.update({
        input: {
          id: reviewId,
          customerId: customerId,
          productId: variantId,
        },
      });
      ids.push(reviewId);
    }

    const ok = await api.admin.review.bulkUpdateStatus(ids, 'APPROVED');
    expect(ok).toBe(true);

    for (const id of ids) {
      const r = await api.admin.review.findOne(id);
      expect(r?.status).toBe('APPROVED');
    }
  });
});
