import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import type { ApiUserMutationSignUpArgs } from '@codegen/admin-gql';
import type { UserData } from '@utils/user';
import { generateUser, Locale, Timezone } from '@utils/user';

import * as Yup from 'yup';

test.describe('SignUp API', () => {
  test('Successful registration', async ({ api }) => {
    await api.session.setupUser();
    expect(api.session.user.data).toMatchSchema(
      Yup.object<UserData>().shape({
        email: Yup.string().email().required(),
        firstName: Yup.string().required(),
        lastName: Yup.string().required(),
      }),
    );
  });

  test('Registration with incorrect email', async ({ api }) => {
    const { errors } = await api.admin.mutation<ApiUserMutationSignUpArgs>('admin/UserSignIn', {
      throwOnError: false,
      variables: {
        input: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'invalid-email',
          password: 'SecurePassword123!',
          language: Locale.EN,
          timezone: Timezone.EUROPE_KIEV,
        },
      },
    });

    expect(errors).toBeTruthy();
  });

  test('Registration with a password that does not meet the requirements', async ({ api }) => {
    const { errors } = await api.admin.mutation<ApiUserMutationSignUpArgs>('admin/UserSignIn', {
      throwOnError: false,
      variables: {
        input: {
          firstName: 'John',
          lastName: 'Doe',
          email: generateUser().email,
          password: '123',
          language: Locale.EN,
          timezone: Timezone.EUROPE_KIEV,
        },
      },
    });

    expect(errors).toBeTruthy();
  });

  test('Registration with already registered email', async ({ api }) => {
    await api.session.setupUser();

    const { errors } = await api.admin.mutation<ApiUserMutationSignUpArgs>('admin/UserSignIn', {
      throwOnError: false,
      variables: {
        input: {
          firstName: 'John',
          lastName: 'Doe',
          email: api.session.user.data.email,
          password: 'SecurePassword123!',
          language: Locale.EN,
          timezone: Timezone.EUROPE_KIEV,
        },
      },
    });

    expect(errors).toBeTruthy();
  });

  test('Registration without mandatory email', async ({ api }) => {
    const { errors } = await api.admin.mutation<ApiUserMutationSignUpArgs>('admin/UserSignIn', {
      throwOnError: false,
      variables: {
        input: {
          firstName: 'John',
          lastName: 'Doe',
          email: '',
          password: 'SecurePassword123!',
          language: Locale.EN,
          timezone: Timezone.EUROPE_KIEV,
        },
      },
    });

    expect(errors).toBeTruthy();
  });

  test('Registration without a required password', async ({ api }) => {
    const { errors } = await api.admin.mutation<ApiUserMutationSignUpArgs>('admin/UserSignIn', {
      throwOnError: false,
      variables: {
        input: {
          firstName: 'John',
          lastName: 'Doe',
          email: generateUser().email,
          password: '',
          language: Locale.EN,
          timezone: Timezone.EUROPE_KIEV,
        },
      },
    });

    expect(errors).toBeTruthy();
  });
});
