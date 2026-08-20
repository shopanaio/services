import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { LoyaltyStorefrontType } from "./LoyaltyStorefrontType.js";
import { StorefrontPresentationService } from "./StorefrontPresentation.js";

export class CustomerFederationResolver extends LoyaltyStorefrontType<string> {
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Customer);
  }
  async loyaltyAccount() {
    this.requireReadPermission();
    const customer = this.$ctx.customer;
    if (!customer || customer.id !== this.$props || customer.isBlocked) return null;
    const program = await this.$ctx.loaders.activeProgram.load(this.$ctx.store.id);
    if (!program) return null;
    const account = await this.$ctx.loaders.accountByCustomerProgram.load({
      customerId: this.$props,
      programId: program.id,
    });
    return account && account.status !== "MERGED" ? this.resolvers.account(account.id) : null;
  }
}

export class ProductFederationResolver extends LoyaltyStorefrontType<string> {
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.Product);
  }
  loyalty() {
    this.requireReadPermission();
    return new StorefrontPresentationService(this.$ctx).product(this.$props);
  }
}

export class ProductVariantFederationResolver extends LoyaltyStorefrontType<string> {
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ProductVariant);
  }
  loyalty() {
    this.requireReadPermission();
    return new StorefrontPresentationService(this.$ctx).variant(this.$props);
  }
}
