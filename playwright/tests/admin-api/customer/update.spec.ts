import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as yup from 'yup';

test.describe('CustomerUpdate', () => {
  test('Create', async ({ api }) => {
    await api.session.setupUserAndProject();

    const input = {
      firstName: 'John',
      lastName: 'Doe',
      language: 'English',
      email: 'john.doe@example.com',
      isVerified: false,
      phone: '555-123-456',
      password: '123456',
    };

    const { id: customerId } = await api.admin.customer.create(input);

    const updateInput = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '555-987-654',
    };

    await api.admin.mutation('admin/CustomerUpdate', {
      variables: {
        input: {
          id: customerId,
          ...updateInput,
        },
      },
    });

    const updatedCustomer = await api.admin.customer.findOne(customerId);

    expect(updatedCustomer).toMatchSchema(
      yup.object({
        id: yup.string().equals([customerId]).required(),
        firstName: yup.string().equals([updateInput.firstName]).required(),
        lastName: yup.string().equals([updateInput.lastName]).required(),
        email: yup.string().equals([updateInput.email]).required(),
        phone: yup.string().equals([updateInput.phone]).required(),
      }),
    );
  });
});
