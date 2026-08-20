import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId } from '@utils/globalid';
import { CheckoutStorefrontTestKit, expectSameSnapshot } from './checkout-storefront-test-kit';

test.describe('Storefront checkout creation and reads', () => {
  let kit: CheckoutStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });

  test.afterEach(async () => kit.close());

  test('creates an empty checkout with the requested channel, locale, and currency', async () => {
    const checkout = await kit.created({
      channelCode: 'mobile-app',
      localeCode: 'uk',
      currencyCode: 'EUR',
    });
    expect(checkout).toMatchObject({
      channelCode: 'mobile-app',
      localeCode: 'uk',
      currencyCode: 'EUR',
      totalQuantity: 0,
      lines: [],
      valid: false,
      status: 'OPEN',
    });
    expect(checkout.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'CART_EMPTY', severity: 'ERROR', effect: 'STOP' }),
      ]),
    );
    kit.expectCanonicalMoney(checkout, 'EUR');
  });

  test('creates a checkout with initial lines in one pipeline execution', async () => {
    const purchasableId = await kit.variant({ price: 1_250 });
    const checkout = await kit.created({
      items: [{ purchasableId, quantity: 2, purchase: { type: 'ONE_TIME' } }],
    });
    expect(checkout.lines).toHaveLength(1);
    expect(checkout.lines[0]).toMatchObject({ purchasableId, quantity: 2 });
    expect(checkout.totalQuantity).toBe(2);
    const persisted = await kit.persisted(checkout.id);
    expect(persisted.version).toBe(1);
    expect(persisted.result_revision).toBe(checkout.resultRevision);
  });

  test('creates a checkout with external source and external ID', async () => {
    const checkout = await kit.created({ externalSource: 'marketplace', externalId: 'cart-42' });
    expect(await kit.persisted(checkout.id)).toMatchObject({
      external_source: 'marketplace',
      external_id: 'cart-42',
    });
  });

  test('creates a checkout with initial tag definitions and line assignments', async () => {
    const purchasableId = await kit.variant();
    const checkout = await kit.created({
      tags: [
        { slug: 'gift', unique: false },
        { slug: 'primary', unique: true },
      ],
      items: [{ purchasableId, quantity: 1, tagSlug: 'gift' }],
    });
    expect(checkout.tags.map(({ slug, unique }) => ({ slug, unique }))).toEqual([
      { slug: 'gift', unique: false },
      { slug: 'primary', unique: true },
    ]);
    expect(checkout.lines[0]?.tag).toMatchObject({ slug: 'gift', unique: false });
  });

  test('rejects a non-variant global ID as purchasableId', async () => {
    const payload = await kit.create({
      items: [{ purchasableId: kit.id('Product'), quantity: 1 }],
    });
    kit.expectUserError(payload, /PURCHASABLE|GLOBAL_ID|MERCHANDISE/);
  });

  test('rejects an invalid purchase configuration', async () => {
    const purchasableId = await kit.variant();
    const response = await kit.graphql<unknown>(
      `mutation InvalidPurchase($input: CheckoutCreateInput!) {
        checkoutCreate(input: $input) { checkout { id } userErrors { code } }
      }`,
      {
        input: {
          channelCode: 'online-store',
          localeCode: 'en',
          currencyCode: 'USD',
          items: [
            {
              purchasableId,
              quantity: 1,
              purchase: { type: 'ONE_TIME', sellingPlanId: kit.id('SellingPlan') },
            },
          ],
        },
      },
    );
    expect(response.data ?? null).toBeNull();
    expect(response.errors?.[0]?.message).toMatch(/sellingPlanId|not defined/iu);
  });

  test('reads the committed checkout snapshot after creation', async () => {
    const created = await kit.created();
    expect(await kit.read(created.id)).toEqual(created);
  });

  test('does not expose a checkout to a different storefront visitor', async () => {
    const checkout = await kit.created();
    expect(await kit.read(checkout.id, { visitorId: `visitor-${crypto.randomUUID()}` })).toBeNull();
  });

  test('does not expose a checkout to a different storefront connection', async () => {
    const checkout = await kit.created();
    const second = await kit.headless.create('Second checkout storefront');
    expect(second.userErrors).toEqual([]);
    expect(second.initialStorefrontCredentials).not.toBeNull();
    expect(
      await kit.read(checkout.id, {
        token: second.initialStorefrontCredentials!.publicAccessToken,
        visitorId: kit.visitorId,
      }),
    ).toBeNull();
  });

  test('rejects malformed or wrong-type global IDs without disclosing checkout existence', async () => {
    const checkout = await kit.created();
    const malformed = await kit.graphql<{ checkout: null }>(
      'query Checkout($id: ID!) { checkout(id: $id) { id } }',
      { id: 'not-a-global-id' },
    );
    const wrongType = await kit.graphql<{ checkout: null }>(
      'query Checkout($id: ID!) { checkout(id: $id) { id } }',
      { id: composeGlobalId('ProductVariant', kit.rawId(checkout.id)) },
    );
    expect(malformed.data?.checkout ?? null).toBeNull();
    expect(wrongType.data?.checkout ?? null).toBeNull();
    expect(malformed.errors?.[0]?.extensions?.code).toBe(wrongType.errors?.[0]?.extensions?.code);
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('returns ordered issues, notifications, lines, groups, and methods from the committed snapshot', async () => {
    const first = await kit.variant({ title: 'First line' });
    const second = await kit.variant({ title: 'Second line' });
    const checkout = await kit.created({
      items: [
        { purchasableId: first, quantity: 1 },
        { purchasableId: second, quantity: 1 },
      ],
    });
    const read = await kit.read(checkout.id);
    expect(read).not.toBeNull();
    expect(read!.lines.map(({ id }) => id)).toEqual(checkout.lines.map(({ id }) => id));
    expect(read!.issues).toEqual(checkout.issues);
    expect(read!.notifications).toEqual(checkout.notifications);
    expect(read!.deliveryGroups).toEqual(checkout.deliveryGroups);
    expect(read!.payment.methods).toEqual(checkout.payment.methods);
    expectSameSnapshot(checkout, read!);
  });
});
