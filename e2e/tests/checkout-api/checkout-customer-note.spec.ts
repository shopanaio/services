import { CurrencyCode } from '@codegen/client-gql';
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: customer note update', () => {
  test('should add, update and clear customer note', async ({ api }) => {
    await test.step('setup client (tenant, project, apiKey) and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';

    await test.step('create empty checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('add customer note', async () => {
      const note = 'Please deliver to the front door. Ring the bell twice.';

      const { data } = await api.client.checkout.updateCustomerNote({
        checkoutId,
        note,
      });

      const updatedCheckout = data.checkoutMutation.checkoutCustomerNoteUpdate;
      expect(updatedCheckout.id).toBe(checkoutId);
      expect(updatedCheckout.customerNote).toBe(note);
    });

    await test.step('update customer note', async () => {
      const updatedNote = 'Changed my mind - please leave at the back door.';

      const { data } = await api.client.checkout.updateCustomerNote({
        checkoutId,
        note: updatedNote,
      });

      const updatedCheckout = data.checkoutMutation.checkoutCustomerNoteUpdate;
      expect(updatedCheckout.id).toBe(checkoutId);
      expect(updatedCheckout.customerNote).toBe(updatedNote);
    });

    await test.step('clear customer note', async () => {
      const { data } = await api.client.checkout.updateCustomerNote({
        checkoutId,
        note: '',
      });

      const updatedCheckout = data.checkoutMutation.checkoutCustomerNoteUpdate;
      expect(updatedCheckout.id).toBe(checkoutId);
      expect(updatedCheckout.customerNote).toBe('');
    });

    await test.step('clear customer note with null', async () => {
      // First add a note
      await api.client.checkout.updateCustomerNote({
        checkoutId,
        note: 'Test note to be cleared',
      });

      // Then clear with null
      const { data } = await api.client.checkout.updateCustomerNote({
        checkoutId,
        note: null,
      });

      const updatedCheckout = data.checkoutMutation.checkoutCustomerNoteUpdate;
      expect(updatedCheckout.id).toBe(checkoutId);
      expect(updatedCheckout.customerNote).toBeNull();
    });

    await test.step('read checkout and verify note persistence', async () => {
      // Set a note again for verification
      const finalNote = 'Final delivery instructions';
      await api.client.checkout.updateCustomerNote({
        checkoutId,
        note: finalNote,
      });

      const { data } = await api.client.checkout.readFull(checkoutId);

      const checkout = data.checkoutQuery.checkout;
      expect(checkout?.customerNote).toBe(finalNote);
    });
  });

  test('should handle long customer notes', async ({ api }) => {
    await api.session.setupClient();
    api.session.setCustomerScope();

    let checkoutId = '';

    await test.step('create empty checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
    });

    await test.step('add long customer note', async () => {
      const longNote = 'This is a very long customer note with detailed delivery instructions. '.repeat(10) +
                      'Please ensure that the package is handled with care and delivered during business hours.';

      const { data } = await api.client.checkout.updateCustomerNote({
        checkoutId,
        note: longNote,
      });

      const updatedCheckout = data.checkoutMutation.checkoutCustomerNoteUpdate;
      expect(updatedCheckout.id).toBe(checkoutId);
      expect(updatedCheckout.customerNote).toBe(longNote);
    });
  });

  test('should handle special characters in customer note', async ({ api }) => {
    await api.session.setupClient();
    api.session.setCustomerScope();

    let checkoutId = '';

    await test.step('create empty checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
    });

    await test.step('add note with special characters', async () => {
      const specialNote = 'Доставка по адресу: ул. Тестовая, д. 123 "Офис №5" (2-й этаж). Tel: +380 (99) 123-45-67!';

      const { data } = await api.client.checkout.updateCustomerNote({
        checkoutId,
        note: specialNote,
      });

      const updatedCheckout = data.checkoutMutation.checkoutCustomerNoteUpdate;
      expect(updatedCheckout.id).toBe(checkoutId);
      expect(updatedCheckout.customerNote).toBe(specialNote);
    });
  });
});
