import * as Yup from 'yup';
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';

test.describe('ProductUpdate', () => {
  test('Create', async ({ api }) => {
    await api.session.setupUserAndProject();

    const updateInput = { title: 'Product Updated' };

    const product = await api.admin.product.create();

    const updated = await api.admin.product.update({
      input: {
        ...updateInput,
        id: product.id,
      },
    });

    api.admin.product.assertProduct(updated);

    expect(updated).toMatchSchema(
      Yup.object({
        title: Yup.string().equals([updateInput.title]).required(),
        slug: Yup.string().required(),
        status: Yup.string().required(),
        createdAt: Yup.string().required(),
        id: Yup.string().required(),
        updatedAt: Yup.string().required(),
        requiresShipping: Yup.boolean(),
      }),
    );
  });
});
