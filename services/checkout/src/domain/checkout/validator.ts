import { vo } from '@src/domain/shared/valueObjects';

export type CreateCheckoutValidationInput = {
  projectId: string;
  currencyCode: string;
  idempotencyKey: string;
  salesChannel: string | null | undefined;
  externalId?: string | null | undefined;
  localeCode?: string | null | undefined;
};

export type CreateCheckoutValidated = {
  projectId: string;
  currencyCode: string;
  idempotencyKey: string;
  salesChannel: string;
  externalId: string | null;
  localeCode: string | null;
};

export class CheckoutDomainValidator {
  static validateAndNormalizeCreate(input: CreateCheckoutValidationInput): CreateCheckoutValidated {
    vo.assertIdempotencyKey(input.idempotencyKey);
    const currencyCode = vo.normalizeCurrencyCode(input.currencyCode);

    const salesChannel = vo.normalizeSalesChannel(input.salesChannel);
    return {
      projectId: input.projectId,
      currencyCode,
      idempotencyKey: input.idempotencyKey,
      salesChannel,
      externalId: input.externalId ?? null,
      localeCode: (input.localeCode ?? null),
    };
  }
}
