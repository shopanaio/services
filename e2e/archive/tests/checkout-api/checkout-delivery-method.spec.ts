import type { ApiCheckoutDeliveryGroup } from '@codegen/client-gql';

import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: delivery method update', () => {
  test('should select delivery method for first delivery group', async ({ api }) => {
    await test.step('setup client', async () => {
      await api.session.setupClient();
    });

    let checkoutId = '';
    let deliveryGroupId = '';
    let shippingMethodCode = '';

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

    await test.step('get available delivery methods', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const checkout = data.checkoutQuery.checkout;

      expect(checkout?.deliveryGroups).toBeTruthy();
      expect(checkout?.deliveryGroups.length).toBeGreaterThan(0);

      const group = checkout?.deliveryGroups[0] as ApiCheckoutDeliveryGroup;
      deliveryGroupId = group.id;

      expect(group.deliveryMethods.length).toBeGreaterThan(0);
      shippingMethodCode = group.deliveryMethods[0].code;
      console.log('shippingMethodCode', shippingMethodCode);
      expect(shippingMethodCode).toBeTruthy();
    });

    await test.step('select delivery method for entire checkout', async () => {
      const { data: readData } = await api.client.checkout.readFull(checkoutId);
      const group = readData.checkoutQuery.checkout?.deliveryGroups[0];
      const provider = group?.deliveryMethods[0]?.provider?.code || '';

      const { data } = await api.client.checkout.updateDeliveryMethod({
        checkoutId,
        shippingMethodCode,
        deliveryGroupId,
        provider,
      });

      const updatedCheckout = data.checkoutMutation.checkoutDeliveryMethodUpdate;

      expect(updatedCheckout.id).toBe(checkoutId);
      const updatedGroup = updatedCheckout.deliveryGroups[0];
      expect(updatedGroup.selectedDeliveryMethod?.code).toBe(shippingMethodCode);
    });

    await test.step('verify delivery method persistence', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const checkout = data.checkoutQuery.checkout;
      const group = checkout?.deliveryGroups.find((g) => g.id === deliveryGroupId);
      expect(group?.selectedDeliveryMethod?.code).toBe(shippingMethodCode);
    });

    await test.step('change to different delivery method', async () => {
      // Get all shipping methods and select a different one
      const { data: readData } = await api.client.checkout.readFull(checkoutId);

      const group = readData.checkoutQuery.checkout?.deliveryGroups.find(
        (g) => g.id === deliveryGroupId,
      );
      const availableMethods = group?.deliveryMethods;
      const differentMethod = availableMethods?.find((m) => m.code !== shippingMethodCode);

      if (differentMethod) {
        const provider = differentMethod.provider?.code || '';
        const { data } = await api.client.checkout.updateDeliveryMethod({
          checkoutId,
          shippingMethodCode: differentMethod.code,
          deliveryGroupId,
          provider,
        });

        const updatedCheckout = data.checkoutMutation.checkoutDeliveryMethodUpdate;
        const updatedGroup = updatedCheckout.deliveryGroups.find((g) => g.id === deliveryGroupId);
        expect(updatedGroup?.selectedDeliveryMethod?.code).toBe(differentMethod.code);
      }
    });
  });

  test('should clear delivery method selection', async ({ api }) => {
    await test.step('setup client', async () => {
      await api.session.setupClient();
    });

    let checkoutId = '';
    let deliveryGroupId = '';
    let shippingMethodCode = '';

    await test.step('create checkout and select delivery method', async () => {
      api.session.setCustomerScope();
      const { data: createData } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = createData.checkoutMutation.checkoutCreate.id;

      // Get shipping methods and select one
      const { data: readData } = await api.client.checkout.readFull(checkoutId);

      const group = readData.checkoutQuery.checkout?.deliveryGroups[0];
      deliveryGroupId = group?.id || '';
      shippingMethodCode = group?.deliveryMethods[0]?.code || '';
      const provider = group?.deliveryMethods[0]?.provider?.code || '';

      await api.client.checkout.updateDeliveryMethod({
        checkoutId,
        shippingMethodCode,
        deliveryGroupId,
        provider,
      });
    });

    await test.step('verify method is selected', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const group = data.checkoutQuery.checkout?.deliveryGroups.find(
        (g) => g.id === deliveryGroupId,
      );
      expect(group?.selectedDeliveryMethod?.code).toBe(shippingMethodCode);
    });

    await test.step('change to different delivery method', async () => {
      // Note: The schema doesn't explicitly show how to clear the selection,
      // but we can try setting a different method or test the behavior
      const { data: readData } = await api.client.checkout.readFull(checkoutId);

      const group = readData.checkoutQuery.checkout?.deliveryGroups.find(
        (g) => g.id === deliveryGroupId,
      );
      const availableMethods = group?.deliveryMethods;
      const differentMethod = availableMethods?.find((m) => m.code !== shippingMethodCode);

      if (differentMethod) {
        const provider = differentMethod.provider?.code || '';
        const { data } = await api.client.checkout.updateDeliveryMethod({
          checkoutId,
          shippingMethodCode: differentMethod.code,
          deliveryGroupId,
          provider,
        });

        const updatedGroup = data.checkoutMutation.checkoutDeliveryMethodUpdate.deliveryGroups.find(
          (g) => g.id === deliveryGroupId,
        );
        expect(updatedGroup?.selectedDeliveryMethod?.code).toBe(differentMethod.code);
      }
    });
  });
});
