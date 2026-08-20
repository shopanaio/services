import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { Store } from "../../repositories/store/StoreRepository.js";
import type { StoreSettingsSnapshot } from "../../repositories/storeSettings/StoreSettingsRepository.js";
import { ProjectType } from "./ProjectType.js";

@SubgraphReference()
export class StoreResolver extends ProjectType<string, Store> {
  async $preload() {
    const item = await this.$ctx.loaders.store.load(this.$props);
    if (!item || item.status !== "active") {
      throw new PreloadNotFoundError(`Store with ID ${this.$props} not found`);
    }
    return item;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Store);
  }

  async handle() {
    return this.$get("name");
  }

  async name() {
    return this.$get("displayName");
  }

  async description() {
    const { brand } = await this.settings();
    return brand?.shortDescription ?? null;
  }

  async email() {
    return this.$get("email");
  }

  async timezone() {
    return this.$get("timezone");
  }

  async defaultLocale() {
    return this.$get("defaultLocale");
  }

  async defaultCurrency() {
    return this.$get("currencyCode");
  }

  async contact() {
    const [store, settings] = await Promise.all([this.$data, this.settings()]);
    return {
      name: store.displayName,
      email: store.email,
      phoneNumbers: settings.phones.map(({ phoneNumber }) => phoneNumber),
    };
  }

  async address() {
    const { address } = await this.settings();
    if (!address) return null;
    return {
      companyName: address.companyName,
      countryCode: address.countryCode,
      address1: address.addressLine1,
      address2: address.addressLine2,
      city: address.city,
      province: address.administrativeArea,
      postalCode: address.postalCode,
    };
  }

  async brand() {
    const { brand, socialLinks } = await this.settings();
    return {
      logo: this.mediaImageReference(brand?.defaultLogoMediaId ?? null),
      squareLogo: this.mediaImageReference(brand?.squareLogoMediaId ?? null),
      coverImage: this.mediaImageReference(brand?.coverImageMediaId ?? null),
      primaryColor: brand?.primaryColor ?? "#1677FF",
      secondaryColor: brand?.secondaryColor ?? "#101112",
      slogan: brand?.slogan ?? null,
      shortDescription: brand?.shortDescription ?? null,
      socialLinks: socialLinks.map(({ platform, url }) => ({ platform, url })),
    };
  }

  markets(args: {
    first?: number | null;
    after?: string | null;
    last?: number | null;
    before?: string | null;
  }) {
    return this.resolvers.marketConnection({
      storeId: this.$props,
      first: args.last == null ? args.first : undefined,
      after: args.after,
      last: args.last,
      before: args.before,
    });
  }

  private settings(): Promise<StoreSettingsSnapshot> {
    return this.$ctx.loaders.storeSettings.load(this.$props).then((settings) => {
      if (!settings) {
        throw new PreloadNotFoundError(`Store settings for ID ${this.$props} not found`);
      }
      return settings;
    });
  }

  private mediaImageReference(id: string | null) {
    return id
      ? {
          __typename: "MediaImage" as const,
          id: this.encodeId(id, GlobalIdEntity.File),
        }
      : null;
  }
}
