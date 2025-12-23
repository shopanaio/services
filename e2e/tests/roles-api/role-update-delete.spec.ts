import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateProjectSlug = () => `test-project-${crypto.randomUUID().slice(0, 8)}`;
const generateRoleName = () => `custom-role-${crypto.randomUUID().slice(0, 8)}`;

/**
 * Role Update and Delete Tests
 *
 * Tests for updating and deleting roles via roleMutation.roleUpdate and roleMutation.roleDelete.
 * According to the IAM plan:
 * - Requires project:admin permission
 * - System roles cannot be modified or deleted
 * - Roles with assigned users cannot be deleted
 */
test.describe('Role Update', () => {
  let projectSlug: string;

  test.beforeEach(async ({ api }) => {
    await api.session.setupUser();

    projectSlug = generateProjectSlug();
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Role Test Project',
          slug: projectSlug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    expect(data.projectMutation.projectCreate.userErrors).toHaveLength(0);
    api.session.project = data.projectMutation.projectCreate.project;
  });

  test('Should update custom role displayName', async ({ api }) => {
    const roleName = generateRoleName();

    // Create custom role
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Original Name',
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    // Update displayName
    const { data } = await api.admin.mutation('roles-api/RoleUpdate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Updated Name',
        },
      },
    });

    const result = data.roleMutation.roleUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.role).not.toBeNull();
    expect(result.role?.displayName).toBe('Updated Name');
    expect(result.role?.name).toBe(roleName); // Name should not change
  });

  test('Should update custom role description', async ({ api }) => {
    const roleName = generateRoleName();

    // Create custom role
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Test Role',
          description: 'Original description',
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    // Update description
    const { data } = await api.admin.mutation('roles-api/RoleUpdate', {
      variables: {
        input: {
          name: roleName,
          description: 'Updated description',
        },
      },
    });

    const result = data.roleMutation.roleUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.role?.description).toBe('Updated description');
  });

  test('Should update custom role permissions', async ({ api }) => {
    const roleName = generateRoleName();

    // Create custom role with initial permissions
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Test Role',
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    // Update permissions (replaces existing)
    const { data } = await api.admin.mutation('roles-api/RoleUpdate', {
      variables: {
        input: {
          name: roleName,
          permissions: [
            { resource: 'product', actions: ['read', 'update'], effect: 'ALLOW' },
            { resource: 'category', actions: ['read'], effect: 'ALLOW' },
          ],
        },
      },
    });

    const result = data.roleMutation.roleUpdate;

    expect(result.userErrors).toHaveLength(0);
    expect(result.role?.permissions.length).toBe(2);

    const productPerm = result.role?.permissions.find(
      (p: { resource: string }) => p.resource === 'product'
    );
    expect(productPerm?.actions).toContain('read');
    expect(productPerm?.actions).toContain('update');
  });

  test('Should fail when updating system role', async ({ api }) => {
    const systemRoles = ['owner', 'admin', 'manager', 'support', 'viewer'];

    for (const roleName of systemRoles) {
      const { data } = await api.admin.mutation('roles-api/RoleUpdate', {
        throwOnError: false,
        variables: {
          input: {
            name: roleName,
            displayName: 'Hacked System Role',
          },
        },
      });

      const result = data.roleMutation.roleUpdate;

      expect(result.role).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Should fail when updating non-existent role', async ({ api }) => {
    const { data } = await api.admin.mutation('roles-api/RoleUpdate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'non-existent-role',
          displayName: 'Updated Name',
        },
      },
    });

    const result = data.roleMutation.roleUpdate;

    expect(result.role).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});

test.describe('Role Delete', () => {
  let projectSlug: string;

  test.beforeEach(async ({ api }) => {
    await api.session.setupUser();

    projectSlug = generateProjectSlug();
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Role Test Project',
          slug: projectSlug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    expect(data.projectMutation.projectCreate.userErrors).toHaveLength(0);
    api.session.project = data.projectMutation.projectCreate.project;
  });

  test('Should delete custom role', async ({ api }) => {
    const roleName = generateRoleName();

    // Create custom role
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'To Be Deleted',
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    // Delete role
    const { data } = await api.admin.mutation('roles-api/RoleDelete', {
      variables: {
        input: { name: roleName },
      },
    });

    const result = data.roleMutation.roleDelete;

    expect(result.userErrors).toHaveLength(0);
    expect(result.deletedRoleName).toBe(roleName);

    // Verify role is deleted
    const { data: rolesData } = await api.admin.query('project-api/ProjectRoles', {
      variables: { slug: projectSlug },
    });

    const roles = rolesData.projectQuery.project?.roles ?? [];
    const deletedRole = roles.find((r: { name: string }) => r.name === roleName);
    expect(deletedRole).toBeUndefined();
  });

  test('Should fail when deleting system role', async ({ api }) => {
    const systemRoles = ['owner', 'admin', 'manager', 'support', 'viewer'];

    for (const roleName of systemRoles) {
      const { data } = await api.admin.mutation('roles-api/RoleDelete', {
        throwOnError: false,
        variables: {
          input: { name: roleName },
        },
      });

      const result = data.roleMutation.roleDelete;

      expect(result.deletedRoleName).toBeNull();
      expect(result.userErrors.length).toBeGreaterThan(0);
    }
  });

  test('Should fail when deleting non-existent role', async ({ api }) => {
    const { data } = await api.admin.mutation('roles-api/RoleDelete', {
      throwOnError: false,
      variables: {
        input: { name: 'non-existent-role' },
      },
    });

    const result = data.roleMutation.roleDelete;

    expect(result.deletedRoleName).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Should fail when deleting role with assigned users', async ({ api }) => {
    // This test requires:
    // 1. Create a custom role
    // 2. Assign a user to the role
    // 3. Try to delete the role

    const roleName = generateRoleName();

    // Create custom role
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Role With Users',
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    // Create a second user and add to project with this role
    const { generateUser } = await import('@utils/user');
    const userData = generateUser();

    const { data: signUpData } = await api.admin.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: userData.email,
          password: userData.password,
        },
      },
    });

    const newUserId = signUpData.userMutation.signUp.user?.id;
    if (!newUserId) {
      test.skip();
      return;
    }

    // Assign new user to the custom role
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      throwOnError: false,
      variables: {
        input: {
          userId: newUserId,
          newRole: roleName,
        },
      },
    });

    // Try to delete role with assigned user
    const { data } = await api.admin.mutation('roles-api/RoleDelete', {
      throwOnError: false,
      variables: {
        input: { name: roleName },
      },
    });

    const result = data.roleMutation.roleDelete;

    // Should fail because role has users
    expect(result.deletedRoleName).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

});
