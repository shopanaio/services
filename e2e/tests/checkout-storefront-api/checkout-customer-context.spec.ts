import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  type Checkout,
  CheckoutStorefrontTestKit,
  expectRevisionAdvanced,
} from './checkout-storefront-test-kit';

test.describe('Storefront checkout customer and context', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('updates customer identity and refreshes buyer eligibility', async () => {
    const before = await kit.created();
    const after = await kit.withActionOverrides(
      [{ action: 'customers.resolveCheckoutBuyerEligibility', mode: 'PASS' }],
      async () => {
        const result = kit.expectSuccess(
          await identity(kit, before.id, {
            email: 'buyer@example.test',
            phone: '+380501234567',
            countryCode: 'UA',
            firstName: 'Ada',
            lastName: 'Lovelace',
          }),
        );
        expect(await kit.actionCalls('customers.resolveCheckoutBuyerEligibility')).toBe(1);
        return result;
      },
    );
    expect(after.customerIdentity).toMatchObject({
      email: 'buyer@example.test',
      phone: '+380501234567',
      countryCode: 'UA',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expectRevisionAdvanced(before, after);
  });

  test('clears optional customer identity fields', async () => {
    const checkout = await kit.created();
    kit.expectSuccess(
      await identity(kit, checkout.id, {
        email: 'clear-me@example.test',
        phone: '+380501234567',
        middleName: 'Byron',
      }),
    );
    const cleared = kit.expectSuccess(
      await identity(kit, checkout.id, {
        email: null,
        phone: null,
        middleName: null,
      }),
    );
    expect(cleared.customerIdentity).toMatchObject({ email: null, phone: null, middleName: null });
  });

  test('uses authenticated customer ownership instead of caller-supplied customer IDs', async () => {
    const checkout = await kit.created();
    const response = await kit.graphql<unknown>(
      `mutation Spoof($input: CheckoutCustomerIdentityUpdateInput!) {
        checkoutCustomerIdentityUpdate(input: $input) { checkout { id } userErrors { code } }
      }`,
      { input: { checkoutId: checkout.id, customerId: kit.id('Customer') } },
    );
    expect(response.data ?? null).toBeNull();
    expect(response.errors?.[0]?.message).toContain('customerId');
    expect((await kit.read(checkout.id))?.customerIdentity.customer).toBeNull();
  });

  test('adds, updates, and clears a customer note without recalculation', async () => {
    const checkout = await kit.created();
    const notes = [];
    for (const note of ['Leave at reception', 'Call on arrival', null]) {
      notes.push(
        kit.expectSuccess(
          await kit.mutation('checkoutCustomerNoteUpdate', 'CheckoutCustomerNoteUpdateInput', {
            checkoutId: checkout.id,
            note,
          }),
        ),
      );
    }
    expect(notes.map(({ customerNote }) => customerNote)).toEqual([
      'Leave at reception',
      'Call on arrival',
      null,
    ]);
    expect(notes.every(({ resultRevision }) => resultRevision === checkout.resultRevision)).toBe(
      true,
    );
  });

  test('updates locale and advances the result revision', async () => {
    const before = await kit.created();
    const after = kit.expectSuccess(
      await kit.mutation('checkoutLanguageCodeUpdate', 'CheckoutLanguageCodeUpdateInput', {
        checkoutId: before.id,
        localeCode: 'uk',
      }),
    );
    expect(after.localeCode).toBe('uk');
    expectRevisionAdvanced(before, after);
  });

  test('updates currency, money projections, and result revision', async () => {
    const variant = await kit.variant({ price: 1_000 });
    const { data } = await kit.api.admin.mutation('inventory-api/VariantSetPricing', {
      variables: { input: { variantId: variant, currency: 'EUR', amountMinor: '900' } },
    });
    expect(data.catalogMutation.variantUpdatePricing.userErrors).toEqual([]);
    const before = await kit.created({
      items: [{ purchasableId: variant, quantity: 2 }],
    });
    expect(before.cost.subtotalAmount).toEqual({ amount: 2_000, currencyCode: 'USD' });
    const after = kit.expectSuccess(
      await kit.mutation('checkoutCurrencyCodeUpdate', 'CheckoutCurrencyCodeUpdateInput', {
        checkoutId: before.id,
        currencyCode: 'EUR',
      }),
    );
    expect(after.currencyCode).toBe('EUR');
    expect(after.lines[0]!.cost).toMatchObject({
      unitPrice: { amount: 900, currencyCode: 'EUR' },
      subtotalAmount: { amount: 1_800, currencyCode: 'EUR' },
    });
    expect(after.cost.subtotalAmount).toEqual({ amount: 1_800, currencyCode: 'EUR' });
    kit.expectCanonicalMoney(after, 'EUR');
    expectRevisionAdvanced(before, after);
  });

  test('rejects a currency unsupported by the store or checkout context', async () => {
    const before = await kit.created();
    const payload = await kit.mutation(
      'checkoutCurrencyCodeUpdate',
      'CheckoutCurrencyCodeUpdateInput',
      { checkoutId: before.id, currencyCode: 'GBP' },
    );
    kit.expectUserError(payload, 'CHECKOUT_PRELIMINARY_PRICING_UNAVAILABLE');
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('preserves billing address independently from delivery destinations', async () => {
    await kit.configureDelivery();
    const checkout = await checkoutWithDeliveryAddress(kit);
    const deliveryBefore = checkout.deliveryGroups[0]!.deliveryAddress;
    const updated = kit.expectSuccess(
      await billing(kit, checkout.id, {
        firstName: 'Ada',
        lastName: 'Lovelace',
        city: 'Kyiv',
        countryCode: 'UA',
      }),
    );
    expect(updated.billingAddress).toMatchObject({ firstName: 'Ada', city: 'Kyiv' });
    expect(updated.deliveryGroups).toHaveLength(1);
    expect(updated.deliveryGroups[0]!.deliveryAddress).toEqual(deliveryBefore);
    expect(updated.deliveryGroups[0]!.deliveryAddress).not.toEqual(updated.billingAddress);
  });

  test('updates and clears the billing address', async () => {
    const checkout = await kit.created();
    const added = kit.expectSuccess(
      await billing(kit, checkout.id, {
        address1: '1 First Street',
        city: 'Kyiv',
        countryCode: 'UA',
      }),
    );
    expect(added.billingAddress).toMatchObject({ address1: '1 First Street', city: 'Kyiv' });
    expect(kit.expectSuccess(await billing(kit, checkout.id, null)).billingAddress).toBeNull();
  });

  test('does not leak customer PII through storefront issues or provider projections', async () => {
    await kit.configurePaymentProvider(['card']);
    const checkout = await kit.created({
      items: [{ purchasableId: await kit.variant({ price: 1_000 }), quantity: 1 }],
    });
    expect(checkout.payment.methods).toHaveLength(1);
    const secret = `private-${crypto.randomUUID()}@example.test`;
    const updated = kit.expectSuccess(await identity(kit, checkout.id, { email: secret }));
    expect(
      JSON.stringify({
        issues: updated.issues,
        notifications: updated.notifications,
        payment: updated.payment,
      }),
    ).not.toContain(secret);
    expect(updated.payment.methods).toHaveLength(1);
    kit.expectSafe({ issues: updated.issues, payment: updated.payment });
  });

  test('does not change visitor ownership when caller identity fields change', async () => {
    const checkout = await kit.created();
    const owner = (await kit.persisted(checkout.id)).owner_visitor_id;
    kit.expectSuccess(await identity(kit, checkout.id, { email: 'another@example.test' }));
    expect((await kit.persisted(checkout.id)).owner_visitor_id).toBe(owner);
  });

  test('recalculates checkout after identity email is set and cleared', async () => {
    const before = await kit.created();
    const signedIn = kit.expectSuccess(
      await identity(kit, before.id, { email: 'signed-in@example.test' }),
    );
    const signedOut = kit.expectSuccess(await identity(kit, before.id, { email: null }));
    expect(signedIn.resultRevision).not.toBe(before.resultRevision);
    expect(signedOut.resultRevision).not.toBe(signedIn.resultRevision);
    expect(signedOut.loyaltyRedemption).toBeNull();
  });

  test('treats unchanged customer context and billing address mutations as no-ops', async () => {
    const checkout = await kit.created();
    const unchangedIdentity = kit.expectSuccess(await identity(kit, checkout.id, {}));
    const unchangedBilling = kit.expectSuccess(await billing(kit, checkout.id, null));
    expect(unchangedIdentity.resultRevision).toBe(checkout.resultRevision);
    expect(unchangedBilling.resultRevision).toBe(checkout.resultRevision);
  });
});

function identity(
  kit: CheckoutStorefrontTestKit,
  checkoutId: string,
  fields: Record<string, unknown>,
) {
  return kit.mutation('checkoutCustomerIdentityUpdate', 'CheckoutCustomerIdentityUpdateInput', {
    checkoutId,
    ...fields,
  });
}

function billing(
  kit: CheckoutStorefrontTestKit,
  checkoutId: string,
  billingAddress: Record<string, unknown> | null,
) {
  return kit.mutation('checkoutBillingAddressUpdate', 'CheckoutBillingAddressUpdateInput', {
    checkoutId,
    billingAddress,
  });
}

async function checkoutWithDeliveryAddress(kit: CheckoutStorefrontTestKit): Promise<Checkout> {
  const checkout = await kit.created({
    items: [
      { purchasableId: await kit.variant({ requiresShipping: true }), quantity: 1 },
    ],
  });
  return kit.expectSuccess(
    await kit.mutation(
      'checkoutDeliveryAddressesAdd',
      'CheckoutDeliveryAddressesAddInput',
      {
        checkoutId: checkout.id,
        addresses: [
          {
            checkoutLineIds: [checkout.lines[0]!.id],
            address: {
              firstName: 'Grace',
              lastName: 'Hopper',
              address1: '1 Delivery Street',
              city: 'Lviv',
              countryCode: 'UA',
              provinceCode: '46',
              zip: '79000',
              phone: '+380501111111',
            },
          },
        ],
      },
    ),
  );
}
