/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { type Checkout, CheckoutStorefrontTestKit } from './checkout-storefront-test-kit';

test.describe('Storefront checkout payments through Apps', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('lists one available payment method from an active provider App', async () => {
    await kit.configurePaymentProvider(['card']);
    const checkout = await payable(kit);
    expect(checkout.payment.methods).toHaveLength(1);
    expect(checkout.payment.methods[0]).toMatchObject({
      handle: expect.any(String),
      code: 'test-stripe-card',
      providerCode: 'test-stripe',
      flow: 'ONLINE',
    });
    expect(checkout.payment.methods[0]!.handle).not.toContain('card');
  });

  test('lists multiple methods from one provider in deterministic order', async () => {
    await kit.configurePaymentProvider();
    const first = await payable(kit);
    const second = await payable(kit);
    expect(first.payment.methods.map(({ code }) => code)).toEqual([
      'test-stripe-bank-transfer',
      'test-stripe-card',
      'test-stripe-card-3ds',
      'test-stripe-declined-card',
    ]);
    expect(second.payment.methods.map(methodProjection)).toEqual(
      first.payment.methods.map(methodProjection),
    );
    expect(first.payment.methods.map(({ code }) => code)).toEqual(
      [...first.payment.methods.map(({ code }) => code)].sort(),
    );
  });

  test('ignores an inactive payment provider account', async () => {
    const provider = await kit.configurePaymentProvider(['card']);
    expect((await payable(kit)).payment.methods).toHaveLength(1);
    await kit.setPaymentProviderStatus(provider.providerAccountId, 'INACTIVE');
    expect((await payable(kit)).payment.methods).toEqual([]);
  });

  test('supports a provider App returning zero available payment methods', async () => {
    await kit.configurePaymentProvider([]);
    const checkout = await payable(kit);
    expect(checkout.payment.methods).toEqual([]);
    expect(checkout.issues).toContainEqual(
      expect.objectContaining({ code: 'PAYMENT_METHODS_UNAVAILABLE' }),
    );
  });

  test('fails the payment stage when every eligible provider is unavailable', async () => {
    await kit.configurePaymentProvider(['card']);
    const before = await payable(kit);
    const payload = await kit.withActionFault('payments.getCheckoutAvailablePaymentMethods', () =>
      updateQuantity(kit, before, 2),
    );
    kit.expectUserError(payload, 'CHECKOUT_PAYMENT_METHODS_UNAVAILABLE');
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('does not invoke payment Apps when loyalty reduces payable total to zero', async () => {
    await kit.configurePaymentProvider(['card']);
    await kit.createDiscount({ amountMinor: '100000' });
    await kit.withActionOverrides([{ action: 'apps.executeCapability', mode: 'PASS' }], async () => {
      const checkout = await payable(kit, 500);
      expect(checkout.payment.payableAmount.amount).toBe(0);
      expect(checkout.payment.methods).toEqual([]);
      expect(checkout.payment.selection.status).toBe('NONE');
      expect(await kit.actionCalls('apps.executeCapability')).toBe(0);
    });
  });

  test('requires a payment method when a positive payable total has methods', async () => {
    await kit.configurePaymentProvider(['card']);
    const checkout = await payable(kit);
    expect(checkout.payment.methods).toHaveLength(1);
    expect(checkout.payment.selection.status).toBe('NONE');
    expect(checkout.issues).toContainEqual(
      expect.objectContaining({ code: 'PAYMENT_METHOD_REQUIRED' }),
    );
  });

  test('reports unavailable payment methods when a positive payable total has none', async () => {
    const checkout = await payable(kit);
    expect(checkout.payment.methods).toEqual([]);
    expect(checkout.issues).toContainEqual(
      expect.objectContaining({ code: 'PAYMENT_METHODS_UNAVAILABLE' }),
    );
  });

  test('selects a payment method using only its opaque handle', async () => {
    await kit.configurePaymentProvider(['card']);
    const before = await payable(kit);
    const method = before.payment.methods[0]!;
    const after = kit.expectSuccess(await select(kit, before.id, method.handle));
    expect(after.payment.selection).toMatchObject({ status: 'SELECTED', method });
    expect(after.valid).toBe(true);
  });

  test('persists selected payment customer input without exposing it publicly', async () => {
    await kit.configurePaymentProvider(['card']);
    const before = await payable(kit);
    const customerInput = { saveMethod: true, holder: 'Ada Lovelace', nested: { consent: 'yes' } };
    const after = kit.expectSuccess(
      await select(kit, before.id, before.payment.methods[0]!.handle, customerInput),
    );
    expect(after.payment.selection.status).toBe('SELECTED');
    expect(JSON.stringify(after.payment)).not.toContain('Ada Lovelace');
    expect(JSON.stringify(await kit.persistedSnapshot(after.id))).toContain('Ada Lovelace');
  });

  test('resets a selected method when it becomes unavailable after recalculation', async () => {
    const provider = await kit.configurePaymentProvider(['card']);
    const before = await selected(kit);
    const handle = before.payment.selection.method!.handle;
    await kit.setPaymentProviderStatus(provider.providerAccountId, 'INACTIVE');
    const after = kit.expectSuccess(await updateQuantity(kit, before, 2));
    expect(after.payment.selection).toMatchObject({
      status: 'RESET',
      previousMethodHandle: handle,
      resetReason: { code: 'PAYMENT_METHOD_UNAVAILABLE' },
    });
  });

  test('does not auto-select the only available payment method', async () => {
    await kit.configurePaymentProvider(['card']);
    const checkout = await payable(kit);
    expect(checkout.payment.methods).toHaveLength(1);
    expect(checkout.payment.selection).toMatchObject({ status: 'NONE', method: null });
  });

  test('rejects a malformed Apps capability envelope without committing', async () => {
    await kit.configurePaymentProvider(['card']);
    const before = await payable(kit);
    const payload = await kit.withActionOverrides(
      [{ action: 'apps.executeCapability', mode: 'RETURN', result: {} }],
      () => updateQuantity(kit, before, 2),
    );
    kit.expectUserError(payload, 'CHECKOUT_PAYMENT_METHODS_UNAVAILABLE');
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('contains a payment Apps boundary failure without exposing a partial method list', async () => {
    await kit.configurePaymentProvider();
    const before = await payable(kit);
    const payload = await kit.withActionFault('apps.executeCapability', () =>
      updateQuantity(kit, before, 2),
    );
    const error = kit.expectUserError(payload, 'CHECKOUT_PAYMENT_METHODS_UNAVAILABLE');
    expect(error.retryable).toBe(true);
    expect(await kit.read(before.id)).toEqual(before);
    kit.expectSafe(error);
  });

  test('never exposes provider bindings, credentials, or customer input in storefront responses', async () => {
    await kit.configurePaymentProvider(['card']);
    const before = await payable(kit);
    const secret = `secret-${crypto.randomUUID()}`;
    const after = kit.expectSuccess(
      await select(kit, before.id, before.payment.methods[0]!.handle, { secret }),
    );
    expect(JSON.stringify(after)).not.toContain(secret);
    kit.expectSafe(after.payment);
    for (const forbiddenField of ['providerAccountId', 'credentials', 'customerInput']) {
      const response = await kit.graphql<unknown>(
        `query ForbiddenPaymentField($id: ID!) {
          checkout(id: $id) { payment { methods { ${forbiddenField} } } }
        }`,
        { id: after.id },
      );
      expect(response.data ?? null).toBeNull();
      expect(response.errors).toEqual([
        expect.objectContaining({
          message: expect.stringContaining(`Cannot query field "${forbiddenField}"`),
          extensions: expect.objectContaining({ code: 'GRAPHQL_VALIDATION_FAILED' }),
        }),
      ]);
    }
  });

  test('returns a safe offline payment method without provider internals', async () => {
    await kit.configurePaymentProvider(['bank-transfer']);
    const checkout = await payable(kit);
    expect(checkout.payment.methods).toEqual([
      expect.objectContaining({ code: 'test-stripe-bank-transfer', flow: 'OFFLINE' }),
    ]);
    kit.expectSafe(checkout.payment);
  });

  test('rejects invalid payment customer input and preserves the previous selection', async () => {
    await kit.configurePaymentProvider(['card']);
    const before = await selected(kit);
    const response = await kit.graphql<unknown>(
      `mutation InvalidPaymentInput($input: CheckoutPaymentMethodUpdateInput!) {
        checkoutPaymentMethodUpdate(input: $input) { checkout { id } userErrors { code } }
      }`,
      {
        input: {
          checkoutId: before.id,
          methodHandle: before.payment.selection.method!.handle,
          customerInput: 'x'.repeat(1_100_000),
        },
      },
    );
    expect(response.data ?? null).toBeNull();
    expect(response.errors).toBeTruthy();
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('resets a selected method with its previous handle and reason when eligibility changes', async () => {
    const provider = await kit.configurePaymentProvider(['card']);
    const before = await selected(kit);
    const previousMethodHandle = before.payment.selection.method!.handle;
    await kit.setPaymentProviderStatus(provider.providerAccountId, 'INACTIVE');
    const after = kit.expectSuccess(
      await kit.mutation('checkoutCurrencyCodeUpdate', 'CheckoutCurrencyCodeUpdateInput', {
        checkoutId: before.id,
        currencyCode: 'EUR',
      }),
    );
    expect(after.payment.selection).toMatchObject({
      status: 'RESET',
      previousMethodHandle,
      resetReason: { code: 'PAYMENT_METHOD_UNAVAILABLE', message: expect.any(String) },
    });
  });
});

async function payable(kit: CheckoutStorefrontTestKit, price = 1_000): Promise<Checkout> {
  return kit.created({ items: [{ purchasableId: await kit.variant({ price }), quantity: 1 }] });
}
async function selected(kit: CheckoutStorefrontTestKit): Promise<Checkout> {
  const checkout = await payable(kit);
  return kit.expectSuccess(await select(kit, checkout.id, checkout.payment.methods[0]!.handle));
}
function select(
  kit: CheckoutStorefrontTestKit,
  checkoutId: string,
  methodHandle: string,
  customerInput?: unknown,
) {
  return kit.mutation('checkoutPaymentMethodUpdate', 'CheckoutPaymentMethodUpdateInput', {
    checkoutId,
    methodHandle,
    customerInput,
  });
}
function updateQuantity(kit: CheckoutStorefrontTestKit, checkout: Checkout, quantity: number) {
  return kit.mutation('checkoutLinesUpdate', 'CheckoutLinesUpdateInput', {
    checkoutId: checkout.id,
    lines: [{ lineId: checkout.lines[0]!.id, quantity }],
  });
}
function methodProjection(method: Checkout['payment']['methods'][number]) {
  return {
    code: method.code,
    title: method.title,
    providerCode: method.providerCode,
    flow: method.flow,
  };
}
