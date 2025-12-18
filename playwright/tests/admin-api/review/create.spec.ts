import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('ReviewCreate', () => {
  test('Create', async ({ api }) => {
    await api.session.setupUserAndProject();

    const product = await api.admin.product.create();
    const { id: customerId } = await api.admin.customer.create();

    
    const reviewId = await api.admin.review.create({
      customerId: customerId,
      productId: product.id,
      rating: 4,
      title: 'Отличный товар',
      message: 'Очень понравилось',
      pros: 'Отличный товар',
      cons: 'Не понравилось',
      displayName: 'John Doe',
    });

    const review = await api.admin.review.findOne(reviewId);

    expect(review).toMatchObject({
      title: 'Отличный товар',
      message: 'Очень понравилось',
      pros: 'Отличный товар',
      cons: 'Не понравилось',
      createdAt: expect.any(String),
      id: expect.any(String),
      rating: 4,
      status: 'PENDING',
      updatedAt: expect.any(String),
    });
  });
});
