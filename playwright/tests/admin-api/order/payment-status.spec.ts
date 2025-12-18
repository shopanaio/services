import { test } from '@fixtures/base.extend';
import {
  ApiProduct,
  ApiQuery,
  EntityStatus,
  OrderStatusEnum,
  PaymentStatusEnum,
  WeightUnit,
  DimensionUnit,
} from '@codegen/admin-gql';
import { GraphQLError } from 'graphql';
import { randomUUID } from 'node:crypto';
import { expect } from 'playwright/test';
import * as Yup from 'yup';

test.describe('Orders API', () => {
  let productRequest: { data: { productMutation: { create: ApiProduct } } };
  let customerId: { data: { customerMutation: { create: string } } };
  let orderCreated: { data: { orderMutation: { create: string } } };
  let order: { data: ApiQuery; errors: GraphQLError[] };

  const createProductInput = (title: string, price: number, oldPrice: number) => ({
    description: null,
    excerpt: '',
    groups: [],
    requiresShipping: false,
    slug: randomUUID(),
    status: EntityStatus.Draft,
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
          oldPrice,
          price,
          sku: '',
          slug: randomUUID(),
          stockStatus: 'OUT_OF_STOCK',
          title,
          variantSortIndex: 0,
          weight: 0,
          weightUnit: WeightUnit.Gr,
          width: 0,
          height: 0,
          length: 0,
          dimensionUnit: DimensionUnit.Mm,
        },
      ],
    },
  });

  const productsInputs = [
    createProductInput('Sunglasses', 3500, 3000),
    createProductInput('Hat', 2500, 2000),
    createProductInput('Pants', 5000, 4000),
  ];

  const customerInput = {
    firstName: 'John',
    lastName: 'Doe',
    language: 'English',
    email: 'john.doe@example.com',
    isVerified: false,
    phone: '45545455',
    password: '123456',
  };

  const orderInput = {
    clientInfo: {
      language: 'ru-RU',
      userAgent: '',
    },
  };

  test('Payment status', async ({ api }) => {
    const productsIds: string[] = [];
    let orderId: string;

    const findOrder = (id: string) =>
      api.admin.query('admin/OrderFindOne', {
        variables: {
          findOneId: id,
        },
      });

    await test.step('Create a new user with a store', async () => {
      await api.session.setupUserAndProject();
    });

    await test.step('Create 3 products', async () => {
      for (const input of productsInputs) {
        productRequest = await api.admin.mutation('admin/ProductCreate', {
          variables: { input },
        });
        productsIds.push(productRequest.data.productMutation.create.variants[0].id);
      }
    });

    await test.step('Create customer', async () => {
      customerId = await api.admin.mutation('admin/CustomerCreate', {
        variables: { input: customerInput },
      });
    });

    await test.step('Create a new order with products', async () => {
      await test.step('Create order', async () => {
        orderCreated = await api.admin.mutation('admin/OrderCreate', {
          variables: { input: orderInput },
        });

        orderId = orderCreated.data.orderMutation.create;

        order = await findOrder(orderId);
      });

      await test.step('Add 3 products', async () => {
        for (const productId of productsIds) {
          const orderProduct = await api.admin.mutation('admin/OrderItemCreate', {
            variables: {
              input: {
                orderId,
                productId: productId,
                quantity: 1,
              },
            },
          });
          expect(orderProduct.data.orderMutation.createOrderItem).toBe(true);
        }
      });

      await test.step('Add customer', async () => {
        const { data } = await api.admin.mutation('admin/OrderCustomerUpdate', {
          variables: {
            input: {
              customerId: customerId.data.customerMutation.create,
              id: orderId,
            },
          },
        });
        expect(data.orderMutation.updateCustomer).toBe(true);
      });

      await test.step('Check products qnt = 3', async () => {
        order = await findOrder(orderId);

        expect(order?.data?.orderQuery?.findOne?.orderItems.length).toBe(3);
      });

      await test.step('Check contact info', async () => {
        expect(order?.data?.orderQuery?.findOne?.customer).toMatchSchema(
          Yup.object({
            firstName: Yup.string().equals([customerInput.firstName]).required(),
            lastName: Yup.string().equals([customerInput.lastName]).required(),
            language: Yup.string().equals([customerInput.language]).required(),
            email: Yup.string().equals([customerInput.email]).required(),
            isVerified: Yup.boolean().equals([customerInput.isVerified]).required(),
            phone: Yup.string().equals([customerInput.phone]).required(),
          }),
        );
      });
    });

    await test.step('Confirm order', async () => {
      const orderStatusConfirm = await api.admin.mutation('admin/OrderUpdateStatus', {
        variables: {
          input: {
            id: orderId,
            status: OrderStatusEnum.Active,
            comment: 'Order status - active',
          },
        },
      });
      expect(orderStatusConfirm.data.orderMutation.updateStatus).toBe(true);

      order = await findOrder(orderId);

      expect(order?.data?.orderQuery?.findOne?.status).toBe('ACTIVE');
    });

    await test.step('Mark as paid and check status', async () => {
      const orderPaymentStatusConfirm = await api.admin.mutation('admin/OrderUpdatePaymentStatus', {
        variables: {
          input: {
            id: order.data.orderQuery.findOne?.payment?.id,
            status: PaymentStatusEnum.Paid,
            comment: 'Payment status - paid',
          },
        },
      });
      expect(orderPaymentStatusConfirm.data.orderMutation.updatePaymentStatus).toBe(true);

      order = await findOrder(orderId);

      expect(order.data.orderQuery.findOne?.payment?.status).toBe('PAID');
    });
  });
});
