import {
  IShippingService,
  ShippingService,
} from '@src/entity/Services/ShippingService';
import { ApiShippingMethod } from '@src/graphql';

export interface IShippingMethod {
  id: string;
  name: string;
  service: IShippingService | null;
}

export class ShippingMethod {
  static create(data: ApiShippingMethod): IShippingMethod | null {
    return {
      id: data.code,
      name: data.name,
      service: data.service ? ShippingService.create(data.service) : null,
    };
  }
}
