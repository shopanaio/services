import { test } from '@fixtures/base.extend';
import { Currency, Country, Locale, Timezone } from '@utils/user';

import { expect } from 'playwright/test';
import * as Yup from 'yup';

test.describe('ProjectCreate', () => {
  test('Create project', async ({   api }) => {
    await test.step('Create user', async () => {
      await api.session.setupUser();
    });

    await test.step('Create project and check', async () => {
      const input = {
        name: 'Session Store',
        currency: Currency.EUR,
        country: Country.UA,
        status: 'ACTIVE',
        timezone: Timezone.EUROPE_KIEV,
        locales: [Locale.EN],
      };

      const { data } = await api.admin.mutation('admin/ProjectCreate', {
        variables: { input },
      });

      api.admin.projects.assertProject(data.projectMutation.create);

      expect(data.projectMutation.create).toMatchSchema(
        Yup.object({
          id: Yup.string().required(),
          name: Yup.string().equals([input.name]).required(),
          status: Yup.string().equals([input.status]).required(),
        }),
      );
    });
  });
});
