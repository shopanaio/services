import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

const metric = {
  type: 'METRIC', metric: 'QUALIFYING_POINTS', customMetricCode: null,
  operator: 'GTE', threshold: '100', currencyCode: null,
};
const tier = (code: string, name: string, rank: number) => ({
  code, name, rank, qualification: metric, maintenance: null,
});

test.describe('Loyalty tiers and benefits end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  test('presents the current effective tier without internal qualification policy', async () => {
    const fixture = await kit.createActiveAccount({ tiers: [tier('gold', 'Gold', 10)] });
    await kit.seedTierMembership(fixture.account, fixture.version);
    const result = await kit.loyaltyAccount('tier { code name rank effectiveFrom effectiveTo }');
    expect(result?.tier).toMatchObject({ code: 'gold', name: 'Gold', rank: 10 });
    expect(JSON.stringify(result)).not.toMatch(/qualification|threshold|metric/iu);
  });

  test('upgrades and revokes a membership atomically in customer projection', async () => {
    const fixture = await kit.createActiveAccount({
      tiers: [tier('silver', 'Silver', 5), tier('gold', 'Gold', 10)],
    });
    const membership = await kit.seedTierMembership(fixture.account, fixture.version);
    expect((await kit.loyaltyAccount('tier { code }'))?.tier.code).toBe('silver');
    await kit.sql`
      update loyalty.tier_membership
      set tier_id = ${decodeGlobalId(fixture.version.tiers[1].id).id}, revision = revision + 1
      where id = ${membership.membershipId}
    `;
    expect((await kit.loyaltyAccount('tier { code }'))?.tier.code).toBe('gold');
    await kit.sql`
      update loyalty.tier_membership set status = 'REVOKED', effective_to = now(), revision = revision + 1
      where id = ${membership.membershipId}
    `;
    expect(await kit.loyaltyAccount('tier { code }')).toEqual({ tier: null });
  });

  test('honors effective membership boundaries', async () => {
    const fixture = await kit.createActiveAccount({ tiers: [tier('gold', 'Gold', 10)] });
    await kit.seedTierMembership(fixture.account, fixture.version, {
      effectiveFrom: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(await kit.loyaltyAccount('tier { code }')).toEqual({ tier: null });
  });
});
