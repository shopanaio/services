import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateProjectSlug = () => `test-project-${crypto.randomUUID().slice(0, 8)}`;

test.describe('ProjectCreate API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUser();
  });

  test('Create project with minimal required fields', async ({ api }) => {
    const slug = generateProjectSlug();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Test Project',
          slug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const result = data.projectMutation.projectCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.project).not.toBeNull();
    expect(result.project?.name).toBe('Test Project');
    expect(result.project?.slug).toBe(slug);
    expect(result.project?.status).toBe('active');
    expect(result.project?.locales).toContain('en');
    expect(result.project?.currencies).toContain('USD');
    expect(result.project?.defaultCurrency).toBe('USD');
    expect(result.project?.organizationId).toBe(api.session.organizationId);
  });

  test('Create project with all fields', async ({ api }) => {
    const slug = generateProjectSlug();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Full Test Project',
          slug,
          locales: ['en', 'uk'],
          currencies: ['USD', 'EUR'],
          defaultCurrency: 'EUR',
          status: 'active',
          timezone: 'Europe/Kiev',
          email: 'test@example.com',
        },
      },
    });

    const result = data.projectMutation.projectCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.project).not.toBeNull();
    expect(result.project?.name).toBe('Full Test Project');
    expect(result.project?.slug).toBe(slug);
    expect(result.project?.status).toBe('active');
    expect(result.project?.timezone).toBe('Europe/Kiev');
    expect(result.project?.email).toBe('test@example.com');
    expect(result.project?.locales).toEqual(expect.arrayContaining(['en', 'uk']));
    expect(result.project?.currencies).toEqual(expect.arrayContaining(['USD', 'EUR']));
    expect(result.project?.defaultCurrency).toBe('EUR');
  });

  test('Create project with inactive status', async ({ api }) => {
    const slug = generateProjectSlug();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Inactive Project',
          slug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
          status: 'inactive',
        },
      },
    });

    const result = data.projectMutation.projectCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.project).not.toBeNull();
    expect(result.project?.status).toBe('inactive');
  });

  test('Create project with duplicate slug should fail', async ({ api }) => {
    const slug = generateProjectSlug();

    // Create first project
    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'First Project',
          slug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Try to create second project with same slug
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Second Project',
          slug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const result = data.projectMutation.projectCreate;

    expect(result.project).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Create project without name should fail', async ({ api }) => {
    const slug = generateProjectSlug();

    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: '',
          slug,
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
      const result = data.projectMutation.projectCreate;
      expect(result.project).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create project without slug should fail', async ({ api }) => {
    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Test Project',
          slug: '',
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
      const result = data.projectMutation.projectCreate;
      expect(result.project).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create project with empty locales should fail', async ({ api }) => {
    const slug = generateProjectSlug();

    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Test Project',
          slug,
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
      const result = data.projectMutation.projectCreate;
      expect(result.project).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create project with empty currencies should fail', async ({ api }) => {
    const slug = generateProjectSlug();

    const { data, errors } = await api.admin.mutation('project-api/ProjectCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Test Project',
          slug,
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
      const result = data.projectMutation.projectCreate;
      expect(result.project).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create project with multiple locales', async ({ api }) => {
    const slug = generateProjectSlug();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Multi-locale Project',
          slug,
          locales: ['en', 'uk', 'de', 'fr'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const result = data.projectMutation.projectCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.project).not.toBeNull();
    expect(result.project?.locales).toHaveLength(4);
    expect(result.project?.locales).toEqual(expect.arrayContaining(['en', 'uk', 'de', 'fr']));
  });

  test('Create project with multiple currencies', async ({ api }) => {
    const slug = generateProjectSlug();

    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Multi-currency Project',
          slug,
          locales: ['en'],
          currencies: ['USD', 'EUR', 'GBP', 'UAH'],
          defaultCurrency: 'EUR',
        },
      },
    });

    const result = data.projectMutation.projectCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.project).not.toBeNull();
    expect(result.project?.currencies).toHaveLength(4);
    expect(result.project?.currencies).toEqual(expect.arrayContaining(['USD', 'EUR', 'GBP', 'UAH']));
    expect(result.project?.defaultCurrency).toBe('EUR');
  });
});
