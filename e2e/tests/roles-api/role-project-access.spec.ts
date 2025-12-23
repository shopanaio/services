import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

/**
 * Project Access Permission Tests
 *
 * Tests that verify users cannot perform actions without proper permissions.
 * These tests actually attempt operations and verify they fail.
 */
test.describe('Project Access Permissions', () => {
  test.beforeEach(async ({ api }) => {
    await api.session.setupUser();
    await api.session.setupProject();
  });

  test('Viewer should NOT be able to update project', async ({ api }) => {
    // Create a viewer user
    const viewer = await api.admin.user.create();

    // Assign viewer role (owner does this)
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

    // Should have permission error
    const errors = data.projectMutation?.projectUpdate?.userErrors ?? [];
    expect(errors.length).toBeGreaterThan(0);

    const hasPermissionError = errors.some(
      (e: { code?: string | null }) =>
        e.code && ['FORBIDDEN', 'PERMISSION_DENIED', 'UNAUTHORIZED', 'ACCESS_DENIED'].includes(e.code)
    );
    expect(hasPermissionError).toBe(true);
  });

  test('Viewer should NOT be able to delete project', async ({ api }) => {
    const projectId = api.session.project.id;

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

    // Should have permission error
    const errors = data.projectMutation?.projectDelete?.userErrors ?? [];
    expect(errors.length).toBeGreaterThan(0);

    const hasPermissionError = errors.some(
      (e: { code?: string | null }) =>
        e.code && ['FORBIDDEN', 'PERMISSION_DENIED', 'UNAUTHORIZED', 'ACCESS_DENIED'].includes(e.code)
    );
    expect(hasPermissionError).toBe(true);
  });

  test('Admin should NOT be able to delete project', async ({ api }) => {
    const projectId = api.session.project.id;

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

    // Should have permission error
    const errors = data.projectMutation?.projectDelete?.userErrors ?? [];
    expect(errors.length).toBeGreaterThan(0);

    const hasPermissionError = errors.some(
      (e: { code?: string | null }) =>
        e.code && ['FORBIDDEN', 'PERMISSION_DENIED', 'UNAUTHORIZED', 'ACCESS_DENIED'].includes(e.code)
    );
    expect(hasPermissionError).toBe(true);
  });

  test('Owner should be able to update project', async ({ api }) => {
    // Owner updates project - should succeed
    const { data } = await api.admin.mutation('project-api/ProjectUpdate', {
      variables: {
        input: {
          name: 'Updated Project Name',
        },
      },
    });

    const errors = data.projectMutation?.projectUpdate?.userErrors ?? [];
    expect(errors).toHaveLength(0);
    expect(data.projectMutation?.projectUpdate?.project?.name).toBe('Updated Project Name');
  });
});
