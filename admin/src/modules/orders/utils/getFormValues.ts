import { IOrderFormValues } from '@modules/orders/types';
import { IOrder } from '@src/entity/Order/Order';

export const getOrderFormValues = (
  order: IOrder,
  overrides?: Partial<IOrderFormValues>,
): IOrderFormValues => {
  return {
    id: order.id,

    paymentSummary: order.paymentSummary,
    customer: order.customer || null,
    customerDetails: order.customerDetails || null,
    status: order.status || OrderStatusEnum.Draft,
    billingAddress: order.billingAddress || null,
    shippingAddress: order.shippingAddress || null,
    paymentMethod: order.paymentMethod || null,
    shippingMethod: order.shippingMethod || null,
    fulfillmentItems: order.fulfillments,
    paymentItem: order.paymentItem,
    events: order.events || [],
    tags: order.tags || [],
    adminNote: order.adminNote || null,
    customerStatistic: order.customerStatistic || null,
    ...overrides,
  };
};
