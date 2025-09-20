import { vo } from "@src/domain/shared/valueObjects";

export type CreateOrderValidationInput = {
  projectId: string;
  currencyCode: string;
};

export type CreateOrderValidated = {
  projectId: string;
  currencyCode: string;
};

export class OrderDomainValidator {
  static validateAndNormalizeCreate(
    input: CreateOrderValidationInput
  ): CreateOrderValidated {
    return {
      projectId: input.projectId,
      currencyCode: input.currencyCode,
    };
  }
}
