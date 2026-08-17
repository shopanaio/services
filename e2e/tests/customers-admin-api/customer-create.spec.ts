/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  customerEmail,
  expectNoUserErrors,
  expectUserError,
  getCustomerByEmail,
  requestCustomerCreate,
  selectFreshStore,
  selectStore,
  setupStore,
} from './helpers';

test.describe('Customers Admin API - customer create', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('admin creates a minimal guest customer', async ({ api }) => {
    const customer = await createCustomer(api);
    expect(customer).toMatchObject({
      lifecycleStatus: 'ACTIVE',
      accountStatus: 'GUEST',
      source: 'admin',
      revision: 0,
    });
    expect(customer.id).toEqual(expect.any(String));
    expect(customer.displayName).toEqual(expect.any(String));
    expect(new Date(customer.createdAt).toISOString()).toBe(customer.createdAt);
    expect(customer.updatedAt).toBe(customer.createdAt);
  });

  test('admin creates a customer with every supported profile field', async ({ api }) => {
    const email = customerEmail();
    const input = {
      email,
      phoneE164: '+380501234567',
      prefix: 'Dr',
      firstName: 'Ada',
      middleName: 'Lovelace',
      lastName: 'Byron',
      suffix: 'III',
      preferredLocale: 'en-GB',
      dateOfBirth: '1990-12-10',
      gender: 'female',
      companyName: 'Analytical Engines',
      jobTitle: 'Founder',
      note: 'Merchant note',
      moderationNote: 'Reviewed by e2e',
    };
    const customer = await createCustomer(api, input);
    expect(customer).toMatchObject(input);
  });

  test('customer display name is derived for full partial and contact-only profiles', async ({
    api,
  }) => {
    const full = await createCustomer(api, { firstName: 'Ada', lastName: 'Lovelace' });
    const partial = await createCustomer(api, { firstName: 'Grace' });
    const email = customerEmail();
    const contact = await createCustomer(api, { email });
    expect(full.displayName).toContain('Ada');
    expect(full.displayName).toContain('Lovelace');
    expect(partial.displayName).toBe('Grace');
    expect(contact.displayName).toBe(email);
  });

  test('email is normalized before uniqueness and persistence', async ({ api }) => {
    const local = `Mixed.${crypto.randomUUID().slice(0, 8)}`;
    const customer = await createCustomer(api, { email: `  ${local}@PLAYWRIGHT.DEV  ` });
    expect(customer.email).toBe(`${local.toLowerCase()}@playwright.dev`);
    expect((await getCustomerByEmail(api, ` ${local.toUpperCase()}@Playwright.Dev `))?.id).toBe(
      customer.id,
    );
  });

  test('duplicate active email in the same store is rejected', async ({ api }) => {
    const email = customerEmail();
    await createCustomer(api, { email });
    const { payload } = await requestCustomerCreate(api, { email: ` ${email.toUpperCase()} ` });
    expectUserError(payload, 'DUPLICATE_EMAIL', ['email']);
    expect(payload.customer).toBeNull();
    expect((await getCustomerByEmail(api, email))?.email).toBe(email);
  });

  test('the same normalized email can exist in another store', async ({ api }) => {
    const email = customerEmail();
    const first = await createCustomer(api, { email });
    const { previous, next } = await selectFreshStore(api);
    const second = await createCustomer(api, { email: email.toUpperCase() });
    expect(second.id).not.toBe(first.id);
    selectStore(api, previous);
    expect((await getCustomerByEmail(api, email))?.id).toBe(first.id);
    selectStore(api, next);
    expect((await getCustomerByEmail(api, email))?.id).toBe(second.id);
  });

  test('invalid phone is rejected with a field error', async ({ api }) => {
    for (const phoneE164 of ['', '0501234567', '+01234567', '+1234567890123456']) {
      const { payload } = await requestCustomerCreate(api, { phoneE164 });
      expectUserError(payload, 'INVALID_PHONE', ['phoneE164']);
      expect(payload.customer).toBeNull();
    }
  });

  test('oversized moderation note is rejected', async ({ api }) => {
    const before = (
      await api.admin.query<any>('customers-admin-api/Customers', { variables: { first: 1 } })
    ).data.customersQuery.customers.totalCount;
    const { payload } = await requestCustomerCreate(api, { moderationNote: 'x'.repeat(10_001) });
    expectUserError(payload, 'INVALID_MODERATION_NOTE', ['moderationNote']);
    const after = (
      await api.admin.query<any>('customers-admin-api/Customers', { variables: { first: 1 } })
    ).data.customersQuery.customers.totalCount;
    expect(after).toBe(before);
  });

  test('malformed email date locale and oversized strings are rejected by the GraphQL contract', async ({
    api,
  }) => {
    for (const input of [
      { email: 'not-an-email' },
      { dateOfBirth: '2025-02-31' },
      { preferredLocale: 'not_a_locale' },
      { firstName: 'x'.repeat(1001) },
    ]) {
      const { payload, errors } = await requestCustomerCreate(api, input);
      expect(Boolean(errors?.length || payload?.userErrors?.length)).toBe(true);
      expect(payload?.customer ?? null).toBeNull();
    }
  });

  test('two concurrent creates with the same email create exactly one customer', async ({
    api,
  }) => {
    const email = customerEmail();
    const results = await Promise.all([
      requestCustomerCreate(api, { email }),
      requestCustomerCreate(api, { email: email.toUpperCase() }),
    ]);
    expect(results.filter(({ payload }) => payload?.customer).length).toBe(1);
    const failure = results.find(({ payload }) => !payload?.customer)?.payload;
    expectUserError(failure, 'DUPLICATE_EMAIL');
    const success = results.find(({ payload }) => payload?.customer);
    expect(success).toBeDefined();
    expectNoUserErrors(success?.payload);
  });
});
