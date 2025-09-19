import { vo } from '@src/domain/shared/valueObjects';

export type CreateCheckoutValidationInput = {
  projectId: string;
  currencyCode: string;
  idempotencyKey: string;
  salesChannel: string | null | undefined;
  displayCurrencyCode: string | null | undefined;
  displayExchangeRate: number | null | undefined;
  externalId?: string | null | undefined;
  localeCode?: string | null | undefined;
};

export type CreateCheckoutValidated = {
  projectId: string;
  currencyCode: string;
  idempotencyKey: string;
  salesChannel: string;
  displayCurrencyCode: string | null;
  displayExchangeRate: number | null;
  externalId: string | null;
  localeCode: string | null;
};

export class CheckoutDomainValidator {
  static validateAndNormalizeCreate(input: CreateCheckoutValidationInput): CreateCheckoutValidated {
    vo.assertIdempotencyKey(input.idempotencyKey);
    const currencyCode = vo.normalizeCurrencyCode(input.currencyCode);

    const hasDisplayCode = input.displayCurrencyCode != null;
    const hasDisplayRate = input.displayExchangeRate != null;
    if (hasDisplayCode !== hasDisplayRate) {
      throw new Error('displayCurrencyCode and displayExchangeRate must be provided together or both null');
    }

    let normalizedDisplayCode: string | null = null;
    let normalizedDisplayRate: number | null = null;
    if (hasDisplayCode && hasDisplayRate) {
      normalizedDisplayCode = vo.normalizeCurrencyCode(input.displayCurrencyCode as string);
      // Fx > 0 — only if currencies differ
      if (normalizedDisplayCode !== currencyCode) {
        vo.assertFxRatePositive(input.displayExchangeRate as number);
      }
      normalizedDisplayRate = input.displayExchangeRate as number;
    }

    const salesChannel = vo.normalizeSalesChannel(input.salesChannel);
    return {
      projectId: input.projectId,
      currencyCode,
      idempotencyKey: input.idempotencyKey,
      salesChannel,
      displayCurrencyCode: normalizedDisplayCode,
      displayExchangeRate: normalizedDisplayRate,
      externalId: input.externalId ?? null,
      localeCode: (input.localeCode ?? null),
    };
  }
}
