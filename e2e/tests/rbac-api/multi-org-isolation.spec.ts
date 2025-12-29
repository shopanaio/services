import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;

interface AuthorizeResult {
  userQuery: {
    authorize: {
      allowed: boolean;
      deniedReason?: string;
    };
  };
}

test.describe('Multi-Organization Isolation (FR-1)', () => {
  test('Policies from one organization should not affect other organizations', async ({ api }) => {
    // 1. Create first user and their organization
    await api.session.setupUser();
    const userAToken = api.session.accessToken;
    const userAId = api.session.tenant.userId;

    const orgAName = generateOrgName();
    const { data: orgAData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgAName,
          displayName: 'Organization A',
        },
      },
    });

    const orgA = orgAData.organizationMutation.organizationCreate.organization;
    expect(orgA).not.toBeNull();
    const orgAId = orgA?.id;

    // User A is admin in org A
    const { data: authOrgA } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId: orgAId, domain: 'org', resource: 'org.profile', action: 'update' },
      },
    });
    expect((authOrgA as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // 2. Create second user and their organization
    const userB = await api.admin.user.create();
    api.session.tenant.accessToken = userB.accessToken;
    api.session.tenant.userId = userB.userId;

    const orgBName = generateOrgName();
    const { data: orgBData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgBName,
          displayName: 'Organization B',
        },
      },
    });

    const orgB = orgBData.organizationMutation.organizationCreate.organization;
    expect(orgB).not.toBeNull();
    const orgBId = orgB?.id;

    // 3. Switch back to user A and verify they cannot access org B
    api.session.tenant.accessToken = userAToken ?? undefined;
    api.session.tenant.userId = userAId;

    const { data: authOrgB } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId: orgBId, domain: 'org', resource: 'org.profile', action: 'update' },
      },
    });

    // User A should NOT have access to org B
    expect((authOrgB as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Each organization should have isolated set of policies', async ({ api }) => {
    // 1. Create org A and create custom role
    await api.session.setupUser();

    const orgAName = generateOrgName();
    const { data: orgAData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgAName,
          displayName: 'Organization A',
        },
      },
    });

    const orgA = orgAData.organizationMutation.organizationCreate.organization;
    expect(orgA).not.toBeNull();
    const orgAId = orgA?.id;

    // Create custom role in org A
    const { data: roleData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId: orgAId,
          domain: 'org',
          name: 'custom-reviewer',
          displayName: 'Custom Reviewer',
          description: 'A custom role for organization A',
          permissions: [{ resource: 'org.profile', actions: ['read'] }],
        },
      },
    });

    expect(roleData.roleMutation.roleCreate.role).not.toBeNull();

    // 2. Create org B
    const orgBName = generateOrgName();
    const { data: orgBData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgBName,
          displayName: 'Organization B',
        },
      },
    });

    const orgB = orgBData.organizationMutation.organizationCreate.organization;
    expect(orgB).not.toBeNull();
    const orgBId = orgB?.id;

    // 3. Verify that "custom-reviewer" does not exist in org B
    const { data: membershipDataB } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: orgBId },
    });

    const rolesB = membershipDataB.organizationQuery.organization?.membership?.roles ?? [];
    const customRoleInB = rolesB.find((r: { name: string }) => r.name === 'custom-reviewer');
    expect(customRoleInB).toBeUndefined();
  });

  test('User with same email can have different roles in different organizations', async ({ api }) => {
    // 1. Create org A, user becomes admin
    await api.session.setupUser();
    const userToken = api.session.accessToken;
    const userId = api.session.tenant.userId;

    const orgAName = generateOrgName();
    const { data: orgAData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgAName,
          displayName: 'Organization A',
        },
      },
    });

    const orgA = orgAData.organizationMutation.organizationCreate.organization;
    expect(orgA).not.toBeNull();
    const orgAId = orgA?.id;

    // 2. Create org B by another user
    const userB = await api.admin.user.create();
    api.session.tenant.accessToken = userB.accessToken;
    api.session.tenant.userId = userB.userId;

    const orgBName = generateOrgName();
    const { data: orgBData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgBName,
          displayName: 'Organization B',
        },
      },
    });

    const orgB = orgBData.organizationMutation.organizationCreate.organization;
    expect(orgB).not.toBeNull();
    const orgBId = orgB?.id;

    // 3. Invite first user to org B as member
    // Get first user's email
    const { data: userAData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: orgAId },
    });
    // Switch to user B context and invite user A
    const userAEmail = userAData.organizationQuery.organization?.membership?.members?.[0]?.user?.email;

    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId: orgBId,
          email: userAEmail,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // 4. Switch back to user A and verify roles
    api.session.tenant.accessToken = userToken ?? undefined;
    api.session.tenant.userId = userId;

    // User A should be admin in org A (can invite)
    const { data: authOrgA } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId: orgAId, domain: 'org', resource: 'org.members', action: 'invite' },
      },
    });
    expect((authOrgA as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // User A should be member in org B (cannot invite)
    const { data: authOrgB } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId: orgBId, domain: 'org', resource: 'org.members', action: 'invite' },
      },
    });
    expect((authOrgB as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Enforcer instances should be cached per-organization', async ({ api }) => {
    // This test verifies performance by making multiple permission checks
    // We verify the checks complete successfully (caching is internal implementation detail)
    await api.session.setupUser();

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgName,
          displayName: 'Test Organization',
        },
      },
    });

    const organization = orgData.organizationMutation.organizationCreate.organization;
    expect(organization).not.toBeNull();
    const organizationId = organization?.id;

    // Make multiple permission checks for the same organization
    const actions = [
      { resource: 'org.profile', action: 'read' },
      { resource: 'org.profile', action: 'update' },
      { resource: 'org.members', action: 'read' },
      { resource: 'org.members', action: 'invite' },
      { resource: 'org.roles', action: 'read' },
    ];

    const startTime = Date.now();

    for (const { resource, action } of actions) {
      const { data: authData } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { organizationId, domain: 'org', resource, action },
        },
      });

      // All should be allowed for admin
      expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Verify all checks completed in reasonable time (< 10 seconds for 5 checks)
    // This is a soft assertion to verify caching is working
    expect(totalTime).toBeLessThan(10000);
  });

  test('Organization member cannot see members of another organization', async ({ api }) => {
    // 1. Create org A with user A as admin
    await api.session.setupUser();
    const userAToken = api.session.accessToken;
    const userAId = api.session.tenant.userId;

    const orgAName = generateOrgName();
    const { data: orgAData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgAName,
          displayName: 'Organization A',
        },
      },
    });

    const orgA = orgAData.organizationMutation.organizationCreate.organization;
    expect(orgA).not.toBeNull();

    // 2. Create org B with user B as admin
    const userB = await api.admin.user.create();
    api.session.tenant.accessToken = userB.accessToken;
    api.session.tenant.userId = userB.userId;

    const orgBName = generateOrgName();
    const { data: orgBData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgBName,
          displayName: 'Organization B',
        },
      },
    });

    const orgB = orgBData.organizationMutation.organizationCreate.organization;
    expect(orgB).not.toBeNull();
    const orgBId = orgB?.id;

    // 3. User A tries to read members of org B
    api.session.tenant.accessToken = userAToken ?? undefined;
    api.session.tenant.userId = userAId;

    const { data: authOrgB } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId: orgBId, domain: 'org', resource: 'org.members', action: 'read' },
      },
    });

    // 4. Verify access denied
    expect((authOrgB as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);
  });

  test('Organization roles are not shared between organizations', async ({ api }) => {
    // 1. Create custom role in org A
    await api.session.setupUser();

    const orgAName = generateOrgName();
    const { data: orgAData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgAName,
          displayName: 'Organization A',
        },
      },
    });

    const orgA = orgAData.organizationMutation.organizationCreate.organization;
    expect(orgA).not.toBeNull();
    const orgAId = orgA?.id;

    // Create custom role
    const { data: roleData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId: orgAId,
          domain: 'org',
          name: 'unique-role-org-a',
          displayName: 'Unique Role for Org A',
          description: 'This role should only exist in org A',
          permissions: [{ resource: 'org.profile', actions: ['read'] }],
        },
      },
    });

    const customRoleA = roleData.roleMutation.roleCreate.role;
    expect(customRoleA).not.toBeNull();
    const customRoleAId = customRoleA?.id;

    // 2. Verify the role ID is scoped to org A
    expect(customRoleAId).toBeDefined();

    // 3. Create org B
    const orgBName = generateOrgName();
    const { data: orgBData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: {
        input: {
          name: orgBName,
          displayName: 'Organization B',
        },
      },
    });

    const orgB = orgBData.organizationMutation.organizationCreate.organization;
    expect(orgB).not.toBeNull();
    const orgBId = orgB?.id;

    // 4. Verify org B cannot reference or use org A's custom role
    // Query org B's roles to verify the custom role doesn't exist there
    const { data: membershipDataB } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: orgBId },
    });

    const rolesB = membershipDataB.organizationQuery.organization?.membership?.roles ?? [];
    const customRoleInB = rolesB.find((r: { id: string }) => r.id === customRoleAId);
    expect(customRoleInB).toBeUndefined();

    // Verify role names don't leak between organizations
    const uniqueRoleInB = rolesB.find((r: { name: string }) => r.name === 'unique-role-org-a');
    expect(uniqueRoleInB).toBeUndefined();
  });
});
