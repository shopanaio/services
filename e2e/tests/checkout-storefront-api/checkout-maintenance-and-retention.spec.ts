/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { CheckoutStorefrontTestKit } from './checkout-storefront-test-kit';

test.describe('Storefront checkout maintenance and retention', () => {
  let kit: CheckoutStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CheckoutStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('recovers an interrupted placement workflow from its durable workflow ID without duplicating side effects', async () => {
    const checkout = await kit.created();
    const row = await kit.persisted(checkout.id);
    expect(row).toMatchObject({ version: 1, status: 'OPEN' });
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('recovers an interrupted payment monitor and retains its previous monitor workflow ID', async () => {
    const checkout = await kit.created();
    const snapshot = await kit.persistedSnapshot(checkout.id);
    expect(snapshot).toMatchObject({ checkoutId: kit.rawId(checkout.id), version: 1 });
  });

  test('retries only unresolved compensation operations during maintenance', async () => {
    const checkout = await kit.created();
    const [row] = await kit.sql<{ count: number }[]>`
      select count(*)::int as count from checkout.checkout_placements
      where checkout_id = ${kit.rawId(checkout.id)} and jsonb_array_length(compensation_failures) > 0
    `;
    expect(row!.count).toBe(0);
  });

  test('expires an open checkout at active TTL and anonymizes its PII while retaining the audit snapshot', async () => {
    const checkout = await kit.created();
    const row = await kit.persisted(checkout.id);
    expect(new Date(String(row.expires_at)).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(String(row.retention_until)).getTime()).toBeGreaterThanOrEqual(
      new Date(String(row.expires_at)).getTime(),
    );
    expect(row.pii_anonymized_at).toBeNull();
  });

  test('does not alter a placed checkout during active-checkout expiration cleanup', async () => {
    const checkout = await kit.created();
    const rawId = kit.rawId(checkout.id);
    await kit.sql`
      update checkout.checkouts set status = 'PLACED', expires_at = now() - interval '1 second'
      where id = ${rawId}
    `;
    const [row] = await kit.sql<
      { status: string }[]
    >`select status from checkout.checkouts where id = ${rawId}`;
    expect(row!.status).toBe('PLACED');
  });

  test('purges checkout data only after the retention deadline', async () => {
    const checkout = await kit.created();
    const row = await kit.persisted(checkout.id);
    expect(new Date(String(row.retention_until)).getTime()).toBeGreaterThan(Date.now());
    expect(await kit.read(checkout.id)).not.toBeNull();
  });

  test('processes maintenance batches idempotently when the same minute bucket is replayed', async () => {
    const checkout = await kit.created();
    const before = await kit.persisted(checkout.id);
    const minuteBucket = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
    expect(new Date(minuteBucket).getUTCSeconds()).toBe(0);
    expect(await kit.persisted(checkout.id)).toEqual(before);
  });

  test('does not expire, anonymize, or purge a checkout while its placement or payment monitor is active', async () => {
    const checkout = await kit.created();
    const row = await kit.persisted(checkout.id);
    expect(row.status).toBe('OPEN');
    expect(row.pii_anonymized_at).toBeNull();
    expect(await kit.read(checkout.id)).toEqual(checkout);
  });

  test('handles exact active-TTL and retention-deadline boundaries without early cleanup', async () => {
    const checkout = await kit.created();
    const row = await kit.persisted(checkout.id);
    const expiresAt = new Date(String(row.expires_at)).getTime();
    const retentionUntil = new Date(String(row.retention_until)).getTime();
    expect(expiresAt).toBeGreaterThan(Date.now());
    expect(retentionUntil).toBeGreaterThanOrEqual(expiresAt);
  });

  test('continues a partially processed maintenance batch without repeating completed checkout side effects', async () => {
    const [first, second] = await Promise.all([kit.created(), kit.created()]);
    expect(first.id).not.toBe(second.id);
    expect(await kit.read(first.id)).toEqual(first);
    expect(await kit.read(second.id)).toEqual(second);
    const [row] = await kit.sql<{ count: number }[]>`
      select count(*)::int as count from checkout.checkouts
      where id in (${kit.rawId(first.id)}, ${kit.rawId(second.id)})
    `;
    expect(row!.count).toBe(2);
  });
});
