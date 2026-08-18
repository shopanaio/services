/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { LoyaltyE2eTestKit } from './loyalty-e2e-test-kit';

const cases = [
  {
    type: 'DAY',
    boundary() {
      const now = new Date();
      return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2);
    },
    next(start: number) { return start + 86_400_000; },
  },
  {
    type: 'WEEK',
    boundary() {
      const now = new Date();
      const untilMonday = (8 - now.getUTCDay()) % 7 || 7;
      return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + untilMonday);
    },
    next(start: number) { return start + 7 * 86_400_000; },
  },
  {
    type: 'MONTH',
    boundary() {
      const now = new Date();
      return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
    },
    next(start: number) {
      const date = new Date(start);
      return Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
    },
  },
] as const;

test.describe('Loyalty calendar earning limit windows end to end', () => {
  let kit: LoyaltyE2eTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new LoyaltyE2eTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  async function deliver(occurredAt: string) {
    const eventId = crypto.randomUUID();
    return kit.callAction('loyalty.*', {
      event: {
        eventId,
        eventType: 'customer.login',
        timestamp: occurredAt,
        source: 'loyalty-window-e2e',
        emitKey: `window:${eventId}`,
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
        },
      },
      delivery: {
        jobId: crypto.randomUUID(), attempt: 1, maxAttempts: 10,
        idempotencyKey: `event:${eventId}`,
      },
    });
  }

  for (const window of cases) {
    test(`resets the ${window.type} account limit at its UTC boundary`, async () => {
      const fixture = await kit.createActiveAccount({
        earningRules: [{
          code: `window-${window.type.toLowerCase()}`,
          name: `${window.type} window`,
          priority: 10,
          triggerType: 'LOGIN',
          triggerConfig: {},
          conditions: { type: 'ALL', conditions: [] },
          actionType: 'AWARD_FIXED_POINTS',
          action: { type: 'AWARD_FIXED_POINTS', points: '10' },
          limits: {
            startsAt: null,
            endsAt: null,
            perEventMaxPoints: null,
            perAccount: {
              maxOccurrences: '1', maxPoints: null,
              window: { type: window.type, rollingWindowSeconds: null },
            },
            campaign: null,
          },
        }],
      });
      const start = window.boundary();
      await deliver(new Date(start).toISOString());
      await deliver(new Date(start + 1_000).toISOString());
      await deliver(new Date(window.next(start)).toISOString());
      expect((await kit.accountBalance(fixture.account.id)).availablePoints).toBe('20');
      const evaluations = await kit.api.admin.query<any>('loyality-admin-api/EventEvaluations', {
        variables: { first: 20, where: { accountId: fixture.account.id } },
      });
      expect(evaluations.data.loyaltyQuery.eventEvaluations.map(({ decision }: any) => decision).sort())
        .toEqual(['AWARDED', 'AWARDED', 'LIMIT_REACHED']);
    });
  }
});
