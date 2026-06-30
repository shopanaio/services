import { test } from '@fixtures/base.extend';
import type { ApiOrder } from '@codegen/admin-gql';
import { expect } from 'playwright/test';
import * as Yup from 'yup';

test.describe('Orders API', () => {
  let customerId: { data: { customerMutation: { create: string } } };
  let order: ApiOrder;

  const productsTitles = ['Sunglasses', 'Hat', 'Pants'];

  const customerInput = {
    firstName: 'John',
    lastName: 'Doe',
    language: 'English',
    email: 'john.doe@example.com',
    isVerified: false,
    phone: '45545455',
    password: '123456',
  };

  test('Cancellation of confirmed order', async ({ api }) => {
    const productsIds: string[] = [];
    let orderId: string;

    await api.session.setupUserAndProject();

    await test.step('Create 3 products', async () => {
      for (const title of productsTitles) {
        const product = await api.admin.product.create({
          input: { title },
        });
        productsIds.push(product.variants[0].id);
      }
    });

    await test.step('Create customer', async () => {
      customerId = await api.admin.mutation('admin/CustomerCreate', {
        variables: { input: customerInput },
      });
    });

    await test.step('Create a new order with products', async () => {
      await test.step('Create order', async () => {
        const createdOrder = await api.admin.order.create();
        orderId = createdOrder.id;
        order = createdOrder;
      });

      await test.step('Add 3 products', async () => {
        for (const productId of productsIds) {
          const result = await api.admin.order.addItem({
            orderId,
            productId,
            quantity: 1,
          });
          expect(result).toBe(true);
        }
      });

      await test.step('Add customer', async () => {
        const added = await api.admin.order.updateCustomer({
          customerId: customerId.data.customerMutation.create,
          id: orderId,
        });
        expect(added).toBe(true);
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
      const statusUpdated = await api.admin.order.updateStatus({
        id: orderId,
        status: 'ACTIVE',
        comment: 'Order status - active',
      });
      expect(statusUpdated).toBe(true);
      order = await api.admin.order.findOne(orderId);
      expect(order.status).toBe('ACTIVE');
    });

    await test.step('Cancel Fulfillment', async () => {
      const fulfilUpdated = await api.admin.order.updateFulfillmentStatus({
        id: order.fulfillments[0].id,
        status: 'CANCELLED',
        comment: 'Fulfillment status - cancelled',
      });
      expect(fulfilUpdated).toBe(true);
    });

    await test.step('Check timeline', async () => {
      order = await api.admin.order.findOne(orderId);
      expect(order.events[0].eventType).toBe('FULFILLMENT_STATUS_UPDATED');
    });

    await test.step('Cancel payment', async () => {
      if (order.payment?.id) {
        const payUpdated = await api.admin.order.updatePaymentStatus({
          id: order.payment.id,
          status: 'CANCELLED',
          comment: 'Payment status - paid',
        });
        expect(payUpdated).toBe(true);
      }
    });

    await test.step('Check timeline', async () => {
      order = await api.admin.order.findOne(orderId);
      expect(order.events[0].eventType).toBe('PAYMENT_STATUS_UPDATED');
    });

    await test.step('Cancel order', async () => {
      const statusCancelled = await api.admin.order.updateStatus({
        id: orderId,
        status: 'CANCELLED',
        comment: 'Order status - Cancelled',
      });
      expect(statusCancelled).toBe(true);
    });

    await test.step('Check timeline', async () => {
      order = await api.admin.order.findOne(orderId);
      expect(order.events[0].eventType).toBe('ORDER_STATUS_UPDATED');
    });

    await test.step('Check statuses', async () => {
      expect(order.status).toBe('CANCELLED');
      expect(order.payment?.status).toBe('CANCELLED');
      expect(order.fulfillments[0].status).toBe('CANCELLED');
    });
  });
});
