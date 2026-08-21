/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  createCustomer,
  customerEmail,
  expectNoUserErrors,
  expectSuccessfulUpdate,
  expectUserError,
  getCustomer,
  missingId,
  setupStore,
  updateCustomer,
  wrongTypeId,
} from './helpers';

test.describe('Customers Admin API - customer profile update', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('admin updates every customer profile section atomically', async ({ api }) => {
    const customer = await createCustomer(api);
    const operations = {
      profile: {
        prefix: 'Dr',
        firstName: 'Ada',
        middleName: 'M',
        lastName: 'Lovelace',
        suffix: 'III',
        preferredLocale: 'en-GB',
        dateOfBirth: '1990-12-10',
        gender: 'female',
      },
      contact: { email: customerEmail(), phoneE164: '+12025550101' },
      company: { companyName: 'Engine', jobTitle: 'Founder' },
      status: { status: 'DISABLED' },
      note: { note: 'Merchant note' },
      moderation: { moderationNote: 'Moderation note' },
    };
    const payload = await updateCustomer(api, customer, operations);
    expectSuccessfulUpdate(payload, [
      'PROFILE_UPDATE',
      'CONTACT_UPDATE',
      'COMPANY_UPDATE',
      'STATUS_UPDATE',
      'NOTE_UPDATE',
      'MODERATION_UPDATE',
    ]);
    expect(payload.customer).toMatchObject({
      ...operations.profile,
      ...operations.contact,
      ...operations.company,
      lifecycleStatus: 'DISABLED',
      ...operations.note,
      ...operations.moderation,
    });
  });

  test('omitted customer update sections leave existing data unchanged', async ({ api }) => {
    const customer = await createCustomer(api, {
      firstName: 'Before',
      companyName: 'Stable',
      note: 'Keep',
    });
    const payload = await updateCustomer(api, customer, { profile: { firstName: 'After' } });
    expectNoUserErrors(payload);
    expect(payload.customer).toMatchObject({
      firstName: 'After',
      companyName: 'Stable',
      note: 'Keep',
    });
  });

  test('nullable customer fields can be cleared explicitly', async ({ api }) => {
    const customer = await createCustomer(api, {
      firstName: 'Ada',
      email: customerEmail(),
      companyName: 'Engine',
      note: 'note',
      moderationNote: 'moderation',
    });
    const payload = await updateCustomer(api, customer, {
      profile: { firstName: null },
      contact: { email: null },
      company: { companyName: null },
      note: { note: null },
      moderation: { moderationNote: null },
    });
    expectNoUserErrors(payload);
    expect(payload.customer).toMatchObject({
      firstName: null,
      email: null,
      companyName: null,
      note: null,
      moderationNote: null,
    });
  });

  test('no-op customer update has deterministic revision semantics', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {});
    expectNoUserErrors(payload);
    expect(payload.operationResults).toEqual([]);
    expect(payload.customer.revision).toBe(customer.revision + 1);
  });

  test('successful multi-section update increments revision exactly once', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {
      profile: { firstName: 'Ada' },
      company: { companyName: 'Engine' },
      note: { note: 'One revision' },
    });
    expectNoUserErrors(payload);
    expect(payload.customer.revision).toBe(customer.revision + 1);
  });

  test('operationResults reports every requested section in input order', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {
      moderation: { moderationNote: 'M' },
      profile: { firstName: 'A' },
      note: { note: 'N' },
      contact: { phoneE164: '+12025550101' },
    });
    expectSuccessfulUpdate(payload, [
      'PROFILE_UPDATE',
      'CONTACT_UPDATE',
      'NOTE_UPDATE',
      'MODERATION_UPDATE',
    ]);
  });

  test('stale expected revision rejects the complete update', async ({ api }) => {
    const customer = await createCustomer(api, { firstName: 'Before' });
    const winner = await updateCustomer(api, customer, { profile: { firstName: 'Winner' } });
    expectNoUserErrors(winner);
    const stale = await updateCustomer(
      api,
      customer,
      { profile: { firstName: 'Loser' }, company: { companyName: 'Must not apply' } },
      customer.revision,
    );
    expectUserError(stale, 'REVISION_CONFLICT');
    expect(await getCustomer(api, customer.id)).toMatchObject({
      firstName: 'Winner',
      companyName: null,
      revision: customer.revision + 1,
    });
  });

  test('invalid or wrong-type customer ID is rejected', async ({ api }) => {
    for (const id of ['invalid', wrongTypeId()]) {
      const payload = await updateCustomer(
        api,
        { id, revision: 1 },
        { profile: { firstName: 'No' } },
      );
      expectUserError(payload, 'INVALID_ID', ['customerId']);
      expect(payload.customer).toBeNull();
    }
  });

  test('missing customer is rejected without creating dependent records', async ({ api }) => {
    const payload = await updateCustomer(
      api,
      { id: missingId(), revision: 1 },
      { addresses: { create: [{ address1: 'No', city: 'No', countryCode: 'US' }] } },
    );
    expectUserError(payload, 'NOT_FOUND');
    expect(payload.customer).toBeNull();
  });

  test('duplicate normalized email is rejected atomically', async ({ api }) => {
    const existing = await createCustomer(api, { email: customerEmail() });
    const customer = await createCustomer(api, { firstName: 'Before' });
    const payload = await updateCustomer(api, customer, {
      contact: { email: ` ${existing.email.toUpperCase()} ` },
      profile: { firstName: 'After' },
    });
    expectUserError(payload, 'DUPLICATE_EMAIL');
    expect(await getCustomer(api, customer.id)).toMatchObject({
      firstName: 'Before',
      email: null,
      revision: customer.revision,
    });
  });

  test('invalid phone and moderation note return precise field errors', async ({ api }) => {
    const customer = await createCustomer(api);
    const payload = await updateCustomer(api, customer, {
      contact: { phoneE164: '555' },
      moderation: { moderationNote: ' ' },
    });
    expectUserError(payload, 'INVALID_PHONE');
    expectUserError(payload, 'INVALID_MODERATION_NOTE');
    expect(payload.operationResults).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'CONTACT_UPDATE', applied: false }),
        expect.objectContaining({ type: 'MODERATION_UPDATE', applied: false }),
      ]),
    );
  });

  test('admin transitions customer among ACTIVE DISABLED and BLOCKED', async ({ api }) => {
    let customer = await createCustomer(api);
    for (const operation of [
      { status: 'DISABLED' },
      { status: 'BLOCKED', blockedReason: 'Risk' },
      { status: 'ACTIVE' },
    ]) {
      const payload = await updateCustomer(api, customer, { status: operation });
      expectNoUserErrors(payload);
      expect(payload.customer.lifecycleStatus).toBe(operation.status);
      customer = payload.customer;
    }
  });

  test('BLOCKED requires a non-empty blocked reason', async ({ api }) => {
    const customer = await createCustomer(api);
    for (const blockedReason of [undefined, '', '   ']) {
      const payload = await updateCustomer(api, customer, {
        status: { status: 'BLOCKED', ...(blockedReason === undefined ? {} : { blockedReason }) },
      });
      expectUserError(payload, 'BLOCKED_REASON_REQUIRED');
    }
  });

  test('ACTIVE and DISABLED clear a previously stored blocked reason', async ({ api }) => {
    const customer = await createCustomer(api);
    const blocked = await updateCustomer(api, customer, {
      status: { status: 'BLOCKED', blockedReason: 'Risk' },
    });
    const active = await updateCustomer(api, blocked.customer, { status: { status: 'ACTIVE' } });
    expectNoUserErrors(active);
    expect(active.customer.blockedReason).toBeNull();
    const disabled = await updateCustomer(api, active.customer, {
      status: { status: 'DISABLED', blockedReason: 'must clear' },
    });
    expectNoUserErrors(disabled);
    expect(disabled.customer).toMatchObject({
      lifecycleStatus: 'DISABLED',
      blockedReason: null,
    });
  });

  test('MERGED and REDACTED cannot be selected through customerUpdate', async ({ api }) => {
    const customer = await createCustomer(api);
    for (const status of ['MERGED', 'REDACTED']) {
      const { data, errors } = await api.admin.mutation<any>('customers-admin-api/CustomerUpdate', {
        throwOnError: false,
        variables: {
          customerId: customer.id,
          
          operations: { status: { status } },
        },
      });
      expect(
        errors?.length || data?.customersMutation?.customerUpdate?.userErrors?.length,
      ).toBeTruthy();
      expect((await getCustomer(api, customer.id)).lifecycleStatus).toBe('ACTIVE');
    }
  });

  test('concurrent updates with one revision allow exactly one winner', async ({ api }) => {
    const customer = await createCustomer(api);
    const results = await Promise.all([
      updateCustomer(api, customer, { profile: { firstName: 'Left' } }),
      updateCustomer(api, customer, { profile: { firstName: 'Right' } }),
    ]);
    expect(results.filter(({ customer }) => customer).length).toBe(1);
    expect(
      results.filter(({ userErrors }) =>
        userErrors.some(({ code }: any) => code === 'REVISION_CONFLICT'),
      ).length,
    ).toBe(1);
    expect((await getCustomer(api, customer.id)).revision).toBe(customer.revision + 1);
  });
});
