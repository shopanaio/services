import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateStoreName = () => `test-store-${crypto.randomUUID().slice(0, 8)}`;
const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;

test.describe('StoreCreate API', () => {
  let organizationId: string;

  test.beforeEach(async ({ api }) => {
    await api.session.setupUser();

    // Create an organization first
    const orgName = generateOrgName();
    const { data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgName,
          displayName: 'Test Organization',
        },
      },
    });

    organizationId = data.organizationMutation.organizationCreate.organization?.id;
  });

  test('Create store with minimal required fields', async ({ api }) => {
    const name = generateStoreName();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name,
          displayName: 'Test Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.store).not.toBeNull();
    expect(result.store?.displayName).toBe('Test Store');
    expect(result.store?.name).toBe(name);
    expect(result.store?.status).toBe('ACTIVE');
    expect(result.store?.locales).toContain('en');
    expect(result.store?.currencies).toContain('USD');
    expect(result.store?.defaultCurrency).toBe('USD');
  });

  test('Create store with all fields', async ({ api }) => {
    const name = generateStoreName();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name,
          displayName: 'Full Test Store',
          locales: ['en', 'uk'],
          currencies: ['USD', 'EUR'],
          defaultCurrency: 'EUR',
          status: 'ACTIVE',
          timezone: 'Europe/Kiev',
          email: 'test@example.com',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.store).not.toBeNull();
    expect(result.store?.displayName).toBe('Full Test Store');
    expect(result.store?.name).toBe(name);
    expect(result.store?.status).toBe('ACTIVE');
    expect(result.store?.timezone).toBe('Europe/Kiev');
    expect(result.store?.email).toBe('test@example.com');
    expect(result.store?.locales).toEqual(expect.arrayContaining(['en', 'uk']));
    expect(result.store?.currencies).toEqual(expect.arrayContaining(['USD', 'EUR']));
    expect(result.store?.defaultCurrency).toBe('EUR');
  });

  test('Create store with inactive status', async ({ api }) => {
    const name = generateStoreName();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name,
          displayName: 'Inactive Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
          status: 'INACTIVE',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.store).not.toBeNull();
    expect(result.store?.status).toBe('INACTIVE');
  });

  test('Create store with duplicate name should fail', async ({ api }) => {
    const name = generateStoreName();

    // Create first store
    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name,
          displayName: 'First Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Try to create second store with same name
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          organizationId,
          name,
          displayName: 'Second Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.store).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Create store without name should fail', async ({ api }) => {
    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          organizationId,
          name: '',
          displayName: 'Test Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Either GraphQL validation error or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeCreate;
      expect(result.store).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create store without displayName should fail', async ({ api }) => {
    const name = generateStoreName();

    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          organizationId,
          name,
          displayName: '',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Either GraphQL validation error or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeCreate;
      expect(result.store).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create store with empty locales should fail', async ({ api }) => {
    const name = generateStoreName();

    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          organizationId,
          name,
          displayName: 'Test Store',
          locales: [],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Either GraphQL validation error or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeCreate;
      expect(result.store).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create store with empty currencies should fail', async ({ api }) => {
    const name = generateStoreName();

    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          organizationId,
          name,
          displayName: 'Test Store',
          locales: ['en'],
          currencies: [],
          defaultCurrency: 'USD',
        },
      },
    });

    // Either GraphQL validation error or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.storeMutation.storeCreate;
      expect(result.store).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create store with multiple locales', async ({ api }) => {
    const name = generateStoreName();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name,
          displayName: 'Multi-locale Store',
          locales: ['en', 'uk', 'de', 'fr'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.store).not.toBeNull();
    expect(result.store?.locales).toHaveLength(4);
    expect(result.store?.locales).toEqual(expect.arrayContaining(['en', 'uk', 'de', 'fr']));
  });

  test('Create store with multiple currencies', async ({ api }) => {
    const name = generateStoreName();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name,
          displayName: 'Multi-currency Store',
          locales: ['en'],
          currencies: ['USD', 'EUR', 'GBP', 'UAH'],
          defaultCurrency: 'EUR',
        },
      },
    });

    const result = data.storeMutation.storeCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.store).not.toBeNull();
    expect(result.store?.currencies).toHaveLength(4);
    expect(result.store?.currencies).toEqual(expect.arrayContaining(['USD', 'EUR', 'GBP', 'UAH']));
    expect(result.store?.defaultCurrency).toBe('EUR');
  });
});
