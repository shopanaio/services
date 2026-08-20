/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { CheckoutStorefrontTestKit } from './checkout-storefront-test-kit';

type Pending = {
  checkoutId: string;
  placementId: string;
  orderId: string;
  paymentSessionId: string;
  paymentCollectionId: string;
  paymentOperationId: string;
  status: string;
  placementState: string;
};

test.describe('Storefront checkout asynchronous payment monitoring', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('finalizes a pending placement after the payment session settles', async () => {
    const pending = await pendingPlacement(kit);

    await kit.withActionOverrides(
      [
        { action: 'inventory.confirmCheckoutInventory', mode: 'PASS' },
        { action: 'order.publishLoyaltyRewardEligible', mode: 'PASS' },
      ],
      async () => {
        await forceSessionState(kit, pending.paymentSessionId, 'CAPTURED');
        const result = await runMonitor(kit, pending.placementId);
        expect(result).toMatchObject({ status: 'PAID', placementState: 'PAYMENT_CREATED' });
        expect(await kit.actionCalls('inventory.confirmCheckoutInventory')).toBe(1);
        expect(await kit.actionCalls('order.publishLoyaltyRewardEligible')).toBe(1);
      },
    );

    expect(await publicPlacement(kit, pending.placementId)).toMatchObject({
      status: 'PAID',
      paymentSessionId: pending.paymentSessionId,
    });
    expect((await kit.read(pending.checkoutId))?.status).toBe('PLACED');
  });

  test('releases acquired resources after a pending payment fails', async () => {
    const pending = await pendingPlacement(kit);

    await kit.withActionOverrides(
      [{ action: 'inventory.releaseCheckoutInventory', mode: 'PASS' }],
      async () => {
        await forceSessionState(kit, pending.paymentSessionId, 'FAILED', {
          category: 'PROVIDER',
          code: 'TEST_PROVIDER_FAILED',
          message: 'Test provider reported a terminal failure.',
          retryable: false,
          providerCode: 'test-stripe',
        });
        const result = await runMonitor(kit, pending.placementId);
        expect(result).toMatchObject({
          status: 'PAYMENT_FAILED',
          paymentFailure: { code: 'TEST_PROVIDER_FAILED', retryable: false },
        });
        expect(await kit.actionCalls('inventory.releaseCheckoutInventory')).toBe(1);
      },
    );

    const placement = await persistedPlacement(kit, pending.placementId);
    expect(placement.result).toMatchObject({ status: 'PAYMENT_FAILED' });
    expect((await kit.read(pending.checkoutId))?.status).toBe('ABANDONED');
  });

  test('expires at the earliest pending-payment deadline and releases inventory once', async () => {
    const pending = await pendingPlacement(kit);
    const [before] = await kit.sql<{ payload: Record<string, unknown> }[]>`
      select payload from payments.payment_session where id = ${kit.rawId(pending.paymentSessionId)}
    `;
    await kit.withActionOverrides(
      [{ action: 'inventory.releaseCheckoutInventory', mode: 'PASS' }],
      async () => {
        await kit.sql`
          update payments.payment_session
          set payload = jsonb_set(
                jsonb_set(payload, '{pendingExpiresAt}', to_jsonb(${new Date(Date.now() - 1_000).toISOString()}::text)),
                '{expiresAt}', to_jsonb(${new Date(Date.now() + 60_000).toISOString()}::text)
              ),
              updated_at = now()
          where id = ${kit.rawId(pending.paymentSessionId)}
        `;
        const result = await runMonitor(kit, pending.placementId);
        expect(result).toMatchObject({
          status: 'PAYMENT_FAILED',
          paymentFailure: { category: 'TIMEOUT', code: 'PAYMENT_PROVIDER_OPERATION_EXPIRED' },
        });
        expect(await kit.actionCalls('inventory.releaseCheckoutInventory')).toBe(1);
      },
    );

    expect(Date.parse(String(before!.payload.pendingExpiresAt))).toBeGreaterThan(Date.now() - 60_000);
    const [after] = await kit.sql<{ state: string; payload: Record<string, unknown> }[]>`
      select state, payload from payments.payment_session where id = ${kit.rawId(pending.paymentSessionId)}
    `;
    expect(after).toMatchObject({ state: 'EXPIRED', payload: { state: 'EXPIRED' } });
  });
});

