import {
  IShippingMethod,
  ShippingMethod,
} from '@src/entity/Services/ShippingMethod';
import {
  IShippingService,
  ShippingService,
} from '@src/entity/Services/ShippingService';
import { ApiShippingItem } from '@src/graphql';

export interface IShippingItem {
  id: ID;
  createdAt: Date;
  estimatedDeliveryAt: Date | null;
  notificationsEnabled: boolean;
  shippingMethod: IShippingMethod | null;
  shippingPrice: number | null;
  shippingService: IShippingService | null;
  trackingCode: string | null;
  trackingData: any;
  trackingEnabled: boolean;
  trackingUrl: string | null;
}

export class ShippingItem {
  static create(data: ApiShippingItem): IShippingItem {
    return {
      trackingCode: data.trackingCode || null,
      id: data.id,
      createdAt: new Date(data.createdAt),
      notificationsEnabled: !!data.notificationsEnabled,
      estimatedDeliveryAt: data.estimatedDeliveryAt
        ? new Date(data.estimatedDeliveryAt)
        : null,
      trackingEnabled: data.trackingEnabled,
      trackingUrl: data.trackingUrl || null,
      shippingPrice: data.shippingPrice || null,
      trackingData: data.trackingData,
      shippingService: data.shippingService
        ? ShippingService.create(data.shippingService)
        : null,
      shippingMethod: data.shippingMethod
        ? ShippingMethod.create(data.shippingMethod)
        : null,
    };
  }
}
