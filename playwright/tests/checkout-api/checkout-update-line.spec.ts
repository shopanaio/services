import { EntityStatus } from '@codegen/admin-gql';
import { ApiCheckoutLine, CurrencyCode } from '@codegen/client-gql';
import { test } from '@fixtures/api/api';
import { expect } from '@playwright/test';
import * as yup from 'yup';

test.describe('checkout-api: lines update', () => {
  test('should create checkout, add two lines, update both and validate totals', async ({
    api,
  }) => {
    await test.step('setup client (tenant, project, apiKey) and customer scope', async () => {
      await api.session.setupClient();
      api.session.setCustomerScope();
    });

    let checkoutId = '';
    let purchasableId = '';
    let purchasableId2 = '';
    let lineId = '';
    let lineId2 = '';

    await test.step('create empty checkout', async () => {
      const { data } = await api.client.checkout.create({
        localeCode: 'en',
        currencyCode: CurrencyCode.Usd,
        items: [],
      });

      checkoutId = data.checkoutMutation.checkoutCreate.id;
      expect(checkoutId).toBeTruthy();
    });

    await test.step('seed two product variants and get purchasableIds', async () => {
      api.session.setTenantScope();
      const handle1 = `test-product-update-1-${Date.now()}`;
      await api.admin.product.create({
        input: {
          title: 'Update Line Product 1',
          status: EntityStatus.Published,
          slug: handle1,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Variant 1',
                slug: handle1,
                price: 23456,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-ULP-1',
              }),
            ],
          },
        },
      });

      const handle2 = `test-product-update-2-${Date.now()}`;
      await api.admin.product.create({
        input: {
          title: 'Update Line Product 2',
          status: EntityStatus.Published,
          slug: handle2,
          groups: [],
          requiresShipping: true,
          tags: [],
          variants: {
            create: [
              api.admin.product.getDefaultVariantInput({
                title: 'Variant 2',
                slug: handle2,
                price: 34567,
                stockStatus: 'IN_STOCK',
                inListing: true,
                variantSortIndex: 0,
                sku: 'SKU-ULP-2',
              }),
            ],
          },
        },
      });

      // Fetch products from client API to get correct purchasable IDs (base64 encoded)
      api.session.setCustomerScope();
      const variant1 = await api.client.variant.get(handle1);
      const variant2 = await api.client.variant.get(handle2);

      purchasableId = variant1.id as string;
      purchasableId2 = variant2.id as string;

      expect(purchasableId).toBeTruthy();
      expect(purchasableId2).toBeTruthy();
    });

    await test.step('add two lines to checkout (qty: 2 and 3)', async () => {
      api.session.setCustomerScope();
      const { data } = await api.client.checkout.addLines({
        checkoutId,
        lines: [
          {
            purchasableId,
            quantity: 2,
          },
          {
            purchasableId: purchasableId2,
            quantity: 3,
          },
        ],
      });

      const addedCheckout = data.checkoutMutation.checkoutLinesAdd.checkout;
      expect(addedCheckout).toMatchSchema(
        yup
          .object({
            lines: yup.array().min(2).max(2).required(),
            totalQuantity: yup.number().equals([5]).required(),
          })
          .required(),
      );

      type AddedLine = { id: string; purchasableId: string };
      const addedLines = (addedCheckout?.lines ?? []) as AddedLine[];
      lineId = addedLines.find((l) => l.purchasableId === purchasableId)?.id || '';
      lineId2 = addedLines.find((l) => l.purchasableId === purchasableId2)?.id || '';
      expect(lineId).toBeTruthy();
      expect(lineId2).toBeTruthy();
    });

    await test.step('update both line quantities to 5 and 7', async () => {
      const { data } = await api.client.checkout.updateLines({
        checkoutId,
        lines: [
          {
            lineId,
            quantity: 5,
          },
          {
            lineId: lineId2,
            quantity: 7,
          },
        ],
      });

      const updatedCheckout = data.checkoutMutation.checkoutLinesUpdate.checkout;
      expect(updatedCheckout).toMatchSchema(
        yup
          .object({
            lines: yup.array().min(2).max(2).required(),
            totalQuantity: yup.number().equals([12]).required(),
          })
          .required(),
      );
    });

    await test.step('read checkout by id and validate updated lines and overall cost', async () => {
      const { data } = await api.client.checkout.readFull(checkoutId);

      const checkout = data.checkoutQuery.checkout;
      const lines = checkout?.lines as ApiCheckoutLine[];
      const line1 = lines.find((l) => l.id === lineId) as ApiCheckoutLine;
      const line2 = lines.find((l) => l.id === lineId2) as ApiCheckoutLine;

      const moneySchema = yup
        .object({
          currencyCode: yup.string().equals(['USD']).required(),
          amount: yup.number().required(),
        })
        .required();

      const unitAmount1 = line1.cost.unitPrice.amount;
      const unitAmount2 = line2.cost.unitPrice.amount;
      const expectedLine1TotalRounded = Math.round((unitAmount1 * 5 + Number.EPSILON) * 100) / 100;
      const expectedLine2TotalRounded = Math.round((unitAmount2 * 7 + Number.EPSILON) * 100) / 100;
      const expectedCheckoutTotalRounded =
        Math.round((expectedLine1TotalRounded + expectedLine2TotalRounded + Number.EPSILON) * 100) /
        100;

      const lineSchema1 = yup
        .object({
          id: yup.string().equals([lineId]).required(),
          purchasableId: yup.string().equals([purchasableId]).required(),
          quantity: yup.number().equals([5]).required(),
          title: yup.string().required(),
          sku: yup.string().equals(['SKU-ULP-1']).required(),
          cost: yup
            .object({
              unitPrice: moneySchema,
              totalAmount: yup
                .object({
                  currencyCode: yup.string().equals(['USD']).required(),
                  amount: yup.number().equals([expectedLine1TotalRounded]).required(),
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

      const lineSchema2 = yup
        .object({
          id: yup.string().equals([lineId2]).required(),
          purchasableId: yup.string().equals([purchasableId2]).required(),
          quantity: yup.number().equals([7]).required(),
          title: yup.string().required(),
          sku: yup.string().equals(['SKU-ULP-2']).required(),
          cost: yup
            .object({
              unitPrice: moneySchema,
              totalAmount: yup
                .object({
                  currencyCode: yup.string().equals(['USD']).required(),
                  amount: yup.number().equals([expectedLine2TotalRounded]).required(),
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

      expect(line1).toMatchSchema(lineSchema1);
      expect(line2).toMatchSchema(lineSchema2);

      expect(checkout).toMatchSchema(
        yup.object({
          id: yup.string().equals([checkoutId]).required(),
          totalQuantity: yup.number().equals([12]).required(),
          cost: yup
            .object({
              subtotalAmount: yup
                .object({
                  currencyCode: yup.string().equals(['USD']).required(),
                  amount: yup.number().equals([expectedCheckoutTotalRounded]).required(),
                })
                .required(),
              totalAmount: yup
                .object({
                  currencyCode: yup.string().equals(['USD']).required(),
                  amount: yup.number().equals([expectedCheckoutTotalRounded]).required(),
                })
                .required(),
            })
            .required(),
          lines: yup.array().min(2).max(2).required(),
        }),
      );
      if (!checkout) {
        throw new Error('checkout is null');
      }
      expect(checkout.cost.totalAmount.amount).toBe(expectedCheckoutTotalRounded);
    });
  });
});
