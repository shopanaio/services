import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

/**
 * System Roles - Organization Level Tests
 *
 * Verifies that system roles (owner, admin, member) are properly
 * created and configured at the organization level after signup.
 *
 * Flow:
 * 1. User signs up -> creates user
 * 2. User creates store -> provisions IAM tenant with system roles
 * 3. Query store.membership.roles to verify system roles
 */
test.describe('System Roles - Organization Level', () => {
  test.beforeEach(async ({ api }) => {
    // Setup: Create user and store (store creation triggers IAM tenant provisioning)
    await api.session.setupUser();
    await api.session.setupProject();
  });

  test('Organization should have system roles (owner, admin, member) after user signup', async ({ api }) => {
    const { data } = await api.admin.query('iam-api/OrganizationRoles', {});

    const roles = data.storeQuery.currentStore?.membership?.roles ?? [];
    const roleNames = roles.map((r: { name: string }) => r.name);

    expect(roleNames).toContain('owner');
    expect(roleNames).toContain('admin');
    expect(roleNames).toContain('member');
  });

  test('All system roles should be marked as isSystem: true', async ({ api }) => {
    const { data } = await api.admin.query('iam-api/OrganizationRoles', {});

    const roles = data.storeQuery.currentStore?.membership?.roles ?? [];
    const systemRoles = roles.filter((r: { name: string }) =>
      ['owner', 'admin', 'member'].includes(r.name)
    );

    expect(systemRoles.length).toBe(3);
    for (const role of systemRoles) {
      expect(role.isSystem).toBe(true);
    }
  });

  test('System roles should have domain matching org scope', async ({ api }) => {
    const { data } = await api.admin.query('iam-api/OrganizationRoles', {});

    const roles = data.storeQuery.currentStore?.membership?.roles ?? [];
    const systemRoles = roles.filter((r: { name: string }) =>
      ['owner', 'admin', 'member'].includes(r.name)
    );

    // System roles should have org-level domain
    for (const role of systemRoles) {
      expect(role.domain).toMatch(/^org:/);
    }
  });

  test('Owner role should have full wildcard permissions (*:*)', async ({ api }) => {
    const { data } = await api.admin.query('iam-api/OrganizationRoles', {});

    const roles = data.storeQuery.currentStore?.membership?.roles ?? [];
    const ownerRole = roles.find((r: { name: string }) => r.name === 'owner');

    expect(ownerRole).toBeDefined();
    expect(ownerRole.permissions).toBeDefined();
    expect(ownerRole.permissions.length).toBeGreaterThan(0);

    // Owner should have wildcard permission
    const wildcardPermission = ownerRole.permissions.find(
      (p: { resource: string; actions: string[] }) =>
        p.resource === '*' && p.actions.includes('*')
    );
    expect(wildcardPermission).toBeDefined();
    expect(wildcardPermission.effect).toBe('ALLOW');
  });

  test('Admin role should have DENY for organization delete', async ({ api }) => {
    const { data } = await api.admin.query('iam-api/OrganizationRoles', {});

    const roles = data.storeQuery.currentStore?.membership?.roles ?? [];
    const adminRole = roles.find((r: { name: string }) => r.name === 'admin');

    expect(adminRole).toBeDefined();
    expect(adminRole.permissions).toBeDefined();

    // Admin should have DENY for organization:delete
    const denyOrgDelete = adminRole.permissions.find(
      (p: { resource: string; actions: string[]; effect: string }) =>
        p.resource === 'organization' && p.actions.includes('delete') && p.effect === 'DENY'
    );
    expect(denyOrgDelete).toBeDefined();
  });

  test('Admin role should have DENY for billing management', async ({ api }) => {
    const { data } = await api.admin.query('iam-api/OrganizationRoles', {});

    const roles = data.storeQuery.currentStore?.membership?.roles ?? [];
    const adminRole = roles.find((r: { name: string }) => r.name === 'admin');

    expect(adminRole).toBeDefined();
    expect(adminRole.permissions).toBeDefined();

    // Admin should have DENY for organization/billing:*
    const denyBilling = adminRole.permissions.find(
      (p: { resource: string; effect: string }) =>
        p.resource === 'organization/billing' && p.effect === 'DENY'
    );
    expect(denyBilling).toBeDefined();
  });

  test('Member role should have read-only permissions for organization', async ({ api }) => {
    const { data } = await api.admin.query('iam-api/OrganizationRoles', {});

    const roles = data.storeQuery.currentStore?.membership?.roles ?? [];
    const memberRole = roles.find((r: { name: string }) => r.name === 'member');

    expect(memberRole).toBeDefined();
    expect(memberRole.permissions).toBeDefined();

    // Member should only have read permission for organization
    const orgReadPermission = memberRole.permissions.find(
      (p: { resource: string; actions: string[] }) =>
        p.resource === 'organization' && p.actions.includes('read')
    );
    expect(orgReadPermission).toBeDefined();
    expect(orgReadPermission.effect).toBe('ALLOW');

    // Member should NOT have wildcard permissions
    const wildcardPermission = memberRole.permissions.find(
      (p: { resource: string; actions: string[] }) =>
        p.resource === '*' && p.actions.includes('*')
    );
    expect(wildcardPermission).toBeUndefined();
  });

  test('System roles should have displayName set', async ({ api }) => {
    const { data } = await api.admin.query('iam-api/OrganizationRoles', {});

    const roles = data.storeQuery.currentStore?.membership?.roles ?? [];
    const systemRoles = roles.filter((r: { name: string }) =>
      ['owner', 'admin', 'member'].includes(r.name)
    );

    for (const role of systemRoles) {
      expect(role.displayName).toBeTruthy();
      expect(typeof role.displayName).toBe('string');
      expect(role.displayName.length).toBeGreaterThan(0);
    }

    // Check specific display names
    const ownerRole = systemRoles.find((r: { name: string }) => r.name === 'owner');
    const adminRole = systemRoles.find((r: { name: string }) => r.name === 'admin');
    const memberRole = systemRoles.find((r: { name: string }) => r.name === 'member');

    expect(ownerRole?.displayName).toBe('Owner');
    expect(adminRole?.displayName).toBe('Administrator');
    expect(memberRole?.displayName).toBe('Member');
  });

  test('System roles should have description set', async ({ api }) => {
    const { data } = await api.admin.query('iam-api/OrganizationRoles', {});

    const roles = data.storeQuery.currentStore?.membership?.roles ?? [];
    const systemRoles = roles.filter((r: { name: string }) =>
      ['owner', 'admin', 'member'].includes(r.name)
    );

    for (const role of systemRoles) {
      expect(role.description).toBeTruthy();
      expect(typeof role.description).toBe('string');
      expect(role.description.length).toBeGreaterThan(0);
    }
  });
});
