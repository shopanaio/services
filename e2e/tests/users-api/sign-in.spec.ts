import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe('SignIn API', () => {
  test('Successful sign in with registered user', async ({ api }) => {
    // First create a user via setupUser
    await api.session.setupUser();
    const { email, password } = api.session.tenant.data;

    const { data } = await api.admin.mutation('users-api/SignIn', {
      variables: {
        input: {
          email,
          password,
        },
      },
    });

    const result = data.userMutation.signIn;

    expect(result.userErrors).toHaveLength(0);
    expect(result.user).not.toBeNull();
    expect(result.user?.email).toBe(email);
    expect(result.token).not.toBeNull();
    expect(result.token?.accessToken).toBeTruthy();
    expect(result.token?.refreshToken).toBeTruthy();
    expect(result.token?.expiresIn).toBeGreaterThan(0);
  });

  test('Sign in with wrong password', async ({ api }) => {
    await api.session.setupUser();
    const { email } = api.session.tenant.data;

    const { data } = await api.admin.mutation('users-api/SignIn', {
      throwOnError: false,
      variables: {
        input: {
          email,
          password: 'WrongPassword123',
        },
      },
    });

    const result = data.userMutation.signIn;

    expect(result.user).toBeNull();
    expect(result.token).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Sign in with non-existent email', async ({ api }) => {
    const { data } = await api.admin.mutation('users-api/SignIn', {
      throwOnError: false,
      variables: {
        input: {
          email: 'nonexistent@example.com',
          password: 'SomePassword123',
        },
      },
    });

    const result = data.userMutation.signIn;

    expect(result.user).toBeNull();
    expect(result.token).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Sign in with invalid email format', async ({ api }) => {
    const { data } = await api.admin.mutation('users-api/SignIn', {
      throwOnError: false,
      variables: {
        input: {
          email: 'invalid-email',
          password: 'SomePassword123',
        },
      },
    });

    const result = data.userMutation.signIn;

    expect(result.user).toBeNull();
    expect(result.token).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Sign in without password', async ({ api }) => {
    await api.session.setupUser();
    const { email } = api.session.tenant.data;

    const { data } = await api.admin.mutation('users-api/SignIn', {
      throwOnError: false,
      variables: {
        input: {
          email,
          password: '',
        },
      },
    });

    const result = data.userMutation.signIn;

    expect(result.user).toBeNull();
    expect(result.token).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});
