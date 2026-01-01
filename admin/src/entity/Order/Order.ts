import { Customer, ICustomer } from '@src/entity/Customer/Customer';
import {
  FulfillmentItem,
  IFulfillment,
} from '@src/entity/Order/FulfillmentItem';
import { IOrderEvent, OrderEvent } from '@src/entity/Order/OrderEvent';
import { IPaymentItem, PaymentItem } from '@src/entity/Order/PaymentItem';
import {
  IOrderProductInfo,
  OrderProductInfo,
} from '@src/entity/Order/ProductInfo';
import { IProductVariant, ProductVariant } from '@src/entity/Product/Variant';
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
  ApiOrder,
  ApiOrderItem,
  ApiAddress,
  OrderStatusEnum,
  ApiWeight,
  ApiActor,
} from '@src/graphql';

export interface IOrderItem {
  id: ID;
  price: number;
  quantity: number;
  fulfillmentQuantity: number;
  totalAmount: number;
  product: IOrderProductInfo;
  productCostPrice: number | null;
  originalQuantity: number;
  weight: ApiWeight | null;
  subtotalAmount: number;
  taxAmount: number | null;
  discountAmount: number | null;
  createdAt: Date;
}

export interface IAddress {
  address1: string | null;
  address2: string | null;
  city: string | null;
  countryCode: string | null;
  email: string | null;
  firstName: string | null;
  id: ID;
  lastName: string | null;
  latitude: number | null;
  longitude: number | null;
  middleName: string | null;
  phone: string | null;
  provinceCode: string | null;
  postalCode: string | null;
  meta: any;
}

export interface IClientInfo {
  language: string | null;
  ip: string | null;
  userAgent: string | null;
  meta: any;
}

export interface ICustomerDetails {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  meta: string | null;
  middleName: string | null;
  phone: string | null;
  note: string | null;
}

export interface IOrderPaymentSummary {
  subtotalAmount: number;
  totalAmount: number;
  totalDiscountAmount: number | null;
  totalRefundedAmount: number | null;
  totalShippingAmount: number | null;
  totalTaxAmount: number | null;
}

export interface IOrder {
  id: ID;
  createdAt: Date;
  updatedAt: Date;
  adminNote: string | null;
  billingAddress: IAddress | null;
  clientInfo: IClientInfo | null;
  createdBy: ApiActor;
  currencyCode: string;
  customer: ICustomer | null;
  customerDetails: ICustomerDetails;
  customerStatistic: ICustomerStatistic | null;
  displayCurrencyCode: string | null;
  displayExchangeRate: number | null;
  externalSystemId: string | null;
  fulfillments: IFulfillment[];
  events: IOrderEvent[];
  orderNumber: number;
  paymentItem: IPaymentItem | null;
  paymentMethod: IPaymentMethod | null;
  shippingAddress: IAddress | null;
  shippingMethod: IShippingMethod | null;
  status: OrderStatusEnum;
  tags: ITag[];
  paymentSummary: IOrderPaymentSummary;
  productsInfo: IOrderProductInfo[];
  orderItems: IOrderItem[];
}

export interface ICustomerStatistic {
  authorizedOrders: number;
  guestOrders: number;
  totalRevenue: number;
}

export class Order {
  static create(data: ApiOrder): IOrder {
    const paymentItem = data.payment ? PaymentItem.create(data.payment) : null;
    const events = sanitizeEntries(data.events?.map(OrderEvent.create));
    const tags = sanitizeEntries(data.tags?.map(Tag.create));
    const orderItems = sanitizeEntries(
      data.orderItems?.map(Order.createItem) || [],
    );
    const fulfillments = sanitizeEntries(
      data.fulfillments?.map((it) => FulfillmentItem.create(it, orderItems)),
    );
    const shippingAddress = data.shippingAddress
      ? Order.createAddress(data.shippingAddress)
      : null;
    const billingAddress = data.billingAddress
      ? Order.createAddress(data.billingAddress)
      : null;
    const paymentMethod = data.paymentMethod
      ? PaymentMethod.create(data.paymentMethod)
      : null;
    const shippingMethod = data.shippingMethod
      ? ShippingMethod.create(data.shippingMethod)
      : null;
    const customerStatistic = data.customerStatistic
      ? {
          authorizedOrders: data.customerStatistic.totalAuthorizedOrders,
          guestOrders: data.customerStatistic.totalGuestOrders,
          totalRevenue: data.customerStatistic.totalRevenue,
        }
      : null;

    const productsInfo = sanitizeEntries(
      data.productsInfo?.map(OrderProductInfo.create || []),
    );

    return {
      updatedAt: new Date(data.updatedAt),
      customerStatistic,
      billingAddress,
      clientInfo: (data.clientInfo as IClientInfo) || null,
      createdAt: new Date(data.createdAt),
      customer: data.customer ? Customer.create(data.customer) : null,
      orderItems,
      customerDetails: {
        email: data.customerEmail || null,
        firstName: data.customerFirstName || null,
        lastName: data.customerLastName || null,
        meta: data.customerMeta || null,
        middleName: data.customerMiddleName || null,
        phone: data.customerPhone || null,
        note: data.customerNote || null,
      },
      id: data.id,
      orderNumber: data.orderNumber,
      fulfillments,
      productsInfo,
      adminNote: data.adminNote || null,
      createdBy: data.createdBy,
      currencyCode: data.currencyCode,
      displayCurrencyCode: data.displayCurrencyCode || null,
      displayExchangeRate: data.displayExchangeRate || null,
      externalSystemId: data.externalSystemId || null,
      events,
      paymentItem,
      paymentMethod,
      shippingAddress,
      shippingMethod,
      status: data.status,
      tags,
      paymentSummary: {
        subtotalAmount: data.subtotalAmount,
        totalAmount: data.totalAmount,
        totalDiscountAmount: data.totalDiscountAmount || null,
        totalRefundedAmount: data.totalRefundedAmount || null,
        totalShippingAmount: data.totalShippingAmount || null,
        totalTaxAmount: data.totalTaxAmount || null,
      },
    };
  }

  static createItem(data: ApiOrderItem): IOrderItem {
    return {
      createdAt: new Date(data.createdAt),
      id: data.id,
      quantity: data.quantity,
      originalQuantity: data.originalQuantity,
      fulfillmentQuantity: null,
      price: data.price,
      taxAmount: data.taxAmount ?? null,
      discountAmount: data.discountAmount ?? null,
      subtotalAmount: data.subtotalAmount,
      totalAmount: data.totalAmount,
      productCostPrice: data.productCostPrice ?? null,
      product: OrderProductInfo.create(data.productInfo),
      weight: data.weight || null,
    };
  }

  static createAddress(data: ApiAddress): IAddress {
    return {
      id: data.id,
      address1: data.address1 || null,
      address2: data.address2 || null,
      city: data.city || null,
      countryCode: data.countryCode || null,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      middleName: data.middleName || null,
      phone: data.phone || null,
      email: data.email || null,
      provinceCode: data.provinceCode || null,
      postalCode: data.postalCode || null,
      meta: data.meta || null,
    };
  }
}
