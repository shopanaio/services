import { test as base } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

interface UserSession {
  email: string;
  password: string;
  accessToken: string;
  userId: string;
}

const test = base.extend<{
  ownerUser: UserSession;
}>({
  ownerUser: async ({ api }, use) => {
    const result = await api.session.setupUser();
    await use({
      email: api.session.tenant.data.email,
      password: api.session.tenant.data.password,
      accessToken: result.token?.accessToken ?? '',
      userId: result.user?.id ?? '',
    });
  },
});

/**
 * Project Access Permission Tests
 *
 * Tests that verify users cannot perform actions without proper permissions.
 * According to the new Casbin/IAM architecture:
 * - Permission checks use domain parameter: [["project", projectId]]
 * - enforce(organizationId, userId, domain, resource, action)
 * - Role assignments are domain-scoped for project-level isolation
 * - Cache invalidation is required after role changes
 *
 * These tests actually attempt operations and verify they fail with FORBIDDEN error.
 */
test.describe('Project Access Permissions', () => {
  test.beforeEach(async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.session.setupProject();
  });

  test('Viewer should NOT be able to update project', async ({ api, ownerUser }) => {
    // Create a viewer user
    const viewer = await api.admin.user.create();

    // Assign viewer role (owner does this)
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: viewer.userId,
          newRole: 'viewer',
        },
      },
    });

    // Switch to viewer user
    api.session.tenant.accessToken = viewer.accessToken;

    // Viewer tries to update project - should fail
    const { data } = await api.admin.mutation('project-api/ProjectUpdate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Hacked Project Name',
        },
      },
    });

    // Should have FORBIDDEN userError
    const userErrors = data.projectMutation?.projectUpdate?.userErrors ?? [];
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].code).toBe('FORBIDDEN');
    expect(userErrors[0].message).toContain('Access denied');
  });

  test('Viewer should NOT be able to delete project', async ({ api, ownerUser }) => {
    const projectId = api.session.project.id;

    // Create a viewer user
    const viewer = await api.admin.user.create();

    // Assign viewer role
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: viewer.userId,
          newRole: 'viewer',
        },
      },
    });

    // Switch to viewer user
    api.session.tenant.accessToken = viewer.accessToken;

    // Viewer tries to delete project - should fail
    const { data } = await api.admin.mutation('project-api/ProjectDelete', {
      throwOnError: false,
      variables: {
        input: {
          id: projectId,
        },
      },
    });

    // Should have FORBIDDEN userError
    const userErrors = data.projectMutation?.projectDelete?.userErrors ?? [];
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].code).toBe('FORBIDDEN');
    expect(userErrors[0].message).toContain('Access denied');
  });

  test('Admin should NOT be able to delete project', async ({ api, ownerUser }) => {
    const projectId = api.session.project.id;

    // Create an admin user
    const admin = await api.admin.user.create();

    // Assign admin role
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: admin.userId,
          newRole: 'admin',
        },
      },
    });

    // Switch to admin user
    api.session.tenant.accessToken = admin.accessToken;

    // Admin tries to delete project - should fail (only owner can delete)
    const { data } = await api.admin.mutation('project-api/ProjectDelete', {
      throwOnError: false,
      variables: {
        input: {
          id: projectId,
        },
      },
    });

    // Should have FORBIDDEN userError
    const userErrors = data.projectMutation?.projectDelete?.userErrors ?? [];
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].code).toBe('FORBIDDEN');
    expect(userErrors[0].message).toContain('Access denied');
  });

  test('Owner should be able to update project', async ({ api }) => {
    // Owner updates project - should succeed
    const { data } = await api.admin.mutation('project-api/ProjectUpdate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Updated Project Name',
        },
      },
    });

    const userErrors = data.projectMutation?.projectUpdate?.userErrors ?? [];
    expect(userErrors).toHaveLength(0);
    expect(data.projectMutation?.projectUpdate?.project?.name).toBe('Updated Project Name');
  });
});

