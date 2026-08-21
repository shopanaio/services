import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  EarningRule,
  Program,
  ProgramVersion,
  RewardDefinition,
  Tier,
  TierPolicy,
} from "../../repositories/models/index.js";
import { LoyaltyType } from "./LoyaltyType.js";
import { presentProgramRules } from "./policyIds.js";

@SubgraphReference()
export class LoyaltyProgramResolver extends LoyaltyType<string, Program> {
  async $preload() {
    const row = await this.$ctx.loaders.program.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty program ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyProgram);
  }
  code() {
    return this.$get("code");
  }
  name() {
    return this.$get("name");
  }
  status() {
    return this.$get("status");
  }
  async isDefault() {
    return (await this.$get("isDefault")) ?? false;
  }
  defaultCurrencyCode() {
    return this.$get("defaultCurrencyCode");
  }
  async metadata() {
    return (await this.$get("metadata")) ?? {};
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
  archivedAt() {
    return this.$get("archivedAt");
  }
  async activeVersion() {
    const versions = await this.$ctx.loaders.programVersions.load(this.$props);
    const version = versions.find(({ status }) => status === "ACTIVE");
    return version ? this.resolvers.programVersion(version.id) : null;
  }
  async versions() {
    const versions = await this.$ctx.loaders.programVersions.load(this.$props);
    return Promise.all(versions.map(({ id }) => this.resolvers.programVersion(id)));
  }
}

@SubgraphReference()
export class LoyaltyProgramVersionResolver extends LoyaltyType<string, ProgramVersion> {
  async $preload() {
    const row = await this.$ctx.loaders.programVersion.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(`Loyalty program version ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyProgramVersion);
  }
  async program() {
    return this.resolvers.program((await this.$get("programId"))!);
  }
  version() {
    return this.$get("version");
  }
  status() {
    return this.$get("status");
  }
  effectiveFrom() {
    return this.$get("effectiveFrom");
  }
  effectiveTo() {
    return this.$get("effectiveTo");
  }
  earningEnabled() {
    return this.$get("earningEnabled");
  }
  redemptionEnabled() {
    return this.$get("redemptionEnabled");
  }
  activationDelaySeconds() {
    return this.$get("activationDelaySeconds");
  }
  pointsExpiryDays() {
    return this.$get("pointsExpiryDays");
  }
  async earnPoints() {
    return String(await this.$get("earnPoints"));
  }
  async earnAmountMinor() {
    return String(await this.$get("earnAmountMinor"));
  }
  async minimumEligibleAmountMinor() {
    return String(await this.$get("minimumEligibleAmountMinor"));
  }
  async redeemPoints() {
    return String(await this.$get("redeemPoints"));
  }
  async redeemAmountMinor() {
    return String(await this.$get("redeemAmountMinor"));
  }
  async minimumRedeemPoints() {
    return String(await this.$get("minimumRedeemPoints"));
  }
  async maximumRedeemPointsPerOrder() {
    const value = await this.$get("maximumRedeemPointsPerOrder");
    return value === null ? null : String(value);
  }
  maximumOrderPercentageBps() {
    return this.$get("maximumOrderPercentageBps");
  }
  roundingMode() {
    return this.$get("roundingMode");
  }
  refundPolicy() {
    return this.$get("refundPolicy");
  }
  debtPolicy() {
    return this.$get("debtPolicy");
  }
  restoredPointsExpiryPolicy() {
    return this.$get("restoredPointsExpiryPolicy");
  }
  rulesSchemaVersion() {
    return this.$get("rulesSchemaVersion");
  }
  async rules() {
    return presentProgramRules((await this.$get("rules"))!);
  }
  async earningRules() {
    return Promise.all(
      (await this.$ctx.loaders.earningRulesByVersion.load(this.$props)).map(({ id }) =>
        this.resolvers.earningRule(id),
      ),
    );
  }
  async rewardDefinitions() {
    return Promise.all(
      (await this.$ctx.loaders.rewardDefinitionsByVersion.load(this.$props)).map(({ id }) =>
        this.resolvers.rewardDefinition(id),
      ),
    );
  }
  async tierPolicy() {
    const value = await this.$ctx.loaders.tierPolicyByVersion.load(this.$props);
    return value ? this.resolvers.tierPolicy(value.id) : null;
  }
  async tiers() {
    return Promise.all(
      (await this.$ctx.loaders.tiersByVersion.load(this.$props)).map(({ id }) =>
        this.resolvers.tier(id),
      ),
    );
  }
  async createdById() {
    const id = await this.$get("createdById");
    return id ? this.encodeId(id, GlobalIdEntity.User) : null;
  }
  async publishedById() {
    const id = await this.$get("publishedById");
    return id ? this.encodeId(id, GlobalIdEntity.User) : null;
  }
  createdAt() {
    return this.$get("createdAt");
  }
  publishedAt() {
    return this.$get("publishedAt");
  }
  referenceReconciliationStatus() {
    return this.$get("referenceReconciliationStatus");
  }
  referenceReconciliationCheckedAt() {
    return this.$get("referenceReconciliationCheckedAt");
  }
}

@SubgraphReference()
export class LoyaltyEarningRuleResolver extends LoyaltyType<string, EarningRule> {
  async $preload() {
    const row = await this.$ctx.loaders.earningRule.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty earning rule ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyEarningRule);
  }
  async programVersion() {
    return this.resolvers.programVersion((await this.$get("programVersionId"))!);
  }
  code() {
    return this.$get("code");
  }
  name() {
    return this.$get("name");
  }
  priority() {
    return this.$get("priority");
  }
  triggerType() {
    return this.$get("triggerType");
  }
  triggerSchemaVersion() {
    return this.$get("triggerSchemaVersion");
  }
  triggerConfig() {
    return this.$get("triggerConfig");
  }
  conditionSchemaVersion() {
    return this.$get("conditionSchemaVersion");
  }
  conditions() {
    return this.$get("conditions");
  }
  actionType() {
    return this.$get("actionType");
  }
  actionSchemaVersion() {
    return this.$get("actionSchemaVersion");
  }
  action() {
    return this.$get("action");
  }
  limitSchemaVersion() {
    return this.$get("limitSchemaVersion");
  }
  limits() {
    return this.$get("limits");
  }
  stopProcessing() {
    return this.$get("stopProcessing");
  }
  createdAt() {
    return this.$get("createdAt");
  }
}

@SubgraphReference()
export class LoyaltyRewardDefinitionResolver extends LoyaltyType<string, RewardDefinition> {
  async $preload() {
    const row = await this.$ctx.loaders.rewardDefinition.load(this.$props);
    if (!row)
      throw new PreloadNotFoundError(`Loyalty reward definition ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyRewardDefinition);
  }
  async programVersion() {
    return this.resolvers.programVersion((await this.$get("programVersionId"))!);
  }
  code() {
    return this.$get("code");
  }
  name() {
    return this.$get("name");
  }
  rewardType() {
    return this.$get("rewardType");
  }
  configurationSchemaVersion() {
    return this.$get("configurationSchemaVersion");
  }
  configuration() {
    return this.$get("configuration");
  }
  validityDays() {
    return this.$get("validityDays");
  }
  startsAt() {
    return this.$get("startsAt");
  }
  endsAt() {
    return this.$get("endsAt");
  }
  async issuanceLimit() {
    const value = await this.$get("issuanceLimit");
    return value === null ? null : String(value);
  }
  async perAccountLimit() {
    const value = await this.$get("perAccountLimit");
    return value === null ? null : String(value);
  }
  async issuedQuantity() {
    return String(await this.$ctx.kernel.repository.reward.countIssued(this.$props));
  }
  createdAt() {
    return this.$get("createdAt");
  }
}

