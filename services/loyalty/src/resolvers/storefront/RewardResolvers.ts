import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { RewardEntitlement } from "../../repositories/models/index.js";
import type { AvailableRewardConnectionInput } from "../../repositories/reward/RewardRepository.js";
import { LoyaltyStorefrontType } from "./LoyaltyStorefrontType.js";
import { copyFrom, rewardFromConfiguration } from "./StorefrontPresentation.js";
import { BaseStorefrontConnectionResolver } from "./connection/BaseConnectionResolver.js";

export class LoyaltyAvailableRewardConnectionResolver extends BaseStorefrontConnectionResolver<AvailableRewardConnectionInput> {
  $preload() {
    return this.$ctx.kernel.repository.reward.getAvailableConnection(this.$props);
  }
  protected createNodeResolver(id: string) {
    return this.resolvers.availableReward(id);
  }
  async nodes() {
    const edges = await this.$get("edges");
    return Promise.all((edges ?? []).map(({ nodeId }) => this.resolvers.availableReward(nodeId)));
  }
}

export class LoyaltyAvailableRewardResolver extends LoyaltyStorefrontType<
  string,
  RewardEntitlement
> {
  async $preload() {
    const row = await this.$ctx.loaders.rewardEntitlement.load(this.$props);
    const now = Date.parse(this.$ctx.loaders.effectiveAt);
    if (
      !row ||
      row.status !== "ISSUED" ||
      Date.parse(row.validFrom) > now ||
      (row.validTo !== null && Date.parse(row.validTo) <= now)
    ) {
      throw new PreloadNotFoundError(`Loyalty reward ${this.$props} was not found`);
    }
    const account = await this.$ctx.loaders.account.load(row.accountId);
    if (!account || account.customerId !== this.$ctx.customer?.id) {
      throw new PreloadNotFoundError(`Loyalty reward ${this.$props} was not found`);
    }
    return row;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyAvailableReward);
  }

  async reward() {
    const definition = await this.definition();
    const configuration = (await this.$get("configurationSnapshot"))!;
    const copy = copyFrom(
      configuration,
      this.$ctx.customer?.language ?? this.$ctx.locale,
      definition.name,
    );
    return rewardFromConfiguration(
      definition.rewardType,
      configuration,
      copy,
      (await this.$get("externalReference"))!,
      this.$ctx,
      (await this.$get("quantity"))!,
    );
  }

  async presentation() {
    const definition = await this.definition();
    return copyFrom(
      (await this.$get("configurationSnapshot"))!,
      this.$ctx.customer?.language ?? this.$ctx.locale,
      definition.name,
    );
  }

  issuedAt() {
    return this.$get("issuedAt");
  }
  validUntil() {
    return this.$get("validTo");
  }
  async revision() {
    const { canonicalHash } = await import("../../application/math.js");
    return canonicalHash({
      id: this.$props,
      updatedAt: await this.$get("updatedAt"),
      status: await this.$get("status"),
      validFrom: await this.$get("validFrom"),
      validTo: await this.$get("validTo"),
    });
  }

  private async definition() {
    const definition = await this.$ctx.loaders.rewardDefinition.load(
      (await this.$get("rewardDefinitionId"))!,
    );
    if (!definition) throw new PreloadNotFoundError("Loyalty reward definition was not found");
    return definition;
  }
}
