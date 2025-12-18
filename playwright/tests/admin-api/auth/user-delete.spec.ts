import { expect } from '@playwright/test';
import { test } from '@fixtures/base.extend';

test.describe('UserDelete API', () => {
  test.skip('UserDelete', async ({   api }) => {
    await api.session.setupUser();

    const userDelete = await api.admin.mutation('admin/UserDelete', {});

    expect(userDelete.data.userMutation.delete).toBe(true);
    // TODO: Check that account doesn't exist

    const { errors } = await api.admin.mutation('admin/UserSignIn', {
      variables: {
        input: {
          email: api.session.user.data.email,
          password: api.session.user.data.password,
        },
      },
    });
    expect(errors).toBeTruthy();
    expect(errors[0].message).toContain('Internal error');
    expect(errors[0].message).toContain('failed to login with oauth provider');
  });
});
