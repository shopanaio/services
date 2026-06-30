import { test } from '@fixtures/base.extend';

test.describe('Translations UI', () => {
  test('Translations create', async ({
    api,
    storesPage,
    signInPage,
    settingsPage,
    productsPage,
    translationsPage,
  }) => {
    await test.step('Create a user and login', async () => {
      await test.step('Create a new user with a store', async () => {
        await api.session.setupUserAndProject();
      });

      await test.step('Prepare product', async () => {
        await api.admin.mutation('admin/ProductCreate', {
          variables: {
            input: {
              description: null,
              excerpt: '',
              groups: [],
              requiresShipping: false,
              slug: null,
              status: 'DRAFT',
              tags: [],
              title: 'Skirt',
              variants: {
                create: [
                  {
                    categories: [],
                    costPrice: 0,
                    coverId: null,
                    features: [],
                    gallery: [],
                    inListing: true,
                    oldPrice: 0,
                    price: 3500,
                    sku: '',
                    slug: null,
                    stockStatus: 'OUT_OF_STOCK',
                    title: 'Product',
                    variantSortIndex: 0,
                    weight: 0,
                    weightUnit: 'g',
                  },
                ],
              },
            },
          },
        });
      });

      await test.step('LogIn', async () => {
        await signInPage.signIn(api.session.user.data.email, api.session.user.data.password);
        await storesPage.waitFor();
        await storesPage.openProject();
      });
    });

    await test.step('Open settings and check 2 languages existing', async () => {
      await settingsPage.openSettings();

      await settingsPage.checkDefaultLanguage('en');
      await settingsPage.checkLanguageExisting('ru');
    });

    await test.step('Add 1 language and check', async () => {
      await test.step('Add language', async () => {
        await settingsPage.clickAddLanguage();
        await settingsPage.clickSelectLanguage();

        await settingsPage.selectLanguageByTitle('uk');

        await settingsPage.clickConfirmInModalAddLanguage();
      });

      await test.step('Check language added', async () => {
        await settingsPage.checkLanguageExisting('uk');
      });
    });

    await test.step('Make translate product', async () => {
      await test.step('Open translation and check languages', async () => {
        await translationsPage.openTranslations();

        await translationsPage.checkLanguage(0, 'EnglishDefault');
        await translationsPage.checkLanguage(1, 'Russian');
        await translationsPage.checkLanguage(2, 'Ukrainian');
      });

      await test.step('Open product', async () => {
        await translationsPage.openRow('Products');
        await translationsPage.openProductForTranslate('Skirt');
      });

      await test.step('Change language and make translation', async () => {
        await translationsPage.changeLanguage(1, 'Russian');

        await translationsPage.refillTitle('Юбка');

        await translationsPage.saveTranslation();
      });

      await test.step('Change language and make translation', async () => {
        await translationsPage.changeLanguage(2, 'Ukrainian');

        await translationsPage.refillTitle('Спідниця');

        await translationsPage.saveTranslation();
      });

      await test.step('Exit', async () => {
        await translationsPage.reloadPage();
      });
    });

    await test.step('Change default language and check', async () => {
      await test.step('Change default language', async () => {
        await test.step('Change default', async () => {
          await settingsPage.openSettings();

          await settingsPage.clickOnLanguage('uk');
          await settingsPage.clickSetAsDefault('uk');

          await settingsPage.clickConfirmSetAsDefault();
        });

        await test.step('Check default', async () => {
          await settingsPage.checkDefaultLanguage('uk');
        });
      });

      await test.step('Check that title changed according default language', async () => {
        await productsPage.openProducts();

        await productsPage.openEditProduct('Спідниця');
        await productsPage.closeProductCreate();
      });
    });

    await test.step('Delete one language', async () => {
      await settingsPage.openSettings();

      await settingsPage.clickOnLanguage('en');
      await settingsPage.clickDeleteLanguage('en');

      await settingsPage.clickConfirmDeleteLanguage();
    });

    await test.step('Check default and another language in translations', async () => {
      await translationsPage.openTranslations();

      await translationsPage.checkLanguage(0, 'UkrainianDefault');
      await translationsPage.checkLanguage(1, 'Russian');
    });
  });
});
