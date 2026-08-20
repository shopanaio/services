import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { CurrencyCode, LocaleCode } from "@shopana/shared-references";
import type { MarketSnapshot } from "../../repositories/market/MarketRepository.js";
import { ProjectType } from "./ProjectType.js";
import { countryValue, currencyValue, languageValue } from "./referenceValues.js";

@SubgraphReference()
export class MarketResolver extends ProjectType<string, MarketSnapshot> {
  async $preload() {
    const snapshot = await this.$ctx.loaders.market.load(this.$props);
    if (!snapshot) {
      throw new PreloadNotFoundError(`Market with ID ${this.$props} not found`);
    }
    return snapshot;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Market);
  }

  async handle() {
    const { market } = await this.$data;
    return market.code;
  }

  async name() {
    const { market } = await this.$data;
    return market.name;
  }

  async countries() {
    const { countries } = await this.$data;
    return countries.map(({ countryCode }) => countryValue(countryCode));
  }

  async languages() {
    const { locales } = await this.$data;
    return locales.map(({ localeCode }) => languageValue(localeCode));
  }

  async currencies() {
    const { currencies } = await this.$data;
    return currencies.map(({ currencyCode }) => currencyValue(currencyCode));
  }

  async defaultCountry() {
    const { countries } = await this.$data;
    const item = countries.find(({ isPrimary }) => isPrimary);
    return item ? countryValue(item.countryCode) : null;
  }

  async defaultLanguage() {
    const { market } = await this.$data;
    return languageValue(market.defaultLocaleCode as LocaleCode);
  }

  async defaultCurrency() {
    const { market } = await this.$data;
    return currencyValue(market.defaultCurrencyCode as CurrencyCode);
  }

  async timezone() {
    const { market } = await this.$data;
    return market.timezone;
  }

  async taxIncluded() {
    const { market } = await this.$data;
    return market.taxIncluded;
  }
}