async function pendingPlacement(kit: CheckoutStorefrontTestKit): Promise<Pending> {
  await kit.configurePaymentProvider(['bank-transfer']);
  const checkout = await kit.created({
    items: [{ purchasableId: await kit.variant({ price: 1_000 }), quantity: 1 }],
  });
  const selected = kit.expectSuccess(
    await kit.mutation('checkoutPaymentMethodUpdate', 'CheckoutPaymentMethodUpdateInput', {
      checkoutId: checkout.id,
      methodHandle: checkout.payment.methods[0]!.handle,
    }),
  );
  const response = await kit.graphql<{ placeOrder: Pending & { userErrors: unknown[] } }>(
    `mutation Pending($input: PlaceOrderInput!) { placeOrder(input: $input) {
      placementId placementState checkoutId orderId status paymentCollectionId paymentSessionId paymentOperationId
      userErrors { code message retryable }
    } }`,
    {
      input: {
        checkoutId: selected.id,
        expectedResultRevision: selected.resultRevision,
        idempotencyKey: crypto.randomUUID(),
      },
    },
  );
  expect(response.errors).toBeUndefined();
  expect(response.data!.placeOrder).toMatchObject({
    status: 'PAYMENT_PENDING',
    placementState: 'PAYMENT_CREATED',
    placementId: expect.any(String),
    paymentSessionId: expect.any(String),
    userErrors: [],
  });
  return response.data!.placeOrder;
}

async function runMonitor(kit: CheckoutStorefrontTestKit, placementId: string) {
  const placement = await persistedPlacement(kit, placementId);
  expect(placement.paymentMonitorInput).not.toBeNull();
  return kit.runWorkflow<Record<string, unknown>>(
    'checkout.monitorPlacedPayment',
    placement.paymentMonitorInput!,
    `checkout-payment-monitor-e2e:${crypto.randomUUID()}`,
    placement.paymentMonitorWorkflowId!,
  );
}

async function forceSessionState(
  kit: CheckoutStorefrontTestKit,
  paymentSessionId: string,
  state: 'CAPTURED' | 'FAILED',
  failure: Record<string, unknown> | null = null,
) {
  await kit.sql`
    update payments.payment_session
    set state = ${state}, revision = revision + 1,
        payload = jsonb_set(
          jsonb_set(payload, '{state}', ${kit.sql.json(state)}::jsonb),
          '{lastFailure}', ${kit.sql.json(failure)}::jsonb
        ),
        updated_at = now()
    where id = ${kit.rawId(paymentSessionId)}
  `;
}

async function persistedPlacement(kit: CheckoutStorefrontTestKit, placementId: string) {
  const [row] = await kit.sql<
    {
      paymentMonitorInput: Record<string, unknown> | null;
      paymentMonitorWorkflowId: string | null;
      result: Record<string, unknown>;
    }[]
  >`
    select payment_monitor_input as "paymentMonitorInput",
           payment_monitor_workflow_id as "paymentMonitorWorkflowId", result
    from checkout.checkout_placements where id = ${kit.rawId(placementId)}
  `;
  expect(row).toBeTruthy();
  expect(row!.paymentMonitorWorkflowId).not.toBeNull();
  return row!;
}

async function publicPlacement(kit: CheckoutStorefrontTestKit, id: string) {
  const response = await kit.graphql<{ checkoutPlacement: Record<string, unknown> | null }>(
    `query PendingPlacement($id: ID!) { checkoutPlacement(id: $id) {
      placementId placementState checkoutId orderId status paymentCollectionId paymentSessionId paymentOperationId
      paymentFailure { category code message retryable providerCode }
    } }`,
    { id },
  );
  expect(response.errors).toBeUndefined();
  return response.data!.checkoutPlacement;
}
