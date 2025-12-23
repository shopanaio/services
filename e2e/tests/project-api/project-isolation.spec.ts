import { test as base } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

const generateProjectSlug = () => `test-project-${crypto.randomUUID().slice(0, 8)}`;

interface UserSession {
  email: string;
  password: string;
  accessToken: string;
}

const test = base.extend<{
  userA: UserSession;
  userB: UserSession;
}>({
  userA: async ({ api }, use) => {
    // Setup first user (creates new organization)
    const result = await api.session.setupUser();
    await use({
      email: api.session.tenant.data.email,
      password: api.session.tenant.data.password,
      accessToken: result.token.accessToken,
    });
  },
  userB: async ({ api }, use) => {
    // Create second user with new credentials (creates new organization)
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
    });
  },
});

test.describe('Project Isolation', () => {
  test('User cannot access projects of another user via project query (cross-organization)', async ({ api, userA, userB }) => {
    const slugA = generateProjectSlug();
    const slugB = generateProjectSlug();

    // User A creates a project in their organization
    api.session.tenant.accessToken = userA.accessToken;
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

    // User B creates a project in their organization
    api.session.tenant.accessToken = userB.accessToken;
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

    // User B tries to access User A's project - should fail
    // Set project slug to User A's project while authenticated as User B
    api.session.project = { slug: slugA, id: '', name: 'Project A' };

    const { errors } = await api.admin.query('project-api/Project', {
      throwOnError: false,
      variables: {
        slug: slugA,
      },
    });

    // User B should NOT be able to see User A's project (cross-organization isolation)
    expect(errors).toBeDefined();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].extensions?.code).toBe('FORBIDDEN');
  });

  test('User cannot see other users projects in projects list (organization isolation)', async ({ api, userA, userB }) => {
    const slugA = generateProjectSlug();
    const slugB = generateProjectSlug();

    // User A creates a project in their organization
    api.session.tenant.accessToken = userA.accessToken;
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

    // User B creates a project in their organization
    api.session.tenant.accessToken = userB.accessToken;
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

    // User B gets list of projects - should only see their own (organization-scoped)
    const { data: projectsData } = await api.admin.query('project-api/Projects', {
      variables: {},
    });

    const projects = projectsData.projectQuery.projects;
    const projectSlugs = projects.map((p: { slug: string }) => p.slug);

    // User B should see their own project
    expect(projectSlugs).toContain(slugB);

    // User B should NOT see User A's project (different organization)
    expect(projectSlugs).not.toContain(slugA);
  });

  test('User can access their own project within their organization', async ({ api, userA }) => {
    const slug = generateProjectSlug();

    // User A creates a project in their organization
    api.session.tenant.accessToken = userA.accessToken;
    await api.admin.mutation('project-api/ProjectCreate', {
      variables: {
        input: {
          name: 'My Project',
          slug,
          locales: ['en'],
          currencies: ['USD'],
          defaultCurrency: 'USD',
        },
      },
    });

    // Set project slug for subsequent queries
    api.session.project = { slug, id: '', name: 'My Project' };

    // User A should be able to access their own project
    const { data: projectData } = await api.admin.query('project-api/Project', {
      variables: {
        slug,
      },
    });

    expect(projectData.projectQuery.project).not.toBeNull();
    expect(projectData.projectQuery.project?.slug).toBe(slug);
    expect(projectData.projectQuery.project?.name).toBe('My Project');
    expect(projectData.projectQuery.project?.organizationId).toBeTruthy();
  });

  test('Projects within same organization are isolated by domain (project scope)', async ({ api, userA }) => {
    const slugA = generateProjectSlug();
    const slugB = generateProjectSlug();

    // User A creates two projects in their organization
    api.session.tenant.accessToken = userA.accessToken;

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

    // Create a second user and add them only to Project A
    const secondUser = await api.admin.user.create();

    // Set project context to Project A to add member
    api.session.project = { slug: slugA, id: '', name: 'Project A' };
    await api.admin.mutation('roles-api/ProjectMemberRoleChange', {
      variables: {
        input: {
          userId: secondUser.userId,
          newRole: 'viewer',
        },
      },
    });

    // Switch to second user
    api.session.tenant.accessToken = secondUser.accessToken;

    // Second user should be able to access Project A
    api.session.project = { slug: slugA, id: '', name: 'Project A' };
    const { data: projectAData } = await api.admin.query('project-api/Project', {
      throwOnError: false,
      variables: { slug: slugA },
    });
    expect(projectAData.projectQuery.project).not.toBeNull();

    // Second user should NOT be able to access Project B (no domain membership)
    api.session.project = { slug: slugB, id: '', name: 'Project B' };
    const { errors: projectBErrors } = await api.admin.query('project-api/Project', {
      throwOnError: false,
      variables: { slug: slugB },
    });
    expect(projectBErrors).toBeDefined();
    expect(projectBErrors.length).toBeGreaterThan(0);
    expect(projectBErrors[0].extensions?.code).toBe('FORBIDDEN');
  });
});
