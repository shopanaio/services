/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { LoyaltyE2eTestKit } from '../loyality-e2e-api/loyalty-e2e-test-kit';

const conditions = { type: 'ALL', conditions: [] };

function rule(overrides: Record<string, unknown> = {}) {
  const { limits, ...rest } = overrides;
  return {
    code: `runtime-${crypto.randomUUID().slice(0, 8)}`,
    name: 'Runtime earning rule',
    priority: 10,
    triggerType: 'LOGIN',
    triggerConfig: {},
    conditions,
    actionType: 'AWARD_FIXED_POINTS',
    action: { type: 'AWARD_FIXED_POINTS', points: '25' },
    limits: {
      startsAt: null,
      endsAt: null,
      perEventMaxPoints: null,
      perAccount: null,
      campaign: null,
      ...(limits as Record<string, unknown> | undefined),
    },
    ...rest,
  };
}

test.describe('Loyalty Admin API earning rules runtime semantics', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setupAdmin();
  });
  test.afterEach(async () => kit.close());

  async function deliver(occurredAt = new Date().toISOString(), overrides: Record<string, unknown> = {}) {
    const externalEventId = crypto.randomUUID();
    await kit.callAction('loyalty.*', {
      event: {
        eventId: externalEventId,
        eventType: 'customer.login',
        timestamp: occurredAt,
        source: 'loyalty-admin-e2e',
        emitKey: `loyalty-admin-e2e:${externalEventId}`,
        context: {
          organizationId: kit.realm.organizationId,
          correlationId: crypto.randomUUID(),
        },
        subject: { type: 'customer', id: kit.customer.rawId },
        payload: {
          customerId: kit.customer.rawId,
          storeId: kit.realm.storeId,
          channelCode: 'WEB',
          segmentIds: [],
          source: 'admin-e2e',
          ...(overrides.payload as object ?? {}),
        },
        ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== 'payload')),
      },
      delivery: {
        jobId: crypto.randomUUID(),
        attempt: 1,
        maxAttempts: 10,
        idempotencyKey: `event:${externalEventId}`,
      },
    });
    return externalEventId;
  }

  test('clips an actual award at the per-event cap and records the evaluated amount', async () => {
    const fixture = await kit.createActiveAccount({
      earningRules: [rule({
        action: { type: 'AWARD_FIXED_POINTS', points: '100' },
        limits: { perEventMaxPoints: '40' },
      })],
    });
    const externalEventId = await deliver();
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '40' });
    const facts = await kit.api.admin.query<any>('loyality-admin-api/EventFacts', {
      variables: { first: 20, where: { customerIds: [fixture.account.customerId], producers: ['loyalty-admin-e2e'] } },
    });
    const fact = facts.data.loyaltyQuery.eventFacts.find((item: any) => item.externalEventId === externalEventId);
    expect(fact.evaluations).toEqual([expect.objectContaining({ decision: 'AWARDED', pointsAwarded: '40' })]);
  });

  test('honors condition priority and stopProcessing during execution', async () => {
    const fixture = await kit.createActiveAccount({
      earningRules: [
        rule({ code: 'first-runtime', priority: 1, stopProcessing: true, conditions: { type: 'CHANNEL', channelCodes: ['WEB'] }, action: { type: 'AWARD_FIXED_POINTS', points: '10' } }),
        rule({ code: 'second-runtime', priority: 2, action: { type: 'AWARD_FIXED_POINTS', points: '100' } }),
      ],
    });
    await deliver();
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '10' });
    const evaluations = await kit.api.admin.query<any>('loyality-admin-api/EventEvaluations', {
      variables: { first: 20, where: { accountId: fixture.account.id } },
    });
    expect(evaluations.data.loyaltyQuery.eventEvaluations).toEqual([
      expect.objectContaining({ decision: 'AWARDED', earningRule: { code: 'first-runtime' }, pointsAwarded: '10' }),
    ]);
  });

  test('records trigger-config mismatch as an ignored immutable decision', async () => {
    const fixture = await kit.createActiveAccount({
      earningRules: [rule({ triggerConfig: { eventType: 'customer.special-login' } })],
    });
    await deliver();
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '0' });
    const evaluations = await kit.api.admin.query<any>('loyality-admin-api/EventEvaluations', {
      variables: { first: 20, where: { accountId: fixture.account.id } },
    });
    expect(evaluations.data.loyaltyQuery.eventEvaluations).toEqual([
      expect.objectContaining({ decision: 'IGNORED', reasonCode: 'TRIGGER_CONFIG_NOT_MATCHED' }),
    ]);
  });

  test('enforces per-account occurrence and points limits across real events', async () => {
    const fixture = await kit.createActiveAccount({
      earningRules: [rule({ limits: { perAccount: { maxOccurrences: '2', maxPoints: '50', window: { type: 'LIFETIME', rollingWindowSeconds: null } } } })],
    });
    await deliver();
    await deliver();
    await deliver();
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '50' });
    const evaluations = await kit.api.admin.query<any>('loyality-admin-api/EventEvaluations', {
      variables: { first: 20, where: { accountId: fixture.account.id } },
    });
    expect(evaluations.data.loyaltyQuery.eventEvaluations.map(({ decision }: any) => decision).sort())
      .toEqual(['AWARDED', 'AWARDED', 'LIMIT_REACHED']);
    const usage = await kit.api.admin.query<any>('loyality-admin-api/EarningRuleUsages', {
      variables: { first: 20, where: { earningRuleId: fixture.version.earningRules[0].id } },
    });
    expect(usage.data.loyaltyQuery.earningRuleUsages).toEqual([
      expect.objectContaining({ occurrenceCount: '2', pointsAwarded: '50' }),
    ]);
  });

  test('does not overshoot a campaign points budget', async () => {
    const fixture = await kit.createActiveAccount({
      earningRules: [rule({
        action: { type: 'AWARD_FIXED_POINTS', points: '20' },
        limits: { campaign: { maxOccurrences: null, maxPoints: '30', maxMonetaryMinorByCurrency: {} } },
      })],
    });
    await deliver();
    await deliver();
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '20' });
    const evaluations = await kit.api.admin.query<any>('loyality-admin-api/EventEvaluations', {
      variables: { first: 20, where: { accountId: fixture.account.id } },
    });
    expect(evaluations.data.loyaltyQuery.eventEvaluations.map(({ decision }: any) => decision).sort())
      .toEqual(['AWARDED', 'BUDGET_EXHAUSTED']);
  });

  test('opens a new rolling usage window after the configured duration', async () => {
    const fixture = await kit.createActiveAccount({
      earningRules: [rule({ limits: { perAccount: {
        maxOccurrences: '1', maxPoints: null,
        window: { type: 'ROLLING', rollingWindowSeconds: 60 },
      } } })],
    });
    const base = Date.now() + 60_000;
    await deliver(new Date(base).toISOString());
    await deliver(new Date(base + 30_000).toISOString());
    await deliver(new Date(base + 61_000).toISOString());
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '50' });
    const evaluations = await kit.api.admin.query<any>('loyality-admin-api/EventEvaluations', {
      variables: { first: 20, where: { accountId: fixture.account.id } },
    });
    expect(evaluations.data.loyaltyQuery.eventEvaluations.map(({ decision }: any) => decision).sort())
      .toEqual(['AWARDED', 'AWARDED', 'LIMIT_REACHED']);
    const usage = await kit.api.admin.query<any>('loyality-admin-api/EarningRuleUsages', {
      variables: { first: 20, where: { earningRuleId: fixture.version.earningRules[0].id } },
    });
    expect(usage.data.loyaltyQuery.earningRuleUsages).toEqual([
      expect.objectContaining({ occurrenceCount: '1', pointsAwarded: '25' }),
    ]);
  });

  test('treats schedule start as inclusive and end as exclusive', async () => {
    const startsAt = new Date(Date.now() + 60_000).toISOString();
    const endsAt = new Date(Date.now() + 120_000).toISOString();
    const fixture = await kit.createActiveAccount({
      earningRules: [rule({ limits: { startsAt, endsAt } })],
    });
    await deliver(startsAt);
    await deliver(endsAt);
    expect(await kit.accountBalance(fixture.account.id)).toMatchObject({ availablePoints: '25' });
    const evaluations = await kit.api.admin.query<any>('loyality-admin-api/EventEvaluations', {
      variables: { first: 20, where: { accountId: fixture.account.id } },
    });
    expect(evaluations.data.loyaltyQuery.eventEvaluations.map(({ reasonCode }: any) => reasonCode).sort())
      .toEqual(['RULE_AWARDED', 'RULE_OUTSIDE_SCHEDULE']);
  });

  test('executes ISSUE_REWARD and links one entitlement to the immutable event fact', async () => {
    const fixture = await kit.createActiveAccount({
      earningRules: [rule({
        actionType: 'ISSUE_REWARD',
        action: { type: 'ISSUE_REWARD', rewardDefinitionCode: 'storefront-points' },
      })],
    });
    const externalEventId = await deliver();
    const listed = await kit.api.admin.query<any>('loyality-admin-api/RewardEntitlements', {
      variables: { first: 20, where: { accountIds: [fixture.account.id] } },
    });
    expect(listed.data.loyaltyQuery.rewardEntitlements).toHaveLength(1);
    const facts = await kit.api.admin.query<any>('loyality-admin-api/EventFacts', {
      variables: { first: 20, where: { customerIds: [fixture.account.customerId] } },
    });
    const fact = facts.data.loyaltyQuery.eventFacts.find((item: any) => item.externalEventId === externalEventId);
    expect(fact.evaluations).toEqual([
      expect.objectContaining({ decision: 'AWARDED', result: { entitlementId: expect.any(String) } }),
    ]);
  });
});
