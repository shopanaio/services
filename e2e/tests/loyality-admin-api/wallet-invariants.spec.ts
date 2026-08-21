/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { LoyaltyE2eTestKit } from '../loyality-e2e-api/loyalty-e2e-test-kit';
import { expectNoUserErrors, expectUserError, idempotencyKey } from './helpers';

test.describe('Loyalty Admin API monetary wallet invariants', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setupAdmin();
  });
  test.afterEach(async () => kit.close());

  async function fundedWallet(amount = '100') {
    const fixture = await kit.fundedAccount('1000');
    const converted = await kit.api.admin.mutation<any>('loyality-admin-api/PointsConvertToMonetary', {
      variables: { input: {
        accountId: fixture.account.id, programVersionId: fixture.version.id,
        walletType: 'STORE_CREDIT', currencyCode: 'USD', points: amount,
        idempotencyKey: idempotencyKey('wallet-fixture'),
      } },
    });
    expectNoUserErrors(converted.data.loyaltyMutation.pointsConvertToMonetary);
    return { fixture, wallet: converted.data.loyaltyMutation.pointsConvertToMonetary.monetaryWallet };
  }

  test('replays equal adjustments and rejects conflicting idempotency reuse', async () => {
    const { wallet } = await fundedWallet();
    const key = idempotencyKey('wallet-adjust-replay');
    const input = { walletId: wallet.id, direction: 'CREDIT', amountMinor: '50', reasonCode: 'REPLAY', idempotencyKey: key };
    const first = await kit.api.admin.mutation<any>('loyality-admin-api/MonetaryWalletAdjust', { variables: { input } });
    const replay = await kit.api.admin.mutation<any>('loyality-admin-api/MonetaryWalletAdjust', { variables: { input } });
    expectNoUserErrors(first.data.loyaltyMutation.monetaryWalletAdjust);
    expectNoUserErrors(replay.data.loyaltyMutation.monetaryWalletAdjust);
    expect(replay.data.loyaltyMutation.monetaryWalletAdjust.transaction.id)
      .toBe(first.data.loyaltyMutation.monetaryWalletAdjust.transaction.id);
    const conflict = await kit.api.admin.mutation<any>('loyality-admin-api/MonetaryWalletAdjust', {
      variables: { input: { ...input, amountMinor: '51' } },
    });
    expectUserError(conflict.data.loyaltyMutation.monetaryWalletAdjust, 'IDEMPOTENCY_CONFLICT');
  });

  test('rejects stale status changes and all operations after close', async () => {
    const { wallet } = await fundedWallet();
    const suspended = await kit.api.admin.mutation<any>('loyality-admin-api/MonetaryWalletStatusUpdate', {
      variables: { input: {
        walletId: wallet.id,  status: 'SUSPENDED', reasonCode: 'RISK',
        idempotencyKey: idempotencyKey('wallet-suspend'),
      } },
    });
    expectNoUserErrors(suspended.data.loyaltyMutation.monetaryWalletStatusUpdate);
    const stale = await kit.api.admin.mutation<any>('loyality-admin-api/MonetaryWalletStatusUpdate', {
      variables: { input: {
        walletId: wallet.id,  status: 'ACTIVE', reasonCode: 'STALE',
        idempotencyKey: idempotencyKey('wallet-stale'),
      } },
    });
    expectUserError(stale.data.loyaltyMutation.monetaryWalletStatusUpdate, 'WALLET_CONCURRENT_CHANGE');
    const current = suspended.data.loyaltyMutation.monetaryWalletStatusUpdate.monetaryWallet;
    const closed = await kit.api.admin.mutation<any>('loyality-admin-api/MonetaryWalletStatusUpdate', {
      variables: { input: {
        walletId: wallet.id,  status: 'CLOSED', reasonCode: 'CLOSE',
        idempotencyKey: idempotencyKey('wallet-close'),
      } },
    });
    expectNoUserErrors(closed.data.loyaltyMutation.monetaryWalletStatusUpdate);
    const adjustment = await kit.api.admin.mutation<any>('loyality-admin-api/MonetaryWalletAdjust', {
      variables: { input: {
        walletId: wallet.id, direction: 'CREDIT', amountMinor: '1', reasonCode: 'CLOSED_CREDIT',
        idempotencyKey: idempotencyKey('closed-wallet-adjust'),
      } },
    });
    expectUserError(adjustment.data.loyaltyMutation.monetaryWalletAdjust, 'WALLET_NOT_ACTIVE');
    const reopen = await kit.api.admin.mutation<any>('loyality-admin-api/MonetaryWalletStatusUpdate', {
      variables: { input: {
        walletId: wallet.id,
        
        status: 'ACTIVE', reasonCode: 'INVALID_REOPEN', idempotencyKey: idempotencyKey('wallet-reopen'),
      } },
    });
    expectUserError(reopen.data.loyaltyMutation.monetaryWalletStatusUpdate, 'WALLET_CLOSED');
  });

  test('serializes concurrent debits without monetary overspend', async () => {
    const { fixture, wallet } = await fundedWallet('100');
    const calls = await Promise.all([1, 2].map((index) => kit.api.admin.mutation<any>(
      'loyality-admin-api/MonetaryWalletAdjust',
      { variables: { input: {
        walletId: wallet.id, direction: 'DEBIT', amountMinor: '80', reasonCode: 'CONCURRENT_DEBIT',
        idempotencyKey: idempotencyKey(`wallet-debit-${index}`),
      } } },
    )));
    expect(calls.filter(({ data }: any) => data.loyaltyMutation.monetaryWalletAdjust.userErrors.length === 0)).toHaveLength(1);
    expect(calls.filter(({ data }: any) => data.loyaltyMutation.monetaryWalletAdjust.userErrors.length > 0)).toHaveLength(1);
    const listed = await kit.api.admin.query<any>('loyality-admin-api/MonetaryWallets', {
      variables: { first: 20, where: { accountIds: [fixture.account.id] } },
    });
    const balance = calls.find(({ data }: any) => data.loyaltyMutation.monetaryWalletAdjust.monetaryWallet)
      ?.data.loyaltyMutation.monetaryWalletAdjust.monetaryWallet.balance;
    expect(balance.available.amountMinor).toBe('20');
    expect(listed.data.loyaltyQuery.monetaryWallets[0].balance.available.amountMinor).toBe('20');
  });

  test('expires monetary lots once and rebuilds a corrupted wallet projection', async () => {
    const { fixture, wallet } = await fundedWallet('100');
    const occurredAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const expiresAt = new Date(Date.now() - 86_400_000).toISOString();
    const credit = await kit.api.admin.mutation<any>('loyality-admin-api/MonetaryWalletAdjust', {
      variables: { input: {
        walletId: wallet.id, direction: 'CREDIT', amountMinor: '50', reasonCode: 'EXPIRING_CREDIT',
        occurredAt, expiresAt, idempotencyKey: idempotencyKey('expired-wallet-credit'),
      } },
    });
    expectNoUserErrors(credit.data.loyaltyMutation.monetaryWalletAdjust);
    const maintenance = await kit.api.admin.mutation<any>('loyality-admin-api/MaintenanceRun', {
      variables: { input: { effectiveAt: new Date().toISOString(), limit: 100, idempotencyKey: idempotencyKey('wallet-expiration') } },
    });
    expect(maintenance.data.loyaltyMutation.maintenanceRun.result.expiredMonetaryLots).toBe(1);
    await kit.sql`
      update loyalty.monetary_wallet_balance set available_amount_minor = 999, revision = revision + 1
      where wallet_id = ${decodeGlobalId(wallet.id).id}
    `;
    const rebuilt = await kit.api.admin.mutation<any>('loyality-admin-api/MonetaryWalletBalanceRebuild', {
      variables: { input: { walletId: wallet.id, idempotencyKey: idempotencyKey('wallet-balance-rebuild') } },
    });
    expectNoUserErrors(rebuilt.data.loyaltyMutation.monetaryWalletBalanceRebuild);
    expect(rebuilt.data.loyaltyMutation.monetaryWalletBalanceRebuild.monetaryWallet.balance.available.amountMinor).toBe('100');
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('900');
  });
});
