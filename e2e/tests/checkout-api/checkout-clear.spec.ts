import { EntityStatus } from '@codegen/admin-gql';
import { CurrencyCode } from '@codegen/client-gql';
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: lines clear', () => {
  test('should clear all lines and recalc totals to zero', async ({ api }) => {
    await test.step('setup client (tenant, project, apiKey) and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId = '';

    await test.step('create empty checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });
      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('seed product variant and get purchasableId', async () => {
      api.session.setTenantScope();
      const handle = `test-product-${Date.now()}`;
      await api.admin.product.create({
        input: {
          title: 'Clear Lines Product',
          status: EntityStatus.Published,
          slug: handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Variant',
                slug: handle,
                price: 100,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
              }),
            ],
          },
        },
      });

      // Fetch product from client API to get correct purchasable ID (base64 encoded)
      api.session.setCustomerScope();
      const variant = await api.client.variant.get(handle);
      purchasableId = variant.id;
      expect(purchasableId).toBeTruthy();
    });

    await test.step('add one line to checkout', async () => {
      api.session.setCustomerScope();
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [
          {
            purchasableId,
            quantity: 2,
          },
        ],
      });

      const afterAdd = data.checkoutMutation.checkoutLinesAdd.checkout;
      expect(afterAdd?.lines.length).toBe(1);
      expect(afterAdd?.totalQuantity).toBe(2);
    });

    await test.step('clear all lines', async () => {
      const { data } = await api.client.checkout.clearLines({ checkoutId });

      const afterClear = data.checkoutMutation.checkoutLinesClear.checkout;
      expect(afterClear?.lines.length).toBe(0);
      expect(afterClear?.totalQuantity).toBe(0);
      expect(afterClear?.cost.subtotalAmount.amount).toBe(0);
      expect(afterClear?.cost.totalAmount.amount).toBe(0);
    });

    await test.step('read checkout by id and verify empty state', async () => {
      const { data } = await api.client.checkout.read(checkoutId);
      const read = data.checkoutQuery.checkout;
      expect(read?.id).toBe(checkoutId);
      expect(read?.lines.length).toBe(0);
      expect(read?.totalQuantity).toBe(0);
      expect(read?.cost.subtotalAmount.amount).toBe(0);
      expect(read?.cost.totalAmount.amount).toBe(0);
    });
  });
});
