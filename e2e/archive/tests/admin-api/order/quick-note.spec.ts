import { test } from '@fixtures/base.extend';
import type { ApiOrder, ApiProduct, ApiTag } from '@codegen/admin-gql';

import { randomUUID } from 'node:crypto';
import { expect } from 'playwright/test';
import * as Yup from 'yup';

test.describe('Orders API', () => {
  let productRequest: { data: { productMutation: { create: ApiProduct } } };
  let customerId: { data: { customerMutation: { create: string } } };
  let order: ApiOrder;

  const createProductInput = (title: string, price: number, oldPrice: number) => ({
    description: null,
    excerpt: '',
    groups: [],
    requiresShipping: false,
    slug: randomUUID(),
    status: 'DRAFT',
    tags: [],
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

  test('Quick Note, Comment, tag', async ({ api }) => {
    const productsIds: string[] = [];
    let tag = {} as ApiTag;
    let orderId: string;

    const findOrder = (id: string) => api.admin.order.findOne(id);

    await test.step('Create a new user with a store', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create 3 products', async () => {
      for (const input of productsInputs) {
        productRequest = await api.admin.mutation('admin/ProductCreate', {
          variables: { input },
        });
        productsIds.push(productRequest.data.productMutation.create.variants[0].id);
      }
    });

    await test.step('Create customer', async () => {
      customerId = await api.admin.mutation('admin/CustomerCreate', {
        variables: { input: customerInput },
      });
    });

    await test.step('Create tag', async () => {
      const tagInput = {
        title: 'Tag 1',
        slug: randomUUID(),
        color: '#000000',
      };

      tag = await api.admin.tag.create({ input: tagInput });
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
          customerId: customerId.data.customerMutation.create,
          id: orderId,
        });
        expect(updated).toBe(true);
      });

      await test.step('Check products qnt = 3', async () => {
        order = await findOrder(orderId);
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

      order = await findOrder(orderId);
      expect(order.status).toBe('ACTIVE');
    });

    await test.step('Add Quick Note', async () => {
      const noteUpdated = await api.admin.order.updateAdminNote({
        id: orderId,
        adminNote: 'Quick note - lorem ipsum',
      });
      expect(noteUpdated).toBe(true);
    });

    await test.step('Check Quick Note', async () => {
      order = await findOrder(orderId);
      expect(order.adminNote).toBe('Quick note - lorem ipsum');
    });

    await test.step('Add Comment', async () => {
      const commentAdded = await api.admin.order.addComment({
        id: orderId,
        comment: 'Comment - lorem ipsum',
      });
      expect(commentAdded).toBe(true);
    });

    await test.step('Check Comment', async () => {
      order = await findOrder(orderId);
      expect(order.events[0].eventType).toBe('COMMENT_CREATED');
    });

    await test.step('Add tag', async () => {
      const tagUpdated = await api.admin.order.updateTags({
        id: orderId,
        tags: [tag.id],
      });
      expect(tagUpdated).toBe(true);
    });

    await test.step('Check Tag', async () => {
      order = await findOrder(orderId);
      expect(order.tags.length).toBe(1);
    });
  });
});
