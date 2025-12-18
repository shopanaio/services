import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('StorefrontReviewCancelVote', () => {
  test('customer can cancel previously set helpful vote', async ({ api }) => {
    await api.session.setupUserAndProject();
    const {
      variants: [{ slug: handle }],
    } = await api.admin.product.create();
    await api.session.setupApiKey();
    await api.session.setupCustomer();

    const product = await api.client.product.get(handle);

    const { id: reviewId } = await api.client.review.create({
      productId: product.id,
      rating: 4,
      title: 'Cancelable',
      message: 'Vote test',
    });

    
    const ok1 = await api.client.review.voteHelpful({ reviewId, helpful: true });
    expect(ok1).toBe(true);

    const afterFirst = await api.client.review.findOne(reviewId);
    expect(afterFirst?.helpfulYes).toBe(1);
    expect(afterFirst?.meHelpful).toBe(true);

    
    const ok2 = await api.client.review.voteHelpful({
      reviewId,
      helpful: true,
    });
    expect(ok2).toBe(true);

    const afterCancel = await api.client.review.findOne(reviewId);
    expect(afterCancel?.helpfulYes).toBe(0);
    expect(afterCancel?.meHelpful).toBe(false);
  });
});
