/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { idempotencyKey } from '../loyality-admin-api/helpers';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty customer and store lifecycle events end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  function lifecycleEvent(eventType: string, payload: Record<string, unknown>) {
    const eventId = crypto.randomUUID();
    return {
      eventId,
      eventType,
      timestamp: new Date().toISOString(),
      source: eventType.startsWith('store') ? 'project' : 'customers',
      emitKey: `${eventType}:${eventId}`,
      context: {
        organizationId: kit.realm.organizationId,
        correlationId: crypto.randomUUID(),
      },
      subject: { type: eventType.startsWith('store') ? 'store' : 'customer', id: crypto.randomUUID() },
      payload,
    };
  }

  async function convertToWallet(fixture: any, points = '100') {
    const result = await kit.api.admin.mutation<any>('loyality-admin-api/PointsConvertToMonetary', {
      variables: { input: {
        accountId: fixture.account.id,
        programVersionId: fixture.version.id,
        walletType: 'STORE_CREDIT',
        currencyCode: 'USD',
        points,
        idempotencyKey: idempotencyKey('lifecycle-convert'),
      } },
    });
    expect(result.data.loyaltyMutation.pointsConvertToMonetary.userErrors).toEqual([]);
    return result.data.loyaltyMutation.pointsConvertToMonetary.monetaryWallet;
  }

  test('merges points and monetary wallets exactly once into the target customer', async () => {
    const source = await kit.fundedAccount('500');
    const sourceWallet = await convertToWallet(source, '100');
    const targetCustomerId = crypto.randomUUID();
    const completedAt = new Date().toISOString();
    const event = lifecycleEvent('customerMerged', {
      schemaVersion: 1,
      storeId: kit.realm.storeId,
      mergeId: crypto.randomUUID(),
      mergeRevision: 1,
      sourceCustomerId: kit.customer.rawId,
      targetCustomerId,
      completedAt,
    });
    expect(await kit.deliverEvent(event)).toEqual({ success: true });
    expect(await kit.deliverEvent(event)).toEqual({ success: true });

    const [sourceAccount] = await kit.sql<any[]>`
      select status, merged_into_account_id as "mergedIntoAccountId", closed_at as "closedAt"
      from loyalty.account where id = ${decodeGlobalId(source.account.id).id}
    `;
    const [targetAccount] = await kit.sql<any[]>`
      select id, status from loyalty.account
      where customer_id = ${targetCustomerId}
        and program_id = ${decodeGlobalId(source.program.id).id}
    `;
    expect(sourceAccount).toMatchObject({
      status: 'MERGED', mergedIntoAccountId: targetAccount.id,
    });
    expect(new Date(sourceAccount.closedAt).toISOString()).toBe(completedAt);
    expect(targetAccount.status).toBe('ACTIVE');

    const [targetBalance] = await kit.sql<any[]>`
      select pending_points as "pendingPoints", available_points as "availablePoints",
             reserved_points as "reservedPoints", debt_points as "debtPoints"
      from loyalty.account_balance where account_id = ${targetAccount.id}
    `;
    expect(targetBalance).toEqual({
      pendingPoints: '0', availablePoints: '400', reservedPoints: '0', debtPoints: '0',
    });

    const wallets = await kit.sql<any[]>`
      select w.id, w.account_id as "accountId", w.status,
             w.merged_into_wallet_id as "mergedIntoWalletId",
             b.pending_amount_minor as "pendingAmountMinor",
             b.available_amount_minor as "availableAmountMinor",
             b.reserved_amount_minor as "reservedAmountMinor"
      from loyalty.monetary_wallet w
      join loyalty.monetary_wallet_balance b on b.wallet_id = w.id
      where w.id = ${decodeGlobalId(sourceWallet.id).id} or w.account_id = ${targetAccount.id}
      order by w.account_id
    `;
    const mergedWallet = wallets.find(({ id }: any) => id === decodeGlobalId(sourceWallet.id).id);
    const targetWallet = wallets.find(({ accountId }: any) => accountId === targetAccount.id);
    expect(mergedWallet).toMatchObject({
      status: 'MERGED', mergedIntoWalletId: targetWallet.id,
      pendingAmountMinor: '0', availableAmountMinor: '0', reservedAmountMinor: '0',
    });
    expect(targetWallet).toMatchObject({
      status: 'ACTIVE', pendingAmountMinor: '0', availableAmountMinor: '100', reservedAmountMinor: '0',
    });
  });

  test('rolls merge back for an active reservation and succeeds on a retry after release', async () => {
    const source = await kit.fundedAccount('200');
    const context = kit.checkoutContext();
    const quoted = await kit.quote(source, '100', context);
    const reserved = await kit.reserve(context, quoted.quote);
    expect(reserved.status).toBe('RESERVED');
    const event = lifecycleEvent('customerMerged', {
      schemaVersion: 1,
      storeId: kit.realm.storeId,
      mergeId: crypto.randomUUID(),
      mergeRevision: 1,
      sourceCustomerId: kit.customer.rawId,
      targetCustomerId: crypto.randomUUID(),
      completedAt: new Date().toISOString(),
    });
    expect(await kit.deliverEvent(event)).toMatchObject({
      success: false,
      error: { code: 'CUSTOMER_LOYALTY_MERGE_FAILED', retryable: true },
    });
    const [account] = await kit.sql<any[]>`
      select status, merged_into_account_id as "mergedIntoAccountId"
      from loyalty.account where id = ${decodeGlobalId(source.account.id).id}
    `;
    expect(account).toEqual({ status: 'ACTIVE', mergedIntoAccountId: null });
    expect(await kit.accountBalance(source.account.id)).toMatchObject({
      availablePoints: '100', reservedPoints: '100',
    });
    expect(await kit.transactionCount(source.account.id, ['MERGE_TRANSFER'])).toBe(0);

    expect((await kit.release(context, reserved)).status).toBe('RELEASED');
    expect(await kit.deliverEvent(event)).toEqual({ success: true });
    const [recovered] = await kit.sql<any[]>`
      select status, merged_into_account_id as "mergedIntoAccountId"
      from loyalty.account where id = ${decodeGlobalId(source.account.id).id}
    `;
    expect(recovered).toMatchObject({
      status: 'MERGED', mergedIntoAccountId: expect.any(String),
    });
  });

  test('closes all customer accounts and wallets idempotently on customer deletion', async () => {
    const fixture = await kit.fundedAccount('200');
    const wallet = await convertToWallet(fixture, '50');
    const deletedAt = new Date().toISOString();
    const event = lifecycleEvent('customerDeleted', {
      schemaVersion: 1,
      customerId: kit.customer.rawId,
      storeId: kit.realm.storeId,
      revision: 1,
      deletedAt,
    });
    expect(await kit.deliverEvent(event)).toEqual({ success: true });
    expect(await kit.deliverEvent(event)).toEqual({ success: true });
    const [account] = await kit.sql<any[]>`
      select status, closed_at as "closedAt", revision
      from loyalty.account where id = ${decodeGlobalId(fixture.account.id).id}
    `;
    const [storedWallet] = await kit.sql<any[]>`
      select status, closed_at as "closedAt", revision
      from loyalty.monetary_wallet where id = ${decodeGlobalId(wallet.id).id}
    `;
    expect(account).toMatchObject({ status: 'CLOSED', revision: 2 });
    expect(storedWallet).toMatchObject({ status: 'CLOSED', revision: 2 });
    expect(new Date(account.closedAt).toISOString()).toBe(deletedAt);
    expect(new Date(storedWallet.closedAt).toISOString()).toBe(deletedAt);
  });

  test('closes every non-merged account in the store and replays the workflow result', async () => {
    const first = await kit.createActiveAccount();
    const second = await kit.createActiveAccount();
    const event = lifecycleEvent('storeDeleted', {
      schemaVersion: 1,
      storeId: kit.realm.storeId,
      organizationId: kit.realm.organizationId,
    });
    expect(await kit.deliverEvent(event)).toMatchObject({
      success: true, data: { closedAccounts: 2 },
    });
    expect(await kit.deliverEvent(event)).toMatchObject({
      success: true, data: { closedAccounts: 2 },
    });
    const firstId = decodeGlobalId(first.account.id).id;
    const secondId = decodeGlobalId(second.account.id).id;
    const rows = await kit.sql<any[]>`
      select id, status from loyalty.account
      where id in (${firstId}, ${secondId})
      order by id
    `;
    expect(rows).toHaveLength(2);
    expect(rows.every(({ status }: any) => status === 'CLOSED')).toBe(true);
  });
});
