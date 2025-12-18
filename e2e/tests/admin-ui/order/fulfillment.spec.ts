import { test } from '@fixtures/base.extend';

test.describe('Fulfillment UI', () => {
  test('Create Fulfillment', async ({ api,   storesPage, signInPage, fulfillmentPage }) => {
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

    await test.step('Open Fulfillment', async () => {
      await fulfillmentPage.openFulfillment();
    })

    await test.step('Create column', async () => {
      await fulfillmentPage.clickCreateColumn();
      await fulfillmentPage.fillColumnTitle('Pending');
      await fulfillmentPage.clickSubmitCreateColumn();

      await fulfillmentPage.checkColumnsCount(4);

      await fulfillmentPage.checkColumnTitle(3, 'Pending');
    })

    await test.step('Drag the column', async () => {
      await fulfillmentPage.dragColumn(0, 1);
      await fulfillmentPage.dragColumn(1, 2);
      await fulfillmentPage.dragColumn(2, 0);

      await fulfillmentPage.dragColumn(3, 1);
    })

    await test.step('Create 5 orders', async () => {
      const orderInput = {
        clientInfo: {
          language: 'ru-RU',
          userAgent: '',
        },
      };

      for (let id = 0; id < 4; id++) {
        await api.admin.mutation('admin/OrderCreate', {
          api,
          variables: { input: orderInput },
        });
      }

      await fulfillmentPage.reloadPage();
    })

    await test.step('Drag orders to another column', async () => {
      await fulfillmentPage.dragOrderToAnotherColumn(3, 1);
      await fulfillmentPage.dragOrderToAnotherColumn(2, 1);
      await fulfillmentPage.dragOrderToAnotherColumn(1, 1);
      await fulfillmentPage.dragOrderToAnotherColumn(0, 1);
    })

    await test.step('Drag orders inside the column', async () => {
      await fulfillmentPage.dragOrderInColumn(0, 1);
      await fulfillmentPage.dragOrderInColumn(1, 2);
      await fulfillmentPage.dragOrderInColumn(2, 3);
    })

    await test.step('Reload page and check all remained', async () => {
      await fulfillmentPage.reloadPage();
      await fulfillmentPage.checkColumnsCount(4);

      await fulfillmentPage.checkOrdersQntInColumn(0, 0);

      await fulfillmentPage.checkOrdersQntInColumn(1, 4);

      await fulfillmentPage.checkOrderNumbersInColumn(1, ['#1001', '#1002', '#1003', '#1000']);

      await fulfillmentPage.checkOrdersQntInColumn(2, 0);

      await fulfillmentPage.checkColumnTitles(['New', 'Pending', 'In Progress', 'Completed']);
    })
  });
});
