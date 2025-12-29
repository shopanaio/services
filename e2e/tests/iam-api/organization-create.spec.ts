import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;

test.describe('OrganizationCreate API', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUser();
  });

  test('Create organization with minimal required fields', async ({ api }) => {
    const name = generateOrgName();

    const { data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name,
          displayName: 'Test Organization',
        },
      },
    });

    const result = data.organizationMutation.organizationCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.organization).not.toBeNull();
    expect(result.organization?.displayName).toBe('Test Organization');
    expect(result.organization?.name).toBe(name);
    expect(result.organization?.id).toBeDefined();
    expect(result.organization?.createdAt).toBeDefined();
  });

  test('Creator should become owner of the organization', async ({ api }) => {
    const name = generateOrgName();

    const { data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name,
          displayName: 'Owner Test Org',
        },
      },
    });

    const result = data.organizationMutation.organizationCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.organization).not.toBeNull();

    const members = result.organization?.membership?.members;
    expect(members).toHaveLength(1);
    expect(members?.[0].role).toBe('admin');
  });

  test('Organization should have system roles after creation', async ({ api }) => {
    const name = generateOrgName();

    const { data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name,
          displayName: 'Roles Test Org',
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

    const ownerRole = roles?.find((r) => r.name === 'admin');
    expect(ownerRole).toBeDefined();
    expect(ownerRole?.isSystem).toBe(true);
  });

  test('Create organization with duplicate name should fail', async ({ api }) => {
    const name = generateOrgName();

    // Create first organization
    await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name,
          displayName: 'First Org',
        },
      },
    });

    // Try to create second organization with same name
    const { data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      throwOnError: false,
      variables: {
        input: {
          name,
          displayName: 'Second Org',
        },
      },
    });

    const result = data.organizationMutation.organizationCreate;

    expect(result.organization).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Create organization without displayName should fail', async ({ api }) => {
    const name = generateOrgName();

    const { data, errors } = await api.admin.mutation('iam-api/OrganizationCreate', {
      throwOnError: false,
      variables: {
        input: {
          name,
          displayName: '',
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

  test('Create organization without name should fail', async ({ api }) => {
    const { data, errors } = await api.admin.mutation('iam-api/OrganizationCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: '',
          displayName: 'Test Org',
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

  test('Create organization with invalid name format should fail', async ({ api }) => {
    const { data, errors } = await api.admin.mutation('iam-api/OrganizationCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Invalid Name With Spaces!',
          displayName: 'Test Org',
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
    const name = generateOrgName();

    // Clear the session to simulate unauthenticated user
    api.session.clearSession();

    const { data } = await api.admin.mutation('iam-api/OrganizationCreate', {
      throwOnError: false,
      variables: {
        input: {
          name,
          displayName: 'Unauthorized Org',
        },
      },
    });

    const result = data.organizationMutation.organizationCreate;
    expect(result.organization).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('User can create multiple organizations', async ({ api }) => {
    const name1 = generateOrgName();
    const name2 = generateOrgName();

    const { data: data1 } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: name1,
          displayName: 'First Organization',
        },
      },
    });

    const { data: data2 } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: name2,
          displayName: 'Second Organization',
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
