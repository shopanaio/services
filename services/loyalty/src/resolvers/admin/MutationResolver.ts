import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { ApolloMutation, ZodResolver } from "@shopana/type-resolver";
import { AccountLifecycleService } from "../../application/accounts/AccountLifecycleService.js";
import { CheckoutRedemptionService } from "../../application/checkout/CheckoutRedemptionService.js";
import { LoyaltyDomainError } from "../../application/errors.js";
import { canonicalHash } from "../../application/math.js";
import {
  NoExternalLoyaltyReferences,
  ProgramLifecycleService,
} from "../../application/program/ProgramLifecycleService.js";
import type { ManualLoyaltyAdjustmentResult } from "../../workflows/ManualAdjustmentWorkflow.js";
import {
  LoyaltyAccountStatusUpdateInputSchema,
  LoyaltyPointsAdjustInputSchema,
  LoyaltyProgramCreateInputSchema,
  LoyaltyProgramUpdateInputSchema,
  LoyaltyProgramVersionCreateInputSchema,
  LoyaltyProgramVersionPublishInputSchema,
  LoyaltyReservationReleaseInputSchema,
} from "./generated/schemas.js";
import type {
  LoyaltyMutationAccountStatusUpdateArgs,
  LoyaltyMutationPointsAdjustArgs,
  LoyaltyMutationProgramCreateArgs,
  LoyaltyMutationProgramUpdateArgs,
  LoyaltyMutationProgramVersionCreateArgs,
  LoyaltyMutationProgramVersionPublishArgs,
  LoyaltyMutationReservationReleaseArgs,
} from "./generated/types.js";
import { LoyaltyType } from "./LoyaltyType.js";
import { normalizeProgramRulesInput } from "./policyIds.js";

type UserError = { message: string; field: string[]; code: string; retryable: boolean };

@ApolloMutation
export class MutationResolver extends LoyaltyType<Record<string, never>> {
  loyaltyMutation() { return this.resolvers.loyaltyMutation(); }
}

export class LoyaltyMutationResolver extends LoyaltyType<Record<string, never>> {
  @ZodResolver(LoyaltyProgramCreateInputSchema())
  async programCreate({ input }: LoyaltyMutationProgramCreateArgs) {
    return this.result("program", async () => {
      const program = await this.programs.createProgram({
        code: input.code,
        name: input.name,
        status: "DRAFT",
        isDefault: input.isDefault ?? false,
        defaultCurrencyCode: input.defaultCurrencyCode,
        metadata: input.metadata ?? {},
        archivedAt: null,
      });
      this.$ctx.loaders.program.clear(program.id).prime(program.id, program);
      return this.resolvers.program(program.id);
    });
  }

  @ZodResolver(LoyaltyProgramUpdateInputSchema())
  async programUpdate({ input }: LoyaltyMutationProgramUpdateArgs) {
    return this.result("program", async () => {
      const programId = this.decodeId(input.programId, GlobalIdEntity.LoyaltyProgram);
      const program = await this.programs.updateProgram(programId, {
        name: input.name ?? undefined,
        status: input.status ?? undefined,
        isDefault: input.isDefault ?? undefined,
        metadata: input.metadata ?? undefined,
      }, input.expectedRevision);
      this.$ctx.loaders.program.clear(program.id).prime(program.id, program);
      return this.resolvers.program(program.id);
    });
  }

