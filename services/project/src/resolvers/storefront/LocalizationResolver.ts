import { GraphQLError } from "graphql";
import type { CurrencyCode, LocaleCode } from "@shopana/shared-references";
import type { MarketSnapshot } from "../../repositories/market/MarketRepository.js";
import { ProjectType } from "./ProjectType.js";
import {
  countryValue,
  currencyValue,
  languageValue,
} from "./referenceValues.js";

interface LocalizationInput {
  storeId: string;
  marketId: string;
}

export class LocalizationResolver extends ProjectType<
  LocalizationInput,
  MarketSnapshot
> {
  async $preload() {
    if (this.$ctx.storefrontStore?.id !== this.$props.storeId) {
      throw new GraphQLError("Store is outside the storefront scope", {
        extensions: { code: "FORBIDDEN" },
      });
    }
    const snapshot = await this.$ctx.loaders.market.load(this.$props.marketId);
    if (!snapshot) {
      throw new GraphQLError("The storefront market is unavailable", {
        extensions: { code: "STORE_CONFIGURATION_ERROR" },
      });
    }
    return snapshot;
  }

  store() {
    return this.resolvers.store(this.$props.storeId);
  }

  market() {
    return this.resolvers.market(this.$props.marketId);
  }

  async country() {
    const { countries } = await this.$data;
    const country =
      countries.find(({ isPrimary }) => isPrimary) ?? countries[0];
    if (!country) {
      throw this.configurationError("country");
    }
    return countryValue(country.countryCode);
  }

  async language() {
    const { market } = await this.$data;
    return languageValue(market.defaultLocaleCode as LocaleCode);
  }

  async currency() {
    const { market } = await this.$data;
    return currencyValue(market.defaultCurrencyCode as CurrencyCode);
  }

  async availableCountries() {
    const { countries } = await this.$data;
    return countries.map(({ countryCode }) => countryValue(countryCode));
  }

  async availableLanguages() {
    const { locales } = await this.$data;
    return locales.map(({ localeCode }) => languageValue(localeCode));
  }

  async availableCurrencies() {
    const { currencies } = await this.$data;
    return currencies.map(({ currencyCode }) => currencyValue(currencyCode));
  }

  private configurationError(field: string) {
    return new GraphQLError(`The storefront market has no ${field}`, {
      extensions: { code: "STORE_CONFIGURATION_ERROR" },
    });
  }
}
