/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import {
  currentStore,
  expectError,
  expectSuccess,
  setupStore,
  stableSettings,
  updateStore,
  validAddress,
  validContact,
} from './helpers';

test.describe('Project Settings Admin API - contact details and address', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('PRJ-CONTACT-001/PRJ-CONTACT-005/PRJ-CONTACT-009 contact update is atomic, ordered, and can clear email', async ({
    api,
  }) => {
    const before = await currentStore(api);
    const first = await updateStore(api, before, {
      contactDetails: validContact('  Updated Store  ', before.name),
    });
    expectSuccess(first, ['CONTACT_DETAILS_UPDATE']);
    expect(first.store?.contactDetails).toEqual({
      name: 'Updated Store',
      slug: before.name,
      email: 'settings@playwright.dev',
      phoneNumbers: ['+12025550101', '+442071838750'],
    });

    const second = await updateStore(api, first.store!, {
      contactDetails: {
        name: 'Updated Store',
        slug: before.name,
        email: null,
        phoneNumbers: ['+442071838750'],
      },
    });
    expectSuccess(second);
    expect(second.store?.contactDetails.email).toBeNull();
    expect(second.store?.contactDetails.phoneNumbers).toEqual(['+442071838750']);
  });

  test('PRJ-CONTACT-002 display name is trimmed and length bounded', async ({ api }) => {
    const store = await currentStore(api);
    const trimmed = await updateStore(api, store, {
      contactDetails: validContact('  Trimmed name  ', store.name),
    });
    expectSuccess(trimmed);
    expect(trimmed.store?.displayName).toBe('Trimmed name');

    const invalid = await updateStore(api, trimmed.store!, {
      contactDetails: validContact('x'.repeat(256), store.name),
    });
    expectError(invalid.userErrors, {
      field: ['operations', 'contactDetails', 'name'],
    });
  });

  test('PRJ-CONTACT-003/PRJ-CONTACT-004 slug uses canonical validation and collisions preserve state', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const before = stableSettings(store);
    const malformed = await updateStore(api, store, {
      contactDetails: validContact('Unchanged', 'Not URL Safe'),
    });
    expectError(malformed.userErrors, {
      field: ['operations', 'contactDetails', 'slug'],
    });
    expect(stableSettings(await currentStore(api))).toEqual(before);

    const organizationId = api.session.organizationId!;
    const other = await api.admin.project.create({
      organizationId,
      name: `collision-${crypto.randomUUID().slice(0, 8)}`,
    });
    const collision = await updateStore(api, store, {
      contactDetails: validContact('Must not persist', other.name),
    });
    expectError(collision.userErrors, { code: 'DUPLICATE_VALUE' });
    expect((await currentStore(api)).displayName).toBe(store.displayName);
  });

  test('PRJ-CONTACT-006 invalid email is rejected at the contact email path', async ({ api }) => {
    const store = await currentStore(api);
    const { data, errors } = await api.admin.mutation('project-api/ProjectUpdate', {
      throwOnError: false,
      variables: {
        storeId: store.id,
        clientMutationId: `invalid-email-${crypto.randomUUID()}`,
        expectedRevision: store.revision,
        operations: {
          contactDetails: {
            ...validContact('Invalid email', store.name),
            email: 'not-an-email',
          },
        },
      },
    });
    const payload = data?.storeMutation?.storeUpdate;
    const serialized = JSON.stringify(errors?.length ? errors : payload?.userErrors);
    expect(serialized).toMatch(/email/iu);
    expect((await currentStore(api)).email).toBe(store.email);
  });

  test('PRJ-CONTACT-007/PRJ-CONTACT-008 E.164 phones are unique and limited to twenty', async ({ api }) => {
    const store = await currentStore(api);
    for (const phoneNumbers of [
      ['2025550101'],
      ['+12025550101', '+12025550101'],
      Array.from({ length: 21 }, (_, index) => `+1202555${String(index).padStart(4, '0')}`),
    ]) {
      const payload = await updateStore(api, store, {
        contactDetails: {
          ...validContact('Invalid phones', store.name),
          phoneNumbers,
        },
      });
      expectError(payload.userErrors, {
        field: ['operations', 'contactDetails', 'phoneNumbers'],
      });
    }
  });

  test('PRJ-CONTACT-010 failed contact update preserves profile and phone rows', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const seeded = await updateStore(api, store, {
      contactDetails: validContact('Stable profile', store.name),
    });
    expectSuccess(seeded);
    const snapshot = seeded.store?.contactDetails;
    const failed = await updateStore(api, seeded.store!, {
      contactDetails: {
        ...validContact('Must roll back', store.name),
        phoneNumbers: ['invalid'],
      },
    });
    expect(failed.store).toBeNull();
    expect((await currentStore(api)).contactDetails).toEqual(snapshot);
  });

  test('PRJ-ADDR-001/PRJ-ADDR-002 address is created then deterministically replaced', async ({ api }) => {
    const store = await currentStore(api);
    expect(store.address).toBeNull();
    const created = await updateStore(api, store, { address: validAddress });
    expectSuccess(created, ['ADDRESS_UPDATE']);
    expect(created.store?.address).toEqual(validAddress);

    const replacement = {
      companyName: 'Replacement',
      countryCode: 'DE',
      addressLine1: 'Unter den Linden 1',
      addressLine2: null,
      city: 'Berlin',
      administrativeArea: 'Berlin',
      postalCode: '10117',
    };
    const replaced = await updateStore(api, created.store!, { address: replacement });
    expectSuccess(replaced);
    expect(replaced.store?.address).toEqual(replacement);
  });

  test('PRJ-ADDR-003/PRJ-ADDR-005/PRJ-ADDR-006 country shape, blank optionals, and field lengths map exactly', async ({
    api,
  }) => {
    const store = await currentStore(api);
    const cases: [Record<string, unknown>, string][] = [
      [{ ...validAddress, countryCode: 'ua' }, 'countryCode'],
      [{ ...validAddress, city: '   ' }, 'city'],
      [{ ...validAddress, postalCode: 'x'.repeat(33) }, 'postalCode'],
      [{ ...validAddress, addressLine1: 'x'.repeat(256) }, 'addressLine1'],
    ];
    for (const [address, field] of cases) {
      const payload = await updateStore(api, store, { address });
      expectError(payload.userErrors, {
        field: ['operations', 'address', field],
      });
    }
  });

  test('PRJ-ADDR-004 nullable address fields can be cleared explicitly', async ({ api }) => {
    const store = await currentStore(api);
    const seeded = await updateStore(api, store, { address: validAddress });
    const cleared = await updateStore(api, seeded.store!, {
      address: {
        companyName: null,
        countryCode: 'UA',
        addressLine1: null,
        addressLine2: null,
        city: null,
        administrativeArea: null,
        postalCode: null,
      },
    });
    expectSuccess(cleared);
    expect(cleared.store?.address).toEqual({
      companyName: null,
      countryCode: 'UA',
      addressLine1: null,
      addressLine2: null,
      city: null,
      administrativeArea: null,
      postalCode: null,
    });
  });

  test('PRJ-ADDR-007 address update does not change any other settings section', async ({
    api,
  }) => {
    const before = await currentStore(api);
    const payload = await updateStore(api, before, { address: validAddress });
    expectSuccess(payload);
    const after = payload.store!;
    expect(after.contactDetails).toEqual(before.contactDetails);
    expect(after.brand).toEqual(before.brand);
    expect(after.orderProcessing).toEqual(before.orderProcessing);
    expect(after.defaults).toEqual(before.defaults);
    expect(after.currencySettings).toEqual(before.currencySettings);
  });

  test('PRJ-ADDR-008 contact and address remain isolated between sibling stores', async ({
    api,
  }) => {
    const first = await currentStore(api);
    const second = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    api.session.project = second;
    const secondBefore = await currentStore(api);
    api.session.project = first;
    const updated = await updateStore(api, first, {
      contactDetails: validContact('First only', first.name),
      address: validAddress,
    });
    expectSuccess(updated);
    api.session.project = second;
    expect(stableSettings(await currentStore(api))).toEqual(stableSettings(secondBefore));
  });
});
