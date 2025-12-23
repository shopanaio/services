import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateRoleName = () => `custom-role-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Custom Role Creation Tests
 *
 * Tests for creating custom roles via roleMutation.roleCreate.
 * According to the IAM plan:
 * - Requires project:admin permission
 * - Name must be unique within project
 * - Name cannot match system roles
 * - Name must be valid slug (a-z0-9-_)
 */
test.describe('Custom Role Creation', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUser();
    await api.session.setupProject();
  });

  test('Should create a custom role with minimal fields', async ({ api }) => {
    const roleName = generateRoleName();

    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Custom Role',
          permissions: [
            {
              resource: 'product',
              actions: ['read'],
              effect: 'ALLOW',
            },
          ],
        },
      },
    });

    const result = data.roleMutation.roleCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.role?.name).toBe(roleName);
    expect(result.role?.displayName).toBe('Custom Role');
    expect(result.role?.isSystem).toBe(false);
  });

  test('Should create a custom role with all fields', async ({ api }) => {
    const roleName = generateRoleName();

    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Content Editor',
          description: 'Can edit products and categories',
          inherits: ['viewer'],
          permissions: [
            {
              resource: 'product',
              actions: ['create', 'update', 'publish'],
              effect: 'ALLOW',
            },
            {
              resource: 'category',
              actions: ['create', 'update'],
              effect: 'ALLOW',
            },
            {
              resource: 'media',
              actions: ['upload', 'delete'],
              effect: 'ALLOW',
            },
          ],
        },
      },
    });

    const result = data.roleMutation.roleCreate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.role?.name).toBe(roleName);
    expect(result.role?.displayName).toBe('Content Editor');
    expect(result.role?.description).toBe('Can edit products and categories');
    expect(result.role?.inherits).toContain('viewer');
    expect(result.role?.isSystem).toBe(false);
    expect(result.role?.permissions.length).toBe(3);
  });

  test('Should create a custom role with DENY permissions', async ({ api }) => {
    const roleName = generateRoleName();

    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Limited Manager',
          inherits: ['manager'],
          permissions: [
            {
              resource: 'product',
              actions: ['delete'],
              effect: 'DENY',
            },
          ],
        },
      },
    });

    const result = data.roleMutation.roleCreate;
    expect(result.userErrors).toHaveLength(0);

    const denyPerm = result.role?.permissions.find(
      (p: { resource: string; effect: string }) => p.resource === 'product' && p.effect === 'DENY',
    );
    expect(denyPerm).toBeDefined();
    expect(denyPerm?.actions).toContain('delete');
  });

  test('Should create a custom role with wildcard resource', async ({ api }) => {
    const roleName = generateRoleName();

    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Full Reader',
          permissions: [
            {
              resource: '*',
              actions: ['read'],
              effect: 'ALLOW',
            },
          ],
        },
      },
    });

    const result = data.roleMutation.roleCreate;

    expect(result.userErrors).toHaveLength(0);
    const wildcardPerm = result.role?.permissions.find(
      (p: { resource: string }) => p.resource === '*',
    );
    expect(wildcardPerm).toBeDefined();
  });

  test('Should create a custom role with wildcard actions', async ({ api }) => {
    const roleName = generateRoleName();

    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Product Admin',
          permissions: [
            {
              resource: 'product',
              actions: ['*'],
              effect: 'ALLOW',
            },
          ],
        },
      },
    });

    const result = data.roleMutation.roleCreate;

    expect(result.userErrors).toHaveLength(0);
    const productPerm = result.role?.permissions.find(
      (p: { resource: string }) => p.resource === 'product',
    );
    expect(productPerm?.actions).toContain('*');
  });

  test('Should fail when creating role with duplicate name', async ({ api }) => {
    const roleName = generateRoleName();

    // Create first role
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'First Role',
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    // Try to create second role with same name
    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: roleName,
          displayName: 'Second Role',
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    const result = data.roleMutation.roleCreate;
    expect(result.role).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Should fail when creating role with system role name', async ({ api }) => {
    const systemRoles = ['owner', 'admin', 'manager', 'support', 'viewer'];

    for (const roleName of systemRoles) {
      const { data } = await api.admin.mutation('roles-api/RoleCreate', {
        throwOnError: false,
        variables: {
          input: {
            name: roleName,
            displayName: `Custom ${roleName}`,
            permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
          },
        },
      });

      const result = data.roleMutation.roleCreate;
      expect(result.role).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Should fail when creating role without name', async ({ api }) => {
    const { data, errors } = await api.admin.mutation('roles-api/RoleCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: '',
          displayName: 'No Name Role',
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    // Either GraphQL validation error or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      expect(data.roleMutation.roleCreate.role).toBeNull();
      expect(data.roleMutation.roleCreate.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Should fail when creating role without displayName', async ({ api }) => {
    const roleName = generateRoleName();

    const { data, errors } = await api.admin.mutation('roles-api/RoleCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: roleName,
          displayName: '',
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    // Either GraphQL validation error or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      expect(data.roleMutation.roleCreate.role).toBeNull();
      expect(data.roleMutation.roleCreate.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Should fail when creating role without permissions', async ({ api }) => {
    const roleName = generateRoleName();

    const { data, errors } = await api.admin.mutation('roles-api/RoleCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: roleName,
          displayName: 'Empty Permissions Role',
          permissions: [],
        },
      },
    });

    // Either GraphQL validation error or userErrors
    if (errors && errors.length > 0) {
      expect(errors.length).toBeGreaterThan(0);
    } else {
      expect(data.roleMutation.roleCreate.role).toBeNull();
      expect(data.roleMutation.roleCreate.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Should fail when creating role with invalid inherits reference', async ({ api }) => {
    const roleName = generateRoleName();

    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: roleName,
          displayName: 'Invalid Inherit Role',
          inherits: ['non-existent-role'],
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    const result = data.roleMutation.roleCreate;

    expect(result.role).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Created custom role should appear in project roles list', async ({ api }) => {
    const roleName = generateRoleName();

    // Create custom role
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Custom Role',
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    // Fetch project roles
    const { data } = await api.admin.query('project-api/ProjectRoles', {
      variables: { slug: api.session.projectSlug },
    });

    const roles = data.projectQuery.project?.roles ?? [];
    const customRole = roles.find((r: { name: string }) => r.name === roleName);
    expect(customRole).toBeDefined();
    expect(customRole?.isSystem).toBe(false);
  });

  test('Should create role with multiple inheritance', async ({ api }) => {
    // First create a custom role
    const baseRoleName = generateRoleName();
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: baseRoleName,
          displayName: 'Base Custom Role',
          permissions: [{ resource: 'media', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    // Create another role that inherits from both viewer and custom role
    const roleName = generateRoleName();
    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Multi Inherit Role',
          inherits: ['viewer', baseRoleName],
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    const result = data.roleMutation.roleCreate;
    expect(result.userErrors).toHaveLength(0);
    expect(result.role?.inherits).toContain('viewer');
    expect(result.role?.inherits).toContain(baseRoleName);
  });
});
