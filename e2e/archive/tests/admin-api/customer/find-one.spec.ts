import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as yup from 'yup';

test.describe('CustomerFindOne', () => {
  test('FindOne', async ({   api }) => {
    await api.session.setupUserAndProject();

    const input = {
      firstName: 'John',
      lastName: 'Doe',
      language: 'English',
      email: 'john.doe@example.com',
      isVerified: false,
      phone: '',
      password: '123456',
    };

    const req = await api.admin.mutation('admin/CustomerCreate', {
      variables: { input },
    });

    const { data } = await api.admin.query('admin/CustomerFindOne', {
      variables: {
        findOneId: req.data.customerMutation.create,
      },
    });
    if (data.customerQuery.findOne) {
      api.admin.customer.assertCustomer(data.customerQuery.findOne);
    }
    expect(data.customerQuery.findOne).toMatchSchema(
      yup.object({
        id: yup.string().equals([req.data.customerMutation.create]).required(),
        firstName: yup.string().equals([input.firstName]).required(),
        lastName: yup.string().equals([input.lastName]).required(),
        email: yup.string().email().equals([input.email]).required(),
        isVerified: yup.boolean().isFalse().required(),
        createdAt: yup.string().required(),
        updatedAt: yup.string().required(),
      }),
    );
  });
});
