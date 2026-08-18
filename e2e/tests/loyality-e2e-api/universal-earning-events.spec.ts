/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { OPPORTUNITY_FIELDS } from '../loyality-storefront-api/loyalty-storefront-test-kit';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

const conditions = { type: 'ALL', conditions: [] };
const rule = (triggerType: string, overrides: Record<string, unknown> = {}) => ({
  code: `${triggerType.toLowerCase()}-${crypto.randomUUID().slice(0, 8)}`,
  name: `${triggerType} reward`, priority: 10, triggerType,
  triggerConfig: triggerType === 'CUSTOM_EVENT' ? { eventType: 'customer.promoted' } : {},
  conditions, actionType: 'AWARD_FIXED_POINTS',
  action: { type: 'AWARD_FIXED_POINTS', points: '25' }, limits: {}, ...overrides,
});

test.describe('Loyalty universal earning events end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  async function opportunities() {
    return kit.loyaltyAccount(`opportunities {
      primaryOpportunity { ${OPPORTUNITY_FIELDS} }
      opportunities { ${OPPORTUNITY_FIELDS} }
      evaluatedAt validUntil revision
    }`);
  }

  test('presents every non-purchase trigger including named custom events', async () => {
    const triggers = ['SIGNUP', 'REVIEW', 'REFERRAL', 'BIRTHDAY', 'ANNIVERSARY', 'LOGIN', 'SUBSCRIPTION_RENEWAL', 'CUSTOM_EVENT'];
    await kit.createActiveAccount({ earningRules: triggers.map((trigger) => rule(trigger)) });
    expect((await opportunities())?.opportunities.opportunities.map(({ type }: any) => type))
      .toEqual(['SIGNUP', 'REVIEW', 'REFERRAL', 'BIRTHDAY', 'ANNIVERSARY', 'LOGIN', 'SUBSCRIPTION_RENEWAL', 'CUSTOM']);
  });

  test('keeps large fixed-point actions exact through Storefront', async () => {
    await kit.createActiveAccount({ earningRules: [rule('LOGIN', {
      action: { type: 'AWARD_FIXED_POINTS', points: '9007199254740993' },
    })] });
    expect((await opportunities())?.opportunities.primaryOpportunity.reward).toMatchObject({
      kind: 'POINTS',
      points: { minimum: '9007199254740993', maximum: '9007199254740993' },
      accuracy: 'EXACT',
    });
  });

  test('honors server priority and stop-processing order', async () => {
    await kit.createActiveAccount({ earningRules: [
      rule('LOGIN', { priority: 20, name: 'Later' }),
      rule('SIGNUP', { priority: 1, name: 'First', stopProcessing: true }),
    ] });
    const result = await opportunities();
    expect(result?.opportunities.primaryOpportunity.type).toBe('SIGNUP');
    expect(result?.opportunities.opportunities.map(({ type }: any) => type))
      .toEqual(['SIGNUP', 'LOGIN']);
  });

  test('processes an immutable ORDER fact exactly once', async () => {
    const fixture = await kit.createActiveAccount({ earningRules: [rule('ORDER')] });
    const event = kit.orderRewardEvent();
    const first = await kit.deliverEvent(event);
    const replay = await kit.deliverEvent(event);
    expect(replay).toEqual(first);
    expect(await kit.transactionCount(fixture.account.id, ['EARN_PENDING'])).toBe(2);
  });
});
