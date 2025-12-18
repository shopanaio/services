import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';



const inputs = [
  {
    firstName: 'John',
    lastName: 'Doe',
    language: 'English',
    email: 'john.doe@example.com',
    isVerified: false,
    phone: '555-123-456',
    password: '123456',
  },
  {
    firstName: 'Anna',
    lastName: 'Müller',
    language: 'Dutch',
    email: 'anna.mueller@example.com',
    isVerified: false,
    phone: '555-987-654',
    password: 'qwerty',
  },
  {
    firstName: 'Pierre',
    lastName: 'Dubois',
    language: 'Czech',
    email: 'pierre.dubois@example.com',
    isVerified: false,
    phone: '555-567-890',
    password: '654321',
  },
];

test.describe('CustomerFindMany', () => {
  test('FindMany', async ({ api }) => {
    await api.session.setupUserAndProject();

    for (const input of inputs) {
      await api.admin.customer.create(input);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await test.step('1st page / perPage 1', async () => {
      const { data } = await api.admin.query('admin/CustomerFindMany', {
        variables: { input: { page: 1, pageSize: 1 } },
      });

      expect(data.customerQuery.findMany.meta).toMatchObject({
        page: 1,
        pageSize: 1,
        count: 1,
        total: 3,
        pageCount: 3,
      });
    });

    await test.step('2nd page / perPage 2', async () => {
      const { data } = await api.admin.query('admin/CustomerFindMany', {
        variables: { input: { page: 2, pageSize: 2 } },
      });

      expect(data.customerQuery.findMany.meta).toMatchObject({
        page: 2,
        pageSize: 2,
        count: 1,
        total: 3,
        pageCount: 2,
      });
    });

    await test.step('All customers on one page', async () => {
      const { data } = await api.admin.query('admin/CustomerFindMany', {
        variables: { input: { page: 1, pageSize: 10 } },
      });

      expect(data.customerQuery.findMany.data).toHaveLength(3);
      expect(data.customerQuery.findMany.meta.total).toBe(3);
    });
  });
});
