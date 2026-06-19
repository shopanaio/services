
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: customer identity update', () => {
  test('should update customer email and customer ID', async ({ api }) => {
    await api.session.setupClient();
    await api.session.setupCustomer();

    let checkoutId = '';

    await test.step('create empty checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('update customer email', async () => {
      const customerEmail = `test-${Date.now()}@example.com`;

      const { data } = await api.client.checkout.updateCustomerIdentity({
        checkoutId,
        email: customerEmail,
      });

      const updatedCheckout = data.checkoutMutation.checkoutCustomerIdentityUpdate;
      expect(updatedCheckout.id).toBe(checkoutId);
      expect(updatedCheckout.customerIdentity?.email).toBe(customerEmail);
    });

    await test.step('update customer ID', async () => {
      const customerId = api.session.customer.data.uuid;
      console.log(customerId, 'customerId');
      const { data } = await api.client.checkout.updateCustomerIdentity({
        checkoutId,
        customerId,
      });

      const updatedCheckout = data.checkoutMutation.checkoutCustomerIdentityUpdate;
      expect(updatedCheckout.id).toBe(checkoutId);
      expect(updatedCheckout.customerIdentity?.customer?.id).toBeTruthy();
    });

    await test.step('update both email and customer ID together', async () => {
      const newEmail = `updated-${Date.now()}@example.com`;
      const newCustomerId = api.session.customer.data.uuid;

      const { data } = await api.client.checkout.updateCustomerIdentity({
        checkoutId,
        email: newEmail,
        customerId: newCustomerId,
      });

      const updatedCheckout = data.checkoutMutation.checkoutCustomerIdentityUpdate;
      expect(updatedCheckout.id).toBe(checkoutId);
      expect(updatedCheckout.customerIdentity?.email).toBe(newEmail);
      expect(updatedCheckout.customerIdentity?.customer?.id).toBeTruthy();
    });

    await test.step('read checkout and verify customer identity persisted', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const checkout = data.checkoutQuery.checkout;
      expect(checkout?.customerIdentity?.email).toBeTruthy();
      expect(checkout?.customerIdentity?.customer?.id).toBeTruthy();
    });
  });

  test('should clear customer email by setting null', async ({ api }) => {
    await api.session.setupClient();
    await api.session.setupCustomer();

    let checkoutId = '';

    await test.step('create checkout with customer email', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;

      // Set initial email
      await api.client.checkout.updateCustomerIdentity({
        checkoutId,
        email: `initial-${Date.now()}@example.com`,
      });
    });

    await test.step('clear customer email', async () => {
      const { data } = await api.client.checkout.updateCustomerIdentity({
        checkoutId,
        email: null,
      });

      const updatedCheckout = data.checkoutMutation.checkoutCustomerIdentityUpdate;
      expect(updatedCheckout.id).toBe(checkoutId);
      expect(updatedCheckout.customerIdentity?.email).toBeNull();
    });
  });
});
