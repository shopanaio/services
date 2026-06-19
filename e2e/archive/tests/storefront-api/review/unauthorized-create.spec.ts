import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';



test.describe('StorefrontReviewUnauthorizedCreate', () => {
  test('guest cannot create review', async ({ api }) => {

    await api.session.setupUserAndProject();

    const {
      variants: [{ slug: handle }],
    } = await api.admin.product.create();


    await api.session.setupApiKey();

    const product = await api.client.product.get(handle);


    const { errors } = await api.client.mutation('client/ReviewCreate', {
      throwOnError: false,
      variables: {
        input: {
          productId: product.id,
          rating: 4,
          title: 'Guest review',
          message: 'Should fail',
        },
      },
    });

    expect(errors).toBeTruthy();
  });
});
