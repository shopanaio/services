import { test } from '@fixtures/base.extend';

test.describe('StoresPage UI', () => {
  test('Create store', async ({ storesPage, api, signInPage }) => {
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

    await test.step('Create store', async () => {
      await storesPage.openCreate();

      await test.step('Fill store name', async () => {
        await storesPage.fillStoreName();

        await storesPage.clickNextBtn();
      })

      await test.step('Fill localization', async () => {
        await storesPage.fillLocalization();
        await storesPage.fillCurrency();
        await storesPage.fillLanguages();

        await storesPage.clickNextBtn();
      })
    })

    await test.step('Check that the store has been created', async () => {
      await storesPage.checkCreateButton();
    })
  });
})
