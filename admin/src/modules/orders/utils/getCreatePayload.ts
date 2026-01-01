import { IOrderFormValues, IOrderItemVFormValue } from '@modules/orders/types';
import { Currencies } from '@src/defs/constants';
import { ApiCreateOrderInput, WeightUnit } from '@src/graphql';

export const getApiCreatedOrderItemPayload = (item: IOrderItemVFormValue) => ({
  title: item.title,
  price: item.price,
  productId: item.product?.id,
  fulfillmentId: item.fulfillmentId,
  quantity: item.quantity,
  total: item.price * item.quantity,
  originalQuantity: item.quantity,
  weight: item.product?.weight || 0,
  weightUnit: WeightUnit.Gr,
});

export const mapApiCreatedOrderItems = (items: IOrderFormValues['items']) =>
  items.map(getApiCreatedOrderItemPayload);

export const getCreateOrderPayload = ({
  data,
}: {
  data: IOrderFormValues;
}): ApiCreateOrderInput => {
  const {
    customer: [customer],
  } = data;

  const items = mapApiCreatedOrderItems(data.items);
  const total = items.reduce((acc, item) => acc + item.total, 0);

  return {
    items,
    currencyCode: Currencies.USD,
    subtotal: total,
    total,
    clientDetails: {
      acceptLanguage: navigator.language,
      userAgent: navigator.userAgent,
      browserIp: '',
    },
    customerDetails: {
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phoneNumber: customer.phone,
      id: customer.id,
      // middleName: data.customerDetails.middleName,
    },
    ...(data.billingAddress ? { billingAddress: data.billingAddress } : {}),
    ...(data.shippingAddress ? { shippingAddress: data.shippingAddress } : {}),
    ...(data.paymentMethod ? { paymentMethodId: data.paymentMethod.id } : {}),
    ...(data.shippingMethod
      ? { shippingMethodId: data.shippingMethod.id }
      : {}),
    status: data.status,
    discount: 0,
    tax: 0,
    shippingAmount: 0,
  };
};
