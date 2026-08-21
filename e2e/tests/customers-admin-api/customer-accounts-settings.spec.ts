/* eslint-disable @typescript-eslint/no-explicit-any */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  eventually,
  expectNoUserErrors,
  expectSafeTransportErrors,
  expectUserError,
  inviteWithPermissions,
  openCustomersSql,
  rawId,
  setupStore,
} from './helpers';

async function settings(api: any) {
  return eventually(
    async () =>
      (
        await api.admin.query<any>('customers-admin-api/CustomerAccountsSettings', {
          throwOnError: false,
          variables: {},
        })
      ).data?.customersQuery?.customerAccountsSettings ?? null,
    Boolean,
  );
}
async function update(api: any, enabledMethods: string[]) {
  const { data, errors } = await api.admin.mutation<any>(
    'customers-admin-api/CustomerAccountsSettingsUpdate',
    { throwOnError: false, variables: { input: { enabledMethods } } },
  );
  return { payload: data?.customersMutation?.customerAccountsSettingsUpdate, errors };
}

test.describe('Customers Admin API - customer account settings', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('admin reads customer account settings for the current store', async ({ api }) => {
    const value = await settings(api);
    expect(value).toMatchObject({
      realmEnabled: expect.any(Boolean),
      registrationMode: expect.any(String),
      revision: expect.any(Number),
    });
    expect(value.methods.map(({ method }: any) => method).sort()).toEqual([
      'EMAIL_OTP',
      'PASSWORD',
      'PHONE_OTP',
    ]);
    expect(value.providers.map(({ provider }: any) => provider).sort()).toEqual([
      'FACEBOOK',
      'GOOGLE',
    ]);
    expect(
      value.methods.every(
        ({ enabled, configured }: any) =>
          typeof enabled === 'boolean' && typeof configured === 'boolean',
      ),
    ).toBe(true);
  });

  test('missing linked IAM application returns null settings without cross-store fallback', async ({
    api,
  }) => {
    const first = api.session.project;
    await settings(api);
    await api.session.setupProject();
    await settings(api);
    const sql = openCustomersSql();
    try {
      await sql`delete from customers.storefront_auth_configuration where store_id = ${rawId(api.session.project.id)}::uuid`;
    } finally {
      await sql.end();
    }
    const { data } = await api.admin.query<any>('customers-admin-api/CustomerAccountsSettings', {
      variables: {},
    });
    expect(data.customersQuery.customerAccountsSettings).toBeNull();
    api.session.project = first;
    expect(await settings(api)).not.toBeNull();
  });

  test('admin replaces enabled PASSWORD and EMAIL_OTP methods', async ({ api }) => {
    const before = await settings(api);
    const { payload } = await update(api, ['PASSWORD', 'EMAIL_OTP'], before.revision);
    expectNoUserErrors(payload);
    expect(payload.settings.revision).toBe(before.revision + 1);
    expect(
      payload.settings.methods
        .filter(({ enabled }: any) => enabled)
        .map(({ method }: any) => method)
        .sort(),
    ).toEqual(['EMAIL_OTP', 'PASSWORD']);
  });

  test('admin can disable every customer authentication method', async ({ api }) => {
    const before = await settings(api);
    const { payload } = await update(api, [], before.revision);
    expectNoUserErrors(payload);
    expect(payload.settings.methods.every(({ enabled }: any) => !enabled)).toBe(true);
  });

  test('duplicate authentication methods are rejected', async ({ api }) => {
    const before = await settings(api);
    const { payload } = await update(api, ['PASSWORD', 'PASSWORD'], before.revision);
    expectUserError(payload, 'INVALID_INPUT', ['input', 'enabledMethods']);
    expect((await settings(api)).revision).toBe(before.revision);
  });

  test('PHONE_OTP is rejected while the method is not configured', async ({ api }) => {
    const before = await settings(api);
    const { payload } = await update(api, ['PHONE_OTP'], before.revision);
    expectUserError(payload, 'METHOD_NOT_CONFIGURED', ['input', 'enabledMethods']);
  });

  test('non-positive or unsafe expected revision is rejected', async ({ api }) => {
    for (const expectedRevision of [0, -1])
      expectUserError((await update(api, [])).payload, 'INVALID_INPUT', [
        'input',
        'expectedRevision',
      ]);
    for (const expectedRevision of [1.5, Number.MAX_SAFE_INTEGER + 1])
      expectSafeTransportErrors(
        (await update(api, [])).errors,
        /BAD_USER_INPUT|Int/iu,
      );
  });

  test('stale customer account settings revision is rejected', async ({ api }) => {
    const before = await settings(api);
    expectNoUserErrors((await update(api, ['PASSWORD'], before.revision)).payload);
    const stale = (await update(api, ['EMAIL_OTP'], before.revision)).payload;
    expect(stale.settings).toBeNull();
    expect(stale.userErrors.length).toBeGreaterThan(0);
    expect(
      (await settings(api)).methods.find(({ method }: any) => method === 'PASSWORD').enabled,
    ).toBe(true);
  });

  test('user without store profile write permission cannot update account settings', async ({
    api,
  }) => {
    const before = await settings(api);
    await inviteWithPermissions(api, [{ resource: 'store.profile', action: 'read' }]);
    const { payload } = await update(api, [], before.revision);
    expectUserError(payload, 'FORBIDDEN');
    expect(payload.settings).toBeNull();
  });

  test('IAM failure is mapped to safe userErrors', async ({ api }) => {
    const before = await settings(api);
    const sql = openCustomersSql();
    try {
      await sql`update customers.storefront_auth_configuration set application_id = ${crypto.randomUUID()}::uuid where store_id = ${rawId(api.session.project.id)}::uuid`;
    } finally {
      await sql.end();
    }
    const { payload, errors } = await update(api, [], before.revision);
    expect(payload?.settings ?? null).toBeNull();
    expect(payload?.userErrors?.length || errors?.length).toBeTruthy();
    expect(JSON.stringify(payload ?? errors)).not.toMatch(/postgres|stack|token|secret/iu);
  });
});
