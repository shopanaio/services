import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;
const generateStoreName = () => `test-store-${crypto.randomUUID().slice(0, 8)}`;

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  domain: string;
  permissions: { resource: string; actions: string[] }[];
}

interface MembershipData {
  organizationQuery: {
    organization: {
      id: string;
      name: string;
      membership: {
        domain: string;
        roles: Role[];
        members: {
          id: string;
          user: { id: string; email: string };
          role: string;
          isOwner: boolean;
        }[];
      };
    };
  };
}

test.describe('System Role Protection (FR-7)', () => {
  test('Cannot delete admin system role', async ({ api }) => {
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

    // Get roles to find admin role ID
    const { data: membershipData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const roles = (membershipData as unknown as MembershipData).organizationQuery.organization
      ?.membership?.roles;
    const adminRole = roles?.find((r) => r.name === 'admin' && r.domain === 'org');
    expect(adminRole).toBeDefined();
    expect(adminRole?.isSystem).toBe(true);

    // Attempt to delete admin system role should fail
    const { data: deleteData } = await api.admin.mutation('roles-api/RoleDelete', {
      variables: {
        input: {
          organizationId,
          id: adminRole?.id,
        },
      },
    });

    const userErrors = deleteData.roleMutation.roleDelete.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/system|cannot|delete/);
    expect(deleteData.roleMutation.roleDelete.deletedRoleName).toBeNull();
  });

  test('Cannot delete member system role', async ({ api }) => {
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

    // Get roles to find member role ID
    const { data: membershipData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const roles = (membershipData as unknown as MembershipData).organizationQuery.organization
      ?.membership?.roles;
    const memberRole = roles?.find((r) => r.name === 'member' && r.domain === 'org');
    expect(memberRole).toBeDefined();
    expect(memberRole?.isSystem).toBe(true);

    // Attempt to delete member system role should fail
    const { data: deleteData } = await api.admin.mutation('roles-api/RoleDelete', {
      variables: {
        input: {
          organizationId,
          id: memberRole?.id,
        },
      },
    });

    const userErrors = deleteData.roleMutation.roleDelete.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/system|cannot|delete/);
    expect(deleteData.roleMutation.roleDelete.deletedRoleName).toBeNull();
  });

  test('Cannot delete viewer system role in store', async ({ api }) => {
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
    api.session.organizationId = organizationId;

    // Create store
    const storeName = generateStoreName();
    const { data: storeData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeName,
          displayName: 'Test Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const store = storeData.storeMutation.storeCreate.store;
    expect(store).not.toBeNull();
    const storeId = store?.id;

    // Get store roles to find viewer role ID
    const { data: storeMembershipData } = await api.admin.query('project-api/StoreMembership', {
      variables: { organizationId },
    });

    const storeData2 = storeMembershipData.storeQuery.stores.find((s: { id: string }) => s.id === storeId);
    const roles = storeData2?.membership?.roles;
    const viewerRole = roles?.find((r: { name: string }) => r.name === 'viewer');
    expect(viewerRole).toBeDefined();
    expect(viewerRole?.isSystem).toBe(true);

    // Attempt to delete viewer system role should fail
    const { data: deleteData } = await api.admin.mutation('roles-api/RoleDelete', {
      variables: {
        input: {
          organizationId,
          id: viewerRole?.id,
        },
      },
    });

    const userErrors = deleteData.roleMutation.roleDelete.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/system|cannot|delete/);
    expect(deleteData.roleMutation.roleDelete.deletedRoleName).toBeNull();
  });

  test('Cannot delete manager system role in store', async ({ api }) => {
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
    api.session.organizationId = organizationId;

    // Create store
    const storeName = generateStoreName();
    const { data: storeData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeName,
          displayName: 'Test Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const store = storeData.storeMutation.storeCreate.store;
    expect(store).not.toBeNull();
    const storeId = store?.id;

    // Get store roles to find manager role ID
    const { data: storeMembershipData } = await api.admin.query('project-api/StoreMembership', {
      variables: { organizationId },
    });

    const storeData2 = storeMembershipData.storeQuery.stores.find((s) => s.id === storeId);
    const roles = storeData2?.membership?.roles;
    const managerRole = roles?.find((r) => r.name === 'manager');
    expect(managerRole).toBeDefined();
    expect(managerRole?.isSystem).toBe(true);

    // Attempt to delete manager system role should fail
    const { data: deleteData } = await api.admin.mutation('roles-api/RoleDelete', {
      variables: {
        input: {
          organizationId,
          id: managerRole?.id,
        },
      },
    });

    const userErrors = deleteData.roleMutation.roleDelete.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/system|cannot|delete/);
    expect(deleteData.roleMutation.roleDelete.deletedRoleName).toBeNull();
  });

  test('Cannot delete store admin system role', async ({ api }) => {
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
    api.session.organizationId = organizationId;

    // Create store
    const storeName = generateStoreName();
    const { data: storeData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeName,
          displayName: 'Test Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const store = storeData.storeMutation.storeCreate.store;
    expect(store).not.toBeNull();
    const storeId = store?.id;

    // Get store roles to find store admin role ID
    const { data: storeMembershipData } = await api.admin.query('project-api/StoreMembership', {
      variables: { organizationId },
    });

    const storeData2 = storeMembershipData.storeQuery.stores.find((s) => s.id === storeId);
    const roles = storeData2?.membership?.roles;
    const storeAdminRole = roles?.find((r) => r.name === 'admin');
    expect(storeAdminRole).toBeDefined();
    expect(storeAdminRole?.isSystem).toBe(true);

    // Attempt to delete store admin system role should fail
    const { data: deleteData } = await api.admin.mutation('roles-api/RoleDelete', {
      variables: {
        input: {
          organizationId,
          id: storeAdminRole?.id,
        },
      },
    });

    const userErrors = deleteData.roleMutation.roleDelete.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/system|cannot|delete/);
    expect(deleteData.roleMutation.roleDelete.deletedRoleName).toBeNull();
  });

  // Skipped: roleUpdate mutation is not implemented yet
  test('Cannot modify permissions of admin system role', async ({ api }) => {
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

    // Get roles to find admin role ID
    const { data: membershipData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const roles = (membershipData as unknown as MembershipData).organizationQuery.organization
      ?.membership?.roles;
    const adminRole = roles?.find((r) => r.name === 'admin' && r.domain === 'org');
    expect(adminRole).toBeDefined();

    // Attempt to modify admin role permissions should fail
    const { data: updateData } = await api.admin.mutation('roles-api/RoleUpdate', {
      variables: {
        input: {
          organizationId,
          id: adminRole?.id,
          permissions: [{ resource: 'org.profile', actions: ['read'] }],
        },
      },
    });

    const userErrors = updateData.roleMutation.roleUpdate.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/system|cannot|modify/);
    expect(updateData.roleMutation.roleUpdate.role).toBeNull();
  });

  // Skipped: roleUpdate mutation is not implemented yet
  test('Cannot modify permissions of member system role', async ({ api }) => {
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

    // Get roles to find member role ID
    const { data: membershipData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const roles = (membershipData as unknown as MembershipData).organizationQuery.organization
      ?.membership?.roles;
    const memberRole = roles?.find((r) => r.name === 'member' && r.domain === 'org');
    expect(memberRole).toBeDefined();

    // Attempt to modify member role permissions should fail
    const { data: updateData } = await api.admin.mutation('roles-api/RoleUpdate', {
      variables: {
        input: {
          organizationId,
          id: memberRole?.id,
          permissions: [{ resource: 'org.profile', actions: ['read', 'update'] }],
        },
      },
    });

    const userErrors = updateData.roleMutation.roleUpdate.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/system|cannot|modify/);
    expect(updateData.roleMutation.roleUpdate.role).toBeNull();
  });

  // Skipped: roleUpdate mutation is not implemented yet
  test('Cannot rename system roles', async ({ api }) => {
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

    // Get roles to find admin role ID
    const { data: membershipData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const roles = (membershipData as unknown as MembershipData).organizationQuery.organization
      ?.membership?.roles;
    const adminRole = roles?.find((r) => r.name === 'admin' && r.domain === 'org');
    expect(adminRole).toBeDefined();

    // Attempt to rename admin role should fail
    const { data: updateData } = await api.admin.mutation('roles-api/RoleUpdate', {
      variables: {
        input: {
          organizationId,
          id: adminRole?.id,
          displayName: 'Super Admin',
        },
      },
    });

    const userErrors = updateData.roleMutation.roleUpdate.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/system|cannot|modify/);
    expect(updateData.roleMutation.roleUpdate.role).toBeNull();
  });

  test('Owner cannot have their admin role revoked', async ({ api }) => {
    await api.session.setupUser();
    const ownerId = api.session.tenant.userId;

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

    // Attempt to change owner's role from admin to member should fail
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: ownerId,
          domain: 'org',
          role: 'member',
        },
      },
    });

    const userErrors = changeData.organizationMutation.memberRoleChange.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toContain('owner');
    expect(changeData.organizationMutation.memberRoleChange.member).toBeNull();
  });

  test('Another admin cannot remove owner admin role', async ({ api }) => {
    await api.session.setupUser();
    const ownerId = api.session.tenant.userId;
    const ownerToken = api.session.accessToken;

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

    // Invite another admin
    const anotherAdmin = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: anotherAdmin.data.email,
          roles: [{ domain: 'org', role: 'admin' }],
        },
      },
    });

    // Switch to the other admin context
    api.session.tenant.accessToken = anotherAdmin.accessToken;
    api.session.tenant.userId = anotherAdmin.userId;

    // Other admin attempts to demote owner should fail
    const { data: changeData } = await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: ownerId,
          domain: 'org',
          role: 'member',
        },
      },
    });

    const userErrors = changeData.organizationMutation.memberRoleChange.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toContain('owner');
    expect(changeData.organizationMutation.memberRoleChange.member).toBeNull();

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('System roles should be marked with isSystem flag', async ({ api }) => {
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
    api.session.organizationId = organizationId;

    // Create store for store roles
    const storeName = generateStoreName();
    const { data: storeData } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          organizationId,
          name: storeName,
          displayName: 'Test Store',
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    const store = storeData.storeMutation.storeCreate.store;
    expect(store).not.toBeNull();
    const storeId = store?.id;

    // Get org-level roles
    const { data: membershipData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const orgRoles = (membershipData as unknown as MembershipData).organizationQuery.organization
      ?.membership?.roles;
    expect(orgRoles).toBeDefined();
    expect(orgRoles?.length).toBeGreaterThan(0);

    // Verify org system roles have isSystem: true
    const orgAdminRole = orgRoles?.find((r) => r.name === 'admin' && r.domain === 'org');
    const orgMemberRole = orgRoles?.find((r) => r.name === 'member' && r.domain === 'org');
    expect(orgAdminRole?.isSystem).toBe(true);
    expect(orgMemberRole?.isSystem).toBe(true);

    // Get store-level roles
    const { data: storeMembershipData } = await api.admin.query('project-api/StoreMembership', {
      variables: { organizationId },
    });

    const storeData2 = storeMembershipData.storeQuery.stores.find((s: { id: string }) => s.id === storeId);
    const storeRoles = storeData2?.membership?.roles;
    expect(storeRoles).toBeDefined();
    expect(storeRoles?.length).toBeGreaterThan(0);

    // Verify store system roles have isSystem: true
    const storeAdminRole = storeRoles?.find((r) => r.name === 'admin');
    const storeManagerRole = storeRoles?.find((r) => r.name === 'manager');
    const storeViewerRole = storeRoles?.find((r) => r.name === 'viewer');
    expect(storeAdminRole?.isSystem).toBe(true);
    expect(storeManagerRole?.isSystem).toBe(true);
    expect(storeViewerRole?.isSystem).toBe(true);
  });

  test('Custom roles should have isSystem false', async ({ api }) => {
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

    // Create custom role
    const { data: createData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: 'custom-reviewer',
          displayName: 'Custom Reviewer',
          description: 'A custom role for reviewers',
          permissions: [{ resource: 'org.profile', actions: ['read'] }],
        },
      },
    });

    const createdRole = createData.roleMutation.roleCreate.role;
    expect(createdRole).not.toBeNull();
    expect(createdRole?.isSystem).toBe(false);
    expect(createdRole?.name).toBe('custom-reviewer');

    // Verify in membership query as well
    const { data: membershipData } = await api.admin.query('iam-api/OrganizationMembership', {
      variables: { id: organizationId },
    });

    const roles = (membershipData as unknown as MembershipData).organizationQuery.organization
      ?.membership?.roles;
    const customRole = roles?.find((r) => r.name === 'custom-reviewer');
    expect(customRole).toBeDefined();
    expect(customRole?.isSystem).toBe(false);
  });
});
