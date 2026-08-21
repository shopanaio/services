/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { CheckoutStorefrontTestKit } from './checkout-storefront-test-kit';

type MaintenanceResult = {
  reconciled: number;
  recovered: number;
  compensationsResolved: number;
  expired: number;
  anonymized: number;
  purged: number;
};

test.describe('Storefront checkout maintenance and retention', () => {
  test.describe.configure({ mode: 'serial' });
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('expires an open checkout at active TTL and strips persisted PII', async () => {
    const checkout = await kit.created();
    const withPii = kit.expectSuccess(
      await kit.mutation('checkoutCustomerIdentityUpdate', 'CheckoutCustomerIdentityUpdateInput', {
        checkoutId: checkout.id,
        email: 'expire-me@example.test',
        phone: '+380501234567',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    );
    await expireAt(kit, checkout.id, new Date(Date.now() - 1_000));

    const result = await maintain(kit);

    expect(result.expired).toBeGreaterThanOrEqual(1);
    expect(result.anonymized).toBeGreaterThanOrEqual(1);
    const expired = await kit.read(checkout.id);
    expect(expired).toMatchObject({ id: withPii.id, status: 'EXPIRED' });
    expect(expired!.customerIdentity).toMatchObject({
      customer: null,
      email: null,
      phone: null,
      firstName: null,
      middleName: null,
      lastName: null,
    });
    const row = await kit.persisted(checkout.id);
    expect(row.pii_anonymized_at).not.toBeNull();
    expect(JSON.stringify(await kit.persistedSnapshot(checkout.id))).not.toContain(
      'expire-me@example.test',
    );
  });

  test('does not expire a checkout before its active TTL', async () => {
    const checkout = await kit.created();
    const before = await kit.persistedSnapshot(checkout.id);
    await expireAt(kit, checkout.id, new Date(Date.now() + 60_000));

    await maintain(kit);

    expect((await kit.persisted(checkout.id)).status).toBe('OPEN');
    expect(await kit.persistedSnapshot(checkout.id)).toEqual(before);
  });

  test('purges checkout rows and snapshots only after the retention deadline', async () => {
    const retained = await kit.created();
    const purged = await kit.created();
    await retentionAt(kit, retained.id, new Date(Date.now() + 60_000));
    await retentionAt(kit, purged.id, new Date(Date.now() - 1_000));

    const result = await maintain(kit);

    expect(result.purged).toBeGreaterThanOrEqual(1);
    expect(await kit.read(retained.id)).not.toBeNull();
    expect(await kit.read(purged.id)).toBeNull();
    const [counts] = await kit.sql<{ checkouts: number; snapshots: number }[]>`
      select
        (select count(*)::int from checkout.checkouts where id = ${kit.rawId(purged.id)}) as checkouts,
        (select count(*)::int from checkout.checkout_current_snapshots where checkout_id = ${kit.rawId(purged.id)}) as snapshots
    `;
    expect(counts).toEqual({ checkouts: 0, snapshots: 0 });
  });

  test('does not clean up a checkout while placement owns it', async () => {
    const checkout = await kit.created();
    await expireAt(kit, checkout.id, new Date(Date.now() - 1_000));
    await insertActivePlacement(kit, checkout.id);

    await maintain(kit);

    expect((await kit.persisted(checkout.id)).status).toBe('OPEN');
    expect(await kit.read(checkout.id)).not.toBeNull();
  });

  test('retries and clears only unresolved placement compensations', async () => {
    await kit.createDiscount({ amountMinor: '100000' });
    const checkout = await kit.created({
      items: [{ purchasableId: await kit.variant({ price: 1_000 }), quantity: 1 }],
    });
    expect(checkout).toMatchObject({ status: 'READY', valid: true });
    await kit.withActionOverrides(
      [
        { action: 'order.createOrderFromCheckoutPlacement', mode: 'THROW' },
        { action: 'catalog.releaseCheckoutInventory', mode: 'THROW' },
      ],
      () => place(kit, checkout.id, checkout.resultRevision),
    );
    const [failed] = await kit.sql<{ compensationFailures: Array<{ operation: string }> }[]>`
      select compensation_failures as "compensationFailures"
      from checkout.checkout_placements where checkout_id = ${kit.rawId(checkout.id)}
    `;
    expect(failed!.compensationFailures).toEqual([
      expect.objectContaining({ operation: 'releaseInventory' }),
    ]);

    await kit.withActionOverrides(
      [{ action: 'catalog.releaseCheckoutInventory', mode: 'PASS' }],
      async () => {
        const result = await maintain(kit);
        expect(result.compensationsResolved).toBeGreaterThanOrEqual(1);
        expect(await kit.actionCalls('catalog.releaseCheckoutInventory')).toBe(1);

        await maintain(kit);
        expect(await kit.actionCalls('catalog.releaseCheckoutInventory')).toBe(1);
      },
    );
    const [recovered] = await kit.sql<{ compensationFailures: unknown[] }[]>`
      select compensation_failures as "compensationFailures"
      from checkout.checkout_placements where checkout_id = ${kit.rawId(checkout.id)}
    `;
    expect(recovered!.compensationFailures).toEqual([]);
  });

  test('replays the same maintenance bucket idempotently', async () => {
    const checkout = await kit.created();
    await expireAt(kit, checkout.id, new Date(Date.now() - 1_000));
    const minuteBucket = currentMinuteBucket();
    const idempotencyKey = `checkout-maintenance-replay:${crypto.randomUUID()}`;

    const first = await maintain(kit, minuteBucket, idempotencyKey);
    const rowAfterFirst = await kit.persisted(checkout.id);
    const replay = await maintain(kit, minuteBucket, idempotencyKey);

    expect(first.expired).toBeGreaterThanOrEqual(1);
    expect(first.anonymized).toBeGreaterThanOrEqual(1);
    expect(replay).toEqual(first);
    expect(await kit.persisted(checkout.id)).toEqual(rowAfterFirst);
  });
});

function maintain(
  kit: CheckoutStorefrontTestKit,
  minuteBucket = currentMinuteBucket(),
  idempotencyKey = `checkout-maintenance-e2e:${crypto.randomUUID()}`,
) {
  return kit.runWorkflow<MaintenanceResult>(
    'checkout.maintainCheckout',
    { minuteBucket },
    idempotencyKey,
  );
}

function currentMinuteBucket(): string {
  return new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
}

async function expireAt(kit: CheckoutStorefrontTestKit, checkoutId: string, value: Date) {
  await kit.sql`
    update checkout.checkouts set expires_at = ${value.toISOString()}, updated_at = now()
    where id = ${kit.rawId(checkoutId)}
  `;
}

async function retentionAt(kit: CheckoutStorefrontTestKit, checkoutId: string, value: Date) {
  await kit.sql`
    update checkout.checkouts
    set retention_until = ${value.toISOString()},
        expires_at = least(expires_at, ${value.toISOString()}::timestamptz),
        updated_at = now()
    where id = ${kit.rawId(checkoutId)}
  `;
}

async function insertActivePlacement(kit: CheckoutStorefrontTestKit, checkoutId: string) {
  const persisted = await kit.persisted(checkoutId);
  await kit.sql`
    insert into checkout.checkout_placements (
      store_id, checkout_id, checkout_version, result_revision, idempotency_key,
      request_hash, credential_id, workflow_id, request_input, status
    ) values (
      ${kit.storeId}, ${kit.rawId(checkoutId)}, ${Number(persisted.version)},
      ${String(persisted.result_revision)}, ${crypto.randomUUID()}, ${crypto.randomUUID()},
      'e2e-maintenance', ${`e2e-active-${crypto.randomUUID()}`},
      ${kit.sql.json({ checkoutId: kit.rawId(checkoutId), storeId: kit.storeId })}::jsonb,
      'CLAIMED'
    )
  `;
}

async function place(
  kit: CheckoutStorefrontTestKit,
  checkoutId: string,
  expectedResultRevision: string,
) {
  const response = await kit.graphql<{
    placeOrder: { orderId: string | null; userErrors: Array<{ code: string }> };
  }>(
    `mutation PlaceForMaintenance($input: PlaceOrderInput!) { placeOrder(input: $input) {
      orderId userErrors { code }
    } }`,
    {
      input: {
        checkoutId,
        expectedResultRevision,
        idempotencyKey: crypto.randomUUID(),
      },
    },
  );
  expect(response.errors).toBeUndefined();
  expect(response.data!.placeOrder.orderId).toBeNull();
  expect(response.data!.placeOrder.userErrors).not.toEqual([]);
}
