import { vo } from "@src/domain/shared/valueObjects";

export type CreateOrderValidationInput = {
  storeId: string;
  currencyCode: string;
};

export type CreateOrderValidated = {
  storeId: string;
  currencyCode: string;
};

export class OrderDomainValidator {
  static validateAndNormalizeCreate(input: CreateOrderValidationInput): CreateOrderValidated {
    return {
      storeId: input.storeId,
      currencyCode: input.currencyCode,
    };
  }
}
