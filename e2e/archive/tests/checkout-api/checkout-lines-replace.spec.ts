import { EntityStatus } from '@codegen/admin-gql';
import type { ApiCheckoutLine } from '@codegen/client-gql';
import { CurrencyCode } from '@codegen/client-gql';
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';

test.describe('checkout-api: lines replace', () => {
  test('should replace product in line when quantity specified', async ({
    api,
  }) => {
    await test.step('setup client (tenant, project, apiKey) and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId1 = '';
    let purchasableId2 = '';
    let purchasableId3 = '';
    let lineId1 = '';
    let lineId2 = '';
    let lineId3 = '';

    await test.step('create empty checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });
      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('seed three products and get purchasableIds', async () => {
      api.session.setTenantScope();
      const time = Date.now();
      const handles = [`replace-1-${time}`, `replace-2-${time}`, `replace-3-${time}`];
      const prices = [10000, 20000, 30000];

      for (let i = 0; i < 3; i++) {
        await api.admin.product.create({
          input: {
            title: `Replace Product ${i + 1}`,
            status: EntityStatus.Published,
            slug: handles[i],
            groups: [],
            requiresShipping: true,
            tags: [],
            variants: {
              create: [
                api.admin.product.getDefaultVariantInput({
                  title: `Variant ${i + 1}`,
                  slug: handles[i],
                  price: prices[i],
                  stockStatus: 'IN_STOCK',
                  inListing: true,
                  variantSortIndex: 0,
                  sku: `SKU-REP-${i + 1}`,
                }),
              ],
            },
          },
        });
      }

      // Fetch products from client API to get correct purchasable IDs (base64 encoded)
      api.session.setCustomerScope();
      const v1 = await api.client.variant.get(handles[0]);
      const v2 = await api.client.variant.get(handles[1]);
      const v3 = await api.client.variant.get(handles[2]);
      purchasableId1 = v1.id as string;
      purchasableId2 = v2.id as string;
      purchasableId3 = v3.id as string;
    });

    await test.step('add three lines with quantities 5, 3, 2', async () => {
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [
          { purchasableId: purchasableId1, quantity: 5 },
          { purchasableId: purchasableId2, quantity: 3 },
          { purchasableId: purchasableId3, quantity: 2 },
        ],
      });
      const co = data.checkoutMutation.checkoutLinesAdd.checkout;
      const lines = (co?.lines ?? []) as ApiCheckoutLine[];
      lineId1 = lines.find((l) => l.purchasableId === purchasableId1)?.id || '';
      lineId2 = lines.find((l) => l.purchasableId === purchasableId2)?.id || '';
      lineId3 = lines.find((l) => l.purchasableId === purchasableId3)?.id || '';
      expect(lineId1 && lineId2 && lineId3).toBeTruthy();
      expect(co?.totalQuantity).toBe(10);
    });

    await test.step('replace: line1 product with purchasableId2 (qty 2) and line3 product with purchasableId2 (full qty)', async () => {
      const { data } = await api.client.mutation('checkout/CheckoutLinesReplace', {
        variables: {
          checkoutId,
          lines: [
            { lineId: lineId1, purchasableId: purchasableId2, quantity: 2 },
            { lineId: lineId3, purchasableId: purchasableId2 }, // replace with full qty (2)
          ],
        },
      });

      const payload = data.checkoutMutation.checkoutLinesReplace;
      const updated = payload.checkout;
      expect(payload.errors?.length ?? 0).toBe(0);

      const lines = (updated?.lines ?? []) as ApiCheckoutLine[];

      // Replace logic:
      // 1. line1 (5 × product1) → transforms to 2 × product2, removes existing line2 (3 × product2)
      // 2. line3 (2 × product3) → transforms to 2 × product2, removes the transformed line1
      // Result: only line3 remains with 2 × product2

      expect(lines.length).toBe(1);
      expect(lines[0].id).toBe(lineId3);
      expect(lines[0].purchasableId).toBe(purchasableId2);
      expect(lines[0].quantity).toBe(2);
      expect(updated?.totalQuantity).toBe(2);
    });
  });
});
