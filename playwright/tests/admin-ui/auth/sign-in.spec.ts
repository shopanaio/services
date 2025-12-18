import { test } from '@fixtures/base.extend';

test.describe('SignIn UI', () => {
  test('Successful sign In', async ({ signInPage, storesPage, api }) => {
    await test.step('Create user', async () => {
      await api.session.setupUser();
    })

    await test.step('SignIn', async () => {
      await test.step('GoTo', async () => {
        await signInPage.goto();
      })

      await test.step('Fill necessary fields', async () => {
        await signInPage.fillEmail(api.session.user.data.email);
        await signInPage.fillPassword(api.session.user.data.password);
      })

      await test.step('Submit', async () => {
        await signInPage.clickSubmit();
      })
    })

    await test.step('Checking that logged in', async () => {
      await storesPage.waitFor();
    })
  });
});
