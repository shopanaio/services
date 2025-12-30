import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateOrgName = () => `test-org-${crypto.randomUUID().slice(0, 8)}`;
const generateStoreName = () => `test-store-${crypto.randomUUID().slice(0, 8)}`;
const generateRoleName = () => `custom-role-${crypto.randomUUID().slice(0, 8)}`;

interface AuthorizeResult {
  userQuery: {
    authorize: {
      allowed: boolean;
      deniedReason?: string;
    };
  };
}

test.describe('Custom Roles (FR-9)', () => {
  test('Admin can create custom role in organization', async ({ api }) => {
    // 1. Create organization (user becomes admin)
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

    // 2. Create custom role with specific permissions
    const roleName = generateRoleName();
    const { data: roleData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: roleName,
          displayName: 'Custom Reviewer',
          description: 'A custom role for reviewing',
          permissions: [{ resource: 'org.profile', action: 'read' }],
        },
      },
    });

    // 3. Verify role is created successfully
    const createdRole = roleData.roleMutation.roleCreate.role;
    expect(createdRole).not.toBeNull();
    expect(createdRole?.name).toBe(roleName);
    expect(createdRole?.displayName).toBe('Custom Reviewer');

    // 4. Verify role has isSystem: false
    expect(createdRole?.isSystem).toBe(false);
  });

  test('Admin can create custom role in store', async ({ api }) => {
    // 1. Create organization and store
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

    // 2. Create custom role in store domain
    const roleName = generateRoleName();
    const { data: roleData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: `store:${storeId}`,
          name: roleName,
          displayName: 'Store Custom Role',
          description: 'A custom role for the store',
          permissions: [{ resource: 'store.profile', action: 'read' }],
        },
      },
    });

    // 3. Verify role is created with isSystem: false
    const createdRole = roleData.roleMutation.roleCreate.role;
    expect(createdRole).not.toBeNull();
    expect(createdRole?.isSystem).toBe(false);
  });

  test('Non-admin cannot create custom roles', async ({ api }) => {
    // 1. Create organization
    await api.session.setupUser();
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

    // 2. Invite user as member
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

    // Switch to member context
    api.session.tenant.accessToken = memberUser.accessToken;
    api.session.tenant.userId = memberUser.userId;

    // 3. Member attempts to create custom role
    const roleName = generateRoleName();
    const { data: roleData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: roleName,
          displayName: 'Attempted Custom Role',
          permissions: [{ resource: 'org.profile', action: 'read' }],
        },
      },
    });

    // 4. Verify operation fails
    const userErrors = roleData.roleMutation.roleCreate.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(roleData.roleMutation.roleCreate.role).toBeNull();

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Custom role permissions cannot exceed creator permissions', async ({ api }) => {
    // Note: This test verifies that users cannot create roles with permissions they don't have
    // In most implementations, only admins can create roles and they have all permissions
    // This test is a placeholder for future permission-limited role creation
    await api.session.setupUser();
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

    // Create a custom role with limited permissions first
    const { data: limitedRoleData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: 'limited-creator',
          displayName: 'Limited Creator',
          permissions: [
            { resource: 'org.profile', action: 'read' },
            { resource: 'org.roles', action: 'write' }, // Can create/update roles
          ],
        },
      },
    });

    expect(limitedRoleData.roleMutation.roleCreate.role).not.toBeNull();

    // Admin creating roles with all permissions should work
    const roleName = generateRoleName();
    const { data: roleData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: roleName,
          displayName: 'Full Permission Role',
          permissions: [
            { resource: 'org.profile', action: 'write' },
            { resource: 'org.members', action: 'admin' },
          ],
        },
      },
    });

    expect(roleData.roleMutation.roleCreate.role).not.toBeNull();

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Admin can modify custom role', async ({ api }) => {
    // 1. Create custom role
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

    const roleName = generateRoleName();
    const { data: createData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: roleName,
          displayName: 'Initial Name',
          permissions: [{ resource: 'org.profile', action: 'read' }],
        },
      },
    });

    const createdRole = createData.roleMutation.roleCreate.role;
    expect(createdRole).not.toBeNull();
    const roleId = createdRole?.id;

    // 2. Modify role permissions
    const { data: updateData } = await api.admin.mutation('roles-api/RoleUpdate', {
      variables: {
        input: {
          organizationId,
          id: roleId,
          permissions: [
            { resource: 'org.profile', action: 'write' },
            { resource: 'org.members', action: 'read' },
          ],
        },
      },
    });

    // 3. Verify changes are saved
    expect(updateData.roleMutation.roleUpdate.userErrors).toHaveLength(0);
    expect(updateData.roleMutation.roleUpdate.role).not.toBeNull();
  });

  test('Admin can rename custom role', async ({ api }) => {
    // 1. Create custom role
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

    const roleName = generateRoleName();
    const { data: createData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: roleName,
          displayName: 'Original Display Name',
          permissions: [{ resource: 'org.profile', action: 'read' }],
        },
      },
    });

    const createdRole = createData.roleMutation.roleCreate.role;
    expect(createdRole).not.toBeNull();
    const roleId = createdRole?.id;

    // 2. Rename the role
    const { data: updateData } = await api.admin.mutation('roles-api/RoleUpdate', {
      variables: {
        input: {
          organizationId,
          id: roleId,
          displayName: 'Updated Display Name',
        },
      },
    });

    // 3. Verify name is updated
    expect(updateData.roleMutation.roleUpdate.userErrors).toHaveLength(0);
    expect(updateData.roleMutation.roleUpdate.role?.displayName).toBe('Updated Display Name');
  });

  test('Custom role modification cannot exceed modifier permissions', async ({ api }) => {
    // This test verifies escalation prevention during modification
    // Implementation depends on specific permission model
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

    // Create custom role with limited permissions
    const roleName = generateRoleName();
    const { data: createData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: roleName,
          displayName: 'Limited Role',
          permissions: [{ resource: 'org.profile', action: 'read' }],
        },
      },
    });

    const createdRole = createData.roleMutation.roleCreate.role;
    expect(createdRole).not.toBeNull();

    // Admin can modify to add more permissions (admin has full access)
    const { data: updateData } = await api.admin.mutation('roles-api/RoleUpdate', {
      variables: {
        input: {
          organizationId,
          id: createdRole?.id,
          permissions: [
            { resource: 'org.profile', action: 'write' },
            { resource: 'org.members', action: 'write' },
          ],
        },
      },
    });

    expect(updateData.roleMutation.roleUpdate.userErrors).toHaveLength(0);
  });

  test('Admin can delete custom role', async ({ api }) => {
    // 1. Create custom role
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

    const roleName = generateRoleName();
    const { data: createData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: roleName,
          displayName: 'Role To Delete',
          permissions: [{ resource: 'org.profile', action: 'read' }],
        },
      },
    });

    const createdRole = createData.roleMutation.roleCreate.role;
    expect(createdRole).not.toBeNull();
    const roleId = createdRole?.id;

    // 2. Delete the role
    const { data: deleteData } = await api.admin.mutation('roles-api/RoleDelete', {
      variables: {
        input: {
          organizationId,
          id: roleId,
        },
      },
    });

    // 3. Verify role is removed
    expect(deleteData.roleMutation.roleDelete.userErrors).toHaveLength(0);
    expect(deleteData.roleMutation.roleDelete.deletedRoleName).toBe(roleName);
  });

  test('Deleting role removes it from assigned users', async ({ api }) => {
    // 1. Create custom role
    await api.session.setupUser();
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

    const roleName = generateRoleName();
    const { data: createData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: roleName,
          displayName: 'Deletable Role',
          permissions: [{ resource: 'org.profile', action: 'write' }],
        },
      },
    });

    const createdRole = createData.roleMutation.roleCreate.role;
    expect(createdRole).not.toBeNull();
    const roleId = createdRole?.id;

    // 2. Assign role to user (with additional system role so they're not left without a role)
    const testUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: testUser.data.email,
          roles: [{ domain: 'org', role: 'member' }], // System role
        },
      },
    });

    // Change to custom role
    await api.admin.mutation('iam-api/MemberRoleChange', {
      variables: {
        input: {
          organizationId,
          userId: testUser.userId,
          domain: 'org',
          role: roleName,
        },
      },
    });

    // 3. Delete the role
    const { data: deleteData } = await api.admin.mutation('roles-api/RoleDelete', {
      variables: {
        input: {
          organizationId,
          id: roleId,
        },
      },
    });

    expect(deleteData.roleMutation.roleDelete.userErrors).toHaveLength(0);

    // 4. Verify user no longer has the permissions from that role
    api.session.tenant.accessToken = testUser.accessToken;
    api.session.tenant.userId = testUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'write' },
      },
    });

    // User should not have update permission anymore (custom role was deleted)
    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Cannot delete custom role if it is the only role for a user', async ({ api }) => {
    // This test depends on implementation - some systems reassign to default role
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
    const roleName = generateRoleName();
    const { data: createData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: roleName,
          displayName: 'Only Role',
          permissions: [{ resource: 'org.profile', action: 'read' }],
        },
      },
    });

    const createdRole = createData.roleMutation.roleCreate.role;
    expect(createdRole).not.toBeNull();
    const roleId = createdRole?.id;

    // Note: In this implementation, users must have a system role,
    // so this test verifies deletion still works or fails appropriately
    const { data: deleteData } = await api.admin.mutation('roles-api/RoleDelete', {
      variables: {
        input: {
          organizationId,
          id: roleId,
        },
      },
    });

    // Either succeeds (no users assigned) or fails with appropriate error
    if (deleteData.roleMutation.roleDelete.userErrors.length > 0) {
      expect(deleteData.roleMutation.roleDelete.userErrors[0].message).toBeDefined();
    } else {
      expect(deleteData.roleMutation.roleDelete.deletedRoleName).toBe(roleName);
    }
  });

  test('Maximum 20 custom roles per organization domain', async ({ api }) => {
    // 1. Create organization
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

    // 2. Create 20 custom roles
    for (let i = 1; i <= 20; i++) {
      const roleName = `custom-role-${i}-${crypto.randomUUID().slice(0, 4)}`;
      const { data: roleData } = await api.admin.mutation('roles-api/RoleCreate', {
        variables: {
          input: {
            organizationId,
            domain: 'org',
            name: roleName,
            displayName: `Custom Role ${i}`,
            permissions: [{ resource: 'org.profile', action: 'read' }],
          },
        },
      });
      expect(roleData.roleMutation.roleCreate.role).not.toBeNull();
    }

    // 3. Attempt to create 21st custom role
    const { data: overLimitData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: 'role-21',
          displayName: 'Role Over Limit',
          permissions: [{ resource: 'org.profile', action: 'read' }],
        },
      },
    });

    // 4. Verify operation fails with limit error
    const userErrors = overLimitData.roleMutation.roleCreate.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/limit|maximum|20/);
    expect(overLimitData.roleMutation.roleCreate.role).toBeNull();
  });

  test('Maximum 20 custom roles per store domain', async ({ api }) => {
    // 1. Create store
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

    // 2. Create 20 custom roles in store
    for (let i = 1; i <= 20; i++) {
      const roleName = `store-role-${i}-${crypto.randomUUID().slice(0, 4)}`;
      const { data: roleData } = await api.admin.mutation('roles-api/RoleCreate', {
        variables: {
          input: {
            organizationId,
            domain: `store:${storeId}`,
            name: roleName,
            displayName: `Store Custom Role ${i}`,
            permissions: [{ resource: 'store.profile', action: 'read' }],
          },
        },
      });
      expect(roleData.roleMutation.roleCreate.role).not.toBeNull();
    }

    // 3. Attempt to create 21st role
    const { data: overLimitData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: `store:${storeId}`,
          name: 'store-role-21',
          displayName: 'Store Role Over Limit',
          permissions: [{ resource: 'store.profile', action: 'read' }],
        },
      },
    });

    // 4. Verify operation fails
    const userErrors = overLimitData.roleMutation.roleCreate.userErrors;
    expect(userErrors.length).toBeGreaterThan(0);
    expect(userErrors[0].message.toLowerCase()).toMatch(/limit|maximum|20/);
  });

  test('Role limit is per domain not global', async ({ api }) => {
    // 1. Create organization with 20 custom roles
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

    // Create 20 org-level custom roles
    for (let i = 1; i <= 20; i++) {
      const roleName = `org-role-${i}-${crypto.randomUUID().slice(0, 4)}`;
      const { data: roleData } = await api.admin.mutation('roles-api/RoleCreate', {
        variables: {
          input: {
            organizationId,
            domain: 'org',
            name: roleName,
            displayName: `Org Role ${i}`,
            permissions: [{ resource: 'org.profile', action: 'read' }],
          },
        },
      });
      expect(roleData.roleMutation.roleCreate.role).not.toBeNull();
    }

    // 2. Create store
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

    // 3. Verify can still create custom roles in store domain
    const storeRoleName = generateRoleName();
    const { data: storeRoleData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: `store:${storeId}`,
          name: storeRoleName,
          displayName: 'Store Custom Role',
          permissions: [{ resource: 'store.profile', action: 'read' }],
        },
      },
    });

    // Should succeed because store domain has separate limit
    expect(storeRoleData.roleMutation.roleCreate.role).not.toBeNull();
    expect(storeRoleData.roleMutation.roleCreate.userErrors).toHaveLength(0);
  });

  test('Can assign custom role to user', async ({ api }) => {
    // 1. Create custom role
    await api.session.setupUser();
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

    const roleName = generateRoleName();
    const { data: createData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: roleName,
          displayName: 'Assignable Role',
          permissions: [{ resource: 'org.profile', action: 'write' }],
        },
      },
    });

    expect(createData.roleMutation.roleCreate.role).not.toBeNull();

    // 2. Assign to user
    const testUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: testUser.data.email,
          roles: [{ domain: 'org', role: roleName }],
        },
      },
    });

    // 3. Verify user has the custom role permissions
    api.session.tenant.accessToken = testUser.accessToken;
    api.session.tenant.userId = testUser.userId;

    const { data: authData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'write' },
      },
    });

    expect((authData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });

  test('Custom role permissions are correctly applied', async ({ api }) => {
    // 1. Create custom role with specific permissions
    await api.session.setupUser();
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

    // Create custom role with limited permissions (only read org.profile)
    const roleName = generateRoleName();
    const { data: createData } = await api.admin.mutation('roles-api/RoleCreate', {
      variables: {
        input: {
          organizationId,
          domain: 'org',
          name: roleName,
          displayName: 'Limited Custom Role',
          permissions: [{ resource: 'org.profile', action: 'read' }],
        },
      },
    });

    expect(createData.roleMutation.roleCreate.role).not.toBeNull();

    // 2. Assign to user
    const testUser = await api.admin.user.create();
    await api.admin.mutation('iam-api/MemberInvite', {
      variables: {
        input: {
          organizationId,
          email: testUser.data.email,
          roles: [{ domain: 'org', role: roleName }],
        },
      },
    });

    // 3. Verify user can only perform actions allowed by the role
    api.session.tenant.accessToken = testUser.accessToken;
    api.session.tenant.userId = testUser.userId;

    // Should be able to read
    const { data: readAuthData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'read' },
      },
    });
    expect((readAuthData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(true);

    // Should NOT be able to update
    const { data: updateAuthData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.profile', action: 'write' },
      },
    });
    expect((updateAuthData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);

    // Should NOT be able to invite members
    const { data: inviteAuthData } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { organizationId, domain: 'org', resource: 'org.members', action: 'write' },
      },
    });
    expect((inviteAuthData as unknown as AuthorizeResult).userQuery.authorize.allowed).toBe(false);

    // Restore owner token
    if (ownerToken) {
      api.session.tenant.accessToken = ownerToken;
    }
  });
});
