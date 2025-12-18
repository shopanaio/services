import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('StorefrontReviewDelete', () => {
  test('customer can delete own review', async ({ api }) => {
    await api.session.setupUserAndProject();

    const {
      variants: [{ slug: handle }],
    } = await api.admin.product.create();

    await api.session.setupApiKey();
    await api.session.setupCustomer();

    const product = await api.client.product.get(handle);

    const review = await api.client.review.create({
      productId: product.id,
      rating: 2,
      title: 'Not great',
      message: 'Could be better',
      pros: 'Quality',
      cons: 'Price',
      locale: 'en',
    });

    const deleted = await api.client.review.delete(review.id);
    expect(deleted).toBe(true);
  });
});
