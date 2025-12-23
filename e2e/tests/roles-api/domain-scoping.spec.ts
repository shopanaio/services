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
  ownerUser: UserSession;
}>({
  ownerUser: async ({ api }, use) => {
    const result = await api.session.setupUser();
    await use({
      email: api.session.tenant.data.email,
      password: api.session.tenant.data.password,
      accessToken: result.token?.accessToken ?? '',
      userId: result.user?.id ?? '',
      organizationId: result.organizationId ?? '',
    });
  },
});

/**
 * Domain Scoping Tests
 *
 * Tests for the domain-scoped permission model.
 * According to the new Casbin/IAM architecture:
 * - Domain parameter: [["project", projectId]] for project-scoped permissions
 * - Domain wildcard "*" grants access to all domains
 * - Specific domain restricts access to that domain only
 * - keyMatch is used for domain pattern matching
 * - User can have multiple domain memberships with different roles
 */
test.describe('Domain Scoping', () => {
  test('Domain wildcard (*) grants access to all projects', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    api.session.organizationId = ownerUser.organizationId;

    // Create two projects
    const slugA = generateProjectSlug();
    const slugB = generateProjectSlug();

    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Project A',
          slug: slugA,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Project B',
          slug: slugB,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Owner should have access to both projects (wildcard domain)
    api.session.project = { slug: slugA, id: '', name: 'Project A' };
    const { data: authA } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'update' },
      },
    });
    expect(authA.authorize.allowed).toBe(true);

    api.session.project = { slug: slugB, id: '', name: 'Project B' };
    const { data: authB } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'update' },
      },
    });
    expect(authB.authorize.allowed).toBe(true);
  });

  test('Specific domain restricts access to that project only', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    api.session.organizationId = ownerUser.organizationId;

    // Create two projects
    const slugA = generateProjectSlug();
    const slugB = generateProjectSlug();

    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Project A',
          slug: slugA,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Project B',
          slug: slugB,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Create a user and add them only to Project A
    const testUser = await api.admin.user.create();

    api.session.project = { slug: slugA, id: '', name: 'Project A' };
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: testUser.userId,
          newRole: 'admin',
        },
      },
    });

    // Switch to test user
    api.session.tenant.accessToken = testUser.accessToken;

    // Test user should have access to Project A
    api.session.project = { slug: slugA, id: '', name: 'Project A' };
    const { data: authA } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'update' },
      },
    });
    expect(authA.authorize.allowed).toBe(true);

    // Test user should NOT have access to Project B (no domain membership)
    api.session.project = { slug: slugB, id: '', name: 'Project B' };
    const { data: authB } = await api.admin.query('roles-api/Authorize', {
      throwOnError: false,
      variables: {
        input: { resource: 'project', action: 'update' },
      },
    });
    expect(authB.authorize.allowed).toBe(false);
  });

  test('User can have different roles in different domains', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    api.session.organizationId = ownerUser.organizationId;

    // Create two projects
    const slugA = generateProjectSlug();
    const slugB = generateProjectSlug();

    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Project A',
          slug: slugA,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'Project B',
          slug: slugB,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Create a user with admin role in A and viewer role in B
    const testUser = await api.admin.user.create();

    api.session.project = { slug: slugA, id: '', name: 'Project A' };
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: testUser.userId,
          newRole: 'admin',
        },
      },
    });

    api.session.project = { slug: slugB, id: '', name: 'Project B' };
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: testUser.userId,
          newRole: 'viewer',
        },
      },
    });

    // Switch to test user
    api.session.tenant.accessToken = testUser.accessToken;

    // In Project A (admin role) - can update
    api.session.project = { slug: slugA, id: '', name: 'Project A' };
    const { data: authAUpdate } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'update' },
      },
    });
    expect(authAUpdate.authorize.allowed).toBe(true);

    // In Project B (viewer role) - can only read, not update
    api.session.project = { slug: slugB, id: '', name: 'Project B' };
    const { data: authBRead } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'product', action: 'read' },
      },
    });
    expect(authBRead.authorize.allowed).toBe(true);

    const { data: authBUpdate } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'product', action: 'update' },
      },
    });
    expect(authBUpdate.authorize.allowed).toBe(false);
  });

  test('Multiple domains per user accumulate correctly', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    api.session.organizationId = ownerUser.organizationId;

    // Create multiple projects
    const projects = await Promise.all(
      [1, 2, 3].map(async (i) => {
        const slug = generateProjectSlug();
        await api.admin.mutation('project-api/ProjectCreate', {
          variables: {
            input: {
              name: `Project ${i}`,
              slug,
              locales: ['en'],
              currencies: ['USD'],
              defaultCurrency: 'USD',
            },
          },
        });
        return slug;
      })
    );

    // Create a user and add to all projects with viewer role
    const testUser = await api.admin.user.create();

    for (const slug of projects) {
      api.session.project = { slug, id: '', name: `Project` };
      await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
        variables: {
          input: {
            userId: testUser.userId,
            newRole: 'viewer',
          },
        },
      });
    }

    // Switch to test user
    api.session.tenant.accessToken = testUser.accessToken;

    // User should have read access in all projects
    for (const slug of projects) {
      api.session.project = { slug, id: '', name: 'Project' };
      const { data: auth } = await api.admin.query('roles-api/Authorize', {
        variables: {
          input: { resource: 'product', action: 'read' },
        },
      });
      expect(auth.authorize.allowed).toBe(true);
    }
  });
});

test.describe('Domain-Scoped vs Org-Wide Roles', () => {
  test('Organization-wide roles apply across all domains', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    api.session.organizationId = ownerUser.organizationId;

    // Create a project
    await api.session.setupProject();

    // Owner has org-wide wildcard access - should work in any project context
    const { data: auth } = await api.admin.query('roles-api/Authorize', {
      variables: {
        input: { resource: 'project', action: 'delete' },
      },
    });
    expect(auth.authorize.allowed).toBe(true);
  });

  test('Domain-scoped role assignments use grouping rules', async ({ api, ownerUser }) => {
    api.session.tenant.accessToken = ownerUser.accessToken;
    api.session.organizationId = ownerUser.organizationId;

    await api.session.setupProject();

    // Check project members - should show domain-scoped role assignment
    const { data } = await api.admin.query('project-api/ProjectMembers', {
      variables: { slug: api.session.projectSlug },
    });

    const members = data.projectQuery.project?.members ?? [];
    expect(members.length).toBeGreaterThan(0);

    // Owner member should exist with owner role in this domain
    const owner = members.find((m: { role: { name: string } }) => m.role.name === 'owner');
    expect(owner).toBeDefined();
  });
});
