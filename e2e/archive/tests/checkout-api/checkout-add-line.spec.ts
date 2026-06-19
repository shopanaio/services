
import type { ApiCheckoutLine, ApiProductVariant } from '@codegen/client-gql';

import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';
import * as yup from 'yup';

test.describe('checkout-api: lines add', () => {
  test('should create checkout and add one line with full verification and snapshot', async ({
    api,
  }) => {
    await test.step('setup client (tenant, project, apiKey) and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableSlug = '';

    await test.step('create empty checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: 'USD',
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('seed product variant and get purchasableId', async () => {
      api.session.setTenantScope();
      const handle = `test-product-${Date.now()}`;
      const product = await api.admin.product.create({
        input: {
          title: 'Add Line Product',
          status: 'PUBLISHED',
          slug: handle,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Variant',
                slug: handle,
                price: 12345,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-ALP-1',
              }),
            ],
          },
        },
      });
      purchasableSlug = product.variants[0].slug as string;
      expect(purchasableSlug).toBeTruthy();
    });

    let variant: ApiProductVariant;

    await test.step('add one line to checkout', async () => {
      api.session.setCustomerScope();
      variant = await api.client.variant.get(purchasableSlug);
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [
          {
            purchasableId: variant.id,
            quantity: 2,
          },
        ],
      });

      const addedCheckout = data.checkoutMutation.checkoutLinesAdd.checkout;
      expect(addedCheckout).toMatchSchema(
        yup
          .object({
            lines: yup.array().min(1).max(1).required(),
            totalQuantity: yup.number().equals([2]).required(),
          })
          .required(),
      );
    });

    await test.step('read checkout by id with full fields and validate line item', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const checkout = data.checkoutQuery.checkout;
      const line = checkout?.lines[0] as ApiCheckoutLine;

      const moneySchema = yup
        .object({
          currencyCode: yup.string().equals(['USD']).required(),
          amount: yup.number().required(),
        })
        .required();

      const unitAmount = line.cost.unitPrice.amount;
      const expectedTotalRounded = Math.round((unitAmount * 2 + Number.EPSILON) * 100) / 100;

      const lineSchema = yup
        .object({
          id: yup.string().required(),
          purchasableId: yup.string().equals([variant.id]).required(),
          quantity: yup.number().equals([2]).required(),
          title: yup.string().required(),
          sku: yup.string().equals(['SKU-ALP-1']).required(),
          cost: yup
            .object({
              unitPrice: moneySchema,
              totalAmount: yup
                .object({
                  currencyCode: yup.string().equals(['USD']).required(),
                  amount: yup.number().equals([expectedTotalRounded]).required(),
                })
                .required(),
              subtotalAmount: moneySchema,
              discountAmount: moneySchema,
              taxAmount: moneySchema,
              compareAtUnitPrice: moneySchema,
            })
            .required(),
          imageSrc: yup.string().nullable(),
          purchasableSnapshot: yup.mixed().nullable(),
        })
        .required();

      expect(line).toMatchSchema(lineSchema);

      expect(checkout).toMatchSchema(
        yup.object({
          id: yup.string().equals([checkoutId]).required(),
          totalQuantity: yup.number().equals([2]).required(),
          cost: yup
            .object({
              subtotalAmount: moneySchema,
              totalAmount: yup
                .object({
                  currencyCode: yup.string().equals(['USD']).required(),
                  amount: yup.number().equals([expectedTotalRounded]).required(),
                })
                .required(),
            })
            .required(),
          lines: yup.array().min(1).max(1).required(),
        }),
      );
    });
  });
});
