import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { LoyaltyStorefrontTestKit } from './loyalty-storefront-test-kit';

test.describe('Loyalty Storefront API balances and expirations', () => {
  let kit: LoyaltyStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyStorefrontTestKit(api, request);
    await kit.setupLoyalty();
  });

  test.afterEach(async () => kit.close());

  test('returns pending available reserved and debt point buckets as unsigned strings', async () => {
    const { account } = await kit.createActiveAccount();
    await kit.setBalance(account, {
      pendingPoints: '9007199254740993',
      availablePoints: '9007199254740994',
      reservedPoints: '9007199254740995',
      debtPoints: '9007199254740996',
    });
    expect(await kit.loyaltyAccount('balance { pendingPoints availablePoints reservedPoints debtPoints }'))
      .toEqual({ balance: {
        pendingPoints: '9007199254740993', availablePoints: '9007199254740994',
        reservedPoints: '9007199254740995', debtPoints: '9007199254740996',
      } });
  });

  test('updates the balance projection after earning activation reservation and redemption', async () => {
    const { account } = await kit.createActiveAccount();
    const credit = await kit.adjustPoints(account, 'CREDIT', '120');
    expect((await kit.loyaltyAccount('balance { availablePoints }'))?.balance.availablePoints).toBe('120');
    await kit.adjustPoints(account, 'DEBIT', '45', credit.account.balance.revision);
    expect((await kit.loyaltyAccount('balance { availablePoints }'))?.balance.availablePoints).toBe('75');
  });

  test('aggregates point lots that expire at the same timestamp', async () => {
    const { account } = await kit.createActiveAccount();
    const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
    const first = await kit.adjustPoints(account, 'CREDIT', '10', 1, 'first lot', expiresAt);
    await kit.adjustPoints(account, 'CREDIT', '15', first.account.balance.revision, 'second lot', expiresAt);
    expect(await kit.loyaltyAccount('upcomingExpirations { points expiresAt }')).toEqual({
      upcomingExpirations: [{ points: '25', expiresAt }],
    });
  });

  test('orders upcoming expirations ascending and limits them to twenty entries', async () => {
    const { account } = await kit.createActiveAccount();
    let revision = 1;
    const dates: string[] = [];
    for (let index = 0; index < 21; index += 1) {
      const expiresAt = new Date(Date.now() + (index + 1) * 86_400_000).toISOString();
      dates.push(expiresAt);
      const result = await kit.adjustPoints(account, 'CREDIT', '1', revision, `lot ${index}`, expiresAt);
      revision = result.account.balance.revision;
    }
    const result = await kit.loyaltyAccount('upcomingExpirations { points expiresAt }');
    expect(result?.upcomingExpirations).toHaveLength(20);
    expect(result?.upcomingExpirations.map(({ expiresAt }: { expiresAt: string }) => expiresAt)).toEqual(dates.slice(0, 20));
  });

  test('excludes expired and fully allocated point lots', async () => {
    const { account } = await kit.createActiveAccount();
    const soon = new Date(Date.now() + 86_400_000).toISOString();
    const later = new Date(Date.now() + 172_800_000).toISOString();
    let result = await kit.adjustPoints(account, 'CREDIT', '10', 1, 'depleted lot', soon);
    result = await kit.adjustPoints(account, 'CREDIT', '20', result.account.balance.revision, 'remaining lot', later);
    await kit.adjustPoints(account, 'DEBIT', '10', result.account.balance.revision);
    const accountId = decodeGlobalId(account.id).id;
    const [depleted] = await kit.sql<{ remaining: string }[]>`
      select (lot.points_issued - coalesce(sum(allocation.points), 0))::text as remaining
      from loyalty.point_lot lot left join loyalty.lot_allocation allocation on allocation.lot_id = lot.id
      where lot.account_id = ${accountId} and lot.expires_at = ${soon}
      group by lot.id
    `;
    expect(depleted?.remaining).toBe('0');
    expect(await kit.loyaltyAccount('upcomingExpirations { points expiresAt }')).toEqual({
      upcomingExpirations: [{ points: '20', expiresAt: later }],
    });
  });

  test('reflects original and reset restored-points expiry policies', async () => {
    const { account } = await kit.createActiveAccount();
    const originalExpiry = new Date(Date.now() + 86_400_000).toISOString();
    const resetExpiry = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const first = await kit.adjustPoints(account, 'CREDIT', '5', 1, 'original expiry', originalExpiry);
    await kit.adjustPoints(account, 'CREDIT', '7', first.account.balance.revision, 'reset expiry', resetExpiry);
    expect((await kit.loyaltyAccount('upcomingExpirations { points expiresAt }'))?.upcomingExpirations)
      .toEqual([{ points: '5', expiresAt: originalExpiry }, { points: '7', expiresAt: resetExpiry }]);
  });

  test('never returns negative unsigned storefront balances', async () => {
    const { account } = await kit.createActiveAccount();
    await kit.setBalance(account, { debtPoints: '25' });
    const balance = (await kit.loyaltyAccount('balance { pendingPoints availablePoints reservedPoints debtPoints }'))?.balance;
    expect(balance).toEqual({ pendingPoints: '0', availablePoints: '0', reservedPoints: '0', debtPoints: '25' });
    for (const value of Object.values(balance)) expect(BigInt(value as string)).toBeGreaterThanOrEqual(0n);
  });
});
