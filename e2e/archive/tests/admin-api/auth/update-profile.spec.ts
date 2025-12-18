import { test } from '@fixtures/base.extend';
import { Locale, Timezone } from '@utils/user';
import { expect } from 'playwright/test';
import * as Yup from 'yup';

test.describe('UserUpdateProfile API', () => {
  test('UserUpdateProfile', async ({   api }) => {
    await api.session.setupUser();

    const input = {
      firstName: 'SuperName',
      lastName: 'SuperLastName',
      language: Locale.RU,
      timezone: Timezone.EUROPE_KIEV,
    };

    const updateProfile = await api.admin.mutation('admin/UserUpdateProfile', {
      variables: { input },
    });

    expect(updateProfile.data.userMutation.updateProfile).toBe(true);

    const me = await api.admin.query('admin/UserMe', {});

    expect(me.data.userQuery.me).toMatchSchema(
      Yup.object({
        firstName: Yup.string().equals([input.firstName]).required(),
        lastName: Yup.string().equals([input.lastName]).required(),
        language: Yup.string().equals([input.language]).required(),
        timezone: Yup.string().equals([input.timezone]).required(),
      }),
    );
  });
});
