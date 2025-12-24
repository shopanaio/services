import { test as base } from '@fixtures/base.extend';

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
  test('User cannot access projects of another user via project query (cross-organization)', async ({}) => {});

  test('User cannot see other users projects in projects list (organization isolation)', async ({}) => {});

  test('User can access their own project within their organization', async ({}) => {});

  test('Projects within same organization are isolated by domain (project scope)', async ({}) => {});
});
