import {
  IPaymentMethod,
  PaymentMethod,
} from '@src/entity/Services/PaymentMethod';
import { ApiPaymentItem, PaymentStatusEnum } from '@src/graphql';

export interface IPaymentItem {
  id: ID;
  amount: number;
  paymentMethod: IPaymentMethod | null;
  status: PaymentStatusEnum;
  meta: any;
}

export class PaymentItem {
  static create(data: ApiPaymentItem): IPaymentItem {
    return {
      amount: data.amount,
      paymentMethod: data.paymentMethod
        ? PaymentMethod.create(data.paymentMethod)
        : null,
      id: data.id,
      status: data.status,
      meta: data.meta,
    };
  }
}
