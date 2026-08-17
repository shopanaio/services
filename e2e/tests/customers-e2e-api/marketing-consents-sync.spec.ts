/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  CONSENT_FIELDS,
  USER_ERROR_FIELDS,
  uniqueKey,
  type CustomerUserError,
} from '../customers-storefront-api/customers-storefront-test-kit';
import { CustomersE2ETestKit } from './customers-e2e-test-kit';

type ConsentPayload = {
  marketingConsent: Record<string, any> | null;
  customer: { revision: number } | null;
  userErrors: CustomerUserError[];
};

test.describe('Customers E2E API — marketing consent synchronization', () => {
  let kit: CustomersE2ETestKit;
  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersE2ETestKit(api, request);
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

  test('admin-created consent state is visible through storefront', async () => {
    const admin = await kit.adminCustomer();
    const phone = '+380501234567';
    const contacted = await kit.adminUpdate({ contact: { phoneE164: phone } }, admin);
    const payload = await kit.adminUpdate(
      {
        consents: {
          set: [
            {
              channel: 'EMAIL',
              state: 'SUBSCRIBED',
              optInLevel: 'DOUBLE_OPT_IN',
              contactPoint: admin.email,
            },
            { channel: 'SMS', state: 'SUBSCRIBED', contactPoint: phone },
            { channel: 'WHATSAPP', state: 'UNSUBSCRIBED', contactPoint: phone },
            {
              channel: 'PUSH',
              state: 'NOT_SUBSCRIBED',
              contactPoint: `push:${crypto.randomUUID()}`,
            },
          ],
        },
      },
      contacted.customer,
    );
    expect(payload.userErrors).toEqual([]);
    const storefront = await kit.currentCustomer<{ marketingConsents: any[] }>(
      `marketingConsents { ${CONSENT_FIELDS} }`,
    );
    expect(storefront.marketingConsents.map(({ channel }) => channel).sort()).toEqual([
      'EMAIL',
      'PUSH',
      'SMS',
      'WHATSAPP',
    ]);
    expect(storefront.marketingConsents.find(({ channel }) => channel === 'EMAIL')).toEqual(
      expect.objectContaining({ state: 'SUBSCRIBED', optInLevel: 'DOUBLE_OPT_IN' }),
    );
  });

  test('storefront consent transition is visible with evidence through admin', async () => {
    expect((await transition('EMAIL', 'SUBSCRIBED')).data?.payload.userErrors).toEqual([]);
    expect((await transition('EMAIL', 'UNSUBSCRIBED')).data?.payload.userErrors).toEqual([]);
    const admin = await kit.adminCustomer();
    const consent = admin.consents.find(({ channel }: any) => channel === 'EMAIL');
    expect(consent).toEqual(
      expect.objectContaining({
        state: 'UNSUBSCRIBED',
        consentedAt: expect.any(String),
        withdrawnAt: expect.any(String),
      }),
    );
    expect(consent.events.edges.map(({ node }: any) => node.newState)).toEqual([
      'SUBSCRIBED',
      'UNSUBSCRIBED',
    ]);
    expect(
      consent.events.edges.every(({ node }: any) => node.idempotencyKey && node.occurredAt),
    ).toBe(true);
  });

  test('admin and storefront consent writes share one customer revision', async () => {
    const stale = await kit.revision();
    const admin = await kit.adminUpdate({
      consents: {
        set: [{ channel: 'EMAIL', state: 'SUBSCRIBED', contactPoint: kit.customer.email }],
      },
    });
    expect(admin.userErrors).toEqual([]);
    const rejected = await transition('EMAIL', 'UNSUBSCRIBED', { expectedRevision: stale });
    kit.expectUserError(rejected.data!.payload.userErrors, 'REVISION_CONFLICT', {
      retryable: true,
    });
    const consent = (await kit.adminCustomer()).consents.find(
      ({ channel }: any) => channel === 'EMAIL',
    );
    expect(consent.state).toBe('SUBSCRIBED');
    expect(consent.events.totalCount).toBe(1);
  });

  test('contact changes affect storefront consent eligibility consistently', async () => {
    const withoutPhone = await transition('SMS', 'SUBSCRIBED');
    kit.expectUserError(withoutPhone.data!.payload.userErrors, 'CONTACT_POINT_UNAVAILABLE');
    const admin = await kit.adminCustomer();
    const changed = await kit.adminUpdate({ contact: { phoneE164: '+380501234567' } }, admin);
    expect(changed.userErrors).toEqual([]);
    expect((await transition('SMS', 'SUBSCRIBED')).data?.payload.userErrors).toEqual([]);
    const removed = await kit.adminUpdate({ contact: { phoneE164: null } });
    expect(removed.userErrors).toEqual([]);
    const rejected = await transition('WHATSAPP', 'SUBSCRIBED');
    kit.expectUserError(rejected.data!.payload.userErrors, 'CONTACT_POINT_UNAVAILABLE');
  });

  test('consent for the same contact remains isolated across stores', async ({ api, request }) => {
    const projectA = api.session.project;
    const email = kit.customer.email;
    const storeB = new CustomersE2ETestKit(api, request);
    try {
      await storeB.setup({ customer: false });
      expect((await storeB.adminAccountSettingsUpdate(['PASSWORD'])).userErrors).toEqual([]);
      const guestB = await storeB.adminCreate({ email });
      await storeB.enrollAdminCustomer(guestB, email);
      expect((await transition('EMAIL', 'SUBSCRIBED')).data?.payload.userErrors).toEqual([]);
      expect(
        (
          await storeB.mutation<ConsentPayload>(
            'customerMarketingConsentUpdate',
            'CustomerMarketingConsentUpdateInput',
            {
              channel: 'EMAIL',
              state: 'UNSUBSCRIBED',
              expectedRevision: await storeB.revision(),
              idempotencyKey: uniqueKey(),
            },
            `marketingConsent { ${CONSENT_FIELDS} } customer { revision } userErrors { ${USER_ERROR_FIELDS} }`,
          )
        ).data?.payload.userErrors,
      ).toEqual([]);
      const adminA = await kit.inProject(projectA, () => kit.adminCustomer());
      const adminB = await storeB.adminCustomer();
      expect(adminA.consents.find(({ channel }: any) => channel === 'EMAIL').state).toBe(
        'SUBSCRIBED',
      );
      expect(adminB.consents.find(({ channel }: any) => channel === 'EMAIL').state).toBe(
        'UNSUBSCRIBED',
      );
    } finally {
      await storeB.close();
      api.session.project = projectA;
    }
  });
});
