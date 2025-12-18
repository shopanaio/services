import { test } from '@fixtures/base.extend';

test.describe('Products UI test 2', () => {
  test('Manage Features / Sort', async ({
    api,
    storesPage,
    productsPage,
    featuresPage,
    signInPage,
  }) => {
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

    await test.step('Create product and feature', async () => {
      await featuresPage.openFeatures();
      await featuresPage.openCreate();
      await featuresPage.fillFeatureName('Color');

      await featuresPage.clickAddValue();
      await featuresPage.fillFeatureValue('red');

      await featuresPage.clickAddValue();
      await featuresPage.fillFeatureValue('green');

      await featuresPage.clickSaveAndExit();

      await productsPage.openProducts();
      await productsPage.openCreate();
      await productsPage.fillProductName(productsPage.title);

      await productsPage.saveAndExitProduct();
    });

    await test.step('Open product', async () => {
      await productsPage.openEditProduct(productsPage.title);
    });
    await test.step('Click Add feature', async () => {
      await productsPage.clickAddFeature();
    });
    /* await test.step('Fill title, click Done and check validation message', async () => {
      await productsPage.fillFeaturesTitle('Size', true);
      await productsPage.clickDoneFeatures();
      await productsPage.checkValidationMassage('Feature is required');
    }); */

    await test.step('Fill title add 2 values and click Done', async () => {
      await productsPage.fillFeaturesTitle('Size', true);

      await productsPage.addFeature('s');
      await productsPage.addFeature('m');

      await productsPage.clickDoneFeatures();
    });
    await test.step('Click Add feature', async () => {
      await productsPage.clickAddFeature();
    });
    await test.step('Click Browse and select existing feature', async () => {
      await productsPage.clickBrowseFeature();
      await productsPage.selectExistingFeature('Color');
      await productsPage.clickOkInModalBrowseFeatures();
    });
    await test.step('Add 2 feature values and click Done', async () => {
      await productsPage.clickSelectFeature();
      await productsPage.clickOnFeatureByTitle('red', true);

      await productsPage.clickOnFeatureByTitle('green', false);
      await productsPage.clickDoneFeatures();
    });
    await test.step('Submit, reload, open and check added attribute', async () => {
      await productsPage.saveAndExitProduct();
      await productsPage.reloadPage();
    });

    /* ---- Manage Features / Sort ---- */

    await test.step('Open product', async () => {
      await productsPage.openEditProduct(productsPage.title);
    });
    await test.step('Swap attributes 1->2', async () => {
      await productsPage.dragFeatures(0, 1);
    });
    await test.step('Click Edit first attribute and reorder values 1->2, Done', async () => {
      await productsPage.editFeature(0);
      await productsPage.dragFeaturesValues(0, 1);
      await productsPage.clickDoneFeatures();
    });
    await test.step('Submit, reload, open and check attributes/values ordering', async () => {
      await productsPage.saveProduct();
      await productsPage.reloadPage();

      await productsPage.openEditProduct(productsPage.title);
      await productsPage.checkFeaturesOrder();

      await productsPage.reloadPage();
    });

    /* ---- Manage Features / Delete ---- */

    await test.step('Open product', async () => {
      await productsPage.openEditProduct(productsPage.title);
    });
    await test.step('Remove attributes', async () => {
      await productsPage.removeFeature(0);
    });
    await test.step('Submit, reload, open and check', async () => {
      await productsPage.saveProduct();
      await productsPage.reloadPage();

      await productsPage.openEditProduct(productsPage.title);
      await productsPage.checkRemove();

      await productsPage.reloadPage();
    });
  });
});
