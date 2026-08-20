import { GlobalIdEntity, type GlobalIdType } from "@shopana/shared-graphql-guid";
import { ApolloMutation, TypePolicy, ZodResolver } from "@shopana/type-resolver";
import { AccountLifecycleService } from "../../application/accounts/AccountLifecycleService.js";
import { CheckoutRedemptionService } from "../../application/checkout/CheckoutRedemptionService.js";
import { PointsLedgerService } from "../../application/ledger/PointsLedgerService.js";
import { RewardEntitlementService } from "../../application/rewards/RewardEntitlementService.js";
import { TierEvaluationService } from "../../application/tiers/TierEvaluationService.js";
import { MonetaryWalletService } from "../../application/wallet/MonetaryWalletService.js";
import { LoyaltyDomainError } from "../../application/errors.js";
import { canonicalHash } from "../../application/math.js";
import { ProgramLifecycleService } from "../../application/program/ProgramLifecycleService.js";
import { BrokerLoyaltyReferenceValidator } from "../../application/program/BrokerLoyaltyReferenceValidator.js";
import type { ManualLoyaltyAdjustmentResult } from "../../workflows/ManualAdjustmentWorkflow.js";
import {
  LoyaltyAccountBalanceRebuildInputSchema,
  LoyaltyAccountStatusUpdateInputSchema,
  LoyaltyEarningRuleCreateInputSchema,
  LoyaltyEarningRuleDeleteInputSchema,
  LoyaltyEarningRuleUpdateInputSchema,
  LoyaltyMaintenanceRunInputSchema,
  LoyaltyMonetaryWalletAdjustInputSchema,
  LoyaltyMonetaryWalletBalanceRebuildInputSchema,
  LoyaltyMonetaryWalletStatusUpdateInputSchema,
  LoyaltyPointsAdjustInputSchema,
  LoyaltyPointsConvertToMonetaryInputSchema,
  LoyaltyProgramCreateInputSchema,
  LoyaltyProgramUpdateInputSchema,
  LoyaltyProgramVersionCreateInputSchema,
  LoyaltyProgramVersionDeleteInputSchema,
  LoyaltyProgramVersionPublishInputSchema,
  LoyaltyProgramVersionUpdateInputSchema,
  LoyaltyReservationReleaseInputSchema,
  LoyaltyRewardDefinitionCreateInputSchema,
  LoyaltyRewardDefinitionDeleteInputSchema,
  LoyaltyRewardDefinitionUpdateInputSchema,
  LoyaltyRewardEntitlementIssueInputSchema,
  LoyaltyRewardEntitlementTransitionInputSchema,
  LoyaltyTierCreateInputSchema,
  LoyaltyTierDeleteInputSchema,
  LoyaltyTierEvaluateInputSchema,
  LoyaltyTierMembershipRevokeInputSchema,
  LoyaltyTierPolicyDeleteInputSchema,
  LoyaltyTierPolicyUpsertInputSchema,
  LoyaltyTierRewardBenefitCreateInputSchema,
  LoyaltyTierRewardBenefitDeleteInputSchema,
  LoyaltyTierUpdateInputSchema,
} from "./generated/schemas.js";
import type {
  LoyaltyMutationAccountBalanceRebuildArgs,
  LoyaltyMutationAccountStatusUpdateArgs,
  LoyaltyMutationEarningRuleCreateArgs,
  LoyaltyMutationEarningRuleDeleteArgs,
  LoyaltyMutationEarningRuleUpdateArgs,
  LoyaltyMutationMaintenanceRunArgs,
  LoyaltyMutationMonetaryWalletAdjustArgs,
  LoyaltyMutationMonetaryWalletBalanceRebuildArgs,
  LoyaltyMutationMonetaryWalletStatusUpdateArgs,
  LoyaltyMutationPointsAdjustArgs,
  LoyaltyMutationPointsConvertToMonetaryArgs,
  LoyaltyMutationProgramCreateArgs,
  LoyaltyMutationProgramUpdateArgs,
  LoyaltyMutationProgramVersionCreateArgs,
  LoyaltyMutationProgramVersionDeleteArgs,
  LoyaltyMutationProgramVersionPublishArgs,
  LoyaltyMutationProgramVersionUpdateArgs,
  LoyaltyMutationReservationReleaseArgs,
  LoyaltyMutationRewardDefinitionCreateArgs,
  LoyaltyMutationRewardDefinitionDeleteArgs,
  LoyaltyMutationRewardDefinitionUpdateArgs,
  LoyaltyMutationRewardEntitlementIssueArgs,
  LoyaltyMutationRewardEntitlementReleaseArgs,
  LoyaltyMutationRewardEntitlementRevokeArgs,
  LoyaltyMutationTierCreateArgs,
  LoyaltyMutationTierDeleteArgs,
  LoyaltyMutationTierEvaluateArgs,
  LoyaltyMutationTierMembershipRevokeArgs,
  LoyaltyMutationTierPolicyDeleteArgs,
  LoyaltyMutationTierPolicyUpsertArgs,
  LoyaltyMutationTierRewardBenefitCreateArgs,
  LoyaltyMutationTierRewardBenefitDeleteArgs,
  LoyaltyMutationTierUpdateArgs,
} from "./generated/types.js";
import { LoyaltyType } from "./LoyaltyType.js";
import { normalizeProgramRulesInput } from "./policyIds.js";

type UserError = { message: string; field: string[]; code: string; retryable: boolean };

@ApolloMutation
export class MutationResolver extends LoyaltyType<Record<string, never>> {
  loyaltyMutation() {
    return this.resolvers.loyaltyMutation();
  }
}

