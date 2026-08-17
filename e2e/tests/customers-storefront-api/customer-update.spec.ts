/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';
import {
  CUSTOMER_SUMMARY_FIELDS,
  CustomersStorefrontTestKit,
  USER_ERROR_FIELDS,
  uniqueKey,
  type CustomerUserError,
} from './customers-storefront-test-kit';

interface UpdatePayload {
  customer: Record<string, unknown> | null;
  userErrors: CustomerUserError[];
}

test.describe('Customers Storefront API — customer update', () => {
  let kit: CustomersStorefrontTestKit;

  test.beforeEach(async ({ api, request }) => {
    kit = new CustomersStorefrontTestKit(api, request);
    await kit.setup();
  });

  test.afterEach(async () => {
    await kit.close();
  });

  async function update(input: Record<string, unknown>, fields = CUSTOMER_SUMMARY_FIELDS) {
    return kit.mutation<UpdatePayload>(
      'customerUpdate',
      'CustomerUpdateInput',
      input,
      `customer { ${fields} } userErrors { ${USER_ERROR_FIELDS} }`,
    );
  }

  test('customer updates every editable profile field', async () => {
    const revision = await kit.revision();
    const values = {
      prefix: 'Dr',
      firstName: 'Ada',
      middleName: 'Augusta',
      lastName: 'Lovelace',
      suffix: 'Countess',
      preferredLocale: 'en-GB',
      dateOfBirth: '1990-02-28',
      gender: 'female',
      companyName: 'Analytical Engines',
      jobTitle: 'Programmer',
    };
    const response = await update({
      ...values,
      expectedRevision: revision,
      idempotencyKey: uniqueKey(),
    });
    expect(response.errors).toBeUndefined();
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customer).toEqual(
      expect.objectContaining({ ...values, revision: revision + 1 }),
    );
    expect(await kit.currentCustomer(CUSTOMER_SUMMARY_FIELDS)).toEqual(
      response.data?.payload.customer,
    );
  });

  test('omitted profile fields remain unchanged', async () => {
    await kit.updateCustomerRow({ firstName: 'Before', lastName: 'Preserved' });
    const response = await update({
      firstName: 'After',
      expectedRevision: await kit.revision(),
      idempotencyKey: uniqueKey(),
    });
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customer).toEqual(
      expect.objectContaining({ firstName: 'After', lastName: 'Preserved' }),
    );
  });

  test('nullable profile fields can be cleared explicitly', async () => {
    await kit.updateCustomerRow({
      prefix: 'Dr',
      middleName: 'Middle',
      suffix: 'III',
      preferredLocale: 'en-US',
      dateOfBirth: '1990-01-01',
      gender: 'x',
      companyName: 'Company',
      jobTitle: 'Role',
    });
    const response = await update({
      prefix: null,
      middleName: null,
      suffix: null,
      preferredLocale: null,
      dateOfBirth: null,
      gender: null,
      companyName: null,
      jobTitle: null,
      expectedRevision: await kit.revision(),
      idempotencyKey: uniqueKey(),
    });
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customer).toEqual(
      expect.objectContaining({
        prefix: null,
        middleName: null,
        suffix: null,
        preferredLocale: null,
        dateOfBirth: null,
        gender: null,
        companyName: null,
        jobTitle: null,
      }),
    );
  });

  test('customer cannot update email phone verification account status or admin-only fields', async () => {
    for (const field of [
      'email',
      'phone',
      'emailVerified',
      'phoneVerified',
      'accountStatus',
      'lifecycleStatus',
      'note',
      'moderationNote',
    ]) {
      const response = await kit.graphql(
        `mutation MassAssignment($input: CustomerUpdateInput!) {
          customerUpdate(input: $input) { userErrors { code } }
        }`,
        {
          input: {
            [field]: field.endsWith('Verified') ? true : 'forged',
            expectedRevision: await kit.revision(),
            idempotencyKey: uniqueKey(field),
          },
        },
      );
      expect(response.data ?? null).toBeNull();
      expect(response.errors?.[0]?.message).toContain(`Field "${field}" is not defined`);
    }
  });

  test('customer update trims and normalizes supported strings', async () => {
    const response = await update({
      firstName: '  Ada  ',
      companyName: '  Analytical Engines  ',
      preferredLocale: 'EN-gb',
      gender: '  non-binary  ',
      expectedRevision: await kit.revision(),
      idempotencyKey: uniqueKey(),
    });
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customer).toEqual(
      expect.objectContaining({
        firstName: 'Ada',
        companyName: 'Analytical Engines',
        preferredLocale: 'en-GB',
        gender: 'non-binary',
      }),
    );
  });

  test('empty and oversized profile values are rejected with precise fields', async () => {
    for (const [field, value] of [
      ['firstName', '   '],
      ['lastName', 'x'.repeat(129)],
      ['companyName', 'x'.repeat(256)],
      ['jobTitle', 'x'.repeat(256)],
    ] as const) {
      const response = await update({
        [field]: value,
        expectedRevision: await kit.revision(),
        idempotencyKey: uniqueKey(field),
      });
      const error = kit.expectUserError(response.data!.payload.userErrors, 'INVALID_VALUE');
      expect(error.field).toContain(field);
    }
  });

  test('valid supported BCP 47 locale is accepted', async () => {
    const response = await update({
      preferredLocale: 'uk-UA',
      expectedRevision: await kit.revision(),
      idempotencyKey: uniqueKey(),
    });
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customer?.preferredLocale).toBe('uk-UA');
  });

  test('unsupported or malformed locale is rejected', async () => {
    for (const preferredLocale of ['not_a_locale', 'xx-ZZ', 'en--US']) {
      const response = await update({
        preferredLocale,
        expectedRevision: await kit.revision(),
        idempotencyKey: uniqueKey(),
      });
      kit.expectUserError(response.data!.payload.userErrors, 'UNSUPPORTED_LOCALE');
    }
  });

  test('valid date of birth boundary is accepted', async () => {
    const response = await update({
      dateOfBirth: '2000-02-29',
      expectedRevision: await kit.revision(),
      idempotencyKey: uniqueKey(),
    });
    expect(response.data?.payload.userErrors).toEqual([]);
    expect(response.data?.payload.customer?.dateOfBirth).toBe('2000-02-29');
  });

  test('future impossible and out-of-range date of birth is rejected', async () => {
    const futureDate = new Date();
    futureDate.setUTCFullYear(futureDate.getUTCFullYear() + 10);
    for (const dateOfBirth of [
      futureDate.toISOString().slice(0, 10),
      '2023-02-29',
      '1800-01-01',
    ]) {
      const response = await update({
        dateOfBirth,
        expectedRevision: await kit.revision(),
        idempotencyKey: uniqueKey(),
      });
      if (response.errors) {
        kit.expectBadUserInput(response);
      } else {
        kit.expectUserError(response.data!.payload.userErrors, 'INVALID_DATE_OF_BIRTH');
      }
    }
  });

  test('stale expected revision rejects the entire profile update', async () => {
    const stale = await kit.revision();
    const applied = await update({
      firstName: 'Original',
      companyName: 'Original Co',
      expectedRevision: stale,
      idempotencyKey: uniqueKey(),
    });
    expect(applied.data?.payload.userErrors).toEqual([]);
    const response = await update({
      firstName: 'Partial',
      companyName: 'Must not write',
      expectedRevision: stale,
      idempotencyKey: uniqueKey(),
    });
    expect(response.data?.payload.customer).toBeNull();
    kit.expectUserError(response.data!.payload.userErrors, 'REVISION_CONFLICT', {
      retryable: true,
    });
    expect(await kit.currentCustomer('firstName companyName')).toEqual({
      firstName: 'Original',
      companyName: 'Original Co',
    });
  });

  test('non-positive fractional and unsafe expected revisions are rejected', async () => {
    for (const expectedRevision of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const response = await update({
        firstName: 'Invalid revision',
        expectedRevision,
        idempotencyKey: uniqueKey(),
      });
      if (response.errors) {
        kit.expectBadUserInput(response);
      } else {
        kit.expectUserError(response.data!.payload.userErrors, 'INVALID_REVISION');
      }
    }
  });

  test('retry with the same idempotency key returns the original profile result', async () => {
    const revision = await kit.revision();
    const idempotencyKey = uniqueKey();
    const input = { firstName: 'Exactly once', expectedRevision: revision, idempotencyKey };
    const first = await update(input);
    const second = await update(input);
    expect(first.data?.payload.userErrors).toEqual([]);
    expect(second.data?.payload).toEqual(first.data?.payload);
    expect(await kit.revision()).toBe(revision + 1);
  });

  test('reusing an idempotency key with a different profile payload is rejected', async () => {
    const idempotencyKey = uniqueKey();
    const revision = await kit.revision();
    expect(
      (await update({ firstName: 'First', expectedRevision: revision, idempotencyKey })).data
        ?.payload.userErrors,
    ).toEqual([]);
    const replay = await update({
      firstName: 'Different',
      expectedRevision: revision,
      idempotencyKey,
    });
    kit.expectUserError(replay.data!.payload.userErrors, /IDEMPOTENCY/iu);
    expect((await kit.currentCustomer<{ firstName: string }>('firstName')).firstName).toBe('First');
  });

  test('blank oversized and malformed idempotency keys are rejected', async () => {
    for (const idempotencyKey of ['', '   ', 'x'.repeat(257), 'contains\nnewline']) {
      const response = await update({
        firstName: 'No write',
        expectedRevision: await kit.revision(),
        idempotencyKey,
      });
      kit.expectUserError(response.data!.payload.userErrors, 'INVALID_IDEMPOTENCY_KEY');
    }
  });

  test('concurrent updates with one revision allow exactly one winner', async () => {
    const revision = await kit.revision();
    const [a, b] = await Promise.all([
      update({ firstName: 'Winner A', expectedRevision: revision, idempotencyKey: uniqueKey() }),
      update({ firstName: 'Winner B', expectedRevision: revision, idempotencyKey: uniqueKey() }),
    ]);
    const payloads = [a.data!.payload, b.data!.payload];
    expect(payloads.filter(({ userErrors }) => userErrors.length === 0)).toHaveLength(1);
    expect(
      payloads.filter(({ userErrors }) => userErrors[0]?.code === 'REVISION_CONFLICT'),
    ).toHaveLength(1);
    expect(await kit.revision()).toBe(revision + 1);
  });
});
