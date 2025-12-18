import { test } from '@fixtures/base.extend';

test.describe('UserMe API', () => {
  test('UserMe', async ({   api }) => {
    await api.session.setupUser();

    const { data } = await api.admin.query('admin/UserMe', {});

  //  (data.userQuery.me);
  });
});
