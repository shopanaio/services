import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgSlug = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;

test.describe('OrganizationCreate API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUser();
  });

  test('Create organization with minimal required fields', async ({ api }) => {
    const slug = generateOrgSlug();

    const { data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: 'Test Organization',
          slug,
        },
      },
    });

    const result = data.organizationMutation.organizationCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.organization).not.toBeNull();
    expect(result.organization?.name).toBe('Test Organization');
    expect(result.organization?.slug).toBe(slug);
    expect(result.organization?.id).toBeDefined();
    expect(result.organization?.createdAt).toBeDefined();
  });

  test('Creator should become owner of the organization', async ({ api }) => {
    const slug = generateOrgSlug();

    const { data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: 'Owner Test Org',
          slug,
        },
      },
    });

    const result = data.organizationMutation.organizationCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.organization).not.toBeNull();

    const members = result.organization?.membership?.members;
    expect(members).toHaveLength(1);
    expect(members?.[0].role).toBe('owner');
  });

  test('Organization should have system roles after creation', async ({ api }) => {
    const slug = generateOrgSlug();

    const { data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: 'Roles Test Org',
          slug,
        },
      },
    });

    const result = data.organizationMutation.organizationCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.organization).not.toBeNull();

    const roles = result.organization?.membership?.roles;
    expect(roles).toBeDefined();
    expect(roles?.length).toBeGreaterThan(0);

    const systemRoles = roles?.filter((r) => r.isSystem);
    expect(systemRoles?.length).toBeGreaterThan(0);

    const ownerRole = roles?.find((r) => r.name === 'owner');
    expect(ownerRole).toBeDefined();
    expect(ownerRole?.isSystem).toBe(true);
  });

  test('Create organization with duplicate slug should fail', async ({ api }) => {
    const slug = generateOrgSlug();

    // Create first organization
    await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: 'First Org',
          slug,
        },
      },
    });

    // Try to create second organization with same slug
    const { data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Second Org',
          slug,
        },
      },
    });

    const result = data.organizationMutation.organizationCreate;

    expect(result.organization).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Create organization without name should fail', async ({ api }) => {
    const slug = generateOrgSlug();

    const { data, errors } = await api.admin.mutation('iam-api/OrganizationCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: '',
          slug,
        },
      },
    });

    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.organizationMutation.organizationCreate;
      expect(result.organization).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create organization without slug should fail', async ({ api }) => {
    const { data, errors } = await api.admin.mutation('iam-api/OrganizationCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Test Org',
          slug: '',
        },
      },
    });

    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.organizationMutation.organizationCreate;
      expect(result.organization).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Create organization with invalid slug format should fail', async ({ api }) => {
    const { data, errors } = await api.admin.mutation('iam-api/OrganizationCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Test Org',
          slug: 'Invalid Slug With Spaces!',
        },
      },
    });

    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      const result = data.organizationMutation.organizationCreate;
      expect(result.organization).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Unauthenticated user should not create organization', async ({ api }) => {
    const slug = generateOrgSlug();

    // Clear the session to simulate unauthenticated user
    api.session.clearSession();

    const { data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Unauthorized Org',
          slug,
        },
      },
    });

    const result = data.organizationMutation.organizationCreate;
    expect(result.organization).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('User can create multiple organizations', async ({ api }) => {
    const slug1 = generateOrgSlug();
    const slug2 = generateOrgSlug();

    const { data: data1 } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: 'First Organization',
          slug: slug1,
        },
      },
    });

    const { data: data2 } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: 'Second Organization',
          slug: slug2,
        },
      },
    });

    expect(data1.organizationMutation.organizationCreate.userErrors).toHaveLength(0);
    expect(data1.organizationMutation.organizationCreate.organization).not.toBeNull();

    expect(data2.organizationMutation.organizationCreate.userErrors).toHaveLength(0);
    expect(data2.organizationMutation.organizationCreate.organization).not.toBeNull();

    expect(data1.organizationMutation.organizationCreate.organization?.id).not.toBe(
      data2.organizationMutation.organizationCreate.organization?.id,
    );
  });
});
