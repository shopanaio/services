import { test } from '@fixtures/base.extend';

test.describe('Features UI test 1', () => {
  test('Create feature', async ({ storesPage, featuresPage, signInPage, api }) => {
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

    await test.step('Shows all validation messages', async () => {
      await featuresPage.openFeatures();

      await featuresPage.openCreate();
      await featuresPage.fillFeatureName('');
      await featuresPage.clickSaveFeature();
      await featuresPage.checkValidationMessage();

      await featuresPage.fillFeatureName('');

      await featuresPage.clickAddValue();
      await featuresPage.fillFeatureValue('Value 0');

      await featuresPage.clickSaveFeature();
      await featuresPage.checkValidationMessage();
    });
    await test.step('Fills all info', async () => {
      await featuresPage.fillFeatureName('Feature Title');
    });
    await test.step('Adds 5 feature items', async () => {
      for (let i = 1; i < 5; i++) {
        await featuresPage.clickAddValue();
        await featuresPage.fillFeatureValue(`Value name ${i}`);
      }
    });
    await test.step('Swaps 1st -> 3rd', async () => {
      await featuresPage.dragValue(0, 2);
    });
    await test.step('Swaps 2nd -> 1st', async () => {
      await featuresPage.dragValue(1, 0);
    });
    await test.step('Removes a 2nd item', async () => {
      await featuresPage.removeFeature(1);
    });
    await test.step('Submits and saves without errors', async () => {
      await featuresPage.clickSaveFeature();
    });
  });
});
