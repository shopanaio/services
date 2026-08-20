import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { CheckoutStorefrontTestKit, expectRevisionAdvanced } from './checkout-storefront-test-kit';

test.describe('Storefront checkout customer and context', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('updates customer identity and refreshes buyer eligibility', async () => {
    const before = await kit.created();
    const after = kit.expectSuccess(
      await identity(kit, before.id, {
        email: 'buyer@example.test',
        phone: '+380501234567',
        countryCode: 'UA',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
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

  test('updates locale and reruns the complete checkout pipeline', async () => {
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

  test('updates currency and reruns the complete checkout pipeline', async () => {
    const before = await kit.created();
    const after = kit.expectSuccess(
      await kit.mutation('checkoutCurrencyCodeUpdate', 'CheckoutCurrencyCodeUpdateInput', {
        checkoutId: before.id,
        currencyCode: 'EUR',
      }),
    );
    expect(after.currencyCode).toBe('EUR');
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
    kit.expectUserError(payload, /CURRENCY/);
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('preserves billing address independently from delivery destinations', async () => {
    const checkout = await kit.created();
    const updated = kit.expectSuccess(
      await billing(kit, checkout.id, {
        firstName: 'Ada',
        lastName: 'Lovelace',
        city: 'Kyiv',
        countryCode: 'UA',
      }),
    );
    expect(updated.billingAddress).toMatchObject({ firstName: 'Ada', city: 'Kyiv' });
    expect(updated.deliveryGroups.every(({ deliveryAddress }) => deliveryAddress === null)).toBe(
      true,
    );
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

  test('does not leak customer PII through issues, provider data, or logs', async () => {
    const checkout = await kit.created();
    const secret = `private-${crypto.randomUUID()}@example.test`;
    const updated = kit.expectSuccess(await identity(kit, checkout.id, { email: secret }));
    expect(
      JSON.stringify({
        issues: updated.issues,
        notifications: updated.notifications,
        payment: updated.payment,
      }),
    ).not.toContain(secret);
    kit.expectSafe({ issues: updated.issues, payment: updated.payment });
  });

  test('does not change authenticated checkout ownership when caller identity fields change', async () => {
    const checkout = await kit.created();
    const owner = (await kit.persisted(checkout.id)).owner_visitor_id;
    kit.expectSuccess(await identity(kit, checkout.id, { email: 'another@example.test' }));
    expect((await kit.persisted(checkout.id)).owner_visitor_id).toBe(owner);
  });

  test('recalculates customer eligibility after sign-in, sign-out, or a customer switch', async () => {
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
