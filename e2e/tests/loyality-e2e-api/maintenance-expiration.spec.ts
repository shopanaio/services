/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { idempotencyKey } from '../loyality-admin-api/helpers';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

test.describe('Loyalty maintenance and expiration end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  async function maintenance(effectiveAt = new Date().toISOString(), key = idempotencyKey('maintenance')) {
    return kit.api.admin.mutation<any>('loyality-admin-api/MaintenanceRun', {
      variables: { input: { effectiveAt, limit: 100, idempotencyKey: key } },
    });
  }

  test('expires points and removes them from storefront upcoming expirations', async () => {
    const fixture = await kit.createActiveAccount();
    const expiresAt = new Date(Date.now() + 2_000).toISOString();
    await kit.adjustPoints(fixture.account, 'CREDIT', '50', 1, 'expiring e2e points', expiresAt);
    expect((await kit.loyaltyAccount('upcomingExpirations { points expiresAt }'))?.upcomingExpirations)
      .toEqual([{ points: '50', expiresAt }]);
    const run = await maintenance(new Date(Date.parse(expiresAt) + 1).toISOString());
    expect(run.data.loyaltyMutation.maintenanceRun.result.expiredPointLots).toBe(1);
    expect(await kit.loyaltyAccount('balance { availablePoints } upcomingExpirations { points }'))
      .toEqual({ balance: { availablePoints: '0' }, upcomingExpirations: [] });
  });

  test('processes bounded work once and is idempotent when no work remains', async () => {
    const fixture = await kit.createActiveAccount();
    const expiredAt = new Date(Date.now() - 1_000).toISOString();
    let revision = 1;
    for (const points of ['10', '20', '30']) {
      const adjusted = await kit.adjustPoints(fixture.account, 'CREDIT', points, revision, points, expiredAt);
      revision = adjusted.account.balance.revision;
    }
    const first = await maintenance();
    expect(first.data.loyaltyMutation.maintenanceRun.result.expiredPointLots).toBe(3);
    const second = await maintenance();
    expect(second.data.loyaltyMutation.maintenanceRun.result.expiredPointLots).toBe(0);
  });

  test('rebuilds the balance projection from immutable ledger entries', async () => {
    const fixture = await kit.fundedAccount('75');
    await kit.sql`
      update loyalty.account_balance set available_points = 1
      where account_id = ${decodeGlobalId(fixture.account.id).id}
    `;
    const rebuilt = await kit.api.admin.mutation<any>('loyality-admin-api/AccountBalanceRebuild', {
      variables: { input: {
        accountId: fixture.account.id, idempotencyKey: idempotencyKey('rebuild-e2e'),
      } },
    });
    expect(rebuilt.data.loyaltyMutation.accountBalanceRebuild.userErrors).toEqual([]);
    expect(rebuilt.data.loyaltyMutation.accountBalanceRebuild.balance.availablePoints).toBe('75');
  });
});
