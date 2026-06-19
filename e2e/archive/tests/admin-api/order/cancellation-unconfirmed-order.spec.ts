import { test } from '@fixtures/base.extend';
import type { ApiCustomer, ApiOrder, ApiProduct } from '@codegen/admin-gql';

import { randomUUID } from 'node:crypto';
import { expect } from 'playwright/test';
import * as Yup from 'yup';

test.describe('Orders API', () => {
  let product: ApiProduct;
  let customer: ApiCustomer;
  let order: ApiOrder;

  const createProductInput = (title: string, price: number, oldPrice: number) => ({
    description: null,
    excerpt: '',
    groups: [],
    slug: randomUUID(),
    title,
    variants: {
      create: [
        {
          categories: [],
          costPrice: 0,
          coverId: null,
          features: [],
          gallery: [],
          inListing: true,
          oldPrice,
          price,
          sku: '',
          slug: randomUUID(),
          stockStatus: 'OUT_OF_STOCK',
          title,
          variantSortIndex: 0,
          weight: 0,
          weightUnit: 'g',
          width: 0,
          height: 0,
          length: 0,
          dimensionUnit: 'mm',
        },
      ],
    },
  });

  const productsInputs = [
    createProductInput('Sunglasses', 3500, 3000),
    createProductInput('Hat', 2500, 2000),
    createProductInput('Pants', 5000, 4000),
  ];

  const customerInput = {
    firstName: 'John',
    lastName: 'Doe',
    language: 'English',
    email: 'john.doe@example.com',
    isVerified: false,
    phone: '45545455',
    password: '123456',
  };

  test('Cancellation of unconfirmed order', async ({ api }) => {
    const productsIds: string[] = [];
    let orderId: string;

    await test.step('Create a new user with a store', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create 3 products', async () => {
      for (const input of productsInputs) {
        product = await api.admin.product.create({ input });
        productsIds.push(product.variants[0].id);
      }
    });

    await test.step('Create customer', async () => {
      customer = await api.admin.customer.create(customerInput);
    });

    await test.step('Create a new order with products', async () => {
      await test.step('Create order', async () => {
        const created = await api.admin.order.create();
        orderId = created.id;
        order = created;
      });

      await test.step('Add 3 products', async () => {
        for (const productId of productsIds) {
          const added = await api.admin.order.addItem({
            orderId,
            productId,
            quantity: 1,
          });
          expect(added).toBe(true);
        }
      });

      await test.step('Add customer', async () => {
        const updated = await api.admin.order.updateCustomer({
          customerId: customer.id,
          id: orderId,
        });
        expect(updated).toBe(true);
      });

      await test.step('Check products qnt = 3', async () => {
        order = await api.admin.order.findOne(orderId);
        expect(order.orderItems.length).toBe(3);
      });

      await test.step('Check contact info', async () => {
        expect(order.customer).toMatchSchema(
          Yup.object({
            firstName: Yup.string().equals([customerInput.firstName]).required(),
            lastName: Yup.string().equals([customerInput.lastName]).required(),
            language: Yup.string().equals([customerInput.language]).required(),
            email: Yup.string().equals([customerInput.email]).required(),
            isVerified: Yup.boolean().equals([customerInput.isVerified]).required(),
            phone: Yup.string().equals([customerInput.phone]).required(),
          }),
        );
      });
    });

    await test.step('Confirm order', async () => {
      const statusActive = await api.admin.order.updateStatus({
        id: orderId,
        status: 'ACTIVE',
        comment: 'Order status - active',
      });
      expect(statusActive).toBe(true);
      order = await api.admin.order.findOne(orderId);
      expect(order.status).toBe('ACTIVE');
    });

    await test.step('Cancel order', async () => {
      const cancelled = await api.admin.order.updateStatus({
        id: orderId,
        status: 'CANCELLED',
        comment: 'Order status - Cancelled',
      });
      expect(cancelled).toBe(true);
    });

    await test.step('Check statuses', async () => {
      order = await api.admin.order.findOne(orderId);
      expect(order.status).toBe('CANCELLED');
    });
  });
});
