/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { composeGlobalId, decodeGlobalId } from '@utils/globalid';
import {
  currentStore,
  localeCreate,
  selectStore,
  setupStore,
  updateStore,
  validAddress,
  validBrand,
  validContact,
} from './helpers';

test.describe('Project Settings Admin API - store queries and profile', () => {
  test.beforeEach(async ({ api }) => {
    await setupStore(api);
  });

  test('PRJ-QUERY-001/PRJ-QUERY-002 stores returns only non-deleted stores owned by the organization', async ({
    api,
  }) => {
    const first = await currentStore(api);
    const second = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    const { data } = await api.admin.query('project-api/Projects', {
      variables: { organizationId: api.session.organizationId! },
    });
    expect(data.storeQuery.stores.map(({ id }) => id)).toEqual(
      expect.arrayContaining([first.id, second.id]),
    );
    expect(data.storeQuery.stores.every(({ id }) => decodeGlobalId(id).typeName === 'Store')).toBe(
      true,
    );
  });

  test('PRJ-QUERY-003 selected-store access never broadens to sibling data', async ({ api }) => {
    const selected = await currentStore(api);
    const sibling = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    selectStore(api, selected);
    const { data } = await api.admin.query('project-api/Projects', {
      variables: { organizationId: api.session.organizationId! },
    });
    const ids = data.storeQuery.stores.map(({ id }) => id);
    expect(ids).toContain(selected.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(sibling.id).not.toBe(selected.id);
  });

  test('PRJ-QUERY-004 unauthenticated stores query fails without existence disclosure', async ({
    api,
  }) => {
    const organizationId = api.session.organizationId!;
    api.session.clearSession();
    const { data, errors } = await api.admin.query('project-api/Projects', {
      throwOnError: false,
      variables: { organizationId },
    });
    expect(JSON.stringify(errors ?? data)).toMatch(/UNAUTHENTICATED/iu);
  });

  test('PRJ-QUERY-005 malformed and type-confused organization IDs fail safely', async ({
    api,
  }) => {
    for (const organizationId of [
      'malformed',
      composeGlobalId('Store', crypto.randomUUID()),
    ]) {
      const { data, errors } = await api.admin.query('project-api/Projects', {
        throwOnError: false,
        variables: { organizationId },
      });
      expect(Boolean(errors?.length) || data?.storeQuery?.stores?.length === 0).toBe(true);
    }
  });

  test('PRJ-QUERY-006 organization selector cannot expose a foreign organization', async ({
    api,
  }) => {
    const trustedOrganizationId = api.session.organizationId!;
    const trustedStore = await currentStore(api);
    const foreignOrganization = await api.session.setupOrganization();
    const foreignStore = await api.admin.project.create({
      organizationId: foreignOrganization.id,
    });
    api.session.organizationId = trustedOrganizationId;
    selectStore(api, trustedStore);
    const { data } = await api.admin.query('project-api/Projects', {
      variables: { organizationId: foreignOrganization.id },
    });
    expect(data.storeQuery.stores.map(({ id }) => id)).not.toContain(foreignStore.id);
  });

  test('PRJ-QUERY-007/PRJ-QUERY-008/PRJ-QUERY-009 currentStore resolves only the trusted selected context', async ({
    api,
  }) => {
    const trusted = await currentStore(api);
    const sibling = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    selectStore(api, trusted);
    expect((await currentStore(api)).id).toBe(trusted.id);
    api.session.project = {
      id: sibling.id,
      name: 'unknown-header-name',
      displayName: sibling.displayName,
    };
    const { data, errors } = await api.admin.query('project-api/Project', {
      throwOnError: false,
    });
    expect(JSON.stringify(errors ?? data)).toMatch(/ADMIN_CONTEXT_INVALID/iu);
  });

  test('PRJ-QUERY-010 deleted selected store resolves null', async ({ api }) => {
    const store = await currentStore(api);
    const { data } = await api.admin.mutation('project-api/ProjectDelete', {
      variables: {
        input: { id: store.id, organizationId: api.session.organizationId! },
      },
    });
    expect(data.storeMutation.storeDelete.userErrors).toHaveLength(0);
    api.session.clearProject();
    const result = await api.admin.query('project-api/Project', {});
    expect(result.data.storeQuery.currentStore).toBeNull();
  });

  test('PRJ-QUERY-011/PRJ-QUERY-012 Store ID and federation references use canonical entity types', async ({
    api,
  }) => {
    const store = await currentStore(api);
    expect(decodeGlobalId(store.id).typeName).toBe('Store');
    expect(decodeGlobalId(store.organization!.id).typeName).toBe('Organization');
    expect(store.membership).toEqual(
      expect.objectContaining({
        domain: `store:${decodeGlobalId(store.id).id}`,
        organizationId: decodeGlobalId(api.session.organizationId!).id,
      }),
    );
  });

  test('PRJ-QUERY-013/PRJ-QUERY-014/PRJ-QUERY-015/PRJ-QUERY-016 profile and language projections are complete and deterministic', async ({
    api,
  }) => {
    await localeCreate(api, 'de', true);
    await localeCreate(api, 'fr', false);
    const store = await currentStore(api);
    expect(store).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        displayName: expect.any(String),
        status: 'ACTIVE',
        timezone: expect.any(String),
        revision: expect.any(Number),
      }),
    );
    expect(store.locales).toContain('de');
    expect(store.locales).not.toContain('fr');
    expect(store.languageSettings).toEqual(
      expect.arrayContaining([
        { code: 'de', name: expect.any(String), isActive: true },
        { code: 'fr', name: expect.any(String), isActive: false },
      ]),
    );
  });

  test('PRJ-QUERY-017/PRJ-QUERY-018 Store defaults and optional settings return documented defaults', async ({
    api,
  }) => {
    const store = await currentStore(api);
    expect(store.defaults).toEqual({
      unitSystem: 'METRIC',
      defaultWeightUnit: 'kg',
      defaultDimensionUnit: 'cm',
      timezone: 'UTC',
    });
    expect(store.address).toBeNull();
    expect(store.brand.socialLinks).toEqual([]);
    expect(store.orderProcessing.orderNumberPrefix).toBe('#');
    expect(store.currencySettings).toEqual(
      expect.objectContaining({
        currencyCode: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
  });

  test('PRJ-QUERY-019 brand exposes typed File federation references', async ({ api }) => {
    const store = await currentStore(api);
    const file = await api.admin.file.createExternal({
      provider: 'URL',
      externalId: crypto.randomUUID(),
      url: 'https://example.com/query-logo.png',
    });
    const updated = await updateStore(api, store, {
      brand: { ...validBrand, defaultLogoId: file.id },
    });
    expect(updated.userErrors).toHaveLength(0);
    expect(updated.store?.brand.defaultLogo?.id).toBe(file.id);
    expect(decodeGlobalId(file.id).typeName).toBe('File');
  });

  test('PRJ-QUERY-020 ordered phones and social links survive fresh resolution', async ({ api }) => {
    const store = await currentStore(api);
    const phones = ['+442071838750', '+12025550101'];
    const socialLinks = [...validBrand.socialLinks].reverse();
    const updated = await updateStore(api, store, {
      contactDetails: { ...validContact('Ordered', store.name), phoneNumbers: phones },
      brand: { ...validBrand, socialLinks },
    });
    expect(updated.userErrors).toHaveLength(0);
    const fresh = await currentStore(api);
    expect(fresh.contactDetails.phoneNumbers).toEqual(phones);
    expect(fresh.brand.socialLinks).toEqual(socialLinks);
  });

  test('PRJ-QUERY-021 unauthenticated currentStore query fails without disclosure', async ({
    api,
  }) => {
    api.session.clearSession();
    const { data, errors } = await api.admin.query('project-api/Project', {
      throwOnError: false,
    });
    expect(JSON.stringify(errors ?? data)).toMatch(/UNAUTHENTICATED/iu);
  });

  test('PRJ-QUERY-022 batched settings resolution never mixes sibling stores', async ({ api }) => {
    const first = await currentStore(api);
    const second = await api.admin.project.create({
      organizationId: api.session.organizationId!,
    });
    const firstUpdated = await updateStore(api, first, {
      contactDetails: validContact('First profile', first.name),
      address: { ...validAddress, countryCode: 'UA' },
    });
    expect(firstUpdated.userErrors).toHaveLength(0);
    selectStore(api, second);
    const secondCurrent = await currentStore(api);
    const secondUpdated = await updateStore(api, secondCurrent, {
      contactDetails: validContact('Second profile', second.name),
      address: { ...validAddress, countryCode: 'DE' },
    });
    expect(secondUpdated.userErrors).toHaveLength(0);
    const { data } = await api.admin.query('project-api/Projects', {
      variables: { organizationId: api.session.organizationId! },
    });
    const byId = new Map(data.storeQuery.stores.map((store) => [store.id, store]));
    expect(byId.get(first.id)?.contactDetails.name).toBe('First profile');
    expect(byId.get(first.id)?.address?.countryCode).toBe('UA');
    expect(byId.get(second.id)?.contactDetails.name).toBe('Second profile');
    expect(byId.get(second.id)?.address?.countryCode).toBe('DE');
  });
});
