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
      accessToken: result.token?.accessToken ?? '',
      userId: result.user?.id ?? '',
    });
  },
});

/**
 * Role Permissions and Authorization Tests
 *
 * Tests for the authorize query that checks user permissions.
 * According to the IAM plan:
 * - DENY always wins over ALLOW
 * - Permissions are checked with role + inherited role permissions
 * - Wildcard patterns (* and resource/*) are supported
 */
test.describe('Authorization Checks', () => {
  let projectSlug: string;

  test.beforeEach(async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;

    projectSlug = generateProjectSlug();
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Permission Test Project',
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

  test('Owner should have access to all resources', async ({ api }) => {
    const resources = [
      { resource: 'product', action: 'create' },
      { resource: 'product', action: 'read' },
      { resource: 'product', action: 'update' },
      { resource: 'product', action: 'delete' },
      { resource: 'order', action: 'read' },
      { resource: 'order', action: 'update' },
      { resource: 'project', action: 'read' },
      { resource: 'project', action: 'update' },
      { resource: 'project', action: 'delete' },
      { resource: 'project/billing', action: 'read' },
    ];

    for (const { resource, action } of resources) {
      const { data } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { resource, action },
        },
      });

      expect(data.authorize.allowed).toBe(true);
    }
  });

  test('Viewer should only have read access', async ({ api }) => {
    // Create a viewer user
    const { generateUser } = await import('@utils/user');
    const viewerData = generateUser();

    const { data: signUpData } = await api.admin.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: viewerData.email,
          password: viewerData.password,
        },
      },
    });

    const viewerId = signUpData.userMutation.signUp.user?.id;
    const viewerToken = signUpData.userMutation.signUp.token?.accessToken;

    if (!viewerId || !viewerToken) {
      test.skip();
      return;
    }

    // Assign viewer role
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: viewerId,
          newRole: 'viewer',
        },
      },
    });

    // Switch to viewer user
    api.session.tenant.accessToken = viewerToken;

    // Viewer should have read access
    const { data: readData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'product', action: 'read' },
      },
    });
    expect(readData.authorize.allowed).toBe(true);

    // Viewer should NOT have write access
    const { data: createData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'product', action: 'create' },
      },
    });
    expect(createData.authorize.allowed).toBe(false);
  });

  test('DENY permission should override ALLOW', async ({ api }) => {
    const roleName = generateRoleName();

    // Create a role with wildcard ALLOW but specific DENY
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Limited Admin',
          permissions: [
            { resource: '*', actions: ['*'], effect: 'ALLOW' },
            { resource: 'project', actions: ['delete'], effect: 'DENY' },
          ],
        },
      },
    });

    // Create a test user
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

    const userId = signUpData.userMutation.signUp.user?.id;
    const userToken = signUpData.userMutation.signUp.token?.accessToken;

    if (!userId || !userToken) {
      test.skip();
      return;
    }

    // Assign limited admin role
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId,
          newRole: roleName,
        },
      },
    });

    // Switch to test user
    api.session.tenant.accessToken = userToken;

    // Should have general access
    const { data: allowedData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'product', action: 'delete' },
      },
    });
    expect(allowedData.authorize.allowed).toBe(true);

    // Should NOT have project delete access (DENY)
    const { data: deniedData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'delete' },
      },
    });
    expect(deniedData.authorize.allowed).toBe(false);
    expect(deniedData.authorize.deniedReason).toBeTruthy();
  });

  test('Inherited permissions should be effective', async ({ api }) => {
    const baseRoleName = generateRoleName();
    const childRoleName = generateRoleName();

    // Create base role with media permissions
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: baseRoleName,
          displayName: 'Media Manager',
          permissions: [
            { resource: 'media', actions: ['upload', 'delete'], effect: 'ALLOW' },
          ],
        },
      },
    });

    // Create child role that inherits from base
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: childRoleName,
          displayName: 'Content Manager',
          inherits: [baseRoleName],
          permissions: [
            { resource: 'product', actions: ['create', 'update'], effect: 'ALLOW' },
          ],
        },
      },
    });

    // Create a test user
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

    const userId = signUpData.userMutation.signUp.user?.id;
    const userToken = signUpData.userMutation.signUp.token?.accessToken;

    if (!userId || !userToken) {
      test.skip();
      return;
    }

    // Assign child role
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId,
          newRole: childRoleName,
        },
      },
    });

    // Switch to test user
    api.session.tenant.accessToken = userToken;

    // Should have product permissions (direct)
    const { data: productData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'product', action: 'create' },
      },
    });
    expect(productData.authorize.allowed).toBe(true);

    // Should have media permissions (inherited)
    const { data: mediaData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'media', action: 'upload' },
      },
    });
    expect(mediaData.authorize.allowed).toBe(true);
  });

  test('Wildcard resource pattern should match sub-resources', async ({ api }) => {
    const roleName = generateRoleName();

    // Create role with wildcard resource pattern
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Project Manager',
          permissions: [
            { resource: 'project/*', actions: ['read', 'update'], effect: 'ALLOW' },
          ],
        },
      },
    });

    // Create a test user
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

    const userId = signUpData.userMutation.signUp.user?.id;
    const userToken = signUpData.userMutation.signUp.token?.accessToken;

    if (!userId || !userToken) {
      test.skip();
      return;
    }

    // Assign role
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId,
          newRole: roleName,
        },
      },
    });

    // Switch to test user
    api.session.tenant.accessToken = userToken;

    // Should have access to project/team
    const { data: teamData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project/team', action: 'read' },
      },
    });
    expect(teamData.authorize.allowed).toBe(true);

    // Should have access to project/settings
    const { data: settingsData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project/settings', action: 'update' },
      },
    });
    expect(settingsData.authorize.allowed).toBe(true);
  });

  test('Unauthenticated request should be denied', async ({ api }) => {
    // Clear access token
    api.session.tenant.accessToken = undefined;

    const { data } = await api.admin.query('roles-api/Authorize', {
      throwOnError: false,
      variables: {
        input: { resource: 'product', action: 'read' },
      },
    });

    expect(data.authorize.allowed).toBe(false);
    expect(data.authorize.deniedReason).toBeTruthy();
  });

  test('Request without project context should be denied', async ({ api }) => {
    // Clear project context
    api.session.project = {} as typeof api.session.project;

    const { data } = await api.admin.query('roles-api/Authorize', {
      throwOnError: false,
      variables: {
        input: { resource: 'product', action: 'read' },
      },
    });

    expect(data.authorize.allowed).toBe(false);
    expect(data.authorize.deniedReason).toContain('project');
  });
});

