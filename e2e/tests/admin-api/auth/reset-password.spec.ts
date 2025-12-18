import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';

test.describe.skip('UserResetPassword API', () => {
  test('UserResetPassword', async ({ api }) => {
    await api.session.setupUser();

    const updatePassword = await api.admin.mutation('admin/UserUpdatePassword', {
      variables: {
        input: {
          password: api.session.user.data.password,
        },
      },
    });

    expect(updatePassword.data.userMutation.updatePassword).toBe(true);
  });
});