test.describe('Multi-Project Role Isolation', () => {
  test('User should have different permissions in different projects', async ({ api }) => {
    // Create owner user
    await api.session.setupUser();
    const ownerToken = api.session.tenant.accessToken ?? '';

    // Create first project where user will be admin
    await api.session.setupProject({ name: 'Project A' });
    const projectA = api.session.project;

    // Create second project where same user will be viewer
    await api.session.setupProject({ name: 'Project B' });
    const projectB = api.session.project;

    // Create a test user
    const testUser = await api.admin.user.create();

    // Assign admin role in Project A (as owner)
    api.session.tenant.accessToken = ownerToken;
    api.session.project = projectA;
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: testUser.userId,
          newRole: 'admin',
        },
      },
    });

    // Assign viewer role in Project B
    api.session.project = projectB;
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: testUser.userId,
          newRole: 'viewer',
        },
      },
    });

    // Switch to test user
    api.session.tenant.accessToken = testUser.accessToken;

    // Test user should be able to update Project A (admin role)
    api.session.project = projectA;
    const { data: updateA } = await api.admin.mutation('project-api/ProjectUpdate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Updated Project A',
        },
      },
    });
    const errorsA = updateA.projectMutation?.projectUpdate?.userErrors ?? [];
    expect(errorsA).toHaveLength(0);

    // Test user should NOT be able to update Project B (viewer role)
    api.session.project = projectB;
    const { data: updateB } = await api.admin.mutation('project-api/ProjectUpdate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'Hacked Project B',
        },
      },
    });
    const errorsB = updateB.projectMutation?.projectUpdate?.userErrors ?? [];
    expect(errorsB.length).toBeGreaterThan(0);
    expect(errorsB[0].code).toBe('FORBIDDEN');
  });
});

test.describe('Role Permission Updates', () => {
  test('Upgrading role should grant new permissions', async ({ api }) => {
    // Setup owner and project
    await api.session.setupUser();
    const ownerToken = api.session.tenant.accessToken ?? '';
    await api.session.setupProject();

    // Create a viewer user
    const viewer = await api.admin.user.create();

    // Assign viewer role
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: viewer.userId,
          newRole: 'viewer',
        },
      },
    });

    // Verify viewer cannot update
    api.session.tenant.accessToken = viewer.accessToken;
    const { data: beforeUpgrade } = await api.admin.mutation('project-api/ProjectUpdate', {
      throwOnError: false,
      variables: {
        input: { name: 'Attempt 1' },
      },
    });
    expect(beforeUpgrade.projectMutation?.projectUpdate?.userErrors?.[0]?.code).toBe('FORBIDDEN');

    // Owner upgrades viewer to admin
    api.session.tenant.accessToken = ownerToken;
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: viewer.userId,
          newRole: 'admin',
        },
      },
    });

    // Now the user (now admin) should be able to update
    api.session.tenant.accessToken = viewer.accessToken;
    const { data: afterUpgrade } = await api.admin.mutation('project-api/ProjectUpdate', {
      throwOnError: false,
      variables: {
        input: { name: 'Updated by new admin' },
      },
    });
    const errorsAfter = afterUpgrade.projectMutation?.projectUpdate?.userErrors ?? [];
    expect(errorsAfter).toHaveLength(0);
    expect(afterUpgrade.projectMutation?.projectUpdate?.project?.name).toBe('Updated by new admin');
  });

  test('Downgrading role should revoke permissions', async ({ api }) => {
    // Setup owner and project
    await api.session.setupUser();
    const ownerToken = api.session.tenant.accessToken ?? '';
    await api.session.setupProject();

    // Create an admin user
    const admin = await api.admin.user.create();

    // Assign admin role
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: admin.userId,
          newRole: 'admin',
        },
      },
    });

    // Verify admin can update
    api.session.tenant.accessToken = admin.accessToken;
    const { data: beforeDowngrade } = await api.admin.mutation('project-api/ProjectUpdate', {
      throwOnError: false,
      variables: {
        input: { name: 'Updated by admin' },
      },
    });
    expect(beforeDowngrade.projectMutation?.projectUpdate?.userErrors ?? []).toHaveLength(0);

    // Owner downgrades admin to viewer
    api.session.tenant.accessToken = ownerToken;
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: admin.userId,
          newRole: 'viewer',
        },
      },
    });

    // Now the user (now viewer) should NOT be able to update
    api.session.tenant.accessToken = admin.accessToken;
    const { data: afterDowngrade } = await api.admin.mutation('project-api/ProjectUpdate', {
      throwOnError: false,
      variables: {
        input: { name: 'Attempt after downgrade' },
      },
    });
    const errorsAfter = afterDowngrade.projectMutation?.projectUpdate?.userErrors ?? [];
    expect(errorsAfter.length).toBeGreaterThan(0);
    expect(errorsAfter[0].code).toBe('FORBIDDEN');
  });
});

