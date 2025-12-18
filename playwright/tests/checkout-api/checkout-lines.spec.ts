import { EntityStatus } from '@codegen/admin-gql';
import { CurrencyCode } from '@codegen/client-gql';
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: lines operations', () => {
  test('should create checkout, add line, update quantity, then remove line', async ({ api }) => {
    let checkoutId = '';
    let lineId = '';
    let purchasableId = '';
    let unitPrice = 0;

    await test.step('create empty checkout', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();

      const { data: createdResp } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      const created = createdResp.checkoutMutation.checkoutCreate;
      expect(created.id).toBeTruthy();
      checkoutId = created.id;
    });

    await test.step('seed product variant and compose purchasableId', async () => {
      api.session.setTenantScope();
      const handle = `test-product-${Date.now()}`;
      unitPrice = 100;
      await api.admin.product.create({
        input: {
          title: 'Test Product',
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
                price: unitPrice,
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
    });

    await test.step('add line to checkout', async () => {
      api.session.setCustomerScope();
      const { data: addResp } = await api.client.checkout.addLines({
        checkoutId,
        lines: [{ purchasableId, quantity: 2 }],
      });

      const afterAdd = addResp.checkoutMutation.checkoutLinesAdd.checkout;
      expect(afterAdd?.lines.length).toBe(1);
      const line = afterAdd?.lines[0];
      expect(line?.purchasableId).toBe(purchasableId);
      lineId = line?.id as string;

      // capture unit price and validate totals after add
      expect(afterAdd?.totalQuantity).toBe(2);
      expect(afterAdd?.cost.subtotalAmount.amount).toBe((unitPrice / 100) * 2);
      expect(afterAdd?.cost.totalAmount.amount).toBe((unitPrice / 100) * 2);
      expect(afterAdd?.cost.subtotalAmount.currencyCode).toBe('USD');
      expect(afterAdd?.cost.totalAmount.currencyCode).toBe('USD');
    });

    await test.step('update line quantity', async () => {
      const { data: updResp } = await api.client.checkout.updateLines({
        checkoutId,
        lines: [{ lineId, quantity: 3 }],
      });

      const afterUpd = updResp.checkoutMutation.checkoutLinesUpdate.checkout;
      expect(afterUpd?.lines[0].quantity).toBe(3);
      // validate totals after update
      expect(afterUpd?.totalQuantity).toBe(3);
      expect(afterUpd?.cost.subtotalAmount.amount).toBe((unitPrice / 100) * 3);
      expect(afterUpd?.cost.totalAmount.amount).toBe((unitPrice / 100) * 3);
    });

    // proceed to deletion scenario

    await test.step('remove line from checkout', async () => {
      const { data: delResp } = await api.client.checkout.deleteLines({
        checkoutId,
        lineIds: [lineId],
      });

      const afterDel = delResp.checkoutMutation.checkoutLinesDelete.checkout;
      expect(afterDel?.lines.length).toBe(0);
      expect(afterDel?.totalQuantity).toBe(0);
      expect(afterDel?.cost.subtotalAmount.amount).toBe(0);
      expect(afterDel?.cost.totalAmount.amount).toBe(0);
    });
  });
});
