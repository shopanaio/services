import { IOrder } from '@src/entity/Order/Order';
import { ApiCustomer } from '@src/graphql';

export interface ICustomer {
  createdAt: Date;
  email: string;
  firstName: string;
  id: ID;
  isBlocked: boolean;
  isVerified: boolean;
  lastName: string;
  phone: string | null;
  updatedAt: Date;
  language: string | null;
  orders: IOrder[];
}

export class Customer {
  static create(data: ApiCustomer): ICustomer {
    return {
      createdAt: new Date(data.createdAt),
      email: data.email,
      firstName: data.firstName,
      id: data.id,
      isBlocked: !!data.isBlocked,
      isVerified: data.isVerified,
      lastName: data.lastName,
      phone: data.phone || null,
      updatedAt: new Date(data.updatedAt),
      language: data.language || null,
      orders: [], //data.orders || [],
    };
  }
}