@SubgraphReference()
export class LoyaltyTierResolver extends LoyaltyType<string, Tier> {
  async $preload() {
    const row = await this.$ctx.loaders.tier.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty tier ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyTier);
  }
  async programVersion() {
    return this.resolvers.programVersion((await this.$get("programVersionId"))!);
  }
  code() {
    return this.$get("code");
  }
  name() {
    return this.$get("name");
  }
  rank() {
    return this.$get("rank");
  }
  qualificationSchemaVersion() {
    return this.$get("qualificationSchemaVersion");
  }
  qualification() {
    return this.$get("qualification");
  }
  maintenance() {
    return this.$get("maintenance");
  }
  async rewardBenefits() {
    return Promise.all(
      (await this.$ctx.loaders.tierRewardBenefits.load(this.$props)).map(({ id }) =>
        this.resolvers.tierRewardBenefit(id),
      ),
    );
  }
  createdAt() {
    return this.$get("createdAt");
  }
}

@SubgraphReference()
export class LoyaltyTierPolicyResolver extends LoyaltyType<string, TierPolicy> {
  async $preload() {
    const row = await this.$ctx.loaders.tierPolicy.load(this.$props);
    if (!row) throw new PreloadNotFoundError(`Loyalty tier policy ${this.$props} was not found`);
    return row;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.LoyaltyTierPolicy);
  }
  async programVersion() {
    return this.resolvers.programVersion((await this.$get("programVersionId"))!);
  }
  windowType() {
    return this.$get("windowType");
  }
  rollingWindowDays() {
    return this.$get("rollingWindowDays");
  }
  calendarPeriod() {
    return this.$get("calendarPeriod");
  }
  programYearStartsMonth() {
    return this.$get("programYearStartsMonth");
  }
  membershipDurationDays() {
    return this.$get("membershipDurationDays");
  }
  gracePeriodDays() {
    return this.$get("gracePeriodDays");
  }
  downgradePolicy() {
    return this.$get("downgradePolicy");
  }
  requalificationPolicy() {
    return this.$get("requalificationPolicy");
  }
  metricSchemaVersion() {
    return this.$get("metricSchemaVersion");
  }
  createdAt() {
    return this.$get("createdAt");
  }
}
