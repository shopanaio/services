import { test } from '@fixtures/base.extend';
import { randomUUID } from 'node:crypto';

test.describe('Orders UI test 5', async () => {
  test('Quick Note, Comment, tag', async ({
    api,
    signInPage,
    storesPage,
    customersPage,
    productsPage,
    ordersPage,
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

    await test.step('Preparing part by API', async () => {
      await test.step('Create 3 products with different prices, stock status', async () => {
        const createProductInput = (title: string, price: number) => ({
          description: null,
          excerpt: '',
          groups: [],
          requiresShipping: false,
          slug: randomUUID(),
          status: 'DRAFT',
          tags: [],
          title,
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
                price,
                sku: '',
                slug: randomUUID(),
                stockStatus: 'OUT_OF_STOCK',
                title,
                variantSortIndex: 0,
                weight: 0,
                weightUnit: 'g',
              },
            ],
          },
        });

        const productsInputs = [
          createProductInput(productsPage.products[0].title, productsPage.products[0].price),
          createProductInput(productsPage.products[1].title, productsPage.products[1].price),
          createProductInput(productsPage.products[2].title, productsPage.products[2].price),
        ];

        for (const input of productsInputs) {
          await api.admin.mutation('admin/ProductCreate', {
            variables: { input },
          });
        }
      });

      await test.step('Create tag', async () => {
        const input = {
          title: 'tag_1',
          slug: randomUUID(),
          color: '#ff0000',
        };

        await api.admin.mutation('admin/TagCreate', {
          variables: { input },
        });
      });

      await test.step('Create customer', async () => {
        const input = {
          firstName: customersPage.customers[0].firstName,
          lastName: customersPage.customers[0].lastName,
          language: 'English',
          email: customersPage.customers[0].email,
          isVerified: true,
          phone: customersPage.customers[0].phone,
          password: '123456',
        };

        await api.admin.mutation('admin/CustomerCreate', {
          variables: { input },
        });
      });
    });

    await test.step('Create a new order with products', async () => {
      await test.step('Create order', async () => {
        await ordersPage.openOrders();
        await ordersPage.clickCreate();
        await ordersPage.checkTimeline('Order created');
      });

      await test.step('Add 3 products', async () => {
        await ordersPage.clickAddProducts();

        for (let i = 0; i < 3; i++) {
          await ordersPage.selectProducts(i);
        }

        await ordersPage.clickOkInModal();
        await ordersPage.checkTimeline('Order item created');
      });

      await test.step('Add customer', async () => {
        await ordersPage.clickSelectCustomer();
        await ordersPage.selectCustomer(0);
        await ordersPage.clickOkInModal();

        await ordersPage.checkTimeline('Customer assigned');
      });

      await test.step('Check products qnt = 3', async () => {
        await ordersPage.checkFirstTableRows(3);
      });

      await test.step('Check contact info', async () => {
        await ordersPage.checkCustomerName(
          `${customersPage.customers[0].firstName} ${customersPage.customers[0].lastName}`,
        );
        await ordersPage.checkCustomerEmail(customersPage.customers[0].email);
        await ordersPage.checkCustomerPhone(customersPage.customers[0].phone);
      });
    });

    /* --------- MAIN PART --------- */

    await test.step('Main part', async () => {
      await test.step('Add Quick Note', async () => {
        await ordersPage.clickQuickNoteBtn();
        await ordersPage.fillQuickNote('Quick note text');
        await ordersPage.clickSaveQuickNote();
      });

      await test.step('Check Quick Note', async () => {
        await ordersPage.checkCommentInTimeline('Quick note text');
      });

      await test.step('Add Comment', async () => {
        await ordersPage.fillComment('Comment text');
        await ordersPage.clickSubmitComment();
      });

      await test.step('Check Comment', async () => {
        await ordersPage.checkCommentInTimeline('Comment text');
      });

      await test.step('Add tag', async () => {
        await ordersPage.clickSelectTag();
        await ordersPage.selectTag(0);
        await ordersPage.clickConfirmSelectTag();
      });

      await test.step('Check Tag', async () => {
        //
      });
    });
  });
});
