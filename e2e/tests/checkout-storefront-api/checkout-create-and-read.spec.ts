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
    const stages = [
      'pricing.calculateCheckoutPreliminaryQuote',
      'delivery.calculateCheckoutDeliveryOptions',
      'pricing.finalizeCheckoutPricingQuote',
      'payments.getCheckoutAvailablePaymentMethods',
    ];
    const checkout = await kit.withActionOverrides(
      stages.map((action) => ({ action, mode: 'PASS' as const })),
      async () => {
        const result = await kit.created({
          items: [{ purchasableId, quantity: 2, purchase: { type: 'ONE_TIME' } }],
        });
        for (const action of stages) expect(await kit.actionCalls(action)).toBe(1);
        return result;
      },
    );
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
    kit.expectUserError(payload, 'BAD_USER_INPUT');
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
    expect(response.errors).toHaveLength(1);
    expect(response.errors?.[0]?.extensions?.code).toBe('GRAPHQL_VALIDATION_FAILED');
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
    expect(malformed.errors).toHaveLength(1);
    expect(wrongType.errors).toHaveLength(1);
    expect(malformed.errors?.[0]?.extensions?.code).toBeDefined();
    expect(malformed.errors?.[0]?.extensions?.code).toBe(wrongType.errors?.[0]?.extensions?.code);
    kit.expectSafe({ malformed: malformed.errors, wrongType: wrongType.errors });
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('returns populated collections in stable committed order across reads', async () => {
    await kit.configureDelivery({ methodTypes: ['SHIPPING', 'PICK_UP'] });
    await kit.configurePaymentProvider(['card-3ds', 'bank-transfer', 'card']);
    const first = await kit.variant({ title: 'First line', requiresShipping: true, stock: 2 });
    const second = await kit.variant({ title: 'Second line', requiresShipping: true });
    const created = await kit.created({
      items: [
        { purchasableId: first, quantity: 3 },
        { purchasableId: second, quantity: 1 },
      ],
    });
    const checkout = kit.expectSuccess(
      await kit.mutation(
        'checkoutDeliveryAddressesAdd',
        'CheckoutDeliveryAddressesAddInput',
        {
          checkoutId: created.id,
          addresses: created.lines.map((line, index) => ({
            checkoutLineIds: [line.id],
            address: {
              firstName: index === 0 ? 'Ada' : 'Grace',
              lastName: 'Tester',
              address1: `${index + 1} Test Street`,
              city: 'Kyiv',
              countryCode: 'UA',
              provinceCode: '30',
              zip: '01001',
              phone: '+380501234567',
            },
          })),
        },
      ),
    );
    const read = await kit.read(checkout.id);
    expect(read).not.toBeNull();
    expect(checkout.lines.map(({ purchasableId }) => purchasableId)).toEqual([first, second]);
    expect(checkout.lines.map(({ quantity }) => quantity)).toEqual([2, 1]);
    expect(checkout.notifications.map(({ code }) => code)).toContain('NOT_ENOUGH_STOCK');
    expect(
      checkout.deliveryGroups.map(({ checkoutLines }) => checkoutLines.map(({ id }) => id)),
    ).toEqual(checkout.lines.map(({ id }) => [id]));
    expect(checkout.payment.methods.map(({ code }) => code)).toEqual([
      'test-stripe-bank-transfer',
      'test-stripe-card',
      'test-stripe-card-3ds',
    ]);
    expect(read!.lines.map(({ id }) => id)).toEqual(checkout.lines.map(({ id }) => id));
    expect(read!.issues).toEqual(checkout.issues);
    expect(read!.notifications).toEqual(checkout.notifications);
    expect(read!.deliveryGroups).toEqual(checkout.deliveryGroups);
    expect(read!.payment.methods).toEqual(checkout.payment.methods);
    expectSameSnapshot(checkout, read!);
  });
});
