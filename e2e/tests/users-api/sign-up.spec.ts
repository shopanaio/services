import { test } from '@fixtures/base.extend';
import { expect } from '@playwright/test';
import { UserData } from '@utils/user';

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
});
