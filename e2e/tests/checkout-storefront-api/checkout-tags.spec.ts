import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { CheckoutStorefrontTestKit } from './checkout-storefront-test-kit';

test.describe('Storefront checkout tags', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('creates a checkout tag after checkout creation', async () => {
    const checkout = await kit.created();
    const after = kit.expectSuccess(await createTag(kit, checkout.id, 'gift', false));
    expect(after.tags).toHaveLength(1);
    expect(after.tags[0]).toMatchObject({ slug: 'gift', unique: false });
    expect(after.tags[0]?.id).toEqual(expect.any(String));
  });

  test('updates a checkout tag slug and uniqueness setting', async () => {
    const checkout = await kit.created({ tags: [{ slug: 'old', unique: false }] });
    const after = kit.expectSuccess(
      await kit.mutation('checkoutTagUpdate', 'CheckoutTagUpdateInput', {
        checkoutId: checkout.id,
        tagId: checkout.tags[0]!.id,
        slug: 'new',
        unique: true,
      }),
    );
    expect(after.tags[0]).toMatchObject({ id: checkout.tags[0]!.id, slug: 'new', unique: true });
  });

  test('deletes a tag and atomically clears its line assignments', async () => {
    const variant = await kit.variant();
    const checkout = await kit.created({
      tags: [{ slug: 'gift', unique: false }],
      items: [{ purchasableId: variant, quantity: 1, tagSlug: 'gift' }],
    });
    const after = kit.expectSuccess(
      await kit.mutation('checkoutTagDelete', 'CheckoutTagDeleteInput', {
        checkoutId: checkout.id,
        tagId: checkout.tags[0]!.id,
      }),
    );
    expect(after.tags).toEqual([]);
    expect(after.lines[0]?.tag).toBeNull();
    expect(after.resultRevision).toBe(checkout.resultRevision);
  });

  test('allows non-unique tags on multiple lines', async () => {
    const [first, second] = await Promise.all([kit.variant(), kit.variant()]);
    const checkout = await kit.created({
      tags: [{ slug: 'gift', unique: false }],
      items: [
        { purchasableId: first, quantity: 1, tagSlug: 'gift' },
        { purchasableId: second, quantity: 1, tagSlug: 'gift' },
      ],
    });
    expect(checkout.lines.map(({ tag }) => tag?.slug)).toEqual(['gift', 'gift']);
  });

  test('enforces unique tags across checkout lines', async () => {
    const [first, second] = await Promise.all([kit.variant(), kit.variant()]);
    const payload = await kit.create({
      tags: [{ slug: 'primary', unique: true }],
      items: [
        { purchasableId: first, quantity: 1, tagSlug: 'primary' },
        { purchasableId: second, quantity: 1, tagSlug: 'primary' },
      ],
    });
    kit.expectUserError(payload, 'CHECKOUT_TAG_UNIQUENESS_CONFLICT');
  });

  test('rejects making a tag unique while assigned to multiple lines', async () => {
    const [first, second] = await Promise.all([kit.variant(), kit.variant()]);
    const checkout = await kit.created({
      tags: [{ slug: 'gift', unique: false }],
      items: [
        { purchasableId: first, quantity: 1, tagSlug: 'gift' },
        { purchasableId: second, quantity: 1, tagSlug: 'gift' },
      ],
    });
    const payload = await kit.mutation('checkoutTagUpdate', 'CheckoutTagUpdateInput', {
      checkoutId: checkout.id,
      tagId: checkout.tags[0]!.id,
      unique: true,
    });
    kit.expectUserError(payload, 'CHECKOUT_TAG_UNIQUENESS_CONFLICT');
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('rejects duplicate or invalid tag slugs', async () => {
    const checkout = await kit.created({ tags: [{ slug: 'gift', unique: false }] });
    for (const [slug, expectedCode] of [
      ['gift', 'CHECKOUT_TAG_ALREADY_EXISTS'],
      ['not valid!', 'BAD_USER_INPUT'],
    ] as const) {
      const payload = await createTag(kit, checkout.id, slug, false);
      kit.expectUserError(payload, expectedCode);
      expect(await kit.read(checkout.id)).toEqual(checkout);
    }
  });

  test('rejects an unknown tag slug while adding initial or subsequent checkout lines', async () => {
    const variant = await kit.variant();
    kit.expectUserError(
      await kit.create({
        items: [{ purchasableId: variant, quantity: 1, tagSlug: 'missing' }],
      }),
      'CHECKOUT_TAG_NOT_FOUND',
    );
    const checkout = await kit.created();
    const payload = await kit.mutation('checkoutLinesAdd', 'CheckoutLinesAddInput', {
      checkoutId: checkout.id,
      lines: [{ purchasableId: variant, quantity: 1, tagSlug: 'missing' }],
    });
    kit.expectUserError(payload, 'CHECKOUT_TAG_NOT_FOUND');
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('preserves tag definitions while clearing lines and removes only their assignments', async () => {
    const variant = await kit.variant();
    const checkout = await kit.created({
      tags: [{ slug: 'gift', unique: false }],
      items: [{ purchasableId: variant, quantity: 1, tagSlug: 'gift' }],
    });
    const cleared = kit.expectSuccess(
      await kit.mutation('checkoutLinesClear', 'CheckoutLinesClearInput', {
        checkoutId: checkout.id,
      }),
    );
    expect(cleared.lines).toEqual([]);
    expect(cleared.tags).toEqual(checkout.tags);
  });

  test('keeps an unchanged tag update from changing checkout or result revisions', async () => {
    const checkout = await kit.created({ tags: [{ slug: 'gift', unique: false }] });
    const rowBefore = await kit.persisted(checkout.id);
    const after = kit.expectSuccess(
      await kit.mutation('checkoutTagUpdate', 'CheckoutTagUpdateInput', {
        checkoutId: checkout.id,
        tagId: checkout.tags[0]!.id,
        slug: 'gift',
        unique: false,
      }),
    );
    const rowAfter = await kit.persisted(checkout.id);
    expect(after.resultRevision).toBe(checkout.resultRevision);
    expect(rowAfter.version).toBe(rowBefore.version);
  });
});

function createTag(
  kit: CheckoutStorefrontTestKit,
  checkoutId: string,
  slug: string,
  unique: boolean,
) {
  return kit.mutation('checkoutTagCreate', 'CheckoutTagCreateInput', {
    checkoutId,
    tag: { slug, unique },
  });
}
