import { expect } from '@playwright/test';
import type { ApiUserMutationSignInArgs } from '@codegen/admin-gql';
import { test } from '@fixtures/base.extend';

const data = {
  invalidEmail: {
    email: 'wrong@example.com',
    password: 'yourpassword',
  },
  invalidPassword: {
    email: 'admin@shopana.io',
    password: 'wrongpassword',
  },
  nonexistentUser: {
    email: 'nonexistent@example.com',
    password: 'somepassword',
  },
  missingEmail: {
    email: '',
    password: 'yourpassword',
  },
  missingPassword: {
    email: 'test@example.com',
    password: '',
  },
};

test.describe('SignIn API', () => {
  test('Successful sign-in after registration', async ({ api }) => {
    await api.session.setupUser();

    const { data } = await api.admin.mutation<ApiUserMutationSignInArgs>('admin/UserSignIn', {
      variables: {
        input: {
          email: api.session.user.data.email,
          password: api.session.user.data.password,
        },
      },
    });

    // TODO: yup
    expect(data.userMutation.signIn.user).toBeTruthy();
    expect(data.userMutation.signIn.jwt).toBeTruthy();
  });

  test('Sign-in with invalid email', async ({   api }) => {
    await api.session.setupUser();

    const { errors } = await api.admin.mutation<ApiUserMutationSignInArgs>('admin/UserSignIn', {
      throwOnError: false,
      variables: {
        input: {
          email: data.invalidEmail.email,
          password: api.session.user.data.password,
        },
      },
    });
    expect(errors).toBeTruthy();
    expect(errors[0].message).toContain('Internal error');
    expect(errors[0].message).toContain('failed to login with oauth provider');
    // 'Entry not found'
  });

  test('Sign-in with incorrect password', async ({   api }) => {
    await api.session.setupUser();

    const { errors } = await api.admin.mutation<ApiUserMutationSignInArgs>('admin/UserSignIn', {
      throwOnError: false,
      variables: {
        input: {
          email: api.session.user.data.email,
          password: data.invalidPassword.password,
        },
      },
    });
    expect(errors).toBeTruthy();
    expect(errors[0].message).toContain('Internal error');
    expect(errors[0].message).toContain('failed to login with oauth provider');
    // 'Access denied
  });

  test('Sign-in with non-existent email', async ({ api }) => {
    await api.session.setupUser();

    const { errors } = await api.admin.mutation<ApiUserMutationSignInArgs>('admin/UserSignIn', {
      throwOnError: false,
      variables: {
        input: {
          email: data.nonexistentUser.email,
          password: data.nonexistentUser.password,
        },
      },
    });
    expect(errors).toBeTruthy();
    expect(errors[0].message).toContain('Internal error');
    expect(errors[0].message).toContain('failed to login with oauth provider');
  });

  test('Sign-in with missing email', async ({ api }) => {
    await api.session.setupUser();

    const { errors } = await api.admin.mutation<ApiUserMutationSignInArgs>('admin/UserSignIn', {
      throwOnError: false,
      variables: {
        // @ts-expect-error Missing email
        input: {
          password: data.invalidPassword.password,
        },
      },
    });
    expect(errors).toBeTruthy();
    expect(errors[0].message).toContain('must be defined');
  });

  test('Sign-in with missing password', async ({ api }) => {
    await api.session.setupUser();

    const { errors } = await api.admin.mutation<ApiUserMutationSignInArgs>('admin/UserSignIn', {
      throwOnError: false,
      variables: {
        // @ts-expect-error Missing password
        input: {
          email: api.session.user.data.email,
        },
      },
    });
    expect(errors).toBeTruthy();
  });
});
