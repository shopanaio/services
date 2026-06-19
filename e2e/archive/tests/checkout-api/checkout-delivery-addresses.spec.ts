import type {
  ApiCheckout,
  ApiCheckoutDeliveryAddressesAddInput } from '@codegen/client-gql';
import {
  CurrencyCode,
} from '@codegen/client-gql';
import { CountryCode } from '@codegen/client-gql';
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: delivery addresses management', () => {
  test('should add, update and remove delivery addresses', async ({ api }) => {
    await test.step('setup client (tenant, project, apiKey) and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let updatedCheckout: ApiCheckout | null = null;

    await test.step('create empty checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('add delivery addresses', async () => {
      const { data } = await api.client.checkout.addDeliveryAddresses({
        checkoutId,
        addresses: [
          {
            address1: '123 Main Street',
            address2: 'Apt 4B',
            city: 'New York',
            countryCode: CountryCode.Us,
          },
        ],
      } satisfies ApiCheckoutDeliveryAddressesAddInput);

      updatedCheckout = data.checkoutMutation.checkoutDeliveryAddressesAdd;
      expect(updatedCheckout.id).toBe(checkoutId);
      expect(updatedCheckout.deliveryGroups.length).toBe(1);

      const [groupHome] = updatedCheckout.deliveryGroups;
      expect(groupHome.deliveryAddress?.address1).toBe('123 Main Street');
      expect(groupHome.deliveryAddress?.address2).toBe('Apt 4B');
      expect(groupHome.deliveryAddress?.city).toBe('New York');
      expect(groupHome.deliveryAddress?.countryCode).toBe('US');
    });

    await test.step('add recipients to delivery groups', async () => {
      const deliveryGroupId = updatedCheckout?.deliveryGroups[0].id as string;

      const { data } = await api.client.checkout.addDeliveryRecipients({
        checkoutId,
        recipients: [
          {
            deliveryGroupId,
            recipient: {
              firstName: 'John',
              lastName: 'Doe',
              email: 'home@example.com',
            },
          },
        ],
      });

      updatedCheckout = data.checkoutMutation.checkoutDeliveryRecipientsAdd;
      expect(updatedCheckout.id).toBe(checkoutId);

      const [groupHome] = updatedCheckout.deliveryGroups;
      expect(groupHome.recipient?.firstName).toBe('John');
      expect(groupHome.recipient?.lastName).toBe('Doe');
      expect(groupHome.recipient?.email).toBe('home@example.com');
    });

    await test.step('update delivery addresses', async () => {
      const { data } = await api.client.checkout.updateDeliveryAddresses({
        checkoutId,
        updates: [
          {
            addressId: updatedCheckout?.deliveryGroups[0].deliveryAddress?.id as string,
            address: {
              address1: '789 Updated Street',
              address2: 'Suite 10',
              city: 'Brooklyn',
              countryCode: CountryCode.Us,
            },
          },
        ],
      });

      const updated = data.checkoutMutation.checkoutDeliveryAddressesUpdate;
      expect(updated.id).toBe(checkoutId);
      const deliveryGroup = updated.deliveryGroups.find(
        (g) => g.id === updatedCheckout?.deliveryGroups[0].id,
      );

      const addr = deliveryGroup?.deliveryAddress;
      expect(addr?.address1).toBe('789 Updated Street');
      expect(addr?.address2).toBe('Suite 10');
      expect(addr?.city).toBe('Brooklyn');
    });

    await test.step('update recipients', async () => {
      const deliveryGroupId = updatedCheckout?.deliveryGroups[0].id as string;

      const { data } = await api.client.checkout.updateDeliveryRecipients({
        checkoutId,
        updates: [
          {
            deliveryGroupId,
            recipient: {
              firstName: 'Jane',
              lastName: 'Smith',
              email: 'updated@example.com',
            },
          },
        ],
      });

      const updated = data.checkoutMutation.checkoutDeliveryRecipientsUpdate;
      expect(updated.id).toBe(checkoutId);

      const deliveryGroup = updated.deliveryGroups.find((g) => g.id === deliveryGroupId);
      expect(deliveryGroup?.recipient?.firstName).toBe('Jane');
      expect(deliveryGroup?.recipient?.lastName).toBe('Smith');
      expect(deliveryGroup?.recipient?.email).toBe('updated@example.com');
    });

    await test.step('remove recipient', async () => {
      const deliveryGroupId = updatedCheckout?.deliveryGroups[0].id as string;

      const { data } = await api.client.checkout.removeDeliveryRecipients({
        checkoutId,
        deliveryGroupIds: [deliveryGroupId],
      });

      const { id, deliveryGroups } = data.checkoutMutation.checkoutDeliveryRecipientsRemove;
      expect(id).toBe(checkoutId);

      const deliveryGroup = deliveryGroups.find((g) => g.id === deliveryGroupId);
      expect(deliveryGroup?.recipient).toBeNull();
    });

    await test.step('remove delivery address', async () => {
      const addressId = updatedCheckout?.deliveryGroups[0].deliveryAddress?.id;
      const { data } = await api.client.checkout.removeDeliveryAddresses({
        checkoutId,
        addressIds: [addressId as string],
      });

      const { id, deliveryGroups } = data.checkoutMutation.checkoutDeliveryAddressesRemove;
      expect(id).toBe(checkoutId);
      expect(deliveryGroups[0].deliveryAddress).toBeNull();
    });
  });
});
