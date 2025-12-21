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
  memberUser: UserSession;
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
  memberUser: async ({ api }, use) => {
    const { generateUser } = await import('@utils/user');
    const userData = generateUser();

    const { data } = await api.admin.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: userData.email,
          password: userData.password,
        },
      },
    });

    const result = data.userMutation.signUp;
    await use({
      email: userData.email,
      password: userData.password,
      accessToken: result.token?.accessToken ?? '',
      userId: result.user?.id ?? '',
    });
  },
});

/**
 * Project Members Management Tests
 *
 * Tests for managing project team members and their roles.
 * According to the IAM plan:
 * - projectMemberRoleChange: change member's role
 * - projectMemberRemove: remove member from team
 * - Cannot change own role
 * - Cannot assign role higher than own
 * - Cannot remove project owner
 */
test.describe('Project Members', () => {
  let projectSlug: string;

  test.beforeEach(async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;

    projectSlug = generateProjectSlug();
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Members Test Project',
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

  test('Project creator should be the only member initially', async ({ api }) => {
    const { data } = await api.admin.query('project-api/ProjectMembers', {
      variables: { slug: projectSlug },
    });

    const members = data.projectQuery.project?.members ?? [];

    expect(members.length).toBe(1);
    expect(members[0].role.name).toBe('owner');
  });

  test('Should list all project members with their roles', async ({ api, memberUser }) => {
    // Add member user to project
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'viewer',
        },
      },
    });

    const { data } = await api.admin.query('project-api/ProjectMembers', {
      variables: { slug: projectSlug },
    });

    const members = data.projectQuery.project?.members ?? [];

    expect(members.length).toBe(2);

    const owner = members.find((m: { role: { name: string } }) => m.role.name === 'owner');
    const viewer = members.find((m: { role: { name: string } }) => m.role.name === 'viewer');

    expect(owner).toBeDefined();
    expect(viewer).toBeDefined();
    expect(viewer?.user.email).toBe(memberUser.email);
  });

  test('Member should have user details', async ({ api, memberUser }) => {
    // Add member user to project
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'viewer',
        },
      },
    });

    const { data } = await api.admin.query('project-api/ProjectMembers', {
      variables: { slug: projectSlug },
    });

    const members = data.projectQuery.project?.members ?? [];
    const viewer = members.find((m: { user: { id: string } }) => m.user.id === memberUser.userId);

    expect(viewer).toBeDefined();
    expect(viewer?.user.id).toBe(memberUser.userId);
    expect(viewer?.user.email).toBe(memberUser.email);
    expect(viewer?.role.name).toBe('viewer');
  });
});

test.describe('Member Role Change', () => {
  let projectSlug: string;

  test.beforeEach(async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;

    projectSlug = generateProjectSlug();
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Role Change Test Project',
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

  test('Owner should be able to change member role', async ({ api, memberUser }) => {
    // First add member as viewer
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'viewer',
        },
      },
    });

    // Then change to manager
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'manager',
        },
      },
    });

    const result = data.roleMutation.projectMemberRoleChange;

    expect(result.userErrors).toHaveLength(0);
    expect(result.member).not.toBeNull();
    expect(result.member?.role.name).toBe('manager');
    expect(result.member?.user.id).toBe(memberUser.userId);
  });

  test('Should be able to assign custom role to member', async ({ api, memberUser }) => {
    const roleName = generateRoleName();

    // Create custom role
    await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Content Editor',
          permissions: [{ resource: 'product', actions: ['read', 'update'], effect: 'ALLOW' }],
        },
      },
    });

    // Assign custom role to member
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: roleName,
        },
      },
    });

    const result = data.roleMutation.projectMemberRoleChange;

    expect(result.userErrors).toHaveLength(0);
    expect(result.member?.role.name).toBe(roleName);
  });

  test('Should fail when changing own role', async ({ api, ownerUser }) => {
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      throwOnError: false,
      variables: {
        input: {
          userId: ownerUser.userId,
          newRole: 'admin',
        },
      },
    });

    const result = data.roleMutation.projectMemberRoleChange;

    expect(result.member).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Admin should not be able to assign owner role', async ({ api, memberUser }) => {
    // Create an admin user
    const { generateUser } = await import('@utils/user');
    const adminData = generateUser();

    const { data: adminSignUp } = await api.admin.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: adminData.email,
          password: adminData.password,
        },
      },
    });

    const adminId = adminSignUp.userMutation.signUp.user?.id;
    const adminToken = adminSignUp.userMutation.signUp.token?.accessToken;

    if (!adminId || !adminToken) {
      test.skip();
      return;
    }

    // Assign admin role
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: adminId,
          newRole: 'admin',
        },
      },
    });

    // Add member user
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'viewer',
        },
      },
    });

    // Switch to admin user
    api.session.tenant.accessToken = adminToken;

    // Admin tries to assign owner role to member - should fail
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      throwOnError: false,
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'owner',
        },
      },
    });

    const result = data.roleMutation.projectMemberRoleChange;

    expect(result.member).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Viewer should not be able to change member roles', async ({ api, memberUser }) => {
    // Create a viewer user
    const { generateUser } = await import('@utils/user');
    const viewerData = generateUser();

    const { data: viewerSignUp } = await api.admin.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: viewerData.email,
          password: viewerData.password,
        },
      },
    });

    const viewerId = viewerSignUp.userMutation.signUp.user?.id;
    const viewerToken = viewerSignUp.userMutation.signUp.token?.accessToken;

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

    // Add member user
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'viewer',
        },
      },
    });

    // Switch to viewer user
    api.session.tenant.accessToken = viewerToken;

    // Viewer tries to change member role - should fail
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      throwOnError: false,
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'support',
        },
      },
    });

    const result = data.roleMutation.projectMemberRoleChange;

    expect(result.member).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Should fail when assigning non-existent role', async ({ api, memberUser }) => {
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      throwOnError: false,
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'non-existent-role',
        },
      },
    });

    const result = data.roleMutation.projectMemberRoleChange;

    expect(result.member).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Should fail when user is not found', async ({ api }) => {
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      throwOnError: false,
      variables: {
        input: {
          userId: 'non-existent-user-id',
          newRole: 'viewer',
        },
      },
    });

    const result = data.roleMutation.projectMemberRoleChange;

    expect(result.member).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});

