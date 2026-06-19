
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: read model', () => {
  test('create then read via checkoutQuery.checkout', async ({ api }) => {
    await api.session.setupClient();
    api.session.setCustomerScope();

    const input = {
      localeCode: 'en',
      currencyCode: 'USD',
      items: [],
    };

    const { data: createdResp } = await api.client.checkout.create(input);

    const created = createdResp.checkoutMutation.checkoutCreate;
    expect(created.id).toBeTruthy();

    const { data: readResp } = await api.client.checkout.read(created.id);

    const checkout = readResp.checkoutQuery.checkout;
    expect(checkout?.id).toBe(created.id);
    expect(checkout?.cost.totalAmount.currencyCode).toBe('USD');
  });
});
