import { test } from '@fixtures/base.extend';

test.describe('Features UI test 2', () => {
  test('Update feature', async ({ api, signInPage, storesPage, featuresPage }) => {
    await test.step('Create a user and login', async () => {
      await test.step('Create a new user with a store', async () => {
        await api.session.setupUserAndProject();
      });
      await test.step('LogIn', async () => {
        await signInPage.signIn(api.session.user.data.email, api.session.user.data.password);
        await storesPage.waitFor();
        await storesPage.openProject();
      })
    });

    await test.step('Create feature with 5 items', async () => {
      await featuresPage.openFeatures();

      await featuresPage.openCreate();
      await featuresPage.fillFeatureName('Feature Title');

      for (let i = 0; i < 5; i++) {
        await featuresPage.clickAddValue();
        await featuresPage.fillFeatureValue(`Value name ${i}`);
      }

      await featuresPage.clickSaveAndExit();
    });
    await test.step('Opens feature drawer', async () => {
      await featuresPage.openEditFeature();
    });
    await test.step('Adds 2 additional items', async () => {
      await featuresPage.clickAddValue();
      await featuresPage.fillFeatureValue('Additional item 6');

      await featuresPage.clickAddValue();
      await featuresPage.fillFeatureValue('Additional item 7');
    });
    await test.step('Swaps 1st -> 5th', async () => {
      await featuresPage.dragValue(0, 4);
    });
    await test.step('Swaps 4th -> 3rd', async () => {
      await featuresPage.dragValue(3, 2);
    });
    await test.step('Removes a 1st item', async () => {
      await featuresPage.removeFeature(0);
    });
    await test.step('Submits and saves without errors', async () => {
      await featuresPage.clickSaveFeature();
    });
  });
});
