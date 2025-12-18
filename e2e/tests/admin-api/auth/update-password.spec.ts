import { test } from '@fixtures/base.extend';
import { expect } from 'playwright/test';

test.describe.skip('UserUpdatePassword API', () => {
  test('UserUpdatePassword', async ({   api }) => {
    await api.session.setupUser();

    const NewPassword = 'NewPassword123';

    const updatePassword = await api.admin.mutation('admin/UserUpdatePassword', {
      variables: {
        input: {
          password: NewPassword,
        },
      },
    });
    expect(updatePassword.data.userMutation.updatePassword).toBe(true);

    // TODO: Sign in with new password

    await api.admin.mutation('admin/UserSignIn', {
      variables: {
        input: {
          email: api.session.user.data.email,
          password: NewPassword,
        },
      },
    });
  });
});
