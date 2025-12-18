/* eslint-disable @typescript-eslint/no-empty-function */
import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import * as crypto from 'crypto';

test.describe('Authentication API', () => {
  test('Password sign up', async ({ api }) => {
    await api.session.setupClient();
    const userData = {
      email: `test-${crypto.randomUUID()}@example.com`,
      password: 'TestPassword123!',
    };

    const { data } = await api.client.auth.passwordSignUp(userData);
    expect(data?.passwordSignUp?.session?.user?.email).toBe(userData.email);
    expect(data?.passwordSignUp?.session?.accessToken).toBeDefined();
  });

  test('Password sign in with valid credentials', async ({ api }) => {
    await api.session.setupClientAndCustomer();
    const { data } = await api.client.auth.passwordSignIn({
      email: api.session.customer.data.email,
      password: api.session.customer.data.password,
    });
    expect(data?.passwordSignIn?.session?.user?.id).toBeDefined();
  });

  test('Password sign in with invalid email', async ({ api }) => {
    await api.session.setupClientAndCustomer();
    const { data } = await api.client.auth.passwordSignIn({
      email: 'invalid@example.com',
      password: api.session.customer.data.password,
    });
    expect(data?.passwordSignIn?.errors?.[0]?.message).toBeDefined();
  });

  test('Password sign in with invalid password', async ({ api }) => {
    await api.session.setupClientAndCustomer();
    const { data } = await api.client.auth.passwordSignIn({
      email: api.session.customer.data.email,
      password: 'invalidpassword',
    });
    expect(data?.passwordSignIn?.errors?.[0]?.message).toBeDefined();
  });

  test('Get current session', async ({ api }) => {
    await api.session.setupClientAndCustomer();
    await api.client.auth.passwordSignIn({
      email: api.session.customer.data.email,
      password: api.session.customer.data.password,
    });

    const { data } = await api.client.auth.getSession();
    expect(data?.session.user.email).toBe(api.session.customer.data.email);
  });

  test('Sign out', async ({ api }) => {
    await api.session.setupClientAndCustomer();
    const { data } = await api.client.auth.signOut();
    expect(data?.signOut).toBe(true);
  });

  test.skip('Update user profile', async () => {});

  test.skip('Password sign up with invalid email format', async () => {});

  test.skip('Password sign up with weak password', async () => {});

  test.skip('Password sign up with missing required fields', async () => {});
});
