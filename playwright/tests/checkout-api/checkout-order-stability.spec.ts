import { EntityStatus } from '@codegen/admin-gql';
import { CurrencyCode } from '@codegen/client-gql';
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';
// import { composeGlobalId, TypeName } from '@utils/globalid';

test.describe('checkout-api: lines order stability', () => {
  test('updating quantity keeps lines order', async ({ api }) => {
    await api.session.setupClient();
    api.session.setTenantScope();

    const handle = `test-product-${Date.now()}`;
    const product = await api.admin.product.create({
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
              title: 'Variant A',
              slug: `${handle}-a`,
              price: 100,
              stockStatus: 'IN_STOCK',
              inListing: true,
              variantSortIndex: 0,
            }),
            api.admin.product.getDefaultVariantInput({
              title: 'Variant B',
              slug: `${handle}-b`,
              price: 200,
              stockStatus: 'IN_STOCK',
              inListing: true,
              variantSortIndex: 1,
            }),
          ],
        },
      },
    });

    // Fetch products from client API to get correct purchasable IDs (base64 encoded)
    api.session.setCustomerScope();
    const variantA = await api.client.variant.get(`${handle}-a`);
    const variantB = await api.client.variant.get(`${handle}-b`);
    const productIdA = variantA.id;
    const productIdB = variantB.id;
    const { data: createdResp } = await api.client.checkout.create({
      localeCode: 'en',
      currencyCode: CurrencyCode.Usd,
      items: [],
    });
    const created = (createdResp as unknown as {
      checkoutMutation: { checkoutCreate: { id: string } };
    }).checkoutMutation.checkoutCreate;

    const { data: addResp } = await api.client.checkout.addLines({
      checkoutId: created.id,
      lines: [
        { purchasableId: productIdA, quantity: 1 },
        { purchasableId: productIdB, quantity: 1 },
      ],
    });
    const checkout = (addResp as unknown as {
      checkoutMutation: {
        checkoutLinesAdd: {
          checkout: { id: string; lines: { id: string; purchasableId: string }[] };
        };
      };
    }).checkoutMutation.checkoutLinesAdd.checkout;

    const originalOrder = checkout.lines.map((l) => l.purchasableId);

    const firstLineId = checkout.lines[0].id;
    const orders: string[][] = [];
    for (let q = 2; q < 10; q++) {
      const { data: updResp } = await api.client.checkout.updateLines({
        checkoutId: checkout.id, lines: [{ lineId: firstLineId, quantity: q }]
      });
      const afterUpd = (updResp as unknown as {
        checkoutMutation: { checkoutLinesUpdate: { checkout: { lines: { purchasableId: string }[] } } };
      }).checkoutMutation.checkoutLinesUpdate.checkout;
      orders.push(afterUpd.lines.map((l) => l.purchasableId));
    }

    orders.forEach((ord) => expect(ord).toEqual(originalOrder));
  });
});
