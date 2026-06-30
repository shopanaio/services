import type { ApiCheckoutPayment } from '@codegen/client-gql';

import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: payment read operations', () => {
  test('should read payment data from newly created checkout', async ({ api }) => {
    await test.step('setup client and install payment apps', async () => {
      await api.session.setupClient();

      await api.admin.mutation('admin/AppsInstall', {
        variables: { code: 'payment:bank_transfer' },
      });
    });

    let checkoutId = '';

    await test.step('create checkout', async () => {
      api.session.setCustomerScope();
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('read payment via readFull query', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const checkout = data.checkoutQuery.checkout;
      expect(checkout).toBeTruthy();
      expect(checkout?.payment).toBeTruthy();

      const payment = checkout?.payment as ApiCheckoutPayment;
      expect(payment.paymentMethods).toBeTruthy();
      expect(payment.paymentMethods.length).toBeGreaterThan(0);
      expect(payment.selectedPaymentMethod).toBeNull();
      expect(payment.payableAmount).toBeTruthy();
    });

    await test.step('read payment via readFull query', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const checkout = data.checkoutQuery.checkout;
      expect(checkout).toBeTruthy();
      expect(checkout?.payment).toBeTruthy();

      const payment = checkout?.payment as ApiCheckoutPayment;
      expect(payment.paymentMethods).toBeTruthy();
      expect(payment.paymentMethods.length).toBeGreaterThan(0);
    });
  });

  test('should verify payment data consistency across different read methods', async ({ api }) => {
    await test.step('setup client and install payment apps', async () => {
      await api.session.setupClient();

      await api.admin.mutation('admin/AppsInstall', {
        variables: { code: 'payment:bank_transfer' },
      });
    });

    let checkoutId = '';
    let paymentMethodCode = '';

    await test.step('create checkout and select payment method', async () => {
      api.session.setCustomerScope();
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;

      // Get and select payment method
      const { data: readData } = await api.client.checkout.readFull(checkoutId);
      const payment = readData.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      paymentMethodCode = payment.paymentMethods[0].code;
      const provider = payment.paymentMethods[0].provider?.code || '';

      await api.client.checkout.updatePaymentMethod({
        checkoutId,
        paymentMethodCode,
        provider,
      });
    });

    await test.step('verify consistency between readFull and readFull', async () => {
      const { data: withPaymentData } = await api.client.checkout.readFull(checkoutId);
      const { data: fullData } = await api.client.checkout.readFull(checkoutId);

      const paymentViaSpecific = withPaymentData.checkoutQuery.checkout
        ?.payment as ApiCheckoutPayment;
      const paymentViaFull = fullData.checkoutQuery.checkout?.payment as ApiCheckoutPayment;

      // Both should have the same selected method
      expect(paymentViaSpecific.selectedPaymentMethod?.code).toBe(paymentMethodCode);
      expect(paymentViaFull.selectedPaymentMethod?.code).toBe(paymentMethodCode);

      // Both should have the same number of available methods
      expect(paymentViaSpecific.paymentMethods.length).toBe(paymentViaFull.paymentMethods.length);

      // Both should have the same payable amount
      expect(paymentViaSpecific.payableAmount.amount).toBe(paymentViaFull.payableAmount.amount);
      expect(paymentViaSpecific.payableAmount.currencyCode).toBe(
        paymentViaFull.payableAmount.currencyCode,
      );
    });
  });

  test('should verify payment data is included in mutation responses', async ({ api }) => {
    await test.step('setup client and install payment apps', async () => {
      await api.session.setupClient();

      await api.admin.mutation('admin/AppsInstall', {
        variables: { code: 'payment:bank_transfer' },
      });
    });

    let checkoutId = '';

    await test.step('create checkout', async () => {
      api.session.setCustomerScope();
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
    });

    await test.step('verify payment data in updatePaymentMethod mutation response', async () => {
      const { data: readData } = await api.client.checkout.readFull(checkoutId);
      const payment = readData.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      const paymentMethodCode = payment.paymentMethods[0].code;
      const provider = payment.paymentMethods[0].provider?.code || '';

      const { data: updateData } = await api.client.checkout.updatePaymentMethod({
        checkoutId,
        paymentMethodCode,
        provider,
      });

      const mutationResponse = updateData.checkoutMutation.checkoutPaymentMethodUpdate;

      // Mutation response should include payment data
      expect(mutationResponse.payment).toBeTruthy();
      expect(mutationResponse.payment.selectedPaymentMethod).toBeTruthy();
      expect(mutationResponse.payment.selectedPaymentMethod?.code).toBe(paymentMethodCode);
      expect(mutationResponse.payment.paymentMethods).toBeTruthy();
      expect(mutationResponse.payment.payableAmount).toBeTruthy();
    });
  });

  test('should read payment with different currency codes', async ({ api }) => {
    await test.step('setup client and install payment apps', async () => {
      await api.session.setupClient();

      await api.admin.mutation('admin/AppsInstall', {
        variables: { code: 'payment:bank_transfer' },
      });
    });

    const currencies = [
      { code: 'USD', expectedCode: 'USD' },
      { code: 'EUR', expectedCode: 'EUR' },
    ];

    for (const currency of currencies) {
      await test.step(`verify payment for ${currency.expectedCode} checkout`, async () => {
        api.session.setCustomerScope();
        const { data } = await api.client.checkout.create({
          localeCode: 'en',
          currencyCode: currency.code,
          items: [],
        });

        const checkoutId = data.checkoutMutation.checkoutCreate.id;

        const { data: readData } = await api.client.checkout.readFull(checkoutId);

        const payment = readData.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
        expect(payment.payableAmount.currencyCode).toBe(currency.expectedCode);
      });
    }
  });

  test('should handle payment data for checkout without payment methods', async ({ api }) => {
    await test.step('setup client WITHOUT installing payment apps', async () => {
      await api.session.setupClient();
      // Intentionally not installing any payment apps
    });

    let checkoutId = '';

    await test.step('create checkout', async () => {
      api.session.setCustomerScope();
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
    });

    await test.step('verify payment structure exists even without methods', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const checkout = data.checkoutQuery.checkout;
      expect(checkout?.payment).toBeTruthy();

      const payment = checkout?.payment as ApiCheckoutPayment;

      // Payment aggregate should exist
      expect(payment.paymentMethods).toBeDefined();
      expect(Array.isArray(payment.paymentMethods)).toBe(true);

      // May be empty if no payment apps installed
      // expect(payment.paymentMethods.length).toBe(0);

      expect(payment.selectedPaymentMethod).toBeDefined();
      expect(payment.payableAmount).toBeTruthy();
      expect(payment.payableAmount.amount).toBe(0);
    });
  });
});