@TypePolicy<LoyaltyMutationResolver>({
  resource: "store.data",
  action: "write",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class LoyaltyMutationResolver extends LoyaltyType<Record<string, never>> {
  @ZodResolver(LoyaltyProgramCreateInputSchema())
  async programCreate({ input }: LoyaltyMutationProgramCreateArgs) {
    return this.result("program", async () => {
      const program = await this.configMutation(
        "programCreate",
        input,
        "PROGRAM",
        (id) => this.$ctx.kernel.repository.program.findById(id),
        () =>
          this.programs.createProgram({
            code: input.code,
            name: input.name,
            status: "DRAFT",
            isDefault: input.isDefault ?? false,
            defaultCurrencyCode: input.defaultCurrencyCode,
            metadata: input.metadata ?? {},
            archivedAt: null,
          }),
      );
      this.$ctx.loaders.program.clear(program.id).prime(program.id, program);
      return this.resolvers.program(program.id);
    });
  }

  @ZodResolver(LoyaltyProgramUpdateInputSchema())
  async programUpdate({ input }: LoyaltyMutationProgramUpdateArgs) {
    return this.result("program", async () => {
      const programId = this.decodeId(input.programId, GlobalIdEntity.LoyaltyProgram);
      const program = await this.configMutation(
        "programUpdate",
        input,
        "PROGRAM",
        (id) => this.$ctx.kernel.repository.program.findById(id),
        () =>
          this.programs.updateProgram(
            programId,
            {
              name: input.name ?? undefined,
              status: input.status ?? undefined,
              isDefault: input.isDefault ?? undefined,
              metadata: input.metadata ?? undefined,
            },
            input.expectedRevision,
          ),
      );
      this.$ctx.loaders.program.clear(program.id).prime(program.id, program);
      return this.resolvers.program(program.id);
    });
  }

  @ZodResolver(LoyaltyProgramVersionCreateInputSchema())
  async programVersionCreate({ input }: LoyaltyMutationProgramVersionCreateArgs) {
    return this.result("programVersion", async () => {
      const programId = this.decodeId(input.programId, GlobalIdEntity.LoyaltyProgram);
      const version = await this.configMutation(
        "programVersionCreate",
        input,
        "PROGRAM_VERSION",
        (id) => this.$ctx.kernel.repository.program.findVersionById(id),
        () =>
          this.programs.createDraftVersion(
            programId,
            {
              effectiveFrom: input.effectiveFrom ?? null,
              effectiveTo: input.effectiveTo ?? null,
              earningEnabled: input.earningEnabled ?? true,
              redemptionEnabled: input.redemptionEnabled ?? true,
              activationDelaySeconds: input.activationDelaySeconds ?? 0,
              pointsExpiryDays: input.pointsExpiryDays ?? null,
              earnPoints: BigInt(input.earnPoints),
              earnAmountMinor: BigInt(input.earnAmountMinor),
              minimumEligibleAmountMinor: BigInt(input.minimumEligibleAmountMinor ?? "0"),
              redeemPoints: BigInt(input.redeemPoints),
              redeemAmountMinor: BigInt(input.redeemAmountMinor),
              minimumRedeemPoints: BigInt(input.minimumRedeemPoints ?? "1"),
              maximumRedeemPointsPerOrder:
                input.maximumRedeemPointsPerOrder == null
                  ? null
                  : BigInt(input.maximumRedeemPointsPerOrder),
              maximumOrderPercentageBps: input.maximumOrderPercentageBps ?? 10_000,
              roundingMode: input.roundingMode ?? "DOWN",
              refundPolicy: input.refundPolicy ?? "PROPORTIONAL",
              debtPolicy: input.debtPolicy ?? "TRACK_DEBT",
              restoredPointsExpiryPolicy: input.restoredPointsExpiryPolicy ?? "ORIGINAL_EXPIRY",
              createdById: this.$ctx.user.id,
              rules: normalizeProgramRulesInput(
                input.rules as unknown as Record<string, unknown>,
              ) as never,
            },
            {
              expectedProgramRevision: input.expectedProgramRevision,
              earningRules: (input.earningRules ?? []).map((rule) => ({
                code: rule.code,
                name: rule.name,
                priority: rule.priority ?? 0,
                triggerType: rule.triggerType,
                triggerSchemaVersion: rule.triggerSchemaVersion ?? 1,
                triggerConfig: rule.triggerConfig ?? {},
                conditionSchemaVersion: rule.conditionSchemaVersion ?? 1,
                conditions: rule.conditions,
                actionType: rule.actionType,
                actionSchemaVersion: rule.actionSchemaVersion ?? 1,
                action: rule.action,
                limitSchemaVersion: rule.limitSchemaVersion ?? 1,
                limits: normalizeEarningLimits(rule.limits),
                stopProcessing: rule.stopProcessing ?? false,
              })),
              rewardDefinitions: (input.rewardDefinitions ?? []).map((definition) => ({
                code: definition.code,
                name: definition.name,
                rewardType: definition.rewardType,
                configurationSchemaVersion: definition.configurationSchemaVersion ?? 1,
                configuration: definition.configuration,
                validityDays: definition.validityDays ?? null,
                startsAt: definition.startsAt ?? null,
                endsAt: definition.endsAt ?? null,
                issuanceLimit:
                  definition.issuanceLimit == null ? null : BigInt(definition.issuanceLimit),
                perAccountLimit:
                  definition.perAccountLimit == null ? null : BigInt(definition.perAccountLimit),
              })),
              tierPolicy: input.tierPolicy
                ? {
                    windowType: input.tierPolicy.windowType,
                    rollingWindowDays: input.tierPolicy.rollingWindowDays ?? null,
                    calendarPeriod: input.tierPolicy.calendarPeriod ?? null,
                    programYearStartsMonth: input.tierPolicy.programYearStartsMonth ?? null,
                    membershipDurationDays: input.tierPolicy.membershipDurationDays ?? null,
                    gracePeriodDays: input.tierPolicy.gracePeriodDays ?? 0,
                    downgradePolicy: input.tierPolicy.downgradePolicy ?? "IMMEDIATE",
                    requalificationPolicy: input.tierPolicy.requalificationPolicy ?? "AUTOMATIC",
                    metricSchemaVersion: input.tierPolicy.metricSchemaVersion ?? 1,
                  }
                : null,
              tiers: (input.tiers ?? []).map((tier) => ({
                code: tier.code,
                name: tier.name,
                rank: tier.rank,
                qualificationSchemaVersion: tier.qualificationSchemaVersion ?? 1,
                qualification: tier.qualification,
                maintenance: tier.maintenance ?? null,
              })),
            },
          ),
      );
      this.$ctx.loaders.programVersion.clear(version.id).prime(version.id, version);
      this.$ctx.loaders.programVersions.clear(programId);
      return this.resolvers.programVersion(version.id);
    });
  }

  @ZodResolver(LoyaltyProgramVersionPublishInputSchema())
  async programVersionPublish({ input }: LoyaltyMutationProgramVersionPublishArgs) {
    return this.result("programVersion", async () => {
      const versionId = this.decodeId(input.programVersionId, GlobalIdEntity.LoyaltyProgramVersion);
      const version = await this.configMutation(
        "programVersionPublish",
        input,
        "PROGRAM_VERSION",
        (id) => this.$ctx.kernel.repository.program.findVersionById(id),
        () =>
          this.programs.publishVersion({
            versionId,
            expectedRevision: input.expectedRevision,
            effectiveFrom: input.effectiveFrom,
            effectiveTo: input.effectiveTo,
            publishedAt: new Date().toISOString(),
            publishedById: this.$ctx.user.id,
          }),
      );
      this.$ctx.loaders.programVersion.clear(version.id).prime(version.id, version);
      this.$ctx.loaders.programVersions.clear(version.programId);
      this.$ctx.loaders.program.clear(version.programId);
      return this.resolvers.programVersion(version.id);
    });
  }

  @ZodResolver(LoyaltyAccountStatusUpdateInputSchema())
  async accountStatusUpdate({ input }: LoyaltyMutationAccountStatusUpdateArgs) {
    return this.result("account", async () => {
      if (input.status === "MERGED") {
        throw new LoyaltyDomainError(
          "INVALID_ACCOUNT_STATUS",
          "MERGED is managed only by customer merge",
        );
      }
      const accountId = this.decodeId(input.accountId, GlobalIdEntity.LoyaltyAccount);
      const account = await new AccountLifecycleService(this.$ctx.kernel.repository).changeStatus({
        accountId,
        status: input.status,
        reason: input.reason,
        occurredAt: new Date().toISOString(),
        expectedRevision: input.expectedRevision,
      });
      this.$ctx.loaders.account.clear(account.id).prime(account.id, account);
      return this.resolvers.account(account.id);
    });
  }

  @ZodResolver(LoyaltyPointsAdjustInputSchema())
  async pointsAdjust({ input }: LoyaltyMutationPointsAdjustArgs) {
    try {
      const accountId = this.decodeId(input.accountId, GlobalIdEntity.LoyaltyAccount);
      const occurredAt = new Date().toISOString();
      const requestHash = canonicalHash({ ...input, accountId });
      const result = (await this.$ctx.kernel.getServices().broker.runWorkflow(
        "loyalty.adjustPoints",
        {
          storeId: this.$ctx.store.id,
          accountId,
          expectedBalanceRevision: input.expectedBalanceRevision,
          points: input.points,
          direction: input.direction,
          reasonCode: input.reasonCode,
          description: input.description,
          actorId: this.$ctx.user.id,
          occurredAt,
          idempotencyKey: input.idempotencyKey,
          requestHash,
          expiresAt: input.expiresAt,
          metadata: input.metadata,
        },
        {
          source: "content",
          resourceId: accountId,
          operation: "adjustLoyaltyPoints",
          contentHash: requestHash,
          organizationId: this.$ctx.store.organizationId,
        },
        { adminContext: this.$ctx.adminContext },
      )) as ManualLoyaltyAdjustmentResult;
      this.$ctx.loaders.accountBalance.clear(result.accountId);
      return {
        account: await this.resolvers.account(result.accountId),
        transaction: await this.resolvers.transaction(result.transactionId),
        userErrors: [],
      };
    } catch (error) {
      return {
        account: null,
        transaction: null,
        userErrors: [this.toUserError(error, "pointsAdjust")],
      };
    }
  }

  @ZodResolver(LoyaltyReservationReleaseInputSchema())
  async reservationRelease({ input }: LoyaltyMutationReservationReleaseArgs) {
    try {
      const reservationId = this.decodeId(input.reservationId, GlobalIdEntity.LoyaltyReservation);
      const current = await this.$ctx.kernel.repository.reservation.findById(reservationId);
      if (!current)
        throw new LoyaltyDomainError("RESERVATION_NOT_FOUND", "Loyalty reservation was not found");
      const requestHash = canonicalHash({ reservationId, input });
      const result = await new CheckoutRedemptionService(this.$ctx.kernel.repository).releaseAdmin({
        storeId: this.$ctx.store.id,
        checkoutId: current.checkoutId,
        reservationId,
        reason: "ADMIN_REQUEST",
        reasonCode: input.reasonCode,
        expectedRevision: input.expectedRevision,
        releasedAt: new Date().toISOString(),
        idempotencyKey: input.idempotencyKey,
        requestHash,
      });
      if (result.status === "REJECTED") {
        return {
          reservation: null,
          transaction: null,
          userErrors: [
            {
              message: result.message,
              field: [],
              code: result.code,
              retryable: result.retryable,
            },
          ],
        };
      }
      const transactionId = result.status === "RELEASED" ? result.releaseTransactionId : null;
      this.$ctx.loaders.reservation.clear(reservationId);
      return {
        reservation: await this.resolvers.reservation(reservationId),
        transaction: transactionId ? await this.resolvers.transaction(transactionId) : null,
        userErrors: [],
      };
    } catch (error) {
      return {
        reservation: null,
        transaction: null,
        userErrors: [this.toUserError(error, "reservationRelease")],
      };
    }
  }

  @ZodResolver(LoyaltyProgramVersionUpdateInputSchema())
  async programVersionUpdate({ input }: LoyaltyMutationProgramVersionUpdateArgs) {
    return this.result("programVersion", async () => {
      const versionId = this.decodeId(input.programVersionId, GlobalIdEntity.LoyaltyProgramVersion);
      const changes: Record<string, unknown> = {};
      copyDefined(changes, input, [
        "effectiveFrom",
        "earningEnabled",
        "redemptionEnabled",
        "activationDelaySeconds",
        "earnPoints",
        "earnAmountMinor",
        "minimumEligibleAmountMinor",
        "redeemPoints",
        "redeemAmountMinor",
        "minimumRedeemPoints",
        "maximumOrderPercentageBps",
        "roundingMode",
        "refundPolicy",
        "debtPolicy",
        "restoredPointsExpiryPolicy",
      ]);
      if (input.earnPoints != null) changes.earnPoints = BigInt(input.earnPoints);
      if (input.earnAmountMinor != null) changes.earnAmountMinor = BigInt(input.earnAmountMinor);
      if (input.minimumEligibleAmountMinor != null)
        changes.minimumEligibleAmountMinor = BigInt(input.minimumEligibleAmountMinor);
      if (input.redeemPoints != null) changes.redeemPoints = BigInt(input.redeemPoints);
      if (input.redeemAmountMinor != null)
        changes.redeemAmountMinor = BigInt(input.redeemAmountMinor);
      if (input.minimumRedeemPoints != null)
        changes.minimumRedeemPoints = BigInt(input.minimumRedeemPoints);
      if (input.clearEffectiveTo) changes.effectiveTo = null;
      else if (input.effectiveTo != null) changes.effectiveTo = input.effectiveTo;
      if (input.clearPointsExpiryDays) changes.pointsExpiryDays = null;
      else if (input.pointsExpiryDays != null) changes.pointsExpiryDays = input.pointsExpiryDays;
      if (input.clearMaximumRedeemPointsPerOrder) changes.maximumRedeemPointsPerOrder = null;
      else if (input.maximumRedeemPointsPerOrder != null)
        changes.maximumRedeemPointsPerOrder = BigInt(input.maximumRedeemPointsPerOrder);
      if (input.rules != null) {
        changes.rules = normalizeProgramRulesInput(
          input.rules as unknown as Record<string, unknown>,
        );
      }
      const version = await this.configMutation(
        "programVersionUpdate",
        input,
        "PROGRAM_VERSION",
        (id) => this.$ctx.kernel.repository.program.findVersionById(id),
        () => this.programs.updateDraftVersion(versionId, changes as never, input.expectedRevision),
      );
      this.$ctx.loaders.programVersion.clear(version.id).prime(version.id, version);
      this.$ctx.loaders.programVersions.clear(version.programId);
      return this.resolvers.programVersion(version.id);
    });
  }

  @ZodResolver(LoyaltyProgramVersionDeleteInputSchema())
  async programVersionDelete({ input }: LoyaltyMutationProgramVersionDeleteArgs) {
    try {
      const id = this.decodeId(input.programVersionId, GlobalIdEntity.LoyaltyProgramVersion);
      const version = await this.$ctx.kernel.repository.program.findVersionById(id);
      await this.configMutation(
        "programVersionDelete",
        input,
        "DELETED_PROGRAM_VERSION",
        async () => ({ id }),
        async () => {
          await this.programs.deleteDraftVersion(id, input.expectedRevision);
          return { id };
        },
      );
      this.$ctx.loaders.programVersion.clear(id);
      if (version) this.$ctx.loaders.programVersions.clear(version.programId);
      return {
        deletedProgramVersionId: this.encodeId(id, GlobalIdEntity.LoyaltyProgramVersion),
        userErrors: [],
      };
    } catch (error) {
      return {
        deletedProgramVersionId: null,
        userErrors: [this.toUserError(error, "programVersionDelete")],
      };
    }
  }

  @ZodResolver(LoyaltyEarningRuleCreateInputSchema())
  async earningRuleCreate({ input }: LoyaltyMutationEarningRuleCreateArgs) {
    return this.result("earningRule", async () => {
      const versionId = this.decodeId(input.programVersionId, GlobalIdEntity.LoyaltyProgramVersion);
      const rule = await this.configMutation(
        "earningRuleCreate",
        input,
        "EARNING_RULE",
        (id) => this.$ctx.kernel.repository.earningRule.findById(id),
        () =>
          this.programs.createEarningRule(versionId, {
            code: input.code,
            name: input.name,
            priority: input.priority ?? 0,
            triggerType: input.triggerType,
            triggerSchemaVersion: input.triggerSchemaVersion ?? 1,
            triggerConfig: input.triggerConfig ?? {},
            conditionSchemaVersion: input.conditionSchemaVersion ?? 1,
            conditions: input.conditions,
            actionType: input.actionType,
            actionSchemaVersion: input.actionSchemaVersion ?? 1,
            action: input.action,
            limitSchemaVersion: input.limitSchemaVersion ?? 1,
            limits: normalizeEarningLimits(input.limits),
            stopProcessing: input.stopProcessing ?? false,
          }),
      );
      this.$ctx.loaders.earningRule.clear(rule.id).prime(rule.id, rule);
      this.$ctx.loaders.earningRulesByVersion.clear(versionId);
      return this.resolvers.earningRule(rule.id);
    });
  }

  @ZodResolver(LoyaltyEarningRuleUpdateInputSchema())
  async earningRuleUpdate({ input }: LoyaltyMutationEarningRuleUpdateArgs) {
    return this.result("earningRule", async () => {
      const id = this.decodeId(input.earningRuleId, GlobalIdEntity.LoyaltyEarningRule);
      const changes: Record<string, unknown> = {};
      copyDefined(changes, input, [
        "name",
        "priority",
        "triggerType",
        "triggerSchemaVersion",
        "triggerConfig",
        "conditionSchemaVersion",
        "conditions",
        "actionType",
        "actionSchemaVersion",
        "action",
        "limitSchemaVersion",
        "limits",
        "stopProcessing",
      ]);
      const rule = await this.configMutation(
        "earningRuleUpdate",
        input,
        "EARNING_RULE",
        (resultId) => this.$ctx.kernel.repository.earningRule.findById(resultId),
        () => this.programs.updateEarningRule(id, changes as never),
      );
      this.$ctx.loaders.earningRule.clear(rule.id).prime(rule.id, rule);
      this.$ctx.loaders.earningRulesByVersion.clear(rule.programVersionId);
      return this.resolvers.earningRule(rule.id);
    });
  }

  @ZodResolver(LoyaltyEarningRuleDeleteInputSchema())
  async earningRuleDelete({ input }: LoyaltyMutationEarningRuleDeleteArgs) {
    const current = await this.loadForDelete(
      input.earningRuleId,
      GlobalIdEntity.LoyaltyEarningRule,
      (id) => this.$ctx.kernel.repository.earningRule.findById(id),
    );
    return this.deleteResult(input.earningRuleId, GlobalIdEntity.LoyaltyEarningRule, async (id) => {
      await this.configMutation(
        "earningRuleDelete",
        input,
        "DELETED_EARNING_RULE",
        async () => ({ id }),
        async () => {
          await this.programs.deleteEarningRule(id);
          return { id };
        },
      );
      this.$ctx.loaders.earningRule.clear(id);
      if (current) this.$ctx.loaders.earningRulesByVersion.clear(current.programVersionId);
    });
  }

  @ZodResolver(LoyaltyRewardDefinitionCreateInputSchema())
  async rewardDefinitionCreate({ input }: LoyaltyMutationRewardDefinitionCreateArgs) {
    return this.result("rewardDefinition", async () => {
      const versionId = this.decodeId(input.programVersionId, GlobalIdEntity.LoyaltyProgramVersion);
      const definition = await this.configMutation(
        "rewardDefinitionCreate",
        input,
        "REWARD_DEFINITION",
        (id) => this.$ctx.kernel.repository.reward.findDefinitionById(id),
        () => this.programs.createRewardDefinition(versionId, rewardDefinitionInput(input)),
      );
      this.$ctx.loaders.rewardDefinition.clear(definition.id).prime(definition.id, definition);
      this.$ctx.loaders.rewardDefinitionsByVersion.clear(versionId);
      return this.resolvers.rewardDefinition(definition.id);
    });
  }

  @ZodResolver(LoyaltyRewardDefinitionUpdateInputSchema())
  async rewardDefinitionUpdate({ input }: LoyaltyMutationRewardDefinitionUpdateArgs) {
    return this.result("rewardDefinition", async () => {
      const id = this.decodeId(input.rewardDefinitionId, GlobalIdEntity.LoyaltyRewardDefinition);
      const changes: Record<string, unknown> = {};
      copyDefined(changes, input, [
        "name",
        "rewardType",
        "configurationSchemaVersion",
        "configuration",
      ]);
      nullableChange(changes, input, "validityDays", "clearValidityDays", (value) => value);
      nullableChange(changes, input, "startsAt", "clearStartsAt", (value) => value);
      nullableChange(changes, input, "endsAt", "clearEndsAt", (value) => value);
      nullableChange(changes, input, "issuanceLimit", "clearIssuanceLimit", (value) =>
        BigInt(value),
      );
      nullableChange(changes, input, "perAccountLimit", "clearPerAccountLimit", (value) =>
        BigInt(value),
      );
      const definition = await this.configMutation(
        "rewardDefinitionUpdate",
        input,
        "REWARD_DEFINITION",
        (resultId) => this.$ctx.kernel.repository.reward.findDefinitionById(resultId),
        () => this.programs.updateRewardDefinition(id, changes as never),
      );
      this.$ctx.loaders.rewardDefinition.clear(definition.id).prime(definition.id, definition);
      this.$ctx.loaders.rewardDefinitionsByVersion.clear(definition.programVersionId);
      return this.resolvers.rewardDefinition(definition.id);
    });
  }

  @ZodResolver(LoyaltyRewardDefinitionDeleteInputSchema())
  async rewardDefinitionDelete({ input }: LoyaltyMutationRewardDefinitionDeleteArgs) {
    const current = await this.loadForDelete(
      input.rewardDefinitionId,
      GlobalIdEntity.LoyaltyRewardDefinition,
      (id) => this.$ctx.kernel.repository.reward.findDefinitionById(id),
    );
    return this.deleteResult(
      input.rewardDefinitionId,
      GlobalIdEntity.LoyaltyRewardDefinition,
      async (id) => {
        await this.configMutation(
          "rewardDefinitionDelete",
          input,
          "DELETED_REWARD_DEFINITION",
          async () => ({ id }),
          async () => {
            await this.programs.deleteRewardDefinition(id);
            return { id };
          },
        );
        this.$ctx.loaders.rewardDefinition.clear(id);
        if (current) this.$ctx.loaders.rewardDefinitionsByVersion.clear(current.programVersionId);
      },
    );
  }

  @ZodResolver(LoyaltyTierPolicyUpsertInputSchema())
  async tierPolicyUpsert({ input }: LoyaltyMutationTierPolicyUpsertArgs) {
    return this.result("tierPolicy", async () => {
      const versionId = this.decodeId(input.programVersionId, GlobalIdEntity.LoyaltyProgramVersion);
      const policy = await this.configMutation(
        "tierPolicyUpsert",
        input,
        "TIER_POLICY",
        (id) =>
          this.$ctx.kernel.repository.tier.getPoliciesByIds([id]).then((rows) => rows[0] ?? null),
        () =>
          this.programs.upsertTierPolicy(versionId, {
            windowType: input.windowType,
            rollingWindowDays: input.rollingWindowDays ?? null,
            calendarPeriod: input.calendarPeriod ?? null,
            programYearStartsMonth: input.programYearStartsMonth ?? null,
            membershipDurationDays: input.membershipDurationDays ?? null,
            gracePeriodDays: input.gracePeriodDays ?? 0,
            downgradePolicy: input.downgradePolicy ?? "IMMEDIATE",
            requalificationPolicy: input.requalificationPolicy ?? "AUTOMATIC",
            metricSchemaVersion: input.metricSchemaVersion ?? 1,
          }),
      );
      this.$ctx.loaders.tierPolicy.clear(policy.id).prime(policy.id, policy);
      this.$ctx.loaders.tierPolicyByVersion.clear(versionId);
      return this.resolvers.tierPolicy(policy.id);
    });
  }

  @ZodResolver(LoyaltyTierPolicyDeleteInputSchema())
  async tierPolicyDelete({ input }: LoyaltyMutationTierPolicyDeleteArgs) {
    try {
      const versionId = this.decodeId(input.programVersionId, GlobalIdEntity.LoyaltyProgramVersion);
      const policy = await this.$ctx.kernel.repository.tier.findPolicy(versionId);
      const deleted = await this.configMutation(
        "tierPolicyDelete",
        input,
        "DELETED_TIER_POLICY",
        async (id) => ({ id }),
        async () => {
          await this.programs.deleteTierPolicy(versionId);
          return { id: policy?.id ?? versionId };
        },
      );
      this.$ctx.loaders.tierPolicyByVersion.clear(versionId);
      if (policy) this.$ctx.loaders.tierPolicy.clear(policy.id);
      return {
        deletedId: this.encodeId(deleted.id, GlobalIdEntity.LoyaltyTierPolicy),
        userErrors: [],
      };
    } catch (error) {
      return { deletedId: null, userErrors: [this.toUserError(error, "tierPolicyDelete")] };
    }
  }

  @ZodResolver(LoyaltyTierCreateInputSchema())
  async tierCreate({ input }: LoyaltyMutationTierCreateArgs) {
    return this.result("tier", async () => {
      const versionId = this.decodeId(input.programVersionId, GlobalIdEntity.LoyaltyProgramVersion);
      const tier = await this.configMutation(
        "tierCreate",
        input,
        "TIER",
        (id) => this.$ctx.kernel.repository.tier.findTierById(id),
        () =>
          this.programs.createTier(versionId, {
            code: input.code,
            name: input.name,
            rank: input.rank,
            qualificationSchemaVersion: input.qualificationSchemaVersion ?? 1,
            qualification: input.qualification,
            maintenance: input.maintenance ?? null,
          }),
      );
      this.$ctx.loaders.tier.clear(tier.id).prime(tier.id, tier);
      this.$ctx.loaders.tiersByVersion.clear(versionId);
      return this.resolvers.tier(tier.id);
    });
  }

  @ZodResolver(LoyaltyTierUpdateInputSchema())
  async tierUpdate({ input }: LoyaltyMutationTierUpdateArgs) {
    return this.result("tier", async () => {
      const id = this.decodeId(input.tierId, GlobalIdEntity.LoyaltyTier);
      const changes: Record<string, unknown> = {};
      copyDefined(changes, input, ["name", "rank", "qualificationSchemaVersion", "qualification"]);
      nullableChange(changes, input, "maintenance", "clearMaintenance", (value) => value);
      const tier = await this.configMutation(
        "tierUpdate",
        input,
        "TIER",
        (resultId) => this.$ctx.kernel.repository.tier.findTierById(resultId),
        () => this.programs.updateTier(id, changes as never),
      );
      this.$ctx.loaders.tier.clear(tier.id).prime(tier.id, tier);
      this.$ctx.loaders.tiersByVersion.clear(tier.programVersionId);
      return this.resolvers.tier(tier.id);
    });
  }

  @ZodResolver(LoyaltyTierDeleteInputSchema())
  async tierDelete({ input }: LoyaltyMutationTierDeleteArgs) {
    const current = await this.loadForDelete(input.tierId, GlobalIdEntity.LoyaltyTier, (id) =>
      this.$ctx.kernel.repository.tier.findTierById(id),
    );
    return this.deleteResult(input.tierId, GlobalIdEntity.LoyaltyTier, async (id) => {
      await this.configMutation(
        "tierDelete",
        input,
        "DELETED_TIER",
        async () => ({ id }),
        async () => {
          await this.programs.deleteTier(id);
          return { id };
        },
      );
      this.$ctx.loaders.tier.clear(id);
      this.$ctx.loaders.tierRewardBenefits.clear(id);
      if (current) this.$ctx.loaders.tiersByVersion.clear(current.programVersionId);
    });
  }

  @ZodResolver(LoyaltyTierRewardBenefitCreateInputSchema())
  async tierRewardBenefitCreate({ input }: LoyaltyMutationTierRewardBenefitCreateArgs) {
    return this.result("tierRewardBenefit", async () => {
      const benefit = await this.configMutation(
        "tierRewardBenefitCreate",
        input,
        "TIER_REWARD_BENEFIT",
        (id) => this.$ctx.kernel.repository.reward.findTierBenefitById(id),
        () =>
          this.programs.createTierRewardBenefit({
            tierId: this.decodeId(input.tierId, GlobalIdEntity.LoyaltyTier),
            rewardDefinitionId: this.decodeId(
              input.rewardDefinitionId,
              GlobalIdEntity.LoyaltyRewardDefinition,
            ),
            grantPolicySchemaVersion: input.grantPolicySchemaVersion ?? 1,
            grantPolicy: input.grantPolicy ?? { type: "ON_QUALIFICATION" },
          }),
      );
      this.$ctx.loaders.tierRewardBenefit.clear(benefit.id).prime(benefit.id, benefit);
      this.$ctx.loaders.tierRewardBenefits.clear(benefit.tierId);
      return this.resolvers.tierRewardBenefit(benefit.id);
    });
  }

  @ZodResolver(LoyaltyTierRewardBenefitDeleteInputSchema())
  async tierRewardBenefitDelete({ input }: LoyaltyMutationTierRewardBenefitDeleteArgs) {
    const current = await this.loadForDelete(
      input.tierRewardBenefitId,
      GlobalIdEntity.LoyaltyTierRewardBenefit,
      (id) => this.$ctx.kernel.repository.reward.findTierBenefitById(id),
    );
    return this.deleteResult(
      input.tierRewardBenefitId,
      GlobalIdEntity.LoyaltyTierRewardBenefit,
      async (id) => {
        await this.configMutation(
          "tierRewardBenefitDelete",
          input,
          "DELETED_TIER_REWARD_BENEFIT",
          async () => ({ id }),
          async () => {
            await this.programs.deleteTierRewardBenefit(id);
            return { id };
          },
        );
        this.$ctx.loaders.tierRewardBenefit.clear(id);
        if (current) this.$ctx.loaders.tierRewardBenefits.clear(current.tierId);
      },
    );
  }

  @ZodResolver(LoyaltyTierEvaluateInputSchema())
  async tierEvaluate({ input }: LoyaltyMutationTierEvaluateArgs) {
    return this.result("tierMembership", async () => {
      const accountId = this.decodeId(input.accountId, GlobalIdEntity.LoyaltyAccount);
      const account = await this.$ctx.kernel.repository.account.findById(accountId);
      if (!account)
        throw new LoyaltyDomainError("ACCOUNT_NOT_FOUND", "Loyalty account was not found");
      const effectiveAt = input.effectiveAt ?? new Date().toISOString();
      const versionId = input.programVersionId
        ? this.decodeId(input.programVersionId, GlobalIdEntity.LoyaltyProgramVersion)
        : (
            await this.$ctx.kernel.repository.program.findEffectiveVersion(
              account.programId,
              effectiveAt,
            )
          )?.id;
      if (!versionId)
        throw new LoyaltyDomainError(
          "PROGRAM_VERSION_NOT_FOUND",
          "Effective loyalty program version was not found",
        );
      const membership = await new TierEvaluationService(this.$ctx.kernel.repository).evaluate({
        account,
        programVersionId: versionId,
        effectiveAt,
        forceRequalification: input.forceRequalification ?? false,
        reasonCode: input.reasonCode,
      });
      this.$ctx.loaders.activeTierMembership.clear(account.id);
      if (!membership) return null;
      this.$ctx.loaders.tierMembership.clear(membership.id).prime(membership.id, membership);
      return this.resolvers.tierMembership(membership.id);
    });
  }

  @ZodResolver(LoyaltyTierMembershipRevokeInputSchema())
  async tierMembershipRevoke({ input }: LoyaltyMutationTierMembershipRevokeArgs) {
    return this.result("tierMembership", async () => {
      const id = this.decodeId(input.membershipId, GlobalIdEntity.LoyaltyTierMembership);
      const membership = await new TierEvaluationService(this.$ctx.kernel.repository).revoke({
        membershipId: id,
        expectedRevision: input.expectedRevision,
        effectiveAt: input.effectiveAt ?? new Date().toISOString(),
        reasonCode: input.reasonCode,
        actorId: this.$ctx.user.id,
      });
      this.$ctx.loaders.tierMembership.clear(id).prime(id, membership);
      this.$ctx.loaders.activeTierMembership.clear(membership.accountId);
      this.$ctx.loaders.tierMembershipEvents.clear(id);
      return this.resolvers.tierMembership(id);
    });
  }

  @ZodResolver(LoyaltyRewardEntitlementIssueInputSchema())
  async rewardEntitlementIssue({ input }: LoyaltyMutationRewardEntitlementIssueArgs) {
    return this.result("rewardEntitlement", async () => {
      const accountId = this.decodeId(input.accountId, GlobalIdEntity.LoyaltyAccount);
      const account = await this.$ctx.kernel.repository.account.findById(accountId);
      if (!account)
        throw new LoyaltyDomainError("ACCOUNT_NOT_FOUND", "Loyalty account was not found");
      const entitlement = await new RewardEntitlementService(this.$ctx.kernel.repository).issue({
        account,
        definitionId: this.decodeId(
          input.rewardDefinitionId,
          GlobalIdEntity.LoyaltyRewardDefinition,
        ),
        quantity: BigInt(input.quantity ?? "1"),
        externalReference: input.externalReference ?? null,
        idempotencyKey: input.idempotencyKey,
        occurredAt: input.occurredAt ?? new Date().toISOString(),
        actorType: "ADMIN_USER",
        actorId: this.$ctx.user.id,
      });
      this.$ctx.loaders.rewardEntitlement.clear(entitlement.id).prime(entitlement.id, entitlement);
      return this.resolvers.rewardEntitlement(entitlement.id);
    });
  }

  @ZodResolver(LoyaltyRewardEntitlementTransitionInputSchema())
  async rewardEntitlementRelease({ input }: LoyaltyMutationRewardEntitlementReleaseArgs) {
    return this.rewardTransition(input, { type: "RELEASE" });
  }

  @ZodResolver(LoyaltyRewardEntitlementTransitionInputSchema())
  async rewardEntitlementRevoke({ input }: LoyaltyMutationRewardEntitlementRevokeArgs) {
    return this.rewardTransition(input, { type: "REVOKE" });
  }

  @ZodResolver(LoyaltyMonetaryWalletStatusUpdateInputSchema())
  async monetaryWalletStatusUpdate({ input }: LoyaltyMutationMonetaryWalletStatusUpdateArgs) {
    return this.result("monetaryWallet", async () => {
      const id = this.decodeId(input.walletId, GlobalIdEntity.LoyaltyMonetaryWallet);
      if (input.status === "MERGED")
        throw new LoyaltyDomainError(
          "INVALID_WALLET_STATUS",
          "MERGED is managed only by customer merge",
        );
      const current = await this.$ctx.kernel.repository.wallet.findById(id);
      if (!current)
        throw new LoyaltyDomainError("WALLET_NOT_FOUND", "Monetary wallet was not found");
      if (current.status === "MERGED")
        throw new LoyaltyDomainError(
          "WALLET_MERGED",
          "Merged monetary wallets cannot change state",
        );
      if (current.status === "CLOSED") {
        if (input.status === "CLOSED") return this.resolvers.monetaryWallet(id);
        throw new LoyaltyDomainError(
          "WALLET_CLOSED",
          "A closed monetary wallet cannot be reopened",
        );
      }
      if (current.status === input.status) return this.resolvers.monetaryWallet(id);
      const wallet = await this.$ctx.kernel.repository.wallet.updateWalletState(
        id,
        input.expectedRevision,
        {
          status: input.status,
          mergedIntoWalletId: null,
          closedAt: input.status === "CLOSED" ? new Date().toISOString() : null,
        },
      );
      if (!wallet)
        throw new LoyaltyDomainError(
          "WALLET_CONCURRENT_CHANGE",
          "Monetary wallet changed concurrently",
          true,
        );
      this.$ctx.loaders.monetaryWallet.clear(id).prime(id, wallet);
      return this.resolvers.monetaryWallet(id);
    });
  }

  @ZodResolver(LoyaltyMonetaryWalletAdjustInputSchema())
  async monetaryWalletAdjust({ input }: LoyaltyMutationMonetaryWalletAdjustArgs) {
    try {
      const walletId = this.decodeId(input.walletId, GlobalIdEntity.LoyaltyMonetaryWallet);
      const wallet = await this.$ctx.kernel.repository.wallet.findById(walletId);
      if (!wallet)
        throw new LoyaltyDomainError("WALLET_NOT_FOUND", "Monetary wallet was not found");
      const amountMinor = BigInt(input.amountMinor);
      if (amountMinor <= 0n)
        throw new LoyaltyDomainError(
          "INVALID_MONETARY_AMOUNT",
          "Monetary adjustment must be positive",
        );
      const occurredAt = input.occurredAt ?? new Date().toISOString();
      const requestHash = canonicalHash({ ...input, walletId });
      const service = new MonetaryWalletService(this.$ctx.kernel.repository);
      const operation =
        input.direction === "CREDIT"
          ? await service.credit({
              wallet,
              programVersionId: null,
              kind: "ADJUST_CREDIT",
              sourceType: "ADMIN",
              idempotencyKey: input.idempotencyKey,
              requestHash,
              actorType: "ADMIN_USER",
              actorId: this.$ctx.user.id,
              reasonCode: input.reasonCode,
              occurredAt,
              effectiveAt: occurredAt,
              amountMinor,
              activationAt: occurredAt,
              expiresAt: input.expiresAt ?? null,
              metadata: input.metadata ?? {},
            })
          : await service.debitAvailableWithLots({
              wallet,
              programVersionId: null,
              kind: "ADJUST_DEBIT",
              sourceType: "ADMIN",
              idempotencyKey: input.idempotencyKey,
              requestHash,
              actorType: "ADMIN_USER",
              actorId: this.$ctx.user.id,
              reasonCode: input.reasonCode,
              occurredAt,
              effectiveAt: occurredAt,
              amountMinor,
              metadata: input.metadata ?? {},
            });
      this.$ctx.loaders.monetaryWalletBalance.clear(walletId);
      this.$ctx.loaders.monetaryTransaction
        .clear(operation.transaction.id)
        .prime(operation.transaction.id, operation.transaction);
      return {
        monetaryWallet: await this.resolvers.monetaryWallet(walletId),
        transaction: await this.resolvers.monetaryTransaction(operation.transaction.id),
        userErrors: [],
      };
    } catch (error) {
      return {
        monetaryWallet: null,
        transaction: null,
        userErrors: [this.toUserError(error, "monetaryWalletAdjust")],
      };
    }
  }

  @ZodResolver(LoyaltyPointsConvertToMonetaryInputSchema())
  async pointsConvertToMonetary({ input }: LoyaltyMutationPointsConvertToMonetaryArgs) {
    try {
      const accountId = this.decodeId(input.accountId, GlobalIdEntity.LoyaltyAccount);
      const account = await this.$ctx.kernel.repository.account.findById(accountId);
      if (!account)
        throw new LoyaltyDomainError("ACCOUNT_NOT_FOUND", "Loyalty account was not found");
      const occurredAt = input.occurredAt ?? new Date().toISOString();
      const result = await new MonetaryWalletService(
        this.$ctx.kernel.repository,
      ).convertPointsToMoney({
        account,
        walletType: input.walletType,
        programVersionId: this.decodeId(
          input.programVersionId,
          GlobalIdEntity.LoyaltyProgramVersion,
        ),
        currencyCode: input.currencyCode,
        points: BigInt(input.points),
        idempotencyKey: input.idempotencyKey,
        requestHash: canonicalHash({ ...input, accountId }),
        occurredAt,
      });
      const wallet = await this.$ctx.kernel.repository.wallet.findForAccount(
        accountId,
        input.walletType,
        input.currencyCode,
      );
      if (!wallet)
        throw new LoyaltyDomainError("WALLET_NOT_FOUND", "Monetary wallet was not found");
      this.$ctx.loaders.accountBalance.clear(accountId);
      this.$ctx.loaders.monetaryWalletBalance.clear(wallet.id);
      return {
        account: await this.resolvers.account(accountId),
        monetaryWallet: await this.resolvers.monetaryWallet(wallet.id),
        pointsTransaction: await this.resolvers.transaction(result.pointsTransactionId),
        monetaryTransaction: await this.resolvers.monetaryTransaction(result.monetaryTransactionId),
        amount: { amountMinor: result.amountMinor.toString(), currencyCode: input.currencyCode },
        userErrors: [],
      };
    } catch (error) {
      return {
        account: null,
        monetaryWallet: null,
        pointsTransaction: null,
        monetaryTransaction: null,
        amount: null,
        userErrors: [this.toUserError(error, "pointsConvertToMonetary")],
      };
    }
  }

  @ZodResolver(LoyaltyMaintenanceRunInputSchema())
  async maintenanceRun({ input }: LoyaltyMutationMaintenanceRunArgs) {
    try {
      const result = await this.$ctx.kernel.getServices().broker.runWorkflow(
        "loyalty.maintenance",
        {
          storeId: this.$ctx.store.id,
          organizationId: this.$ctx.store.organizationId,
          effectiveAt: input.effectiveAt,
          limit: input.limit ?? 100,
          rebuildBalances: input.rebuildBalances ?? false,
        },
        {
          source: "content",
          resourceId: this.$ctx.store.id,
          operation: "loyaltyMaintenance",
          content: input,
          organizationId: this.$ctx.store.organizationId,
        },
        { adminContext: this.$ctx.adminContext },
      );
      return { result, userErrors: [] };
    } catch (error) {
      return { result: null, userErrors: [this.toUserError(error, "maintenanceRun")] };
    }
  }

  @ZodResolver(LoyaltyAccountBalanceRebuildInputSchema())
  async accountBalanceRebuild({ input }: LoyaltyMutationAccountBalanceRebuildArgs) {
    try {
      const accountId = this.decodeId(input.accountId, GlobalIdEntity.LoyaltyAccount);
      const account = await this.$ctx.kernel.repository.account.findById(accountId);
      if (!account)
        throw new LoyaltyDomainError("ACCOUNT_NOT_FOUND", "Loyalty account was not found");
      await new PointsLedgerService(this.$ctx.kernel.repository).rebuildBalance(accountId);
      this.$ctx.loaders.accountBalance.clear(accountId);
      return {
        account: await this.resolvers.account(accountId),
        balance: new (await import("./AccountResolvers.js")).LoyaltyAccountBalanceResolver(
          accountId,
          this.$ctx,
        ),
        userErrors: [],
      };
    } catch (error) {
      return {
        account: null,
        balance: null,
        userErrors: [this.toUserError(error, "accountBalanceRebuild")],
      };
    }
  }

  @ZodResolver(LoyaltyMonetaryWalletBalanceRebuildInputSchema())
  async monetaryWalletBalanceRebuild({ input }: LoyaltyMutationMonetaryWalletBalanceRebuildArgs) {
    return this.result("monetaryWallet", async () => {
      const walletId = this.decodeId(input.walletId, GlobalIdEntity.LoyaltyMonetaryWallet);
      const wallet = await this.$ctx.kernel.repository.wallet.findById(walletId);
      if (!wallet)
        throw new LoyaltyDomainError("WALLET_NOT_FOUND", "Monetary wallet was not found");
      await new MonetaryWalletService(this.$ctx.kernel.repository).rebuildBalance(walletId);
      this.$ctx.loaders.monetaryWalletBalance.clear(walletId);
      return this.resolvers.monetaryWallet(walletId);
    });
  }

  private async rewardTransition(
    input: Record<string, any>,
    transition: { type: "RELEASE" | "REVOKE" },
  ) {
    return this.result("rewardEntitlement", async () => {
      const id = this.decodeId(input.entitlementId, GlobalIdEntity.LoyaltyRewardEntitlement);
      const entitlement = await new RewardEntitlementService(
        this.$ctx.kernel.repository,
      ).transition({
        entitlementId: id,
        expectedRevision: input.expectedRevision,
        transition,
        idempotencyKey: input.idempotencyKey,
        occurredAt: input.occurredAt ?? new Date().toISOString(),
        actorType: "ADMIN_USER",
        actorId: this.$ctx.user.id,
        reasonCode: input.reasonCode,
      });
      this.$ctx.loaders.rewardEntitlement.clear(id).prime(id, entitlement);
      this.$ctx.loaders.rewardEntitlementEvents.clear(id);
      return this.resolvers.rewardEntitlement(id);
    });
  }

  private async deleteResult(
    idValue: string,
    type: GlobalIdType,
    work: (id: string) => Promise<void>,
  ) {
    try {
      const id = this.decodeId(idValue, type);
      await work(id);
      return { deletedId: this.encodeId(id, type), userErrors: [] };
    } catch (error) {
      return { deletedId: null, userErrors: [this.toUserError(error, "delete")] };
    }
  }

  private async loadForDelete<T>(
    idValue: string,
    type: GlobalIdType,
    load: (id: string) => Promise<T | null>,
  ): Promise<T | null> {
    try {
      return await load(this.decodeId(idValue, type));
    } catch {
      return null;
    }
  }

  private get programs() {
    return new ProgramLifecycleService(
      this.$ctx.kernel.repository,
      new BrokerLoyaltyReferenceValidator(this.$ctx.kernel.getServices().broker),
    );
  }

  private async configMutation<T extends { id: string }>(
    operation: string,
    input: { idempotencyKey: string },
    resultKind: string,
    load: (id: string) => Promise<T | null>,
    work: () => Promise<T>,
  ): Promise<T> {
    const idempotencyKey = input.idempotencyKey.trim();
    if (!idempotencyKey)
      throw new LoyaltyDomainError("INVALID_IDEMPOTENCY_KEY", "idempotencyKey must not be blank");
    const requestHash = canonicalHash({ operation, input });
    return this.$ctx.kernel.repository.runInTransaction(async () => {
      await this.$ctx.kernel.repository.configMutation.lock(operation, idempotencyKey);
      const previous = await this.$ctx.kernel.repository.configMutation.find(
        operation,
        idempotencyKey,
      );
      if (previous) {
        this.$ctx.kernel.repository.configMutation.requireSameRequest(previous, requestHash);
        if (!previous.resultId)
          throw new LoyaltyDomainError(
            "IDEMPOTENCY_RESULT_MISSING",
            "Stored loyalty configuration result is incomplete",
          );
        const restored = await load(previous.resultId);
        if (!restored)
          throw new LoyaltyDomainError(
            "IDEMPOTENCY_RESULT_MISSING",
            "Stored loyalty configuration result no longer exists",
          );
        return restored;
      }
      const value = await work();
      await this.$ctx.kernel.repository.configMutation.record({
        operation,
        idempotencyKey,
        requestHash,
        resultKind,
        resultId: value.id,
      });
      return value;
    });
  }

  private async result(key: string, work: () => Promise<unknown>) {
    try {
      return { [key]: await work(), userErrors: [] };
    } catch (error) {
      return { [key]: null, userErrors: [this.toUserError(error, key)] };
    }
  }

  private toUserError(error: unknown, operation: string): UserError {
    if (error instanceof LoyaltyDomainError) {
      return { message: error.message, field: [], code: error.code, retryable: error.retryable };
    }
    this.$ctx.kernel.getServices().logger.error(
      {
        requestId: this.$ctx.requestId,
        operation,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : { value: String(error) },
      },
      "Loyalty Admin GraphQL mutation failed",
    );
    return {
      message: "The loyalty operation could not be completed",
      field: [],
      code: "LOYALTY_OPERATION_FAILED",
      retryable: false,
    };
  }
}

function copyDefined(
  target: Record<string, unknown>,
  source: Record<string, any>,
  keys: readonly string[],
): void {
  for (const key of keys)
    if (source[key] !== undefined && source[key] !== null) target[key] = source[key];
}

function normalizeEarningLimits(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && Object.keys(value).length > 0
    ? (value as Record<string, unknown>)
    : { startsAt: null, endsAt: null, perEventMaxPoints: null, perAccount: null, campaign: null };
}

function nullableChange(
  target: Record<string, unknown>,
  source: Record<string, any>,
  valueKey: string,
  clearKey: string,
  map: (value: any) => unknown,
): void {
  if (source[clearKey]) target[valueKey] = null;
  else if (source[valueKey] !== undefined && source[valueKey] !== null)
    target[valueKey] = map(source[valueKey]);
}

function rewardDefinitionInput(input: Record<string, any>) {
  return {
    code: input.code,
    name: input.name,
    rewardType: input.rewardType,
    configurationSchemaVersion: input.configurationSchemaVersion ?? 1,
    configuration: input.configuration,
    validityDays: input.validityDays ?? null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    issuanceLimit: input.issuanceLimit == null ? null : BigInt(input.issuanceLimit),
    perAccountLimit: input.perAccountLimit == null ? null : BigInt(input.perAccountLimit),
  };
}
