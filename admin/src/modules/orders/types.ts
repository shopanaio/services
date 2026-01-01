import { ICustomer } from '@src/entity/Customer/Customer';
import { IFulfillment } from '@src/entity/Order/FulfillmentItem';
import {
  IAddress,
  ICustomerStatistic,
  ICustomerDetails,
  IOrderPaymentSummary,
} from '@src/entity/Order/Order';
import { IOrderEvent } from '@src/entity/Order/OrderEvent';
import { IPaymentItem } from '@src/entity/Order/PaymentItem';
import { IPaymentMethod } from '@src/entity/PaymentMethod/PaymentMethod';
import { IShippingMethod } from '@src/entity/ShippingMethod/ShippingMethod';

import { ITag } from '@src/entity/Tag/Tag';
import { OrderStatusEnum } from '@src/graphql';

export type IAddressFormValues = Omit<IAddress, 'id'> & { id: ID | null };

export interface IOrderFormValues {
  id: ID | null;
  customerDetails: ICustomerDetails | null;
  customer: ICustomer | null;
  status: OrderStatusEnum;
  billingAddress: IAddressFormValues | null;
  shippingAddress: IAddressFormValues | null;
  paymentMethod: IPaymentMethod | null;
  shippingMethod: IShippingMethod | null;
  fulfillmentItems: IFulfillment[];
  paymentItem: IPaymentItem | null;
  events: IOrderEvent[];
  tags: ITag[];
  adminNote: string | null;
  customerStatistic: ICustomerStatistic | null;
  paymentSummary: IOrderPaymentSummary;
}
