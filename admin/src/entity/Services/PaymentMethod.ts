import {
  IPaymentService,
  PaymentService,
} from '@src/entity/Services/PaymentService';
import { ApiPaymentMethod } from '@src/graphql';

export interface IPaymentMethod {
  service: IPaymentService | null;
  id: string;
  name: string;
}

export class PaymentMethod {
  static create(data: ApiPaymentMethod): IPaymentMethod | null {
    return {
      id: data.code,
      name: data.name,
      service: PaymentService.create(data.service),
    };
  }
}
