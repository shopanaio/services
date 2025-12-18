import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { ApiCustomerQueryFindManyArgs } from '@codegen/admin-gql';

test.describe('Customers API', () => {
  test('ApiTest', async ({ api }) => {
    const findCustomers = (sortField = 'updatedTime', sortOrder = 'descend', search = '') =>
      api.admin.query<ApiCustomerQueryFindManyArgs>('admin/CustomerFindMany', {
        variables: {
          input: {
            page: 1,
            pageSize: 25,
            search,
            sortField,
            sortOrder,
          },
        },
      });

    await test.step('Create a new user with a store', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create 3 customers', async () => {
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

      for (const input of inputs) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await api.admin.customer.create(input);
      }
    });

    await test.step('Checking the correctness of the data', async () => {
      const customers = await findCustomers();

      expect(customers.data.customerQuery.findMany.data[2]).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        isVerified: false,
      });
      expect(customers.data.customerQuery.findMany.data[1]).toMatchObject({
        firstName: 'Anna',
        lastName: 'Müller',
        email: 'anna.mueller@example.com',
        isVerified: false,
      });
      expect(customers.data.customerQuery.findMany.data[0]).toMatchObject({
        firstName: 'Pierre',
        lastName: 'Dubois',
        email: 'pierre.dubois@example.com',
        isVerified: false,
      });
    });

    await test.step('Checking sorting customers', async () => {
      await test.step('Sort by firstNameASC', async () => {
        const customers = await findCustomers('firstName', 'ascend');

        expect(customers.data.customerQuery.findMany.data[0].firstName).toBe('Anna');
        expect(customers.data.customerQuery.findMany.data[1].firstName).toBe('John');
        expect(customers.data.customerQuery.findMany.data[2].firstName).toBe('Pierre');
      });

      await test.step('Sort by firstNameDSC', async () => {
        const customers = await findCustomers('firstName', 'descend');

        expect(customers.data.customerQuery.findMany.data[0].firstName).toBe('Pierre');
        expect(customers.data.customerQuery.findMany.data[1].firstName).toBe('John');
        expect(customers.data.customerQuery.findMany.data[2].firstName).toBe('Anna');
      });

      await test.step('Sort by lastNameASC', async () => {
        const customers = await findCustomers('lastName', 'ascend');

        expect(customers.data.customerQuery.findMany.data[0].firstName).toBe('John');
        expect(customers.data.customerQuery.findMany.data[1].firstName).toBe('Pierre');
        expect(customers.data.customerQuery.findMany.data[2].firstName).toBe('Anna');
      });

      await test.step('Sort by lastNameDSC', async () => {
        const customers = await findCustomers('lastName', 'descend');

        expect(customers.data.customerQuery.findMany.data[0].firstName).toBe('Anna');
        expect(customers.data.customerQuery.findMany.data[1].firstName).toBe('Pierre');
        expect(customers.data.customerQuery.findMany.data[2].firstName).toBe('John');
      });
    });

    await test.step('Search check', async () => {
      const customers = await findCustomers('lastName', 'descend', 'an');

      expect(customers.data.customerQuery.findMany.data[0].firstName).toBe('Anna');
    });
  });
});
