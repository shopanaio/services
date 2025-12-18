import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('StorefrontReviewVoteHelpful', () => {
  test('customer can vote review helpful', async ({ api }) => {
    await api.session.setupUserAndProject();

    const {
      variants: [{ slug: handle }],
    } = await api.admin.product.create();

    await api.session.setupApiKey();
    await api.session.setupCustomer();

    const product = await api.client.product.get(handle);
    const review = await api.client.review.create({
      productId: product.id,
      rating: 4,
      title: 'Nice',
      message: 'Nice product',
      pros: 'Quality',
      cons: 'Price',
      locale: 'en',
    });

    const ok = await api.client.review.voteHelpful({
      reviewId: review.id,
      helpful: true,
    });

    expect(ok).toBe(true);
  });
});
