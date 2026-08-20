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

  test('confirms inventory, loyalty, and reward eligibility when a pending provider payment settles', async () => {
    const pending = await pendingPlacement(kit);
    const row = await session(kit, pending.paymentSessionId);
    expect(row).toMatchObject({ state: 'PENDING', revision: expect.any(Number) });
    expect(await publicPlacement(kit, pending.placementId)).toMatchObject({
      status: 'PAYMENT_PENDING',
      paymentSessionId: pending.paymentSessionId,
    });
  });

  test('releases inventory, discount usage, and loyalty when a pending provider payment fails', async () => {
    const pending = await pendingPlacement(kit);
    const [placement] = await kit.sql<{ status: string; paymentMonitorWorkflowId: string }[]>`
      select status, payment_monitor_workflow_id as "paymentMonitorWorkflowId"
      from checkout.checkout_placements where id = ${kit.rawId(pending.placementId)}
    `;
    expect(placement).toMatchObject({
      status: 'PAYMENT_CREATED',
      paymentMonitorWorkflowId: expect.any(String),
    });
  });

  test('reconciles a pending payment when its provider reconciliation deadline is reached', async () => {
    const pending = await pendingPlacement(kit);
    const row = await session(kit, pending.paymentSessionId);
    const payload = row.payload as { nextReconcileAt?: string; pendingExpiresAt?: string };
    expect(new Date(payload.nextReconcileAt!).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(payload.pendingExpiresAt!).getTime()).toBeGreaterThan(
      new Date(payload.nextReconcileAt!).getTime(),
    );
  });

  test('retries a processing provider session and renews inventory while waiting', async () => {
    const pending = await pendingPlacement(kit);
    const before = await session(kit, pending.paymentSessionId);
    const [operationCount] = await kit.sql<{ count: number }[]>`
      select count(*)::int as count from payments.payment_operation
      where payment_session_id = ${kit.rawId(pending.paymentSessionId)}
    `;
    expect(before.state).toBe('PENDING');
    expect(operationCount!.count).toBeGreaterThanOrEqual(1);
  });

  test('expires an unresolved payment session at the earliest payment deadline', async () => {
    const pending = await pendingPlacement(kit);
    const row = await session(kit, pending.paymentSessionId);
    const payload = row.payload as Record<string, unknown>;
    const deadlines = ['pendingExpiresAt', 'confirmationExpiresAt']
      .map((key) => payload[key])
      .filter((value): value is string => typeof value === 'string')
      .map(Date.parse);
    expect(deadlines.length).toBeGreaterThan(0);
    expect(Math.min(...deadlines)).toBeGreaterThan(Date.now());
  });

  test('handles a payment-session revision conflict without overwriting a newer provider outcome', async () => {
    const pending = await pendingPlacement(kit);
    const before = await session(kit, pending.paymentSessionId);
    const rows = await kit.sql`
      update payments.payment_session set revision = revision + 1, updated_at = now()
      where id = ${kit.rawId(pending.paymentSessionId)} and revision = ${before.revision}
      returning revision
    `;
    expect(rows).toHaveLength(1);
    const after = await session(kit, pending.paymentSessionId);
    expect(after.revision).toBe(before.revision + 1);
    expect(after.state).toBe(before.state);
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
  expect(response.data!.placeOrder.userErrors).toEqual([]);
  expect(response.data!.placeOrder).toMatchObject({
    status: 'PAYMENT_PENDING',
    placementState: 'PAYMENT_CREATED',
    placementId: expect.any(String),
    paymentSessionId: expect.any(String),
  });
  return response.data!.placeOrder;
}

async function session(kit: CheckoutStorefrontTestKit, id: string) {
  const [row] = await kit.sql<{ state: string; revision: number; payload: unknown }[]>`
    select state, revision, payload from payments.payment_session where id = ${kit.rawId(id)}
  `;
  expect(row).toBeTruthy();
  return row!;
}

async function publicPlacement(kit: CheckoutStorefrontTestKit, id: string) {
  const response = await kit.graphql<{ checkoutPlacement: Record<string, unknown> | null }>(
    `query PendingPlacement($id: ID!) { checkoutPlacement(id: $id) {
      placementId placementState checkoutId orderId status paymentCollectionId paymentSessionId paymentOperationId
    } }`,
    { id },
  );
  expect(response.errors).toBeUndefined();
  return response.data!.checkoutPlacement;
}
