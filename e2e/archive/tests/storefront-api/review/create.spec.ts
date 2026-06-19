
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('StorefrontReviewCreate', () => {
  test('customer can create a review', async ({ api }) => {
    await api.session.setupUserAndProject();

    const {
      variants: [{ slug: handle }],
    } = await api.admin.product.create();

    await api.session.setupApiKey();
    await api.session.setupCustomer();

    const product = await api.client.product.get(handle);
    const review = await api.client.review.create({
      productId: product.id,
      rating: 4.5,
      title: 'Great product',
      message: 'I really liked it',
      pros: 'Quality',
      cons: 'Price',
      locale: 'en',
      displayName: 'John Doe',
    });

    expect(review).toMatchObject({
      id: expect.any(String),
      title: 'Great product',
      message: 'I really liked it',
      pros: 'Quality',
      cons: 'Price',
      locale: 'en',
      verifiedPurchase: false,
      status: 'PENDING',
      createdAt: expect.any(String),
      editedAt: expect.any(String),
      helpfulYes: 0,
      helpfulNo: 0,
      meHelpful: false,
      displayName: 'John Doe',
    });
  });
});
