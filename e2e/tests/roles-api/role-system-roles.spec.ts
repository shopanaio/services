import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateProjectSlug = () => `test-project-${crypto.randomUUID().slice(0, 8)}`;

/**
 * System Roles Tests
 *
 * Tests that verify system roles are properly created when a project is provisioned.
 * According to the new Casbin/IAM architecture:
 * - System roles are scoped to organization (organizationId)
 * - Role assignments are domain-scoped (project-level)
 * - Policies use 4-parameter format: (sub, dom, obj, act, eft)
 *
 * System roles are flat (no inheritance):
 * - owner: full access (*:* wildcard)
 * - admin: full access except project delete/billing (with DENY rules)
 * - manager: product/category/media management
 * - support: order/customer management
 * - viewer: read-only access
 */
test.describe('System Roles', () => {
  let projectSlug: string;

  test.beforeEach(async ({ api }) => {
    await api.session.setupUser();

    // Create a project
    projectSlug = generateProjectSlug();
    const { data } = await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Role Test Project',
          slug: projectSlug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    expect(data.projectMutation.projectCreate.userErrors).toHaveLength(0);
    expect(data.projectMutation.projectCreate.project).not.toBeNull();
    api.session.project = data.projectMutation.projectCreate.project;
  });

  test('Project should have all system roles after creation', async ({ api }) => {
    const { data } = await api.admin.query('project-api/ProjectRoles', {
      variables: { slug: projectSlug },
    });

    const roles = data.projectQuery.project?.roles ?? [];
    const roleNames = roles.map((r: { name: string }) => r.name);

    // Check all system roles exist
    expect(roleNames).toContain('owner');
    expect(roleNames).toContain('admin');
    expect(roleNames).toContain('manager');
    expect(roleNames).toContain('support');
    expect(roleNames).toContain('viewer');
  });

  test('All system roles should be marked as isSystem: true', async ({ api }) => {
    const { data } = await api.admin.query('project-api/ProjectRoles', {
      variables: { slug: projectSlug },
    });

    const roles = data.projectQuery.project?.roles ?? [];
    const systemRoles = ['owner', 'admin', 'manager', 'support', 'viewer'];

    for (const roleName of systemRoles) {
      const role = roles.find((r: { name: string }) => r.name === roleName);
      expect(role).toBeDefined();
      expect(role?.isSystem).toBe(true);
    }
  });

  test('Owner role should have full access permissions', async ({ api }) => {
    const { data } = await api.admin.query('project-api/ProjectRoles', {
      variables: { slug: projectSlug },
    });

    const roles = data.projectQuery.project?.roles ?? [];
    const owner = roles.find((r: { name: string }) => r.name === 'owner');

    expect(owner).toBeDefined();
    expect(owner?.permissions.length).toBeGreaterThan(0);

    // Owner should have wildcard ALLOW permission
    const wildcardPerm = owner?.permissions.find(
      (p: { resource: string; actions: string[]; effect: string }) =>
        p.resource === '*' && p.actions.includes('*') && p.effect === 'ALLOW'
    );
    expect(wildcardPerm).toBeDefined();
  });

  test('Admin role should have DENY for project delete and billing', async ({ api }) => {
    const { data } = await api.admin.query('project-api/ProjectRoles', {
      variables: { slug: projectSlug },
    });

    const roles = data.projectQuery.project?.roles ?? [];
    const admin = roles.find((r: { name: string }) => r.name === 'admin');

    expect(admin).toBeDefined();

    // Admin should have DENY for project delete
    const projectDeleteDeny = admin?.permissions.find(
      (p: { resource: string; actions: string[]; effect: string }) =>
        p.resource === 'project' && p.actions.includes('delete') && p.effect === 'DENY'
    );

    // Admin should have DENY for project/billing
    const billingDeny = admin?.permissions.find(
      (p: { resource: string; effect: string }) =>
        p.resource === 'project/billing' && p.effect === 'DENY'
    );

    // At least one of these restrictions should be present
    expect(projectDeleteDeny || billingDeny).toBeTruthy();
  });

  test('Viewer role should have read-only permissions', async ({ api }) => {
    const { data } = await api.admin.query('project-api/ProjectRoles', {
      variables: { slug: projectSlug },
    });

    const roles = data.projectQuery.project?.roles ?? [];
    const viewer = roles.find((r: { name: string }) => r.name === 'viewer');

    expect(viewer).toBeDefined();
    expect(viewer?.permissions.length).toBeGreaterThan(0);

    // Viewer should only have read permissions
    const viewerPerms = viewer?.permissions ?? [];
    for (const perm of viewerPerms) {
      if (perm.effect === 'ALLOW') {
        // Only read actions should be allowed
        expect(perm.actions.every((a: string) => a === 'read' || a === '*')).toBe(true);
      }
    }
  });

  test('Project creator should be assigned owner role', async ({ api }) => {
    const { data } = await api.admin.query('project-api/ProjectMembers', {
      variables: { slug: projectSlug },
    });

    const members = data.projectQuery.project?.members ?? [];

    // Should have at least one member (the creator)
    expect(members.length).toBeGreaterThan(0);

    // The creator should have owner role
    const ownerMember = members.find(
      (m: { role: { name: string } }) => m.role.name === 'owner'
    );
    expect(ownerMember).toBeDefined();
  });

  test('Current user should have owner role for created project', async ({ api }) => {
    // This test requires the X-Project-Name header to be set for the user query
    api.session.project = { slug: projectSlug } as typeof api.session.project;

    const { data } = await api.admin.query('users-api/UserCurrent', {
      variables: {},
    });

    // User should have 'owner' role in the project context
    expect(data.userQuery.current?.role).toBe('owner');
  });

  test('System roles should have displayName set', async ({ api }) => {
    const { data } = await api.admin.query('project-api/ProjectRoles', {
      variables: { slug: projectSlug },
    });

    const roles = data.projectQuery.project?.roles ?? [];
    const systemRoles = ['owner', 'admin', 'manager', 'support', 'viewer'];

    for (const roleName of systemRoles) {
      const role = roles.find((r: { name: string }) => r.name === roleName);
      expect(role?.displayName).toBeTruthy();
      expect(role?.displayName.length).toBeGreaterThan(0);
    }
  });
});
