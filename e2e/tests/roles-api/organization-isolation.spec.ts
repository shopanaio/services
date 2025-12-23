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
  organizationId: string;
}

const test = base.extend<{
  orgAUser: UserSession;
  orgBUser: UserSession;
}>({
  orgAUser: async ({ api }, use) => {
    // Setup first user (creates Organization A)
    const result = await api.session.setupUser();
    await use({
      email: api.session.tenant.data.email,
      password: api.session.tenant.data.password,
      accessToken: result.token?.accessToken ?? '',
      userId: result.user?.id ?? '',
      organizationId: result.organizationId ?? '',
    });
  },
  orgBUser: async ({ api }, use) => {
    // Create second user (creates Organization B)
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
      organizationId: result.user?.organizationId ?? '',
    });
  },
});

/**
 * Organization Isolation Tests
 *
 * Tests that verify data isolation between different organizations.
 * According to the new Casbin/IAM architecture:
 * - Each user registration creates a new organization
 * - Policies are filtered by organizationId
 * - Enforcers are cached per organization
 * - Cross-organization access is forbidden
 */
test.describe('Organization Isolation', () => {
  test('Users in different organizations have different organizationIds', async ({ orgAUser, orgBUser }) => {
    expect(orgAUser.organizationId).toBeTruthy();
    expect(orgBUser.organizationId).toBeTruthy();
    expect(orgAUser.organizationId).not.toBe(orgBUser.organizationId);
  });

  test('User cannot access other organization data via projects', async ({ api, orgAUser, orgBUser }) => {
    const slugA = generateProjectSlug();

    // Org A user creates a project
    api.session.tenant.accessToken = orgAUser.accessToken;
    api.session.organizationId = orgAUser.organizationId;
    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Org A Project',
          slug: slugA,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Org B user tries to access Org A's project
    api.session.tenant.accessToken = orgBUser.accessToken;
    api.session.organizationId = orgBUser.organizationId;
    api.session.project = { slug: slugA, id: '', name: 'Org A Project' };

    const { errors } = await api.admin.query('project-api/Project', {
      throwOnError: false,
      variables: { slug: slugA },
    });

    // Should be forbidden - different organization
    expect(errors).toBeDefined();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].extensions?.code).toBe('FORBIDDEN');
  });

  test('Policies are isolated per organization', async ({ api, orgAUser, orgBUser }) => {
    const roleName = generateRoleName();

    // Org A creates a custom role
    api.session.tenant.accessToken = orgAUser.accessToken;
    api.session.organizationId = orgAUser.organizationId;
    await api.session.setupProject();

    const { data: createResult } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          name: roleName,
          displayName: 'Org A Custom Role',
          permissions: [{ resource: 'product', actions: ['read'], effect: 'ALLOW' }],
        },
      },
    });

    expect(createResult.roleMutation.roleCreate.userErrors).toHaveLength(0);

    // Org B creates their own project and checks roles
    api.session.tenant.accessToken = orgBUser.accessToken;
    api.session.organizationId = orgBUser.organizationId;
    await api.session.setupProject();

    const { data: rolesResult } = await api.admin.query('project-api/ProjectRoles', {
      variables: { slug: api.session.projectSlug },
    });

    const roles = rolesResult.projectQuery.project?.roles ?? [];
    const orgARole = roles.find((r: { name: string }) => r.name === roleName);

    // Org A's custom role should NOT be visible in Org B
    expect(orgARole).toBeUndefined();
  });

  test('Cross-organization role assignment should be prevented', async ({ api, orgAUser, orgBUser }) => {
    // Org A creates a project
    api.session.tenant.accessToken = orgAUser.accessToken;
    api.session.organizationId = orgAUser.organizationId;
    await api.session.setupProject();

    // Org A tries to add Org B user to their project
    // This should fail because Org B user is in a different organization
    const { data } = await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      throwOnError: false,
      variables: {
        input: {
          userId: orgBUser.userId,
          newRole: 'viewer',
        },
      },
    });

    const errors = data.roleMutation?.projectMemberRoleChange?.userErrors ?? [];
    // Should fail - cross-organization role assignment
    expect(errors.length).toBeGreaterThan(0);
  });

  test('Organization members listing is scoped', async ({ api, orgAUser }) => {
    // This test verifies that member listing respects organization boundaries
    api.session.tenant.accessToken = orgAUser.accessToken;
    api.session.organizationId = orgAUser.organizationId;
    await api.session.setupProject();

    const { data } = await api.admin.query('project-api/ProjectMembers', {
      variables: { slug: api.session.projectSlug },
    });

    const members = data.projectQuery.project?.members ?? [];

    // Should only see members from the same organization
    expect(members.length).toBe(1); // Only the creator
    expect(members[0].role.name).toBe('owner');
  });
});

test.describe('Enforcer Isolation', () => {
  test('Each organization has separate enforcer context', async ({ api, orgAUser, orgBUser }) => {
    // Create projects in both organizations
    api.session.tenant.accessToken = orgAUser.accessToken;
    api.session.organizationId = orgAUser.organizationId;
    await api.session.setupProject();
    const projectASlug = api.session.projectSlug;

    api.session.tenant.accessToken = orgBUser.accessToken;
    api.session.organizationId = orgBUser.organizationId;
    await api.session.setupProject();
    const projectBSlug = api.session.projectSlug;

    // Org A owner should have access to their project
    api.session.tenant.accessToken = orgAUser.accessToken;
    api.session.organizationId = orgAUser.organizationId;
    api.session.project = { slug: projectASlug, id: '', name: 'Project A' };

    const { data: authA } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'read' },
      },
    });
    expect(authA.authorize.allowed).toBe(true);

    // Org B owner should have access to their project
    api.session.tenant.accessToken = orgBUser.accessToken;
    api.session.organizationId = orgBUser.organizationId;
    api.session.project = { slug: projectBSlug, id: '', name: 'Project B' };

    const { data: authB } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'read' },
      },
    });
    expect(authB.authorize.allowed).toBe(true);

    // But Org A owner should NOT have access to Org B's project
    api.session.tenant.accessToken = orgAUser.accessToken;
    api.session.organizationId = orgAUser.organizationId;
    api.session.project = { slug: projectBSlug, id: '', name: 'Project B' };

    const { data: crossAuth } = await api.admin.query('roles-api/Authorize', {
      throwOnError: false,
      variables: {
        input: { resource: 'project', action: 'read' },
      },
    });
    expect(crossAuth.authorize.allowed).toBe(false);
  });
});
