/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { idempotencyKey } from '../loyality-admin-api/helpers';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty monetary wallets end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  async function convert(fixture: any, overrides: Record<string, unknown> = {}) {
    return kit.api.admin.mutation<any>('loyality-admin-api/PointsConvertToMonetary', {
      variables: { input: {
        accountId: fixture.account.id, programVersionId: fixture.version.id,
        walletType: 'STORE_CREDIT', currencyCode: 'USD', points: '200',
        idempotencyKey: idempotencyKey('convert'), ...overrides,
      } },
    });
  }

  test('converts points into exact monetary credit atomically', async () => {
    const fixture = await kit.fundedAccount('500');
    const result = await convert(fixture);
    const payload = result.data.loyaltyMutation.pointsConvertToMonetary;
    expect(payload.userErrors).toEqual([]);
    expect(payload).toMatchObject({
      account: { balance: { availablePoints: '300' } },
      monetaryWallet: {
        walletType: 'STORE_CREDIT', currencyCode: 'USD',
        balance: { available: { amountMinor: '200', currencyCode: 'USD' } },
      },
      pointsTransaction: { kind: 'ADJUST_DEBIT' },
      monetaryTransaction: { kind: 'ADJUST_CREDIT', sourceType: 'POINTS_CONVERSION' },
    });
  });

  test('keeps cashback and store-credit wallets separate', async () => {
    const fixture = await kit.fundedAccount('500');
    const credit = (await convert(fixture, { points: '100' })).data.loyaltyMutation.pointsConvertToMonetary.monetaryWallet;
    const cashback = (await convert(fixture, { points: '100', walletType: 'CASHBACK' }))
      .data.loyaltyMutation.pointsConvertToMonetary.monetaryWallet;
    expect(cashback.id).not.toBe(credit.id);
    const listed = await kit.api.admin.query<any>('loyality-admin-api/MonetaryWallets', {
      variables: { first: 20, where: { accountIds: [fixture.account.id] } },
    });
    expect(listed.data.loyaltyQuery.monetaryWallets.map(({ walletType }: any) => walletType).sort())
      .toEqual(['CASHBACK', 'STORE_CREDIT']);
  });

  test('prevents overspend and duplicate conversion', async () => {
    const fixture = await kit.fundedAccount('250');
    const key = idempotencyKey('same-conversion');
    const first = await convert(fixture, { points: '200', idempotencyKey: key });
    const replay = await convert(fixture, { points: '200', idempotencyKey: key });
    expect(replay.data.loyaltyMutation.pointsConvertToMonetary.monetaryTransaction.id)
      .toBe(first.data.loyaltyMutation.pointsConvertToMonetary.monetaryTransaction.id);
    const rejected = await convert(fixture, { points: '100' });
    expect(rejected.data.loyaltyMutation.pointsConvertToMonetary.userErrors.length).toBeGreaterThan(0);
    expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('50');
  });

  test('adjusts wallet credit and debit without touching the points ledger', async () => {
    const fixture = await kit.fundedAccount('300');
    const wallet = (await convert(fixture, { points: '100' }))
      .data.loyaltyMutation.pointsConvertToMonetary.monetaryWallet;
    const pointTransactions = await kit.transactionCount(fixture.account.id);
    for (const [direction, amountMinor] of [['CREDIT', '50'], ['DEBIT', '25']] as const) {
      const result = await kit.api.admin.mutation<any>('loyality-admin-api/MonetaryWalletAdjust', {
        variables: { input: {
          walletId: wallet.id, direction, amountMinor, reasonCode: `E2E_${direction}`,
          idempotencyKey: idempotencyKey(`wallet-${direction}`),
        } },
      });
      expect(result.data.loyaltyMutation.monetaryWalletAdjust.userErrors).toEqual([]);
    }
    expect(await kit.transactionCount(fixture.account.id)).toBe(pointTransactions);
  });
});
