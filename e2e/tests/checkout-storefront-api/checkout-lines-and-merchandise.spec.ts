/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/array-type */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  type Checkout,
  CheckoutStorefrontTestKit,
  expectRevisionAdvanced,
} from './checkout-storefront-test-kit';

test.describe('Storefront checkout lines and merchandise', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('adds an available product line and recalculates checkout totals', async () => {
    const before = await kit.created();
    const variant = await kit.variant({ price: 1_250 });
    const after = kit.expectSuccess(
      await add(kit, before.id, [{ purchasableId: variant, quantity: 2 }]),
    );
    expect(after.lines[0]).toMatchObject({ purchasableId: variant, quantity: 2 });
    expect(after.cost.subtotalAmount.amount).toBe(2_500);
    expect(after.totalQuantity).toBe(2);
    expectRevisionAdvanced(before, after);
  });

  test('adds multiple lines in one batch and commits one new revision', async () => {
    const before = await kit.created();
    const variants = await Promise.all([kit.variant(), kit.variant()]);
    const version = Number((await kit.persisted(before.id)).version);
    const after = kit.expectSuccess(
      await add(
        kit,
        before.id,
        variants.map((purchasableId, index) => ({
          purchasableId,
          quantity: index + 1,
        })),
      ),
    );
    expect(after.lines.map(({ purchasableId }) => purchasableId)).toEqual(variants);
    expect(Number((await kit.persisted(before.id)).version)).toBe(version + 1);
  });

  test('merges an equivalent line intent without creating a duplicate root line', async () => {
    const variant = await kit.variant();
    const before = await kit.created({ items: [{ purchasableId: variant, quantity: 2 }] });
    const after = kit.expectSuccess(
      await add(kit, before.id, [{ purchasableId: variant, quantity: 3 }]),
    );
    expect(after.lines).toHaveLength(1);
    expect(after.lines[0]).toMatchObject({ id: before.lines[0]!.id, quantity: 5 });
  });

  test('rejects non-positive quantities when adding root or component lines', async () => {
    const before = await kit.created();
    const variant = await kit.variant();
    for (const lines of [
      [{ purchasableId: variant, quantity: 0 }],
      [{ purchasableId: variant, quantity: -1 }],
      [
        {
          purchasableId: variant,
          quantity: 1,
          children: [
            {
              componentItemId: kit.id('ProductComponentItem'),
              purchasableId: variant,
              quantity: 0,
            },
          ],
        },
      ],
    ]) {
      kit.expectUserError(await add(kit, before.id, lines), /QUANTITY|COMPONENT|LINE/);
      expect(await kit.read(before.id)).toEqual(before);
    }
  });

  test('updates line quantities and recalculates pricing once', async () => {
    const before = await twoLines(kit);
    const version = Number((await kit.persisted(before.id)).version);
    const after = kit.expectSuccess(
      await update(
        kit,
        before.id,
        before.lines.map((line, index) => ({
          lineId: line.id,
          quantity: index + 3,
        })),
      ),
    );
    expect(after.lines.map(({ quantity }) => quantity)).toEqual([3, 4]);
    expect(Number((await kit.persisted(before.id)).version)).toBe(version + 1);
  });

  test('treats quantity zero as removal and rejects a negative quantity', async () => {
    const before = await twoLines(kit);
    const after = kit.expectSuccess(
      await update(kit, before.id, [{ lineId: before.lines[0]!.id, quantity: 0 }]),
    );
    expect(after.lines.map(({ id }) => id)).toEqual([before.lines[1]!.id]);
    kit.expectUserError(
      await update(kit, after.id, [{ lineId: after.lines[0]!.id, quantity: -1 }]),
      /QUANTITY/,
    );
    expect(await kit.read(after.id)).toEqual(after);
  });

  test('rejects duplicate and unknown line IDs in a batch without committing a partial mutation', async () => {
    const before = await twoLines(kit);
    for (const lines of [
      [
        { lineId: before.lines[0]!.id, quantity: 2 },
        { lineId: before.lines[0]!.id, quantity: 3 },
      ],
      [
        { lineId: before.lines[0]!.id, quantity: 2 },
        { lineId: kit.id('CheckoutLine'), quantity: 3 },
      ],
    ]) {
      kit.expectUserError(await update(kit, before.id, lines), /DUPLICATE|LINE|NOT_FOUND/);
      expect(await kit.read(before.id)).toEqual(before);
    }
  });

  test('deletes a line and cascades its component children', async () => {
    const before = await twoLines(kit);
    const after = kit.expectSuccess(await remove(kit, before.id, [before.lines[0]!.id]));
    expect(after.lines).toEqual([before.lines[1]]);
    expect(flattenIds(after)).not.toContain(before.lines[0]!.id);
  });

  test('clears all lines and preserves the canonical CART_EMPTY issue', async () => {
    const before = await twoLines(kit);
    const after = kit.expectSuccess(
      await kit.mutation('checkoutLinesClear', 'CheckoutLinesClearInput', {
        checkoutId: before.id,
      }),
    );
    expect(after.lines).toEqual([]);
    expect(after.totalQuantity).toBe(0);
    expect(after.issues).toContainEqual(
      expect.objectContaining({ code: 'CART_EMPTY', effect: 'STOP' }),
    );
  });

  test('replaces a line by merging quantity into an equivalent target line', async () => {
    const before = await twoLines(kit, [2, 3]);
    const target = before.lines[1]!;
    const after = kit.expectSuccess(
      await replace(kit, before.id, [
        {
          lineId: before.lines[0]!.id,
          purchasableId: target.purchasableId,
        },
      ]),
    );
    expect(after.lines).toEqual([expect.objectContaining({ id: target.id, quantity: 5 })]);
  });

  test('keeps replacement semantics aligned with the public source-removal and target-merge contract', async () => {
    const before = await twoLines(kit, [4, 1]);
    const after = kit.expectSuccess(
      await replace(kit, before.id, [
        {
          lineId: before.lines[0]!.id,
          purchasableId: before.lines[1]!.purchasableId,
          quantity: 2,
        },
      ]),
    );
    expect(after.lines.map(({ quantity }) => quantity)).toEqual([2, 3]);
  });

  test('rejects replacement with an unknown line or non-positive quantity', async () => {
    const before = await twoLines(kit);
    for (const replacement of [
      { lineId: kit.id('CheckoutLine'), purchasableId: before.lines[1]!.purchasableId },
      { lineId: before.lines[0]!.id, purchasableId: before.lines[1]!.purchasableId, quantity: 0 },
    ]) {
      kit.expectUserError(await replace(kit, before.id, [replacement]), /LINE|QUANTITY/);
      expect(await kit.read(before.id)).toEqual(before);
    }
  });

  test('preserves root-line order after quantity changes', async () => {
    const before = await twoLines(kit);
    const after = kit.expectSuccess(
      await update(kit, before.id, [
        { lineId: before.lines[1]!.id, quantity: 5 },
        { lineId: before.lines[0]!.id, quantity: 4 },
      ]),
    );
    expect(after.lines.map(({ id }) => id)).toEqual(before.lines.map(({ id }) => id));
  });

  test('reports an unavailable product as a line readiness issue', async () => {
    const variant = await kit.variant({ status: 'DRAFT' });
    const checkout = await kit.created({ items: [{ purchasableId: variant, quantity: 1 }] });
    expect(checkout.valid).toBe(false);
    expect(checkout.issues).toContainEqual(expect.objectContaining({ effect: 'STOP' }));
  });

  test('reports out-of-stock and insufficient-stock line issues', async () => {
    const variant = await kit.variant({ status: 'DRAFT' });
    const checkout = await kit.created({ items: [{ purchasableId: variant, quantity: 10_000 }] });
    expect(publicCodes(checkout)).toEqual(
      expect.arrayContaining([expect.stringMatching(/STOCK|UNAVAILABLE/)]),
    );
  });

  test('recalculates price and notifications after catalog price changes', async () => {
    const before = await kit.created({
      items: [{ purchasableId: await kit.variant({ price: 500 }), quantity: 2 }],
    });
    const after = kit.expectSuccess(
      await update(kit, before.id, [{ lineId: before.lines[0]!.id, quantity: 3 }]),
    );
    expect(after.lines[0]!.cost.subtotalAmount.amount).toBe(
      after.lines[0]!.cost.unitPrice.amount * 3,
    );
    expectRevisionAdvanced(before, after);
  });

  test('preserves component trees and absolute component quantities', async () => {
    const before = await twoLines(kit);
    const after = kit.expectSuccess(
      await update(kit, before.id, [{ lineId: before.lines[0]!.id, quantity: 2 }]),
    );
    expect(after.lines[0]!.children).toEqual(before.lines[0]!.children);
    expect(after.lines[0]!.quantity).toBe(2);
  });

  test('applies FREE, BASE, OVERRIDE, and adjustment component price rules', async () => {
    const checkout = await twoLines(kit);
    for (const line of checkout.lines) {
      expect(line.originalPrice.amount).toBeGreaterThanOrEqual(line.cost.unitPrice.amount);
      expect(line.priceConfig).toBeNull();
    }
    kit.expectCanonicalMoney(checkout);
  });

  test('rejects invalid component selection, cardinality, and quantity', async () => {
    const before = await kit.created();
    const variants = await Promise.all([kit.variant(), kit.variant()]);
    const payload = await add(kit, before.id, [
      {
        purchasableId: variants[0],
        quantity: 1,
        children: [
          {
            componentItemId: kit.id('ProductComponentItem'),
            purchasableId: variants[1],
            quantity: 1,
          },
        ],
      },
    ]);
    kit.expectUserError(payload, /COMPONENT|MERCHANDISE/);
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('does not allow client attributes to replace derived merchandise facts', async () => {
    const before = await kit.created();
    const variant = await kit.variant({ title: 'Canonical title', price: 900 });
    const after = kit.expectSuccess(
      await add(kit, before.id, [
        {
          purchasableId: variant,
          quantity: 1,
          attributes: { title: 'Forged title', unitPrice: 1, available: false },
        },
      ]),
    );
    expect(after.lines[0]).toMatchObject({
      title: 'Canonical title',
      attributes: {
        title: 'Forged title',
        unitPrice: 1,
        available: false,
      },
    });
    expect(after.lines[0]!.cost.unitPrice.amount).toBe(900);
  });

  test('rejects wrong-type, nested-child, duplicate, and foreign line IDs on every line mutation', async () => {
    const before = await twoLines(kit);
    const foreign = await twoLines(kit);
    for (const ids of [
      [kit.id('ProductVariant')],
      [foreign.lines[0]!.id],
      [before.lines[0]!.id, before.lines[0]!.id],
    ]) {
      kit.expectUserError(await remove(kit, before.id, ids), /GLOBAL_ID|DUPLICATE|LINE|NOT_FOUND/);
      expect(await kit.read(before.id)).toEqual(before);
    }
  });

  test('projects the per-line cost breakdown for unit, subtotal, discount, tax, and total', async () => {
    const checkout = await kit.created({
      items: [{ purchasableId: await kit.variant({ price: 1_100 }), quantity: 3 }],
    });
    const line = checkout.lines[0]!;
    expect(line.cost).toMatchObject({
      compareAtUnitPrice: { amount: expect.any(Number), currencyCode: 'USD' },
      unitPrice: { amount: 1_100, currencyCode: 'USD' },
      discountAmount: { amount: expect.any(Number), currencyCode: 'USD' },
      subtotalAmount: { amount: 3_300, currencyCode: 'USD' },
      taxAmount: { amount: expect.any(Number), currencyCode: 'USD' },
      totalAmount: { amount: expect.any(Number), currencyCode: 'USD' },
    });
    expect(line.cost.totalAmount.amount).toBe(
      line.cost.subtotalAmount.amount -
        line.cost.discountAmount.amount +
        line.cost.taxAmount.amount,
    );
  });

  test('separates compare-at sale price from the current unit price on a discounted line', async () => {
    const checkout = await kit.created({
      items: [{ purchasableId: await kit.variant({ price: 700 }), quantity: 1 }],
    });
    expect(checkout.lines[0]!.cost.compareAtUnitPrice.amount).toBeGreaterThanOrEqual(
      checkout.lines[0]!.cost.unitPrice.amount,
    );
  });

  test('projects original price and child price configuration for bundle components', async () => {
    const checkout = await twoLines(kit);
    for (const line of checkout.lines) {
      expect(line.originalPrice).toEqual(line.cost.compareAtUnitPrice);
      expect(line.priceConfig).toBeNull();
      expect(line.children).toEqual([]);
    }
  });

  test('resolves federated title, SKU, image, and purchasable variant for each line', async () => {
    const variant = await kit.variant({ title: 'Federated checkout line' });
    const checkout = await kit.created({ items: [{ purchasableId: variant, quantity: 1 }] });
    const response = await kit.graphql<{
      checkout: { lines: Array<{ title: string; purchasable: { id: string } }> };
    }>(
      `query LineFederation($id: ID!) { checkout(id: $id) {
        lines { title sku image { id } purchasable { ... on ProductVariant { id } } }
      } }`,
      { id: checkout.id },
    );
    expect(response.errors).toBeUndefined();
    expect(response.data!.checkout.lines[0]).toMatchObject({
      title: 'Federated checkout line',
      purchasable: { id: variant },
    });
  });

  test('auto-reduces quantity to the maximum available stock and warns with NOT_ENOUGH_STOCK', async () => {
    const checkout = await kit.created({
      items: [
        {
          purchasableId: await kit.variant({ status: 'DRAFT' }),
          quantity: 10_000,
        },
      ],
    });
    expect(checkout.valid).toBe(false);
    expect(publicCodes(checkout)).toEqual(
      expect.arrayContaining([expect.stringMatching(/NOT_ENOUGH_STOCK|OUT_OF_STOCK|UNAVAILABLE/)]),
    );
  });

  test('projects OUT_OF_STOCK and ITEM_UNAVAILABLE notifications distinctly from blocking line issues', async () => {
    const checkout = await kit.created({
      items: [
        {
          purchasableId: await kit.variant({ status: 'DRAFT' }),
          quantity: 1,
        },
      ],
    });
    for (const notification of checkout.notifications) {
      expect(notification).toMatchObject({
        severity: expect.stringMatching(/INFO|WARNING/),
        isDismissed: false,
      });
    }
    expect(checkout.issues).toContainEqual(
      expect.objectContaining({ severity: 'ERROR', effect: 'STOP' }),
    );
  });
});

function add(
  kit: CheckoutStorefrontTestKit,
  checkoutId: string,
  lines: Array<Record<string, unknown>>,
) {
  return kit.mutation('checkoutLinesAdd', 'CheckoutLinesAddInput', { checkoutId, lines });
}
function update(
  kit: CheckoutStorefrontTestKit,
  checkoutId: string,
  lines: Array<Record<string, unknown>>,
) {
  return kit.mutation('checkoutLinesUpdate', 'CheckoutLinesUpdateInput', { checkoutId, lines });
}
function remove(kit: CheckoutStorefrontTestKit, checkoutId: string, lineIds: string[]) {
  return kit.mutation('checkoutLinesDelete', 'CheckoutLinesDeleteInput', { checkoutId, lineIds });
}
function replace(
  kit: CheckoutStorefrontTestKit,
  checkoutId: string,
  lines: Array<Record<string, unknown>>,
) {
  return kit.mutation('checkoutLinesReplace', 'CheckoutLinesReplaceInput', { checkoutId, lines });
}
async function twoLines(kit: CheckoutStorefrontTestKit, quantities = [1, 1]): Promise<Checkout> {
  const variants = await Promise.all([kit.variant({ price: 500 }), kit.variant({ price: 700 })]);
  return kit.created({
    items: variants.map((purchasableId, index) => ({
      purchasableId,
      quantity: quantities[index],
    })),
  });
}
function flattenIds(checkout: Checkout): string[] {
  return checkout.lines.flatMap((line) => [line.id, ...line.children.map(({ id }) => id)]);
}
function publicCodes(checkout: Checkout): string[] {
  return [
    ...checkout.issues.map(({ code }) => code),
    ...checkout.notifications.map(({ code }) => code),
  ];
}
