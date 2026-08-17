/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  CONSENT_FIELDS,
  CustomersStorefrontTestKit,
  USER_ERROR_FIELDS,
  uniqueKey,
  type CustomerUserError,
} from './customers-storefront-test-kit';

interface ConsentPayload {
  marketingConsent: Record<string, unknown> | null;
  customer: { revision: number } | null;
  userErrors: CustomerUserError[];
}

test.describe('Customers Storefront API — marketing consents', () => {
  let kit: CustomersStorefrontTestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersStorefrontTestKit(api, request);
    await kit.setup();
  });
  test.afterEach(async () => kit.close());

  const transition = async (
    channel: string,
    state: string,
    overrides: Record<string, unknown> = {},
  ) =>
    kit.mutation<ConsentPayload>(
      'customerMarketingConsentUpdate',
      'CustomerMarketingConsentUpdateInput',
      {
        channel,
        state,
        expectedRevision: await kit.revision(),
        idempotencyKey: uniqueKey(),
        ...overrides,
      },
      `marketingConsent { ${CONSENT_FIELDS} } customer { revision } userErrors { ${USER_ERROR_FIELDS} }`,
    );

  async function seedPushContact(): Promise<void> {
    await kit.sql`
      insert into customers.customer_consent
        (store_id, customer_id, channel, state, opt_in_level, contact_point, source)
      values (${kit.realm.storeId}, ${kit.customer.rawId}, 'PUSH', 'NOT_SUBSCRIBED', 'UNKNOWN',
              ${`push:${crypto.randomUUID()}`}, 'e2e')
      on conflict (customer_id, channel) do nothing
    `;
  }

  test('customer reads current marketing consent for every configured channel', async () => {
    await kit.updateCustomerRow({ phoneE164: '+380501234567' });
    await seedPushContact();
    for (const channel of ['EMAIL', 'SMS', 'WHATSAPP']) {
      expect((await transition(channel, 'SUBSCRIBED')).data?.payload.userErrors).toEqual([]);
    }
    const customer = await kit.currentCustomer<{ marketingConsents: { channel: string }[] }>(
      `marketingConsents { ${CONSENT_FIELDS} }`,
    );
    expect(customer.marketingConsents.map(({ channel }) => channel).sort()).toEqual([
      'EMAIL',
      'PUSH',
      'SMS',
      'WHATSAPP',
    ]);
  });

  test('customer subscribes and unsubscribes email marketing', async () => {
    const subscribed = await transition('EMAIL', 'SUBSCRIBED');
    expect(subscribed.data?.payload.marketingConsent).toEqual(
      expect.objectContaining({
        channel: 'EMAIL',
        state: 'SUBSCRIBED',
        optInLevel: 'SINGLE_OPT_IN',
        consentedAt: expect.any(String),
        withdrawnAt: null,
      }),
    );
    const unsubscribed = await transition('EMAIL', 'UNSUBSCRIBED');
    expect(unsubscribed.data?.payload.marketingConsent).toEqual(
      expect.objectContaining({
        state: 'UNSUBSCRIBED',
        withdrawnAt: expect.any(String),
      }),
    );
  });

  test('customer subscribes and unsubscribes SMS and WhatsApp marketing', async () => {
    await kit.updateCustomerRow({ phoneE164: '+380501234567' });
    for (const channel of ['SMS', 'WHATSAPP']) {
      expect((await transition(channel, 'SUBSCRIBED')).data?.payload.userErrors).toEqual([]);
      const result = await transition(channel, 'UNSUBSCRIBED');
      expect(result.data?.payload.marketingConsent).toEqual(
        expect.objectContaining({ channel, state: 'UNSUBSCRIBED' }),
      );
    }
  });

  test('customer subscribes and unsubscribes push marketing when a contact point exists', async () => {
    await seedPushContact();
    for (const state of ['SUBSCRIBED', 'UNSUBSCRIBED']) {
      const response = await transition('PUSH', state);
      expect(response.data?.payload.userErrors).toEqual([]);
      expect(response.data?.payload.marketingConsent).toEqual(
        expect.objectContaining({ channel: 'PUSH', state }),
      );
    }
  });

  test('subscribe without the channel contact point is rejected', async () => {
    await kit.updateCustomerRow({ phoneE164: null });
    for (const channel of ['SMS', 'WHATSAPP', 'PUSH']) {
      const response = await transition(channel, 'SUBSCRIBED');
      kit.expectUserError(response.data!.payload.userErrors, 'CONTACT_POINT_UNAVAILABLE');
      expect(response.data?.payload.marketingConsent).toBeNull();
    }
  });

  test('invalid channel and non-selectable state are rejected', async () => {
    for (const input of [
      { channel: 'FAX', state: 'SUBSCRIBED' },
      { channel: 'EMAIL', state: 'PENDING' },
      { channel: 'EMAIL', state: 'INVALID' },
    ]) {
      const response = await transition(input.channel, input.state);
      expect(response.data ?? null).toBeNull();
      expect(response.errors).not.toHaveLength(0);
    }
  });

  test('repeated transition updates consent timestamps and preserves immutable evidence', async () => {
    const first = await transition('EMAIL', 'SUBSCRIBED');
    await transition('EMAIL', 'UNSUBSCRIBED');
    const third = await transition('EMAIL', 'SUBSCRIBED');
    expect(third.data?.payload.marketingConsent?.updatedAt).not.toBe(
      first.data?.payload.marketingConsent?.updatedAt,
    );
    const [row] = await kit.sql`
      select count(*)::int as count, bool_and(evidence ? 'channel') as has_evidence
      from customers.customer_consent_event where customer_id = ${kit.customer.rawId}
    `;
    expect(row).toEqual({ count: 3, has_evidence: true });
  });

  test('stale and invalid revision reject consent changes', async () => {
    const stale = await kit.revision();
    expect(
      (await transition('EMAIL', 'SUBSCRIBED', { expectedRevision: stale })).data?.payload
        .userErrors,
    ).toEqual([]);
    for (const expectedRevision of [stale, 0, 1.5]) {
      const response = await transition('EMAIL', 'SUBSCRIBED', { expectedRevision });
      if (response.errors) kit.expectBadUserInput(response);
      else
        expect(['REVISION_CONFLICT', 'INVALID_REVISION']).toContain(
          response.data!.payload.userErrors[0]!.code,
        );
    }
  });

  test('same idempotency key returns the original consent transition', async () => {
    const key = uniqueKey();
    const revision = await kit.revision();
    const overrides = { idempotencyKey: key, expectedRevision: revision };
    const first = await transition('EMAIL', 'SUBSCRIBED', overrides);
    const replay = await transition('EMAIL', 'SUBSCRIBED', overrides);
    expect(replay.data?.payload).toEqual(first.data?.payload);
    expect(await kit.rowCount('customer_consent_event')).toBe(1);
  });

  test('concurrent opposite consent transitions allow one revision winner', async () => {
    const revision = await kit.revision();
    const [subscribe, unsubscribe] = await Promise.all([
      transition('EMAIL', 'SUBSCRIBED', { expectedRevision: revision }),
      transition('EMAIL', 'UNSUBSCRIBED', { expectedRevision: revision }),
    ]);
    const results = [subscribe.data!.payload, unsubscribe.data!.payload];
    expect(results.filter(({ userErrors }) => userErrors.length === 0)).toHaveLength(1);
    expect(
      results.filter(({ userErrors }) => userErrors[0]?.code === 'REVISION_CONFLICT'),
    ).toHaveLength(1);
  });

  test('consent is isolated by customer and store even for identical contacts', async () => {
    const foreign = await kit.createGuestCustomer();
    await kit.sql`
      insert into customers.customer_consent
        (store_id, customer_id, channel, state, opt_in_level, contact_point, source, consented_at)
      values (${kit.realm.storeId}, ${foreign.id}, 'EMAIL', 'SUBSCRIBED', 'SINGLE_OPT_IN',
              ${kit.customer.email}, 'e2e', now())
    `;
    const response = await transition('EMAIL', 'UNSUBSCRIBED');
    expect(response.data?.payload.userErrors).toEqual([]);
    const [foreignConsent] = await kit.sql`
      select state from customers.customer_consent where customer_id = ${foreign.id}
    `;
    expect(foreignConsent!.state).toBe('SUBSCRIBED');
  });
});
