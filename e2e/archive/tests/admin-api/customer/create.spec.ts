import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';



test.describe('CustomerCreate', () => {
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

    const customer = await api.admin.customer.create(input);

    expect(customer).toMatchObject({
      id: expect.any(String),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      isVerified: input.isVerified,
      phone: input.phone,
    });
  });
});