test.describe('Member Remove', () => {
  let projectSlug: string;

  test.beforeEach(async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;

    projectSlug = generateProjectSlug();
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Member Remove Test Project',
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

  test('Owner should be able to remove member', async ({ api, memberUser }) => {
    // Add member
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'viewer',
        },
      },
    });

    // Remove member
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRemove', {
      variables: {
        input: {
          userId: memberUser.userId,
        },
      },
    });

    const result = data.roleMutation.projectMemberRemove;

    expect(result.userErrors).toHaveLength(0);
    expect(result.removedUserId).toBe(memberUser.userId);

    // Verify member is removed
    const { data: membersData } = await api.admin.query('project-api/ProjectMembers', {
      variables: { slug: projectSlug },
    });

    const members = membersData.projectQuery.project?.members ?? [];
    const removedMember = members.find((m: { user: { id: string } }) => m.user.id === memberUser.userId);

    expect(removedMember).toBeUndefined();
  });

  test('Should fail when removing self', async ({ api, ownerUser }) => {
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRemove', {
      throwOnError: false,
      variables: {
        input: {
          userId: ownerUser.userId,
        },
      },
    });

    const result = data.roleMutation.projectMemberRemove;

    expect(result.removedUserId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Should fail when removing project owner', async ({ api, ownerUser, memberUser }) => {
    // Make member an admin
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'admin',
        },
      },
    });

    // Switch to admin user
    api.session.tenant.accessToken = memberUser.accessToken;

    // Admin tries to remove owner - should fail
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRemove', {
      throwOnError: false,
      variables: {
        input: {
          userId: ownerUser.userId,
        },
      },
    });

    const result = data.roleMutation.projectMemberRemove;

    expect(result.removedUserId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Viewer should not be able to remove members', async ({ api, memberUser }) => {
    // Create a viewer user
    const { generateUser } = await import('@utils/user');
    const viewerData = generateUser();

    const { data: viewerSignUp } = await api.admin.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: viewerData.email,
          password: viewerData.password,
        },
      },
    });

    const viewerId = viewerSignUp.userMutation.signUp.user?.id;
    const viewerToken = viewerSignUp.userMutation.signUp.token?.accessToken;

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

    // Add member user
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'viewer',
        },
      },
    });

    // Switch to viewer user
    api.session.tenant.accessToken = viewerToken;

    // Viewer tries to remove member - should fail
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRemove', {
      throwOnError: false,
      variables: {
        input: {
          userId: memberUser.userId,
        },
      },
    });

    const result = data.roleMutation.projectMemberRemove;

    expect(result.removedUserId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Admin should be able to remove manager', async ({ api, memberUser }) => {
    // Create an admin user
    const { generateUser } = await import('@utils/user');
    const adminData = generateUser();

    const { data: adminSignUp } = await api.admin.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: adminData.email,
          password: adminData.password,
        },
      },
    });

    const adminToken = adminSignUp.userMutation.signUp.token?.accessToken;

    if (!adminToken) {
      test.skip();
      return;
    }

    // Assign admin role
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: adminSignUp.userMutation.signUp.user?.id,
          newRole: 'admin',
        },
      },
    });

    // Add member as manager
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'manager',
        },
      },
    });

    // Switch to admin user
    api.session.tenant.accessToken = adminToken;

    // Admin removes manager
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRemove', {
      variables: {
        input: {
          userId: memberUser.userId,
        },
      },
    });

    const result = data.roleMutation.projectMemberRemove;

    expect(result.userErrors).toHaveLength(0);
    expect(result.removedUserId).toBe(memberUser.userId);
  });

  test('Manager should not be able to remove admin', async ({ api, memberUser }) => {
    // Create a manager user
    const { generateUser } = await import('@utils/user');
    const managerData = generateUser();

    const { data: managerSignUp } = await api.admin.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: managerData.email,
          password: managerData.password,
        },
      },
    });

    const managerId = managerSignUp.userMutation.signUp.user?.id;
    const managerToken = managerSignUp.userMutation.signUp.token?.accessToken;

    if (!managerId || !managerToken) {
      test.skip();
      return;
    }

    // Assign manager role
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: managerId,
          newRole: 'manager',
        },
      },
    });

    // Add member as admin
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: memberUser.userId,
          newRole: 'admin',
        },
      },
    });

    // Switch to manager user
    api.session.tenant.accessToken = managerToken;

    // Manager tries to remove admin - should fail
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRemove', {
      throwOnError: false,
      variables: {
        input: {
          userId: memberUser.userId,
        },
      },
    });

    const result = data.roleMutation.projectMemberRemove;

    expect(result.removedUserId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Should fail when removing non-existent user', async ({ api }) => {
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRemove', {
      throwOnError: false,
      variables: {
        input: {
          userId: 'non-existent-user-id',
        },
      },
    });

    const result = data.roleMutation.projectMemberRemove;

    expect(result.removedUserId).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});