test.describe('Member Management Authorization', () => {
  test('Viewer should NOT be able to add members', async ({ api }) => {
    // Setup owner and project
    await api.session.setupUser();
    await api.session.setupProject();

    // Create a viewer user
    const viewer = await api.admin.user.create();
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: viewer.userId,
          newRole: 'viewer',
        },
      },
    });

    // Create another user to try adding
    const newUser = await api.admin.user.create();

    // Switch to viewer and try to add member
    api.session.tenant.accessToken = viewer.accessToken;
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      throwOnError: false,
      variables: {
        input: {
          userId: newUser.userId,
          newRole: 'viewer',
        },
      },
    });

    const errors = data.roleMutation?.projectMemberRoleChange?.userErrors ?? [];
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe('FORBIDDEN');
  });

  test('Viewer should NOT be able to remove members', async ({ api }) => {
    // Setup owner and project
    await api.session.setupUser();
    await api.session.setupProject();

    // Create a viewer user
    const viewer = await api.admin.user.create();
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: viewer.userId,
          newRole: 'viewer',
        },
      },
    });

    // Create another member
    const member = await api.admin.user.create();
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: member.userId,
          newRole: 'viewer',
        },
      },
    });

    // Switch to viewer and try to remove member
    api.session.tenant.accessToken = viewer.accessToken;
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRemove', {
      throwOnError: false,
      variables: {
        input: {
          userId: member.userId,
        },
      },
    });

    const errors = data.roleMutation?.projectMemberRemove?.userErrors ?? [];
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe('FORBIDDEN');
  });

  test('Admin should be able to add members', async ({ api }) => {
    // Setup owner and project
    await api.session.setupUser();
    await api.session.setupProject();

    // Create an admin user
    const admin = await api.admin.user.create();
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: admin.userId,
          newRole: 'admin',
        },
      },
    });

    // Create another user to add
    const newUser = await api.admin.user.create();

    // Switch to admin and add member
    api.session.tenant.accessToken = admin.accessToken;
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      throwOnError: false,
      variables: {
        input: {
          userId: newUser.userId,
          newRole: 'viewer',
        },
      },
    });

    const errors = data.roleMutation?.projectMemberRoleChange?.userErrors ?? [];
    expect(errors).toHaveLength(0);
  });

  test('Owner should be able to manage all members', async ({ api }) => {
    // Setup owner and project
    await api.session.setupUser();
    await api.session.setupProject();

    // Create users
    const admin = await api.admin.user.create();
    const viewer = await api.admin.user.create();

    // Owner adds admin
    const { data: addAdmin } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      throwOnError: false,
      variables: {
        input: {
          userId: admin.userId,
          newRole: 'admin',
        },
      },
    });
    expect(addAdmin.roleMutation?.projectMemberRoleChange?.userErrors ?? []).toHaveLength(0);

    // Owner adds viewer
    const { data: addViewer } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      throwOnError: false,
      variables: {
        input: {
          userId: viewer.userId,
          newRole: 'viewer',
        },
      },
    });
    expect(addViewer.roleMutation?.projectMemberRoleChange?.userErrors ?? []).toHaveLength(0);

    // Owner removes viewer
    const { data: removeViewer } = await api.admin.mutation('roles-api/ProjectMemberRemove', {
      throwOnError: false,
      variables: {
        input: {
          userId: viewer.userId,
        },
      },
    });
    expect(removeViewer.roleMutation?.projectMemberRemove?.userErrors ?? []).toHaveLength(0);
  });
});

test.describe('Role Management Authorization', () => {
  test('Viewer should NOT be able to create roles', async ({ api }) => {
    // Setup owner and project
    await api.session.setupUser();
    await api.session.setupProject();

    // Create viewer
    const viewer = await api.admin.user.create();
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: viewer.userId,
          newRole: 'viewer',
        },
      },
    });

    // Switch to viewer and try to create role
    api.session.tenant.accessToken = viewer.accessToken;
    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'custom-role',
          displayName: 'Custom Role',
          permissions: [
            { resource: 'product', actions: ['read'], effect: 'ALLOW' },
          ],
        },
      },
    });

    const errors = data.roleMutation?.roleCreate?.userErrors ?? [];
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].code).toBe('FORBIDDEN');
  });

  test('Admin should be able to create roles', async ({ api }) => {
    // Setup owner and project
    await api.session.setupUser();
    await api.session.setupProject();

    // Create admin
    const admin = await api.admin.user.create();
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: admin.userId,
          newRole: 'admin',
        },
      },
    });

    // Switch to admin and create role
    api.session.tenant.accessToken = admin.accessToken;
    const { data } = await api.admin.mutation('roles-api/RoleCreate', {
      throwOnError: false,
      variables: {
        input: {
          name: 'custom-editor',
          displayName: 'Custom Editor',
          permissions: [
            { resource: 'product', actions: ['read', 'write'], effect: 'ALLOW' },
          ],
        },
      },
    });

    const errors = data.roleMutation?.roleCreate?.userErrors ?? [];
    expect(errors).toHaveLength(0);
    expect(data.roleMutation?.roleCreate?.role?.name).toBe('custom-editor');
  });
});
