/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { createDraft, expectNoUserErrors, expectUserError, idempotencyKey, seedAccount, setupStore } from './helpers';

async function funded(api: any) {
  const { program, version } = await createDraft(api);
  const account = await seedAccount(api, program);
  await api.admin.mutation('loyality-admin-api/PointsAdjust', { variables: { input: { accountId: account.id, expectedBalanceRevision: 1, direction: 'CREDIT', points: '500', reasonCode: 'WALLET_FIXTURE', description: 'wallet fixture', idempotencyKey: idempotencyKey('wallet-points') } } });
  return { program, version, account };
}

async function convert(api: any, fixture: any, overrides: any = {}) {
  return api.admin.mutation('loyality-admin-api/PointsConvertToMonetary', { variables: { input: { accountId: fixture.account.id, programVersionId: fixture.version.id, walletType: 'STORE_CREDIT', currencyCode: 'USD', points: '200', idempotencyKey: idempotencyKey('points-convert'), ...overrides } } });
}

test.describe('Loyalty Admin API monetary wallets', () => {
  test.beforeEach(async ({ api }) => setupStore(api));

  test('converts points to an exact currency wallet amount atomically', async ({ api }) => {
    const fixture = await funded(api);
    const result = await convert(api, fixture);
    const payload = result.data.loyaltyMutation.pointsConvertToMonetary;
    expectNoUserErrors(payload);
    expect(payload).toMatchObject({ account: { id: fixture.account.id, balance: { availablePoints: '300' } }, monetaryWallet: { walletType: 'STORE_CREDIT', currencyCode: 'USD', status: 'ACTIVE', balance: { available: { amountMinor: '200', currencyCode: 'USD' } } }, amount: { amountMinor: '200', currencyCode: 'USD' }, pointsTransaction: { kind: 'ADJUST_DEBIT' }, monetaryTransaction: { kind: 'ADJUST_CREDIT', sourceType: 'POINTS_CONVERSION' } });
  });

  test('creates distinct wallets by type and currency and filters them', async ({ api }) => {
    const fixture = await funded(api);
    const storeCredit = (await convert(api, fixture, { points: '100' })).data.loyaltyMutation.pointsConvertToMonetary.monetaryWallet;
    const cashback = (await convert(api, fixture, { walletType: 'CASHBACK', points: '100' })).data.loyaltyMutation.pointsConvertToMonetary.monetaryWallet;
    expect(cashback.id).not.toBe(storeCredit.id);
    const listed = await api.admin.query<any>('loyality-admin-api/MonetaryWallets', { variables: { first: 20, where: { accountIds: [fixture.account.id], walletTypes: ['CASHBACK'], currencyCodes: ['USD'], statuses: ['ACTIVE'] } } });
    expect(listed.data.loyaltyQuery.monetaryWallets).toEqual([expect.objectContaining({ id: cashback.id, walletType: 'CASHBACK' })]);
  });

  test('credits and debits a wallet with immutable monetary transactions', async ({ api }) => {
    const fixture = await funded(api);
    const wallet = (await convert(api, fixture, { points: '100' })).data.loyaltyMutation.pointsConvertToMonetary.monetaryWallet;
    const credit = await api.admin.mutation<any>('loyality-admin-api/MonetaryWalletAdjust', { variables: { input: { walletId: wallet.id, direction: 'CREDIT', amountMinor: '50', reasonCode: 'MANUAL_CREDIT', idempotencyKey: idempotencyKey('money-credit') } } });
    expectNoUserErrors(credit.data.loyaltyMutation.monetaryWalletAdjust);
    expect(credit.data.loyaltyMutation.monetaryWalletAdjust.monetaryWallet.balance.available.amountMinor).toBe('150');
    const debit = await api.admin.mutation<any>('loyality-admin-api/MonetaryWalletAdjust', { variables: { input: { walletId: wallet.id, direction: 'DEBIT', amountMinor: '40', reasonCode: 'MANUAL_DEBIT', idempotencyKey: idempotencyKey('money-debit') } } });
    expectNoUserErrors(debit.data.loyaltyMutation.monetaryWalletAdjust);
    expect(debit.data.loyaltyMutation.monetaryWalletAdjust.monetaryWallet.balance.available.amountMinor).toBe('110');
    expect(debit.data.loyaltyMutation.monetaryWalletAdjust.transaction.entries).toEqual([expect.objectContaining({ bucket: 'AVAILABLE', amount: { amountMinor: '-40', currencyCode: 'USD' } })]);
  });

  test('rejects insufficient conversion and debit without partial mutation', async ({ api }) => {
    const fixture = await funded(api);
    const wallet = (await convert(api, fixture, { points: '100' })).data.loyaltyMutation.pointsConvertToMonetary.monetaryWallet;
    const tooManyPoints = await convert(api, fixture, { points: '1000' });
    expectUserError(tooManyPoints.data.loyaltyMutation.pointsConvertToMonetary);
    const tooMuchMoney = await api.admin.mutation<any>('loyality-admin-api/MonetaryWalletAdjust', { variables: { input: { walletId: wallet.id, direction: 'DEBIT', amountMinor: '101', reasonCode: 'OVERSPEND', idempotencyKey: idempotencyKey('money-overdraft') } } });
    expectUserError(tooMuchMoney.data.loyaltyMutation.monetaryWalletAdjust);
    const listed = await api.admin.query<any>('loyality-admin-api/MonetaryWallets', { variables: { first: 20, where: { accountIds: [fixture.account.id] } } });
    expect(listed.data.loyaltyQuery.monetaryWallets[0].balance.available.amountMinor).toBe('100');
  });

  test('suspends and closes wallets with optimistic revisions', async ({ api }) => {
    const fixture = await funded(api);
    let wallet = (await convert(api, fixture, { points: '100' })).data.loyaltyMutation.pointsConvertToMonetary.monetaryWallet;
    for (const status of ['SUSPENDED', 'ACTIVE', 'CLOSED'] as const) {
      const result = await api.admin.mutation<any>('loyality-admin-api/MonetaryWalletStatusUpdate', { variables: { input: { walletId: wallet.id,  status, reasonCode: `ADMIN_${status}`, idempotencyKey: idempotencyKey(`wallet-${status}`) } } });
      expectNoUserErrors(result.data.loyaltyMutation.monetaryWalletStatusUpdate);
      wallet = result.data.loyaltyMutation.monetaryWalletStatusUpdate.monetaryWallet;
      expect(wallet.status).toBe(status);
    }
  });
});
