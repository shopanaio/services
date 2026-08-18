import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { decodeGlobalId } from '@utils/globalid';
import { LoyaltyStorefrontTestKit, OPPORTUNITY_FIELDS } from './loyalty-storefront-test-kit';

const all = { type: 'ALL', conditions: [] };
const window = { type: 'LIFETIME', rollingWindowSeconds: null };
const rule = (triggerType: string, overrides: Record<string, unknown> = {}) => ({
  code: `${triggerType.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
  name: `${triggerType} reward`,
  priority: 10,
  triggerType,
  triggerConfig: {},
  conditions: all,
  actionType: 'AWARD_FIXED_POINTS',
  action: { type: 'AWARD_FIXED_POINTS', points: '25' },
  limits: {},
  ...overrides,
});

test.describe('Loyalty Storefront API account opportunities', () => {
  let kit: LoyaltyStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyStorefrontTestKit(api, request);
    await kit.setupLoyalty();
  });

  test.afterEach(async () => kit.close());

  async function opportunities() {
    return kit.loyaltyAccount(`opportunities {
      primaryOpportunity { ${OPPORTUNITY_FIELDS} }
      opportunities { ${OPPORTUNITY_FIELDS} }
      evaluatedAt validUntil revision
    }`);
  }

  test('returns account opportunities for every non-purchase trigger', async () => {
    const triggers = ['SIGNUP', 'REVIEW', 'REFERRAL', 'BIRTHDAY', 'ANNIVERSARY', 'LOGIN', 'SUBSCRIPTION_RENEWAL', 'CUSTOM_EVENT'];
    await kit.createActiveAccount({ earningRules: triggers.map((trigger) => rule(trigger, {
      triggerConfig: trigger === 'CUSTOM_EVENT' ? { eventType: 'customer.promoted' } : {},
    })) });
    expect((await opportunities())?.opportunities.opportunities.map(({ type }: any) => type))
      .toEqual(['SIGNUP', 'REVIEW', 'REFERRAL', 'BIRTHDAY', 'ANNIVERSARY', 'LOGIN', 'SUBSCRIPTION_RENEWAL', 'CUSTOM']);
  });

  test('excludes ORDER opportunities from the account-level projection', async () => {
    await kit.createActiveAccount({ earningRules: [rule('ORDER'), rule('LOGIN')] });
    expect((await opportunities())?.opportunities.opportunities.map(({ type }: any) => type)).toEqual(['LOGIN']);
  });

  test('selects primaryOpportunity using server priority order', async () => {
    await kit.createActiveAccount({ earningRules: [
      rule('LOGIN', { priority: 20, name: 'Later' }),
      rule('SIGNUP', { priority: 1, name: 'First' }),
    ] });
    const result = await opportunities();
    expect(result?.opportunities.primaryOpportunity?.type).toBe('SIGNUP');
    expect(result?.opportunities.opportunities.map(({ type }: any) => type)).toEqual(['SIGNUP', 'LOGIN']);
  });

  test('returns AVAILABLE for an eligible active account', async () => {
    await kit.createActiveAccount({ earningRules: [rule('LOGIN')] });
    expect((await opportunities())?.opportunities.primaryOpportunity).toMatchObject({
      type: 'LOGIN', state: 'AVAILABLE', remainingUses: null,
    });
  });

  test('returns COMPLETED for a one-time completed action', async () => {
    const fixture = await kit.createActiveAccount({ earningRules: [rule('SIGNUP', {
      limits: { startsAt: null, endsAt: null, perEventMaxPoints: null,
        perAccount: { maxOccurrences: '1', maxPoints: null, window }, campaign: null },
    })] });
    await kit.seedRuleUsage(fixture.version.earningRules[0].id, `account:${decodeGlobalId(fixture.account.id).id}`, { occurrenceCount: '1' });
    expect((await opportunities())?.opportunities.primaryOpportunity).toMatchObject({ state: 'COMPLETED', remainingUses: '0' });
  });

  test('returns LIMIT_REACHED for exhausted account limits', async () => {
    const fixture = await kit.createActiveAccount({ earningRules: [rule('LOGIN', {
      limits: { startsAt: null, endsAt: null, perEventMaxPoints: null,
        perAccount: { maxOccurrences: '2', maxPoints: '25', window }, campaign: null },
    })] });
    await kit.seedRuleUsage(fixture.version.earningRules[0].id, `account:${decodeGlobalId(fixture.account.id).id}`, {
      occurrenceCount: '1', pointsAwarded: '25',
    });
    expect((await opportunities())?.opportunities.primaryOpportunity).toMatchObject({ state: 'LIMIT_REACHED', remainingUses: '1' });
  });

  test('returns BUDGET_EXHAUSTED for exhausted campaign limits', async () => {
    const fixture = await kit.createActiveAccount({ earningRules: [rule('LOGIN', {
      limits: { startsAt: null, endsAt: null, perEventMaxPoints: null, perAccount: null,
        campaign: { maxOccurrences: '1', maxPoints: null, maxMonetaryMinorByCurrency: {} } },
    })] });
    await kit.seedRuleUsage(fixture.version.earningRules[0].id, 'campaign', { occurrenceCount: '1' });
    expect((await opportunities())?.opportunities.primaryOpportunity?.state).toBe('BUDGET_EXHAUSTED');
  });

  test('omits opportunities outside rule reward or version schedules', async () => {
    await kit.createActiveAccount({ earningRules: [rule('LOGIN', {
      limits: { startsAt: new Date(Date.now() + 60_000).toISOString(), endsAt: new Date(Date.now() + 120_000).toISOString(),
        perEventMaxPoints: null, perAccount: null, campaign: null },
    })] });
    expect((await opportunities())?.opportunities.opportunities).toEqual([]);
  });

  test('evaluates segment ANY ALL exclusion and nested boolean conditions', async () => {
    await kit.createActiveAccount({ earningRules: [
      rule('LOGIN', { conditions: { type: 'ALL', conditions: [{ type: 'NOT', condition: { type: 'ANY', conditions: [] } }] } }),
      rule('SIGNUP', { conditions: { type: 'ANY', conditions: [all] } }),
    ] });
    expect((await opportunities())?.opportunities.opportunities.map(({ type }: any) => type)).toEqual(['SIGNUP']);
  });

  test('returns exact reward values for fixed account actions', async () => {
    await kit.createActiveAccount({ earningRules: [rule('LOGIN', {
      action: { type: 'AWARD_FIXED_POINTS', points: '9007199254740993' },
    })] });
    expect((await opportunities())?.opportunities.primaryOpportunity?.reward).toMatchObject({
      kind: 'POINTS', points: { minimum: '9007199254740993', maximum: '9007199254740993' }, accuracy: 'EXACT',
    });
  });

  test('returns localized merchant copy with deterministic fallbacks', async () => {
    await kit.updateCustomerRow({ preferredLocale: 'uk-UA' });
    await kit.createActiveAccount({ earningRules: [rule('LOGIN', { name: 'Localized fallback' })] });
    const opportunity = (await opportunities())?.opportunities.primaryOpportunity;
    expect(opportunity?.presentation).toEqual(opportunity?.reward.copy);
    expect(opportunity?.presentation).toEqual({
      headline: 'Localized fallback', description: null, badge: null,
      accessibilityLabel: 'Localized fallback', terms: [],
    });
  });

  test('returns evaluatedAt validUntil and an opaque revision that changes with inputs', async () => {
    const fixture = await kit.createActiveAccount({ earningRules: [rule('LOGIN', {
      limits: { startsAt: null, endsAt: new Date(Date.now() + 86_400_000).toISOString(),
        perEventMaxPoints: null, perAccount: null, campaign: null },
    })] });
    const before = (await opportunities())?.opportunities;
    expect(new Date(before.evaluatedAt).toISOString()).toBe(before.evaluatedAt);
    expect(before.validUntil).toEqual(expect.any(String));
    await kit.sql`update loyalty.account set revision = revision + 1 where id = ${decodeGlobalId(fixture.account.id).id}`;
    const after = (await opportunities())?.opportunities;
    expect(after.revision).not.toBe(before.revision);
  });
});
