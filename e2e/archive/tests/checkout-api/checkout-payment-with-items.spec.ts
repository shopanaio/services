import type { ApiCheckoutPayment } from '@codegen/client-gql';
import { CurrencyCode } from '@codegen/client-gql';
import { EntityStatus } from '@codegen/admin-gql';
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: payment with items', () => {
  test('should calculate payableAmount correctly when items are added to checkout', async ({
    api,
  }) => {
    await api.session.setupClient();

    let purchasableId = '';
    const unitPrice = 5000; // $50.00
    const quantity = 2;
    const expectedTotal = (unitPrice / 100) * quantity;

    await test.step('create product variant', async () => {
      api.session.setTenantScope();
      const handle = `test-payment-product-${Date.now()}`;

      await api.admin.product.create({
        input: {
          title: 'Payment Test Product',
          status: EntityStatus.Published,
          slug: handle,
          groups: [],
          requiresShipping: false,
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
                sku: 'SKU-PAYMENT-1',
              }),
            ],
          },
        },
      });

      // Get purchasable ID from client API
      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;
      expect(purchasableId).toBeTruthy();
    });

    let checkoutId = '';

    await test.step('create checkout with items', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [
          {
            purchasableId,
            quantity,
          },
        ],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('verify payableAmount reflects item total', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const checkout = data.checkoutQuery.checkout;
      const payment = checkout?.payment as ApiCheckoutPayment;

      expect(payment.payableAmount).toBeTruthy();
      expect(payment.payableAmount.amount).toBe(expectedTotal);
      expect(payment.payableAmount.currencyCode).toBe('USD');
    });

    await test.step('select payment method and verify payableAmount persists', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      const paymentMethodCode = payment.paymentMethods[0].code;
      const provider = payment.paymentMethods[0].provider?.code || '';

      const { data: updateData } = await api.client.checkout.updatePaymentMethod({
        checkoutId,
        paymentMethodCode,
        provider,
      });

      const updatedPayment = updateData.checkoutMutation.checkoutPaymentMethodUpdate.payment;
      expect(updatedPayment.selectedPaymentMethod?.code).toBe(paymentMethodCode);
      expect(updatedPayment.payableAmount.amount).toBe(expectedTotal);
      expect(updatedPayment.payableAmount.currencyCode).toBe('USD');
    });
  });

  test('should update payableAmount when items are added after checkout creation', async ({
    api,
  }) => {
    await api.session.setupClient();

    let purchasableId = '';
    const unitPrice = 3000; // $30.00

    await test.step('create product variant', async () => {
      api.session.setTenantScope();
      const handle = `test-payment-product-add-${Date.now()}`;

      await api.admin.product.create({
        input: {
          title: 'Payment Add Test Product',
          status: EntityStatus.Published,
          slug: handle,
          groups: [],
          requiresShipping: false,
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
                sku: 'SKU-PAYMENT-ADD-1',
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

    await test.step('create empty checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
    });

    await test.step('verify initial payableAmount is zero', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      expect(payment.payableAmount.amount).toBe(0);
    });

    await test.step('add items to checkout', async () => {
      await api.client.checkout.addLines({
        checkoutId,
        lines: [
          {
            purchasableId,
            quantity: 3,
          },
        ],
      });
    });

    await test.step('verify payableAmount updated after adding items', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      const expectedTotal = (unitPrice / 100) * 3;
      expect(payment.payableAmount.amount).toBe(expectedTotal);
    });

    await test.step('select payment method', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      const paymentMethodCode = payment.paymentMethods[0].code;
      const provider = payment.paymentMethods[0].provider?.code || '';

      await api.client.checkout.updatePaymentMethod({
        checkoutId,
        paymentMethodCode,
        provider,
      });
    });

    await test.step('remove items and verify payableAmount updates', async () => {
      const { data: beforeData } = await api.client.checkout.readFull(checkoutId);
      const lineId = beforeData.checkoutQuery.checkout?.lines[0]?.id;

      expect(lineId).toBeTruthy();
      if (!lineId) {
        throw new Error('Line id not found');
      }

      await api.client.checkout.deleteLines({
        checkoutId,
        lineIds: [lineId],
      });

      const { data: afterData } = await api.client.checkout.readFull(checkoutId);
      const payment = afterData.checkoutQuery.checkout?.payment as ApiCheckoutPayment;

      expect(payment.payableAmount.amount).toBe(0);
      // Payment method should still be selected
      expect(payment.selectedPaymentMethod).toBeTruthy();
    });
  });

  test('should update payableAmount when line quantity is changed', async ({ api }) => {
    await api.session.setupClient();

    let purchasableId = '';
    const unitPrice = 2500; // $25.00

    await test.step('create product variant', async () => {
      api.session.setTenantScope();
      const handle = `test-payment-qty-${Date.now()}`;

      await api.admin.product.create({
        input: {
          title: 'Payment Quantity Test Product',
          status: EntityStatus.Published,
          slug: handle,
          groups: [],
          requiresShipping: false,
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
                sku: 'SKU-PAYMENT-QTY-1',
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
    let lineId = '';

    await test.step('create checkout with item', async () => {
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
      lineId = data.checkoutMutation.checkoutCreate.lines[0].id;
    });

    await test.step('verify initial payableAmount', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      const expectedTotal = unitPrice / 100;
      expect(payment.payableAmount.amount).toBe(expectedTotal);
    });

    await test.step('select payment method', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      const paymentMethodCode = payment.paymentMethods[0].code;
      const provider = payment.paymentMethods[0].provider?.code || '';

      await api.client.checkout.updatePaymentMethod({
        checkoutId,
        paymentMethodCode,
        provider,
      });
    });

    await test.step('increase line quantity', async () => {
      await api.client.checkout.updateLines({
        checkoutId,
        lines: [
          {
            lineId,
            quantity: 5,
          },
        ],
      });
    });

    await test.step('verify payableAmount updated after quantity change', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const payment = data.checkoutQuery.checkout?.payment as ApiCheckoutPayment;
      const expectedTotal = (unitPrice / 100) * 5;
      expect(payment.payableAmount.amount).toBe(expectedTotal);

      // Payment method should still be selected
      expect(payment.selectedPaymentMethod).toBeTruthy();
    });
  });
});
