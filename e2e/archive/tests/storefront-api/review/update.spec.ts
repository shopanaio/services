import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('StorefrontReviewUpdate', () => {
  test('customer can update own review', async ({ api }) => {
    await api.session.setupUserAndProject();

    const {
      variants: [{ slug: handle }],
    } = await api.admin.product.create();

    await api.session.setupApiKey();
    await api.session.setupCustomer();

    const product = await api.client.product.get(handle);
    const created = await api.client.review.create({
      productId: product.id,
      rating: 3,
      title: 'Ok product',
      message: 'Some text',
      pros: 'Quality',
      cons: 'Price',
      locale: 'en',
    });

    const updated = await api.client.review.update({
      id: created.id,
      rating: 5,
      title: 'Amazing!',
      message: 'Some text',
      pros: 'No',
      cons: 'Very bad',
    });

    expect(updated).toMatchObject({
      id: created.id,
      rating: 5,
      title: 'Amazing!',
      message: 'Some text',
      pros: 'No',
      cons: 'Very bad',
      locale: 'en',
      verifiedPurchase: false,
      status: 'PENDING',
    });
  });
});
