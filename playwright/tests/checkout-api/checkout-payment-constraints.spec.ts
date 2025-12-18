import { ApiCheckoutPayment, CurrencyCode } from '@codegen/client-gql';
import { EntityStatus } from '@codegen/admin-gql';
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: payment method constraints', () => {
  test('should verify payment method structure', async ({ api }) => {
    await api.session.setupClient();

    let checkoutId = '';

    await test.step('create checkout', async () => {
      api.session.setCustomerScope();
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
    });

    const { data } = await api.client.checkout.readFull(checkoutId);
    const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;

    console.log(data.checkoutQuery.checkout?.payment);

    expect(payment.paymentMethods.length).toBeGreaterThan(0);
    payment.paymentMethods.forEach((method) => {
      // Verify payment method has required fields
      expect(method.code).toBeTruthy();
      expect(method.provider?.code).toBeTruthy();
      expect(method.flow).toBeTruthy();
      expect(method.data).toBeDefined();
    });
  });

  test('should maintain payment selection when delivery method is changed', async ({ api }) => {
    await api.session.setupClient();

    let purchasableId = '';
    const unitPrice = 4000; // $40.00

    await test.step('create product variant requiring shipping', async () => {
      api.session.setTenantScope();
      const handle = `test-payment-shipping-${Date.now()}`;

      await api.admin.product.create({
        input: {
          title: 'Payment Shipping Test Product',
          status: EntityStatus.Published,
          slug: handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Test Variant',
                slug: handle,
                price: unitPrice,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-PAYMENT-SHIP-1',
              }),
            ],
          },
        },
      });

      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;
    });

    let checkoutId = '';
    let deliveryGroupId = '';
    let paymentMethodCode = '';

    await test.step('create checkout with shipping item', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [
          {
            purchasableId,
            quantity: 1,
          },
        ],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      deliveryGroupId = data.checkoutMutation.checkoutCreate.deliveryGroups[0].id;
    });

    await test.step('select payment method', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      paymentMethodCode = payment.paymentMethods[0].code;
      const provider = payment.paymentMethods[0].provider?.code || '';

      await api.client.checkout.updatePaymentMethod({
        checkoutId,
        paymentMethodCode,
        provider,
      });
    });

    await test.step('change delivery method', async () => {
      const { data: readData } = await api.client.checkout.readFull(checkoutId);

      const deliveryGroup = readData.checkoutQuery.checkout?.deliveryGroups.find(
        (g) => g.id === deliveryGroupId,
      );
      const shippingMethodCode = deliveryGroup?.deliveryMethods[0]?.code;
      const provider = deliveryGroup?.deliveryMethods[0]?.provider?.code;

      if (shippingMethodCode && provider) {
        await api.client.checkout.updateDeliveryMethod({
          checkoutId,
          deliveryGroupId,
          shippingMethodCode,
          provider,
        });
      }
    });

    await test.step('verify payment method remains selected after delivery change', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      expect(payment.selectedPaymentMethod).toBeTruthy();
      expect(payment.selectedPaymentMethod?.code).toBe(paymentMethodCode);
    });
  });

  test('should display all payment method fields correctly', async ({ api }) => {
    await api.session.setupClient();

    let checkoutId = '';

    await test.step('create checkout', async () => {
      api.session.setCustomerScope();
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
    });

    await test.step('verify all payment method fields are present', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      const method = payment.paymentMethods[0];

      // Required fields
      expect(method.code).toBeTruthy();
      expect(typeof method.code).toBe('string');

      expect(method.provider?.code).toBeTruthy();
      expect(typeof method.provider?.code).toBe('string');

      expect(method.flow).toBeTruthy();
      expect(['ONLINE', 'OFFLINE', 'ON_DELIVERY']).toContain(method.flow);

      // Optional fields should be defined (even if null)
      expect(method.data).toBeDefined();
    });

    await test.step('select payment method and verify all fields are preserved', async () => {
      const { data: readData } = await api.client.checkout.readFull(checkoutId);
      const payment = readData.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      const methodCode = payment.paymentMethods[0].code;
      const provider = payment.paymentMethods[0].provider?.code || '';

      const { data: updateData } = await api.client.checkout.updatePaymentMethod({
        checkoutId,
        paymentMethodCode: methodCode,
        provider,
      });

      const selectedMethod =
        updateData.checkoutMutation.checkoutPaymentMethodUpdate.payment.selectedPaymentMethod;

      expect(selectedMethod).toBeTruthy();
      expect(selectedMethod?.code).toBe(methodCode);
      expect(selectedMethod?.provider?.code).toBeTruthy();
      expect(selectedMethod?.flow).toBeTruthy();
      expect(selectedMethod?.data).toBeDefined();
    });
  });

  test('should verify payment aggregate completeness', async ({ api }) => {
    await api.session.setupClient();

    let checkoutId = '';

    await test.step('create checkout', async () => {
      api.session.setCustomerScope();
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
    });

    await test.step('verify payment aggregate has all required fields', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;

      // Required fields of payment aggregate
      expect(payment.paymentMethods).toBeDefined();
      expect(Array.isArray(payment.paymentMethods)).toBe(true);
      expect(payment.paymentMethods.length).toBeGreaterThan(0);

      expect(payment.selectedPaymentMethod).toBeDefined(); // Can be null initially

      expect(payment.payableAmount).toBeTruthy();
      expect(payment.payableAmount.amount).toBeDefined();
      expect(payment.payableAmount.currencyCode).toBeTruthy();
    });

    await test.step('verify payment aggregate after method selection', async () => {
      const { data: readData } = await api.client.checkout.readFull(checkoutId);
      const payment = readData.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      const methodCode = payment.paymentMethods[0].code;
      const provider = payment.paymentMethods[0].provider?.code || '';

      await api.client.checkout.updatePaymentMethod({
        checkoutId,
        paymentMethodCode: methodCode,
        provider,
      });

      const { data: afterData } = await api.client.checkout.readFull(checkoutId);
      const updatedPayment = afterData.checkoutQuery.checkout?.payment as ApiCheckoutPayment;

      // After selection, selectedPaymentMethod should be populated
      expect(updatedPayment.selectedPaymentMethod).toBeTruthy();
      expect(updatedPayment.selectedPaymentMethod?.code).toBe(methodCode);

      // Other fields should remain intact
      expect(updatedPayment.paymentMethods.length).toBeGreaterThan(0);
      expect(updatedPayment.payableAmount).toBeTruthy();
    });
  });
});
