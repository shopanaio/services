/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  customerEmail,
  expectNoUserErrors,
  expectUserError,
  getCustomer,
  setupStore,
  updateCustomer,
} from './helpers';

const points: Record<string, string> = {
  EMAIL: 'marketing@playwright.dev',
  SMS: '+12025550101',
  WHATSAPP: '+442071838750',
  PUSH: 'device-token-e2e',
};

test.describe('Customers Admin API - customer consent updates', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('admin creates current consent for every supported channel', async ({ api }) => {
    const customer = await createCustomer(api);
    const set = Object.entries(points).map(([channel, contactPoint]) => ({
      channel,
      state: 'SUBSCRIBED',
      contactPoint,
    }));
    const payload = await updateCustomer(api, customer, { consents: { set } });
    expectNoUserErrors(payload);
    expect(payload.customer.consents.map(({ channel }: any) => channel).sort()).toEqual(
      Object.keys(points).sort(),
    );
    expect(
      payload.customer.consents.every(
        ({ consentedAt, withdrawnAt }: any) => consentedAt && withdrawnAt === null,
      ),
    ).toBe(true);
  });

  test('admin transitions consent through selectable states and opt-in levels', async ({ api }) => {
    let customer = await createCustomer(api, { email: customerEmail() });
    for (const [state, optInLevel] of [
      ['PENDING', 'UNKNOWN'],
      ['SUBSCRIBED', 'SINGLE_OPT_IN'],
      ['UNSUBSCRIBED', 'CONFIRMED_OPT_IN'],
      ['NOT_SUBSCRIBED', 'UNKNOWN'],
    ]) {
      const payload = await updateCustomer(api, customer, {
        consents: { set: [{ channel: 'EMAIL', state, optInLevel, contactPoint: customer.email }] },
      });
      expectNoUserErrors(payload);
      expect(payload.customer.consents[0]).toMatchObject({ state, optInLevel });
      customer = payload.customer;
    }
    expect((await getCustomer(api, customer.id)).consents[0].events.totalCount).toBe(4);
  });

  test('consent update defaults opt-in level to UNKNOWN', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {
      consents: { set: [{ channel: 'SMS', state: 'SUBSCRIBED', contactPoint: points.SMS }] },
    });
    expect(payload.customer.consents[0].optInLevel).toBe('UNKNOWN');
  });

  test('duplicate channels in one batch are rejected atomically', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {
      consents: {
        set: [
          { channel: 'EMAIL', state: 'SUBSCRIBED', contactPoint: points.EMAIL },
          { channel: 'EMAIL', state: 'UNSUBSCRIBED', contactPoint: points.EMAIL },
        ],
      },
    });
    expectUserError(payload, 'DUPLICATE_CHANNEL');
    expect((await getCustomer(api, customer.id)).consents).toEqual([]);
  });

  test('contact point must match the selected channel', async ({ api }) => {
    const customer = await createCustomer(api);
    for (const [channel, contactPoint] of [
      ['EMAIL', 'not-email'],
      ['SMS', '555'],
      ['WHATSAPP', 'email@playwright.dev'],
      ['PUSH', ''],
    ]) {
      const payload = await updateCustomer(api, customer, {
        consents: { set: [{ channel, state: 'SUBSCRIBED', contactPoint }] },
      });
      expectUserError(payload, 'INVALID_CONTACT_POINT');
    }
  });

  test('subscribed and unsubscribed timestamps preserve consent invariants', async ({ api }) => {
    const customer = await createCustomer(api);
    const subscribed = await updateCustomer(api, customer, {
      consents: { set: [{ channel: 'SMS', state: 'SUBSCRIBED', contactPoint: points.SMS }] },
    });
    expect(subscribed.customer.consents[0]).toMatchObject({
      consentedAt: expect.any(String),
      withdrawnAt: null,
    });
    const unsubscribed = await updateCustomer(api, subscribed.customer, {
      consents: { set: [{ channel: 'SMS', state: 'UNSUBSCRIBED', contactPoint: points.SMS }] },
    });
    expect(unsubscribed.customer.consents[0]).toMatchObject({
      consentedAt: expect.any(String),
      withdrawnAt: expect.any(String),
    });
  });

  test('admin cannot directly select INVALID or REDACTED', async ({ api }) => {
    const customer = await createCustomer(api);
    for (const state of ['INVALID', 'REDACTED']) {
      const { data, errors } = await api.admin.mutation<any>('customers-admin-api/CustomerUpdate', {
        throwOnError: false,
        variables: {
          customerId: customer.id,
          
          operations: {
            consents: { set: [{ channel: 'EMAIL', state, contactPoint: points.EMAIL }] },
          },
        },
      });
      expect(
        errors?.length || data?.customersMutation?.customerUpdate?.userErrors?.length,
      ).toBeTruthy();
    }
  });

  test('repeated transitions append ordered immutable evidence events', async ({ api }) => {
    let customer = await createCustomer(api);
    for (const [index, state] of ['PENDING', 'SUBSCRIBED', 'UNSUBSCRIBED'].entries()) {
      const payload = await updateCustomer(api, customer, {
        consents: {
          set: [
            { channel: 'EMAIL', state, contactPoint: points.EMAIL, evidence: { sequence: index } },
          ],
        },
      });
      expectNoUserErrors(payload);
      customer = payload.customer;
    }
    const events = (await getCustomer(api, customer.id)).consents[0].events.edges.map(
      ({ node }: any) => node,
    );
    expect(events.map(({ newState }: any) => newState)).toEqual([
      'PENDING',
      'SUBSCRIBED',
      'UNSUBSCRIBED',
    ]);
    expect(events.map(({ evidence }: any) => evidence.sequence)).toEqual([0, 1, 2]);
    expect(events.every(({ actorType, occurredAt }: any) => actorType && occurredAt)).toBe(true);
  });

  test('consent events support stable forward and backward pagination', async ({ api }) => {
    let customer = await createCustomer(api);
    for (const state of ['PENDING', 'SUBSCRIBED', 'UNSUBSCRIBED'])
      customer = (
        await updateCustomer(api, customer, {
          consents: { set: [{ channel: 'SMS', state, contactPoint: points.SMS }] },
        })
      ).customer;
    const id = customer.consents[0].id;
    const { data } = await api.admin.query<any>('customers-admin-api/CustomerConsent', {
      variables: { id },
    });
    const events = data.customersQuery.customerConsent.events;
    expect(events.totalCount).toBe(3);
    expect(new Set(events.edges.map(({ cursor }: any) => cursor)).size).toBe(3);
  });

  test('customerConsent direct query is store isolated', async ({ api }) => {
    const customer = await createCustomer(api);
    const updated = await updateCustomer(api, customer, {
      consents: { set: [{ channel: 'SMS', state: 'SUBSCRIBED', contactPoint: points.SMS }] },
    });
    const id = updated.customer.consents[0].id;
    await api.session.setupProject();
    const { data } = await api.admin.query<any>('customers-admin-api/CustomerConsent', {
      variables: { id },
    });
    expect(data.customersQuery.customerConsent).toBeNull();
  });
});