test.describe('Available Resources', () => {
  let projectSlug: string;

  test.beforeEach(async ({ api }) => {
    await api.session.setupUser();

    projectSlug = generateProjectSlug();
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Resource Test Project',
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

  test('Should return list of available resources for role editor', async ({ api }) => {
    const { data } = await api.admin.query('project-api/ProjectAvailableResources', {
      variables: { slug: projectSlug },
    });

    const resources = data.projectQuery.project?.availableResources ?? [];

    expect(resources.length).toBeGreaterThan(0);

    // Check structure of resources
    for (const resource of resources) {
      expect(resource.service).toBeTruthy();
      expect(resource.name).toBeTruthy();
      expect(resource.actions.length).toBeGreaterThan(0);
    }
  });

  test('Available resources should include standard resources', async ({ api }) => {
    const { data } = await api.admin.query('project-api/ProjectAvailableResources', {
      variables: { slug: projectSlug },
    });

    const resources = data.projectQuery.project?.availableResources ?? [];
    const resourceNames = resources.map((r: { name: string }) => r.name);

    // Check for standard resources
    expect(resourceNames).toContain('product');
    expect(resourceNames).toContain('order');
    expect(resourceNames).toContain('project');
  });

  test('Product resource should have standard CRUD actions', async ({ api }) => {
    const { data } = await api.admin.query('project-api/ProjectAvailableResources', {
      variables: { slug: projectSlug },
    });

    const resources = data.projectQuery.project?.availableResources ?? [];
    const productResource = resources.find((r: { name: string }) => r.name === 'product');

    expect(productResource).toBeDefined();
    expect(productResource?.actions).toContain('create');
    expect(productResource?.actions).toContain('read');
    expect(productResource?.actions).toContain('update');
    expect(productResource?.actions).toContain('delete');
  });
});
