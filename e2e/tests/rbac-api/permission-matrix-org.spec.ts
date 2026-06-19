import { test } from '@fixtures/base.extend';
import type { ApiFixtures } from '@fixtures/api/api';
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

type Api = ApiFixtures['api'];

async function checkPermission(
  api: Api,
  organizationId: string | undefined,
  resource: string,
  action: string,
): Promise<boolean> {
  const { data } = await api.admin.query('roles-api/Authorize', {
    variables: {
      input: { organizationId, domain: 'org', resource, action },
    },
  });
  return (data as unknown as AuthorizeResult).userQuery.authorize.allowed;
}

test.describe('Organization Permission Matrix', () => {
  test('Admin can read org.profile', async ({ api }) => {
    await api.session.setupUser();

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;
    const allowed = await checkPermission(api, organizationId, 'org.profile', 'read');
    expect(allowed).toBe(true);
  });

  test('Admin can write org.profile', async ({ api }) => {
    await api.session.setupUser();

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;
    const allowed = await checkPermission(api, organizationId, 'org.profile', 'write');
    expect(allowed).toBe(true);
  });

  test('Admin owner can admin org.profile', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;
    const ownerId = api.session.tenant.userId;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    // Owner can admin (delete)
    const ownerAllowed = await checkPermission(api, organizationId, 'org.profile', 'admin');
    expect(ownerAllowed).toBe(true);

    // Add non-owner admin
    const adminB = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: adminB.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // Switch to non-owner admin
    api.session.tenant.accessToken = adminB.accessToken;
    api.session.tenant.userId = adminB.userId;

    // Non-owner admin should be denied admin (delete)
    const nonOwnerAllowed = await checkPermission(api, organizationId, 'org.profile', 'admin');
    expect(nonOwnerAllowed).toBe(false);

    // Restore owner
    if (ownerToken) api.session.tenant.accessToken = ownerToken;
    api.session.tenant.userId = ownerId;
  });

  test('Member can read org.profile', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    // Add member
    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    // Switch to member
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const allowed = await checkPermission(api, organizationId, 'org.profile', 'read');
    expect(allowed).toBe(true);

    if (ownerToken) api.session.tenant.accessToken = ownerToken;
  });

  test('Member cannot write org.profile', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const allowed = await checkPermission(api, organizationId, 'org.profile', 'write');
    expect(allowed).toBe(false);

    if (ownerToken) api.session.tenant.accessToken = ownerToken;
  });

  test('Member cannot admin org.profile', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const allowed = await checkPermission(api, organizationId, 'org.profile', 'admin');
    expect(allowed).toBe(false);

    if (ownerToken) api.session.tenant.accessToken = ownerToken;
  });

  test('Admin can read org.members', async ({ api }) => {
    await api.session.setupUser();

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;
    const allowed = await checkPermission(api, organizationId, 'org.members', 'read');
    expect(allowed).toBe(true);
  });

  test('Admin can write org.members', async ({ api }) => {
    await api.session.setupUser();

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;
    const allowed = await checkPermission(api, organizationId, 'org.members', 'write');
    expect(allowed).toBe(true);
  });

  test('Admin can admin org.members', async ({ api }) => {
    await api.session.setupUser();

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;
    const allowed = await checkPermission(api, organizationId, 'org.members', 'admin');
    expect(allowed).toBe(true);
  });

  test('Member can read org.members', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const allowed = await checkPermission(api, organizationId, 'org.members', 'read');
    expect(allowed).toBe(true);

    if (ownerToken) api.session.tenant.accessToken = ownerToken;
  });

  test('Member cannot write org.members', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const allowed = await checkPermission(api, organizationId, 'org.members', 'write');
    expect(allowed).toBe(false);

    if (ownerToken) api.session.tenant.accessToken = ownerToken;
  });

  test('Member cannot admin org.members', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const allowed = await checkPermission(api, organizationId, 'org.members', 'admin');
    expect(allowed).toBe(false);

    if (ownerToken) api.session.tenant.accessToken = ownerToken;
  });

  test('Admin can perform all org.roles actions', async ({ api }) => {
    await api.session.setupUser();

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    const actions = ['read', 'write', 'admin'];
    for (const action of actions) {
      const allowed = await checkPermission(api, organizationId, 'org.roles', action);
      expect(allowed, `Admin should have org.roles.${action}`).toBe(true);
    }
  });

  test('Member cannot access org.roles', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const actions = ['write', 'admin'];
    for (const action of actions) {
      const allowed = await checkPermission(api, organizationId, 'org.roles', action);
      expect(allowed, `Member should not have org.roles.${action}`).toBe(false);
    }

    if (ownerToken) api.session.tenant.accessToken = ownerToken;
  });

  test('Admin can perform all org.stores actions', async ({ api }) => {
    await api.session.setupUser();

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    const actions = ['read', 'write', 'admin'];
    for (const action of actions) {
      const allowed = await checkPermission(api, organizationId, 'org.stores', action);
      expect(allowed, `Admin should have org.stores.${action}`).toBe(true);
    }
  });

  test('Member cannot manage org.stores', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const actions = ['write', 'admin'];
    for (const action of actions) {
      const allowed = await checkPermission(api, organizationId, 'org.stores', action);
      expect(allowed, `Member should not have org.stores.${action}`).toBe(false);
    }

    if (ownerToken) api.session.tenant.accessToken = ownerToken;
  });

  test('Admin can perform all org.access actions', async ({ api }) => {
    await api.session.setupUser();

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    const actions = ['read', 'write', 'admin'];
    for (const action of actions) {
      const allowed = await checkPermission(api, organizationId, 'org.access', action);
      expect(allowed, `Admin should have org.access.${action}`).toBe(true);
    }
  });

  test('Member cannot manage org.access', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    const memberUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: memberUser.data.email,
          roles: [{ domain: 'org', role: 'member' }],
        },
      },
    });

    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    const actions = ['write', 'admin'];
    for (const action of actions) {
      const allowed = await checkPermission(api, organizationId, 'org.access', action);
      expect(allowed, `Member should not have org.access.${action}`).toBe(false);
    }

    if (ownerToken) api.session.tenant.accessToken = ownerToken;
  });

  test('Only owner can transfer ownership', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;
    const ownerId = api.session.tenant.userId;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    // Add non-owner admin
    const adminB = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: adminB.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // Add target for transfer
    const adminC = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: adminC.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // Non-owner admin tries to transfer ownership
    api.session.tenant.accessToken = adminB.accessToken;
    api.session.tenant.userId = adminB.userId;

    const { data: transferData } = await api.admin.mutation('iam-api/OwnershipTransfer', {
      variables: {
        input: {
          organizationId,
          newOwnerId: adminC.userId,
        },
      },
    });

    // Should fail
    expect(transferData.organizationMutation.ownershipTransfer.userErrors.length).toBeGreaterThan(0);

    // Restore owner
    if (ownerToken) api.session.tenant.accessToken = ownerToken;
    api.session.tenant.userId = ownerId;
  });

  test('Only owner can delete organization', async ({ api }) => {
    await api.session.setupUser();
    const ownerToken = api.session.accessToken;
    const ownerId = api.session.tenant.userId;

    const orgName = generateOrgName();
    const { data: orgData } = await api.admin.mutation('iam-api/OrganizationCreate', {
      variables: { input: { name: orgName, displayName: 'Test Organization' } },
    });

    const organizationId = orgData.organizationMutation.organizationCreate.organization?.id;

    // Add non-owner admin
    const adminB = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: adminB.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // Non-owner admin tries to check delete permission
    api.session.tenant.accessToken = adminB.accessToken;
    api.session.tenant.userId = adminB.userId;

    const allowed = await checkPermission(api, organizationId, 'org.profile', 'admin');
    expect(allowed).toBe(false);

    // Owner can admin (delete)
    if (ownerToken) api.session.tenant.accessToken = ownerToken;
    api.session.tenant.userId = ownerId;

    const ownerAllowed = await checkPermission(api, organizationId, 'org.profile', 'admin');
    expect(ownerAllowed).toBe(true);
  });
});
