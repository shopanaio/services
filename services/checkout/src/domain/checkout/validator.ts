import { vo } from '@src/domain/shared/valueObjects';

export type CreateCheckoutValidationInput = {
  storeId: string;
  currencyCode: string;
  idempotencyKey: string;
  salesChannel: string | null | undefined;
  externalId?: string | null | undefined;
  localeCode?: string | null | undefined;
};

export type CreateCheckoutValidated = {
  storeId: string;
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
      storeId: input.storeId,
      currencyCode,
      idempotencyKey: input.idempotencyKey,
      salesChannel,
      externalId: input.externalId ?? null,
      localeCode: (input.localeCode ?? null),
    };
  }
}
