import { test as base } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateProjectSlug = () => `test-project-${crypto.randomUUID().slice(0, 8)}`;
const generateRoleName = () => `custom-role-${crypto.randomUUID().slice(0, 8)}`;

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
      accessToken: result.token.accessToken,
      userId: result.user.id,
    });
  },
});

/**
 * Casbin Cache Tests
 *
 * Tests for the enforcer caching mechanism.
 * According to the new Casbin/IAM architecture:
 * - Enforcers are cached per organization
 * - Cache is invalidated on role/policy changes
 * - Version-based invalidation ensures consistency
 * - TTL-based expiration for long-running enforcers
 */
test.describe('Cache Behavior', () => {
  test('Cache invalidation on role change takes effect immediately', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
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

    // Verify viewer cannot update
    api.session.tenant.accessToken = viewer.accessToken;
    const { data: beforeChange } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'product', action: 'update' },
      },
    });
    expect(beforeChange.authorize.allowed).toBe(false);

    // Owner upgrades viewer to admin
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: viewer.userId,
          newRole: 'admin',
        },
      },
    });

    // Cache should be invalidated - new admin should have access immediately
    api.session.tenant.accessToken = viewer.accessToken;
    const { data: afterChange } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'product', action: 'update' },
      },
    });
    expect(afterChange.authorize.allowed).toBe(true);
  });

  test('Cache invalidation on policy change', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.session.setupProject();

    const roleName = generateRoleName();

    // Create a custom role without product:delete permission
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Limited Editor',
          permissions: [
            { resource: 'product', actions: ['read', 'update'], effect: 'ALLOW' },
          ],
        },
      },
    });

    // Create user and assign custom role
    const testUser = await api.admin.user.create();
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: testUser.userId,
          newRole: roleName,
        },
      },
    });

    // Verify user cannot delete products
    api.session.tenant.accessToken = testUser.accessToken;
    const { data: beforeUpdate } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'product', action: 'delete' },
      },
    });
    expect(beforeUpdate.authorize.allowed).toBe(false);

    // Owner updates role to include delete permission
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.admin.mutation('roles-api/RoleUpdate', {
      variables: {
        input: {
          name: roleName,
          permissions: [
            { resource: 'product', actions: ['read', 'update', 'delete'], effect: 'ALLOW' },
          ],
        },
      },
    });

    // Cache should be invalidated - user should now have delete access
    api.session.tenant.accessToken = testUser.accessToken;
    const { data: afterUpdate } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'product', action: 'delete' },
      },
    });
    expect(afterUpdate.authorize.allowed).toBe(true);
  });

  test('Other users unaffected by unrelated cache invalidation', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.session.setupProject();

    // Create two users with admin role
    const userA = await api.admin.user.create();
    const userB = await api.admin.user.create();

    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: userA.userId,
          newRole: 'admin',
        },
      },
    });

    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: userB.userId,
          newRole: 'admin',
        },
      },
    });

    // Verify both users have update access
    api.session.tenant.accessToken = userA.accessToken;
    const { data: userAAuth1 } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'update' },
      },
    });
    expect(userAAuth1.authorize.allowed).toBe(true);

    api.session.tenant.accessToken = userB.accessToken;
    const { data: userBAuth1 } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'update' },
      },
    });
    expect(userBAuth1.authorize.allowed).toBe(true);

    // Downgrade user A to viewer
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: userA.userId,
          newRole: 'viewer',
        },
      },
    });

    // User A should no longer have update access
    api.session.tenant.accessToken = userA.accessToken;
    const { data: userAAuth2 } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'update' },
      },
    });
    expect(userAAuth2.authorize.allowed).toBe(false);

    // User B should still have update access (unaffected)
    api.session.tenant.accessToken = userB.accessToken;
    const { data: userBAuth2 } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'update' },
      },
    });
    expect(userBAuth2.authorize.allowed).toBe(true);
  });
});

test.describe('Version-Based Invalidation', () => {
  test('Role removal invalidates cache correctly', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.session.setupProject();

    // Create user with admin role
    const testUser = await api.admin.user.create();
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: testUser.userId,
          newRole: 'admin',
        },
      },
    });

    // Verify user has access
    api.session.tenant.accessToken = testUser.accessToken;
    const { data: beforeRemove } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'product', action: 'create' },
      },
    });
    expect(beforeRemove.authorize.allowed).toBe(true);

    // Remove user from project
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.admin.mutation('roles-api/ProjectMemberRemove', {
      variables: {
        input: {
          userId: testUser.userId,
        },
      },
    });

    // User should no longer have access
    api.session.tenant.accessToken = testUser.accessToken;
    const { data: afterRemove } = await api.admin.query('roles-api/Authorize', {
      throwOnError: false,
      variables: {
        input: { resource: 'product', action: 'create' },
      },
    });
    expect(afterRemove.authorize.allowed).toBe(false);
  });

  test('Custom role deletion invalidates cache for assigned users', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.session.setupProject();

    const roleName = generateRoleName();

    // Create custom role
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Temporary Role',
          permissions: [
            { resource: 'media', actions: ['upload'], effect: 'ALLOW' },
          ],
        },
      },
    });

    // Assign user to custom role
    const testUser = await api.admin.user.create();
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: testUser.userId,
          newRole: roleName,
        },
      },
    });

    // Verify user has custom role permissions
    api.session.tenant.accessToken = testUser.accessToken;
    const { data: beforeDelete } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'media', action: 'upload' },
      },
    });
    expect(beforeDelete.authorize.allowed).toBe(true);

    // First, change user to a different role (can't delete role with assigned users)
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: testUser.userId,
          newRole: 'viewer',
        },
      },
    });

    // Delete custom role
    await api.admin.mutation('roles-api/RoleDelete', {
      variables: {
        input: { name: roleName },
      },
    });

    // User should now only have viewer permissions (no media upload)
    api.session.tenant.accessToken = testUser.accessToken;
    const { data: afterDelete } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'media', action: 'upload' },
      },
    });
    expect(afterDelete.authorize.allowed).toBe(false);
  });
});

test.describe('Concurrent Access', () => {
  test('Multiple simultaneous authorization checks work correctly', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    await api.session.setupProject();

    // Perform multiple authorization checks in parallel
    const resources = [
      { resource: 'product', action: 'create' },
      { resource: 'product', action: 'read' },
      { resource: 'order', action: 'read' },
      { resource: 'project', action: 'update' },
      { resource: 'category', action: 'create' },
    ];

    const results = await Promise.all(
      resources.map(({ resource, action }) =>
        api.admin.query('roles-api/Authorize', {
          variables: {
            input: { resource, action },
          },
        })
      )
    );

    // Owner should have access to all resources
    for (const result of results) {
      expect(result.data.authorize.allowed).toBe(true);
    }
  });
});
