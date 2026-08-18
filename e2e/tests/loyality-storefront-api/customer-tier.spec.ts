import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { LoyaltyStorefrontTestKit } from './loyalty-storefront-test-kit';

const metric = { type: 'METRIC', metric: 'QUALIFYING_POINTS', customMetricCode: null,
  operator: 'GTE', threshold: '100', currencyCode: null };
const tier = (code = 'gold', name = 'Gold', rank = 10) => ({ code, name, rank, qualification: metric, maintenance: null });

test.describe('Loyalty Storefront API customer tier', () => {
  let kit: LoyaltyStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyStorefrontTestKit(api, request);
    await kit.setupLoyalty();
  });

  test.afterEach(async () => kit.close());

  test('returns the current active tier membership', async () => {
    const fixture = await kit.createActiveAccount({ tiers: [tier('vip', 'VIP', 20)] });
    const effectiveFrom = new Date(Date.now() - 60_000).toISOString();
    const effectiveTo = new Date(Date.now() + 60_000).toISOString();
    await kit.seedTierMembership(fixture.account, fixture.version, {
      effectiveFrom, effectiveTo,
    });
    expect(await kit.loyaltyAccount('tier { code name rank effectiveFrom effectiveTo }')).toEqual({
      tier: { code: 'vip', name: 'VIP', rank: 20, effectiveFrom, effectiveTo },
    });
  });

  test('returns null before a membership effectiveFrom boundary', async () => {
    const fixture = await kit.createActiveAccount({ tiers: [tier()] });
    await kit.seedTierMembership(fixture.account, fixture.version, {
      effectiveFrom: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(await kit.loyaltyAccount('tier { code }')).toEqual({ tier: null });
  });

  test('returns null at and after a membership effectiveTo boundary', async () => {
    const fixture = await kit.createActiveAccount({ tiers: [tier()] });
    await kit.seedTierMembership(fixture.account, fixture.version, {
      effectiveFrom: new Date(Date.now() - 120_000).toISOString(),
      effectiveTo: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(await kit.loyaltyAccount('tier { code }')).toEqual({ tier: null });
  });

  test('reflects qualification upgrade downgrade renewal and revocation', async () => {
    const fixture = await kit.createActiveAccount({ tiers: [tier('silver', 'Silver', 5), tier('gold', 'Gold', 10)] });
    const membership = await kit.seedTierMembership(fixture.account, fixture.version);
    expect((await kit.loyaltyAccount('tier { code rank }'))?.tier).toEqual({ code: 'silver', rank: 5 });
    await kit.sql`update loyalty.tier_membership set tier_id = ${decodeGlobalId(fixture.version.tiers[1].id).id}
      where id = ${membership.membershipId}`;
    expect((await kit.loyaltyAccount('tier { code rank }'))?.tier).toEqual({ code: 'gold', rank: 10 });
    await kit.sql`update loyalty.tier_membership set status = 'REVOKED', effective_to = now()
      where id = ${membership.membershipId}`;
    expect(await kit.loyaltyAccount('tier { code }')).toEqual({ tier: null });
  });

  test('does not expose tier qualification metrics or internal event metadata', async () => {
    const fixture = await kit.createActiveAccount({ tiers: [tier()] });
    await kit.seedTierMembership(fixture.account, fixture.version);
    const result = await kit.loyaltyAccount('tier { code name rank effectiveFrom effectiveTo }');
    expect(result?.tier).toEqual(expect.objectContaining({ code: 'gold', name: 'Gold', rank: 10 }));
    expect(JSON.stringify(result)).not.toMatch(/qualification|snapshot|event|reason|points/iu);
    const introspection = await kit.graphql<{ type: { fields: Array<{ name: string }> } }>(
      `query TierShape { type: __type(name: "LoyaltyTier") { fields { name } } }`,
    );
    expect(introspection.data?.type.fields.map(({ name }) => name).sort()).toEqual(
      ['code', 'effectiveFrom', 'effectiveTo', 'name', 'rank'].sort(),
    );
  });
});
