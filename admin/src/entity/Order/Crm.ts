import { IAddress, IOrder, Order } from '@src/entity/Order/Order';
import {
  IOrderProductInfo,
  OrderProductInfo,
} from '@src/entity/Order/ProductInfo';
import {
  IPaymentMethod,
  PaymentMethod,
} from '@src/entity/Services/PaymentMethod';
import {
  IShippingMethod,
  ShippingMethod,
} from '@src/entity/Services/ShippingMethod';
import { ITag, Tag } from '@src/entity/Tag/Tag';
import { sanitizeEntries } from '@src/entity/utils';
import {
  ApiCrmColumn,
  FulfillmentStatusEnum,
  OrderStatusEnum,
  PaymentStatusEnum,
} from '@src/graphql';

export interface ICrmColumn {
  id: string;
  slug: string;
  sortIndex: number;
  title: string;
  tickets: ICrmOrder[];
}

export interface ICrmOrder {
  id: ID;
  createdAt: Date;
  status: OrderStatusEnum;
  orderNumber: number;
  totalDiscountAmount: number;
  totalAmount: number;
  customerEmail: string | null;
  customerPhone: string | null;
  customerFirstName: string | null;
  customerMiddleName: string | null;
  customerLastName: string | null;
  tags: ITag[];
  paymentMethod: IPaymentMethod | null;
  shippingMethod: IShippingMethod | null;
  shippingAddress: IAddress | null;
  billingAddress: IAddress | null;
  payment: { status: PaymentStatusEnum } | null;
  fulfillments: { status: FulfillmentStatusEnum }[];
  productsInfo: IOrderProductInfo[];
}

export class CrmColumn {
  static create(data: ApiCrmColumn): ICrmColumn {
    return {
      id: data.ID,
      slug: data.slug,
      sortIndex: data.sortIndex || -1,
      title: data.title,
      tickets: sanitizeEntries(
        (data.tickets || []).map((it) => ({
          id: it.id,
          status: it.status,
          createdAt: new Date(it.createdAt),
          orderNumber: it.orderNumber,
          totalDiscountAmount: it.totalDiscountAmount,
          totalAmount: it.totalAmount,
          customerEmail: it.customerEmail,
          customerPhone: it.customerPhone,
          customerFirstName: it.customerFirstName,
          customerMiddleName: it.customerMiddleName,
          customerLastName: it.customerLastName,
          paymentMethod: it.paymentMethod
            ? PaymentMethod.create(it.paymentMethod)
            : null,
          shippingMethod: it.shippingMethod
            ? ShippingMethod.create(it.shippingMethod)
            : null,
          shippingAddress: it.shippingAddress
            ? Order.createAddress(it.shippingAddress)
            : null,
          billingAddress: it.billingAddress
            ? Order.createAddress(it.billingAddress)
            : null,
          tags: sanitizeEntries(it.tags || []).map(Tag.create),
          payment: it.payment ? { status: it.payment.status } : null,
          fulfillments: sanitizeEntries(it.fulfillments || []).map((f) => ({
            status: f.status,
          })),
          productsInfo: sanitizeEntries(it.productsInfo || []).map(
            OrderProductInfo.create,
          ),
        })),
      ) as ICrmOrder[],
    };
  }
}