  @ZodResolver(LoyaltyProgramVersionCreateInputSchema())
  async programVersionCreate({ input }: LoyaltyMutationProgramVersionCreateArgs) {
    return this.result("programVersion", async () => {
      const programId = this.decodeId(input.programId, GlobalIdEntity.LoyaltyProgram);
      const version = await this.programs.createDraftVersion(programId, {
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
        maximumRedeemPointsPerOrder: input.maximumRedeemPointsPerOrder == null
          ? null : BigInt(input.maximumRedeemPointsPerOrder),
        maximumOrderPercentageBps: input.maximumOrderPercentageBps ?? 10_000,
        roundingMode: input.roundingMode ?? "DOWN",
        refundPolicy: input.refundPolicy ?? "PROPORTIONAL",
        debtPolicy: input.debtPolicy ?? "TRACK_DEBT",
        restoredPointsExpiryPolicy: input.restoredPointsExpiryPolicy ?? "ORIGINAL_EXPIRY",
        createdById: this.$ctx.user.id,
        rules: normalizeProgramRulesInput(input.rules as unknown as Record<string, unknown>) as never,
      }, {
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
          limits: rule.limits ?? {},
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
          issuanceLimit: definition.issuanceLimit == null ? null : BigInt(definition.issuanceLimit),
          perAccountLimit: definition.perAccountLimit == null ? null : BigInt(definition.perAccountLimit),
        })),
        tierPolicy: input.tierPolicy ? {
          windowType: input.tierPolicy.windowType,
          rollingWindowDays: input.tierPolicy.rollingWindowDays ?? null,
          calendarPeriod: input.tierPolicy.calendarPeriod ?? null,
          programYearStartsMonth: input.tierPolicy.programYearStartsMonth ?? null,
          membershipDurationDays: input.tierPolicy.membershipDurationDays ?? null,
          gracePeriodDays: input.tierPolicy.gracePeriodDays ?? 0,
          downgradePolicy: input.tierPolicy.downgradePolicy ?? "IMMEDIATE",
          requalificationPolicy: input.tierPolicy.requalificationPolicy ?? "AUTOMATIC",
          metricSchemaVersion: input.tierPolicy.metricSchemaVersion ?? 1,
        } : null,
        tiers: (input.tiers ?? []).map((tier) => ({
          code: tier.code,
          name: tier.name,
          rank: tier.rank,
          qualificationSchemaVersion: tier.qualificationSchemaVersion ?? 1,
          qualification: tier.qualification,
          maintenance: tier.maintenance ?? null,
        })),
      });
      this.$ctx.loaders.programVersion.clear(version.id).prime(version.id, version);
      this.$ctx.loaders.programVersions.clear(programId);
      return this.resolvers.programVersion(version.id);
    });
  }

  @ZodResolver(LoyaltyProgramVersionPublishInputSchema())
  async programVersionPublish({ input }: LoyaltyMutationProgramVersionPublishArgs) {
    return this.result("programVersion", async () => {
      const versionId = this.decodeId(input.programVersionId, GlobalIdEntity.LoyaltyProgramVersion);
      const version = await this.programs.publishVersion({
        versionId,
        expectedRevision: input.expectedRevision,
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo,
        publishedAt: new Date().toISOString(),
        publishedById: this.$ctx.user.id,
      });
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
        throw new LoyaltyDomainError("INVALID_ACCOUNT_STATUS", "MERGED is managed only by customer merge");
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
      const result = await this.$ctx.kernel.getServices().broker.runWorkflow(
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
          tenantId: this.$ctx.store.id,
        },
        { adminContext: this.$ctx.adminContext },
      ) as ManualLoyaltyAdjustmentResult;
      this.$ctx.loaders.accountBalance.clear(result.accountId);
      return {
        account: await this.resolvers.account(result.accountId),
        transaction: await this.resolvers.transaction(result.transactionId),
        userErrors: [],
      };
    } catch (error) {
      return { account: null, transaction: null, userErrors: [toUserError(error)] };
    }
  }

  @ZodResolver(LoyaltyReservationReleaseInputSchema())
  async reservationRelease({ input }: LoyaltyMutationReservationReleaseArgs) {
    try {
      const reservationId = this.decodeId(input.reservationId, GlobalIdEntity.LoyaltyReservation);
      const current = await this.$ctx.kernel.repository.reservation.findById(reservationId);
      if (!current) throw new LoyaltyDomainError("RESERVATION_NOT_FOUND", "Loyalty reservation was not found");
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
        return { reservation: null, transaction: null, userErrors: [{
          message: result.message, field: [], code: result.code, retryable: result.retryable,
        }] };
      }
      const transactionId = result.status === "RELEASED" ? result.releaseTransactionId : null;
      this.$ctx.loaders.reservation.clear(reservationId);
      return {
        reservation: await this.resolvers.reservation(reservationId),
        transaction: transactionId ? await this.resolvers.transaction(transactionId) : null,
        userErrors: [],
      };
    } catch (error) {
      return { reservation: null, transaction: null, userErrors: [toUserError(error)] };
    }
  }

  private get programs() {
    return new ProgramLifecycleService(this.$ctx.kernel.repository, new NoExternalLoyaltyReferences());
  }

  private async result(key: "program" | "programVersion" | "account", work: () => Promise<unknown>) {
    try {
      return { [key]: await work(), userErrors: [] };
    } catch (error) {
      return { [key]: null, userErrors: [toUserError(error)] };
    }
  }
}

function toUserError(error: unknown): UserError {
  if (error instanceof LoyaltyDomainError) {
    return { message: error.message, field: [], code: error.code, retryable: error.retryable };
  }
  return {
    message: error instanceof Error ? error.message : String(error),
    field: [],
    code: "LOYALTY_OPERATION_FAILED",
    retryable: false,
  };
}
