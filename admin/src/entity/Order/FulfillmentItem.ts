import { IOrderItem } from '@src/entity/Order/Order';
import { IShippingItem, ShippingItem } from '@src/entity/Order/ShippingItem';
import { sanitizeEntries } from '@src/entity/utils';
import { ApiFulfillment, FulfillmentStatusEnum } from '@src/graphql';

export interface IFulfillment {
  id: ID;
  createdAt: Date;
  parentId: ID | null;
  orderItems: IOrderItem[];
  shippingItem: IShippingItem | null;
  status: FulfillmentStatusEnum;
}

export class FulfillmentItem {
  static create(data: ApiFulfillment, orderItems: IOrderItem[]): IFulfillment {
    return {
      id: data.id,
      parentId: data.parentId || null,
      createdAt: new Date(data.createdAt),
      orderItems: sanitizeEntries(
        orderItems.map((it) => {
          const fulfillmentItem = data.items.find(
            (item) => item.orderItemId === it.id,
          );
          if (!fulfillmentItem) {
            return null;
          }

          return {
            ...it,
            fulfillmentQuantity: fulfillmentItem.quantity,
          };
        }),
      ),
      shippingItem: data.shippingItem
        ? ShippingItem.create(data.shippingItem)
        : null,
      status: data.status,
    };
  }
}
