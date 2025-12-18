import { test } from '@fixtures/base.extend';
import { randomUUID } from 'node:crypto';

test.describe('Translations UI', () => {
  test('Translations create', async ({
    api,
    storesPage,
    signInPage,
    productsPage,
    categoriesPage,
    translationsPage,
  }) => {
    await test.step('Create a user and login', async () => {
      await test.step('Create a new user with a store', async () => {
        await api.session.setupUserAndProject();
      });
      await test.step('LogIn', async () => {
        await signInPage.signIn(api.session.user.data.email, api.session.user.data.password);
        await storesPage.waitFor();
        await storesPage.openProject();
      });
    });

    await test.step('Preparing to test', async () => {
      await test.step('Create a product with filled fields', async () => {
        await productsPage.openCreate();
        await productsPage.fillProductName('Product title');
        await productsPage.fillDescription('Product description');
        await productsPage.fillExcerpt('Product excerpt');

        await productsPage.saveAndExitProduct();
      });
      await test.step('Create a category with filled fields', async () => {
        await categoriesPage.openCategories();
        await categoriesPage.openCreate();

        await categoriesPage.fillCategoriesTitle('Categories title');

        await categoriesPage.fillDescription('Categories description');
        await categoriesPage.clickSaveDescription();

        await categoriesPage.clickExcerpt();
        await categoriesPage.fillExcerpt('Categories excerpt');

        await categoriesPage.saveAndExitCategory();
      });

      await test.step('Create a feature API', async () => {
        const groupId = randomUUID();

        const input = {
          features: [
            { title: 'Red', slug: 'red', sortIndex: 0, groupId },
            { title: 'Green', slug: 'green', sortIndex: 1, groupId },
            { title: 'Blue', slug: 'blue', sortIndex: 2, groupId },
          ],
          title: 'Feature color',
          slug: 'feature-color',
        };

        await api.admin.mutation('admin/FeatureGroupCreate', {
          variables: { input },
        });
      });

      await test.step('Create a tag API', async () => {
        const input = {
          title: 'sale',
          slug: randomUUID(),
        };

        await api.admin.mutation('admin/TagCreate', {
          variables: { input },
        });
      });
    });

    await test.step('Main part', async () => {
      await test.step('Open Translations and check if 2 languages are available', async () => {
        await translationsPage.openTranslations();

        await translationsPage.checkLanguage(0, 'EnglishDefault');
        await translationsPage.checkLanguage(1, 'Russian');
      });

      await test.step('Open products and make translation', async () => {
        await test.step('Open product', async () => {
          await translationsPage.openRow('Products');
          await translationsPage.openProductForTranslate('Product title');
        });

        await test.step('Refill fields', async () => {
          await translationsPage.refillTitle('Product title english');
          await translationsPage.refillDescription('Product description english');

          await translationsPage.clickExcerpt();
          await translationsPage.refillExcerpt('Product excerpt english');

          await translationsPage.saveTranslation();
        });

        await test.step('Check product edited', async () => {
          await translationsPage.checkTitle('Product title english');
          await translationsPage.checkDescription('Product description english');

          await translationsPage.clickExcerpt();
          await translationsPage.checkExcerpt('Product excerpt english');
        });

        await test.step('Change language and make translation', async () => {
          await translationsPage.changeLanguage(1, 'Russian');

          await translationsPage.refillTitle('Заголовок продукта');

          await translationsPage.clickDescription();
          await translationsPage.refillDescription('Описание продукта');

          await translationsPage.clickExcerpt();
          await translationsPage.refillExcerpt('Отрывки продукта');

          await translationsPage.saveTranslation();
        });

        await test.step('Check product translation', async () => {
          await translationsPage.checkTitle('Заголовок продукта');

          await translationsPage.clickDescription();
          await translationsPage.checkDescription('Описание продукта');

          await translationsPage.clickExcerpt();
          await translationsPage.checkExcerpt('Отрывки продукта');
          await translationsPage.closeTranslationModal();
        });
      });

      await test.step('Exit', async () => {
        await translationsPage.reloadPage();
      });

      await test.step('Open categories and make translation', async () => {
        await test.step('Open category', async () => {
          await translationsPage.openRow('Categories');
          await translationsPage.openProductForTranslate('Categories title');
        });
        await test.step('Refill fields', async () => {
          await translationsPage.refillTitle('Categories title english');

          await translationsPage.clickDescription();
          await translationsPage.refillDescription('Categories description english');

          await translationsPage.clickExcerpt();
          await translationsPage.refillExcerpt('Categories excerpt english');

          await translationsPage.saveTranslation();
        });

        await test.step('Check categories edited', async () => {
          await translationsPage.checkTitle('Categories title english');

          await translationsPage.clickDescription();
          await translationsPage.checkDescription('Categories description english');

          await translationsPage.clickExcerpt();
          await translationsPage.checkExcerpt('Categories excerpt english');
        });

        await test.step('Change language and make translation', async () => {
          await translationsPage.changeLanguage(1, 'Russian');

          await translationsPage.refillTitle('Заголовок категории');

          await translationsPage.clickDescription();
          await translationsPage.refillDescription('Описание категории');

          await translationsPage.clickExcerpt();
          await translationsPage.refillExcerpt('Отрывки категории');

          await translationsPage.saveTranslation();
        });

        await test.step('Check categories translation', async () => {
          await translationsPage.checkTitle('Заголовок категории');

          await translationsPage.clickDescription();
          await translationsPage.checkDescription('Описание категории');

          await translationsPage.clickExcerpt();
          await translationsPage.checkExcerpt('Отрывки категории');
        });
      });

      await test.step('Exit', async () => {
        await translationsPage.reloadPage();
      });

      await test.step('Open tag and make translation', async () => {
        await test.step('Open tags', async () => {
          await translationsPage.openRow('Tags');
          await translationsPage.openProductForTranslate('sale');
        });
        await test.step('Refill fields', async () => {
          await translationsPage.refillTitle('Tag sale english');

          await translationsPage.saveTranslation();
        });

        await test.step('Check tag edited', async () => {
          await translationsPage.checkTitle('Tag sale english');
        });

        await test.step('Change language and make translation', async () => {
          await translationsPage.changeLanguage(1, 'Russian');

          await translationsPage.refillTitle('Тэг распродажа ру');
          await translationsPage.saveTranslation();
        });

        await test.step('Check categories translation', async () => {
          await translationsPage.checkTitle('Тэг распродажа ру');
        });
      });

      await test.step('Exit', async () => {
        await translationsPage.reloadPage();
      });

      await test.step('Open features and make translation', async () => {
        await test.step('Open features', async () => {
          await translationsPage.openRow('Features');
          await translationsPage.openProductForTranslate('Feature color');
        });
        await test.step('Refill fields', async () => {
          await translationsPage.refillTitle('Feature color english');

          await translationsPage.refillFeatureValue(1, 'Red english');
          await translationsPage.refillFeatureValue(2, 'Green english');
          await translationsPage.refillFeatureValue(3, 'Blue english');

          await translationsPage.saveTranslation();
        });

        await test.step('Check feature edited', async () => {
          await translationsPage.checkTitle('Feature color english');

          await translationsPage.checkFeatureValue(1, 'Red english');
          await translationsPage.checkFeatureValue(2, 'Green english');
          await translationsPage.checkFeatureValue(3, 'Blue english');
        });

        await test.step('Change language and make translation', async () => {
          await translationsPage.changeLanguage(1, 'Russian');

          await translationsPage.refillTitle('Особенность цвет ру');

          await translationsPage.refillFeatureValue(1, 'Красный ру');
          await translationsPage.refillFeatureValue(2, 'Зеленый ру');
          await translationsPage.refillFeatureValue(3, 'Голубой ру');

          await translationsPage.saveTranslation();
        });

        await test.step('Check categories translation', async () => {
          await translationsPage.checkTitle('Особенность цвет ру');

          await translationsPage.checkFeatureValue(1, 'Красный ру');
          await translationsPage.checkFeatureValue(2, 'Зеленый ру');
          await translationsPage.checkFeatureValue(3, 'Голубой ру');
        });
      });

      await test.step('Exit', async () => {
        await translationsPage.reloadPage();
      });
    });
  });
});
