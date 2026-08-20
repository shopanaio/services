/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-non-null-asserted-optional-chain */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  type Checkout,
  CheckoutStorefrontTestKit,
  expectRevisionAdvanced,
} from './checkout-storefront-test-kit';

test.describe('Storefront checkout validation and concurrency', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('commits an invalid checkout snapshot when validation returns business issues', async () => {
    const checkout = await kit.created();
    expect(checkout.valid).toBe(false);
    expect(checkout.status).toBe('OPEN');
    expect(checkout.issues).toContainEqual(
      expect.objectContaining({ code: 'CART_EMPTY', effect: 'STOP' }),
    );
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('does not commit a checkout when a required pipeline stage fails', async () => {
    const before = await lineCheckout(kit);
    const payload = await kit.withActionFault('pricing.calculateCheckoutPreliminaryQuote', () =>
      quantity(kit, before, 2),
    );
    kit.expectUserError(payload, 'CHECKOUT_PRELIMINARY_PRICING_UNAVAILABLE');
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('does not commit a checkout when delivery calculation fails', async () => {
    const before = await lineCheckout(kit);
    const payload = await kit.withActionFault('delivery.calculateCheckoutDeliveryOptions', () =>
      quantity(kit, before, 2),
    );
    kit.expectUserError(payload, 'CHECKOUT_DELIVERY_UNAVAILABLE');
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('fails each required pipeline stage and skips every downstream stage', async () => {
    const stages = [
      ['pricing.calculateCheckoutPreliminaryQuote', 'CHECKOUT_PRELIMINARY_PRICING_UNAVAILABLE'],
      ['delivery.calculateCheckoutDeliveryOptions', 'CHECKOUT_DELIVERY_UNAVAILABLE'],
      ['pricing.finalizeCheckoutPricingQuote', 'CHECKOUT_FINAL_PRICING_UNAVAILABLE'],
      ['payments.getCheckoutAvailablePaymentMethods', 'CHECKOUT_PAYMENT_METHODS_UNAVAILABLE'],
    ] as const;
    for (const [index, [action, expectedCode]] of stages.entries()) {
      const before = await lineCheckout(kit);
      const downstream = stages.slice(index + 1).map(([candidate]) => candidate);
      const payload = await kit.withActionOverrides(
        [
          { action, mode: 'THROW' },
          ...downstream.map((candidate) => ({ action: candidate, mode: 'PASS' as const })),
        ],
        async () => {
          const result = await quantity(kit, before, 2);
          expect(await kit.actionCalls(action)).toBe(1);
          for (const candidate of downstream) expect(await kit.actionCalls(candidate)).toBe(0);
          return result;
        },
      );
      const error = kit.expectUserError(payload, expectedCode);
      expect(error.retryable).toBe(true);
      expect(await kit.read(before.id)).toEqual(before);
    }
  });

  test('does not commit a checkout when a pipeline dependency returns malformed output', async () => {
    const before = await lineCheckout(kit);
    const payload = await kit.withActionOverrides(
      [{ action: 'pricing.finalizeCheckoutPricingQuote', mode: 'RETURN', result: {} }],
      () => quantity(kit, before, 2),
    );
    kit.expectUserError(payload, 'CHECKOUT_FINAL_PRICING_UNAVAILABLE');
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('commits warnings but blocks readiness for STOP validation issues', async () => {
    const checkout = await lineCheckout(kit);
    expect(
      checkout.issues.every(
        ({ severity, effect }) =>
          (severity === 'WARNING' && effect === 'CONTINUE') ||
          (severity === 'ERROR' && effect === 'STOP'),
      ),
    ).toBe(true);
    expect(checkout.valid).toBe(!checkout.issues.some(({ effect }) => effect === 'STOP'));
  });

  test('returns native validation issues in deterministic precedence order', async () => {
    const first = await lineCheckout(kit);
    const second = await lineCheckout(kit);
    expect(second.issues.map(issueShape)).toEqual(first.issues.map(issueShape));
    expect(first.issues).toEqual([...first.issues].sort(compareIssue));
  });

  test('fails recalculation when buyer eligibility resolution is unavailable', async () => {
    const before = await lineCheckout(kit);
    const payload = await kit.withActionFault('customers.resolveCheckoutBuyerEligibility', () =>
      kit.mutation('checkoutCustomerIdentityUpdate', 'CheckoutCustomerIdentityUpdateInput', {
        checkoutId: before.id,
        email: 'buyer@example.test',
      }),
    );
    kit.expectUserError(payload, 'BUYER_ELIGIBILITY_RESOLUTION_FAILED');
    expect(await kit.read(before.id)).toEqual(before);
  });

  test('does not expose validation-function bindings, configuration, or traces to storefront callers', async () => {
    const checkout = await lineCheckout(kit);
    kit.expectSafe(checkout.issues);
    for (const issue of checkout.issues) {
      expect(Object.keys(issue).sort()).toEqual([
        'code',
        'effect',
        'field',
        'lineId',
        'message',
        'retryable',
        'severity',
      ]);
    }
  });

  test('returns a retryable version conflict for concurrent checkout mutations', async () => {
    const before = await lineCheckout(kit);
    const results = await Promise.all([quantity(kit, before, 2), quantity(kit, before, 3)]);
    expect(results.filter(({ checkout }) => checkout !== null)).toHaveLength(1);
    const failure = results.find(({ checkout }) => checkout === null)!;
    expect(failure.userErrors).toEqual([
      expect.objectContaining({ code: 'CHECKOUT_VERSION_CONFLICT', retryable: true }),
    ]);
  });

  test('does not automatically replay a conflicting checkout mutation', async () => {
    const before = await lineCheckout(kit);
    const version = Number((await kit.persisted(before.id)).version);
    const results = await Promise.all([quantity(kit, before, 2), quantity(kit, before, 3)]);
    const successes = results.filter(({ checkout }) => checkout !== null);
    const failures = results.filter(({ checkout }) => checkout === null);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]!.userErrors).toEqual([
      expect.objectContaining({ code: 'CHECKOUT_VERSION_CONFLICT', retryable: true }),
    ]);
    const committed = successes[0]!.checkout!;
    expect((await kit.read(before.id))!.lines[0]!.quantity).toBe(committed.lines[0]!.quantity);
    expect([2, 3]).toContain(committed.lines[0]!.quantity);
    expect(Number((await kit.persisted(before.id)).version)).toBe(version + 1);
  });

  test('increments the checkout result revision exactly once for a line quantity mutation', async () => {
    const before = await lineCheckout(kit);
    const version = Number((await kit.persisted(before.id)).version);
    const after = kit.expectSuccess(await quantity(kit, before, 2));
    expectRevisionAdvanced(before, after);
    expect(Number((await kit.persisted(before.id)).version)).toBe(version + 1);
  });

  test('does not increment result revision for customer-note and tag-only mutations', async () => {
    const before = await lineCheckout(kit);
    const note = kit.expectSuccess(
      await kit.mutation('checkoutCustomerNoteUpdate', 'CheckoutCustomerNoteUpdateInput', {
        checkoutId: before.id,
        note: 'No recalculation',
      }),
    );
    const tag = kit.expectSuccess(
      await kit.mutation('checkoutTagCreate', 'CheckoutTagCreateInput', {
        checkoutId: before.id,
        tag: { slug: 'metadata', unique: false },
      }),
    );
    expect(note.resultRevision).toBe(before.resultRevision);
    expect(tag.resultRevision).toBe(before.resultRevision);
  });

  test('rejects mutations for a persisted EXPIRED checkout', async () => {
    const before = await lineCheckout(kit);
    await lifecycle(kit, before.id, 'EXPIRED', new Date(Date.now() - 1_000).toISOString());
    const read = await kit.read(before.id);
    expect(read?.status).toBe('EXPIRED');
    kit.expectUserError(await quantity(kit, read!, 2), 'CHECKOUT_VERSION_CONFLICT');
  });

  test('rejects recalculating and metadata mutations after the checkout is placed or expired', async () => {
    for (const status of ['PLACED', 'EXPIRED'] as const) {
      const before = await lineCheckout(kit);
      await lifecycle(kit, before.id, status);
      const immutable = await kit.read(before.id);
      kit.expectUserError(await quantity(kit, immutable!, 2), 'CHECKOUT_VERSION_CONFLICT');
      kit.expectUserError(
        await kit.mutation('checkoutCustomerNoteUpdate', 'CheckoutCustomerNoteUpdateInput', {
          checkoutId: immutable!.id,
          note: 'Must not be committed',
        }),
        'CHECKOUT_VERSION_CONFLICT',
      );
      expect(await kit.read(before.id)).toEqual(immutable);
    }
  });

  test('preserves the ABANDONED lifecycle state as non-placeable and non-mutable', async () => {
    const before = await lineCheckout(kit);
    await lifecycle(kit, before.id, 'ABANDONED');
    const abandoned = await kit.read(before.id);
    expect(abandoned?.status).toBe('ABANDONED');
    kit.expectUserError(await quantity(kit, abandoned!, 2), 'CHECKOUT_VERSION_CONFLICT');
  });

  test('does not allow cross-store checkout reads or mutations', async () => {
    const checkout = await lineCheckout(kit);
    const second = await kit.headless.create('Foreign storefront connection');
    expect(second.userErrors).toEqual([]);
    const options = { token: second.initialStorefrontCredentials!.publicAccessToken };
    expect(await kit.read(checkout.id, options)).toBeNull();
    const payload = await quantity(kit, checkout, 2, options);
    kit.expectUserError(payload, 'CHECKOUT_NOT_FOUND');
  });

  test('does not allow a different visitor or storefront connection to mutate checkout lines or metadata', async () => {
    const checkout = await lineCheckout(kit);
    for (const options of [
      { visitorId: `visitor-${crypto.randomUUID()}` },
      {
        token: (await kit.headless.create('Another connection')).initialStorefrontCredentials!
          .publicAccessToken,
      },
    ]) {
      kit.expectUserError(
        await quantity(kit, checkout, 2, options),
        'CHECKOUT_NOT_FOUND',
      );
      kit.expectUserError(
        await kit.mutation(
          'checkoutCustomerNoteUpdate',
          'CheckoutCustomerNoteUpdateInput',
          { checkoutId: checkout.id, note: 'Unauthorized change' },
          options,
        ),
        'CHECKOUT_NOT_FOUND',
      );
      expect(await kit.read(checkout.id)).toEqual(checkout);
    }
  });

  test('preserves the prior snapshot for a malformed checkout line global ID', async () => {
    const checkout = await lineCheckout(kit);
    const response = await kit.graphql<unknown>(
      `mutation Malformed($input: CheckoutLinesUpdateInput!) {
        checkoutLinesUpdate(input: $input) { checkout { id } userErrors { code } }
      }`,
      { input: { checkoutId: checkout.id, lines: [{ lineId: 'bad-id', quantity: 2 }] } },
    );
    expect(response.data ?? null).toBeNull();
    expect(response.errors).toEqual([
      expect.objectContaining({
        extensions: expect.objectContaining({ code: 'BAD_USER_INPUT' }),
      }),
    ]);
    kit.expectSafe(response.errors);
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('does not advance checkout or result revision for a true no-op mutation', async () => {
    const checkout = await lineCheckout(kit);
    const version = Number((await kit.persisted(checkout.id)).version);
    const note = kit.expectSuccess(
      await kit.mutation('checkoutCustomerNoteUpdate', 'CheckoutCustomerNoteUpdateInput', {
        checkoutId: checkout.id,
        note: null,
      }),
    );
    expect(note.resultRevision).toBe(checkout.resultRevision);
    expect(Number((await kit.persisted(checkout.id)).version)).toBe(version);
  });

  test('returns only customer-safe public errors for invalid mutations', async () => {
    const checkout = await lineCheckout(kit);
    const payload = await quantity(kit, checkout, -1);
    const error = kit.expectUserError(payload, 'BAD_USER_INPUT');
    kit.expectSafe(error);
    expect(JSON.stringify(error)).not.toMatch(/postgres|node_modules|stack|select\s/iu);
  });

  test('transitions a checkout from OPEN to READY when validation passes and back to OPEN when it fails', async () => {
    await kit.configurePaymentProvider(['card']);
    const before = await lineCheckout(kit);
    expect(before.status).toBe('OPEN');
    const ready = kit.expectSuccess(
      await kit.mutation('checkoutPaymentMethodUpdate', 'CheckoutPaymentMethodUpdateInput', {
        checkoutId: before.id,
        methodHandle: before.payment.methods[0]!.handle,
      }),
    );
    expect(ready).toMatchObject({ status: 'READY', valid: true });
    const open = kit.expectSuccess(
      await kit.mutation('checkoutLinesClear', 'CheckoutLinesClearInput', { checkoutId: ready.id }),
    );
    expect(open).toMatchObject({ status: 'OPEN', valid: false });
  });
});

async function lineCheckout(kit: CheckoutStorefrontTestKit): Promise<Checkout> {
  return kit.created({ items: [{ purchasableId: await kit.variant(), quantity: 1 }] });
}
function quantity(
  kit: CheckoutStorefrontTestKit,
  checkout: Checkout,
  value: number,
  options: Parameters<CheckoutStorefrontTestKit['mutation']>[3] = {},
) {
  return kit.mutation(
    'checkoutLinesUpdate',
    'CheckoutLinesUpdateInput',
    {
      checkoutId: checkout.id,
      lines: [{ lineId: checkout.lines[0]!.id, quantity: value }],
    },
    options,
  );
}
function issueShape(issue: Checkout['issues'][number]) {
  return { code: issue.code, severity: issue.severity, effect: issue.effect, field: issue.field };
}
function compareIssue(left: Checkout['issues'][number], right: Checkout['issues'][number]) {
  return `${left.field.join('.')}:${left.code}`.localeCompare(
    `${right.field.join('.')}:${right.code}`,
  );
}
async function lifecycle(
  kit: CheckoutStorefrontTestKit,
  checkoutId: string,
  status: 'PLACED' | 'EXPIRED' | 'ABANDONED',
  expiresAt?: string,
) {
  const rawId = kit.rawId(checkoutId);
  await kit.sql.begin(async (sql) => {
    await sql`
      update checkout.checkouts set status = ${status},
        expires_at = ${expiresAt ?? new Date(Date.now() + 60_000).toISOString()}
      where id = ${rawId}
    `;
    await sql`
      update checkout.checkout_current_snapshots
      set snapshot = jsonb_set(
        jsonb_set(snapshot, '{lifecycle,status}', ${sql.json(status)}::jsonb),
        '{lifecycle,expiresAt}', ${sql.json(expiresAt ?? new Date(Date.now() + 60_000).toISOString())}::jsonb
      )
      where checkout_id = ${rawId}
    `;
  });
}
