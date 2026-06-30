import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';



test.describe('StorefrontReviewVoteOnce', () => {
  test('same customer second vote does not increase counters', async ({ api }) => {
    await api.session.setupUserAndProject();
    const {
      variants: [{ slug: handle }],
    } = await api.admin.product.create();
    await api.session.setupApiKey();
    await api.session.setupCustomer();

    const product = await api.client.product.get(handle);
    const { id: reviewId } = await api.client.review.create({
      productId: product.id,
      rating: 5,
      title: 'Great',
      message: 'Love it',
    });


    const ok1 = await api.client.review.voteHelpful({ reviewId, helpful: true });
    expect(ok1).toBe(true);

    const afterFirst = await api.client.review.findOne(reviewId);
    expect(afterFirst?.helpfulYes).toBe(1);


    const ok2 = await api.client.review.voteHelpful({ reviewId, helpful: false });
    expect(ok2).toBe(true);

    const afterSecond = await api.client.review.findOne(reviewId);
    expect(afterSecond?.helpfulYes).toBe(1);
  });
});
