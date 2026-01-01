import { ApiCurrency } from '@src/graphql';

export enum CurrencyEnum {
  en = 'en',
}

export interface ICurrency {
  title: string;
  code: CurrencyEnum;
  isActive?: boolean;
}

export class Currency {
  static create(data: ApiCurrency): ICurrency | null {
    try {
      return {
        title: data.title,
        code: data.code as CurrencyEnum,
        isActive: data.isActive,
      };
    } catch (e) {
      console.error('Currency construction failed');
      return null;
    }
  }
}
