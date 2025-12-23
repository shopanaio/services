import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { generateUser } from '@utils/user';

test.describe('SignUp API', () => {
  test('Successful registration', async ({ api }) => {
    const user = generateUser();

    const { data } = await api.admin.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: user.email,
          password: user.password,
        },
      },
    });

    const result = data.userMutation.signUp;

    expect(result.userErrors).toHaveLength(0);
    expect(result.user?.email).toBe(user.email);
    expect(result.token?.accessToken).toBeTruthy();
    expect(result.token?.refreshToken).toBeTruthy();
    expect(result.token?.expiresIn).toBeGreaterThan(0);
  });

  test('Registration with invalid email format', async ({ api }) => {
    const { data } = await api.admin.mutation('users-api/SignUp', {
      throwOnError: false,
      variables: {
        input: {
          email: 'invalid-email',
          password: 'StrongPassword123',
        },
      },
    });

    const result = data.userMutation.signUp;

    expect(result.user).toBeNull();
    expect(result.token).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Registration with already registered email', async ({ api }) => {
    const user = generateUser();

    // First registration
    await api.admin.mutation('users-api/SignUp', {
      variables: {
        input: {
          email: user.email,
          password: user.password,
        },
      },
    });

    // Second registration with same email
    const { data } = await api.admin.mutation('users-api/SignUp', {
      throwOnError: false,
      variables: {
        input: {
          email: user.email,
          password: user.password,
        },
      },
    });

    const result = data.userMutation.signUp;

    expect(result.user).toBeNull();
    expect(result.token).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
    expect(result.userErrors[0].code).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('Registration without email', async ({ api }) => {
    const { data } = await api.admin.mutation('users-api/SignUp', {
      throwOnError: false,
      variables: {
        input: {
          email: '',
          password: 'StrongPassword123',
        },
      },
    });

    const result = data.userMutation.signUp;

    expect(result.user).toBeNull();
    expect(result.token).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });

  test('Registration without password', async ({ api }) => {
    const user = generateUser();

    const { data } = await api.admin.mutation('users-api/SignUp', {
      throwOnError: false,
      variables: {
        input: {
          email: user.email,
          password: '',
        },
      },
    });

    const result = data.userMutation.signUp;

    expect(result.user).toBeNull();
    expect(result.token).toBeNull();
    expect(result.userErrors.length).toBeGreaterThan(0);
  });
});
