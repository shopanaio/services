import { test } from '@fixtures/base.extend';

test.describe('Product-components UI', () => {
  test('Create components', async ({ api, storesPage, signInPage, productsPage }) => {
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

    await test.step('Create 3 product', async () => {
      await productsPage.openCreate();
      await productsPage.fillProductName('Test Box');
      await productsPage.saveAndExitProduct();

      await productsPage.openCreate();
      await productsPage.fillProductName('Test component 1');
      await productsPage.clickAddOptions();
      await productsPage.fillFeaturesTitle('Size', false);

      await productsPage.timeout(2);

      await productsPage.addFeature('Large');
      await productsPage.addFeature('Medium');
      await productsPage.addFeature('Small');

      await productsPage.clickDoneOptions();
      await productsPage.variantsSetPriceAvailable();

      await productsPage.openVariantForm(0);
      await productsPage.retitleVariant();
      await productsPage.saveVariantForm();

      await productsPage.openVariantForm(1);
      await productsPage.retitleVariant();
      await productsPage.saveVariantForm();

      await productsPage.openVariantForm(2);
      await productsPage.retitleVariant();
      await productsPage.saveVariantForm();

      await productsPage.saveAndExitProduct();

      await productsPage.openCreate();
      await productsPage.fillProductName('Test component 2');
      await productsPage.saveAndExitProduct();
    });

    await test.step('Creating Component Groups', async () => {
      await test.step('Go to Product Test Box', async () => {
        await productsPage.openEditProduct('Test Box');
      });
      await test.step('Create 2 component groups', async () => {
        await productsPage.clickAddComponent();
        await productsPage.fillGroupTitle('Group 1');
        await productsPage.clickSelectProducts();
        await productsPage.clickOnComponent(1);

        await productsPage.clickOnComponent(2);
        await productsPage.clickOnComponent(3);
        await productsPage.clickOnComponent(4);

        await productsPage.clickOkInModalBrowseVariants();
        await productsPage.toggleMultipleSelection();
        await productsPage.clickDoneGroup();

        await productsPage.clickAddComponent();
        await productsPage.fillGroupTitle('Group 2');
        await productsPage.clickSelectProducts();
        await productsPage.clickOnComponent(0);

        await productsPage.clickOkInModalBrowseVariants();
        await productsPage.toggleRequired();
        await productsPage.clickDoneGroup();
      });
      await test.step('Save changes', async () => {
        await productsPage.saveProduct();

        await productsPage.checkGroup(0, 'Group 1');
        await productsPage.checkGroup(1, 'Group 2');
      });
    });

    await test.step('Changing the order of groups', async () => {
      await test.step('Swapping Group 1 and Group 2', async () => {
        await productsPage.dragGroup(0, 1);
      });
      await test.step('Save changes', async () => {
        await productsPage.saveProduct();

        await productsPage.checkGroup(0, 'Group 2');
        await productsPage.checkGroup(1, 'Group 1');
      });
    });

    await test.step('Deleting the first group and changing the second group', async () => {
      await test.step('Delete Group 1', async () => {
        await productsPage.deleteGroup(1);
      });
      await test.step('For the Group 2, set is required = true', async () => {
        await productsPage.editGroup(0);
        await productsPage.toggleRequired();
        await productsPage.clickDoneGroup();
      });
      await test.step('Save changes', async () => {
        await productsPage.saveProduct();

        await productsPage.checkGroup(0, 'Group 2');
      });
    });
    await test.step('Removing the remaining group', async () => {
      await productsPage.deleteGroup(0);
    });
  });
});
