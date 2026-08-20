import { Injectable } from "@nestjs/common";
import { Action, BrokerActions, InjectBroker, ServiceBroker } from "@shopana/shared-kernel";
import type { ContextStore } from "@shopana/shared-context";
import {
  LoyaltyActionNames,
  LoyaltyCheckoutActionNames,
  type CommitCheckoutLoyaltyRedemptionParams,
  type CommitCheckoutLoyaltyRedemptionResult,
  type ExpireCheckoutLoyaltyRedemptionsParams,
  type ExpireCheckoutLoyaltyRedemptionsResult,
  type GetCustomerLoyaltyAccountParams,
  type GetCustomerLoyaltyAccountResult,
  type QuoteCheckoutLoyaltyRedemptionParams,
  type QuoteCheckoutLoyaltyRedemptionResult,
  type ReleaseCheckoutLoyaltyRedemptionParams,
  type ReleaseCheckoutLoyaltyRedemptionResult,
  type ReserveCheckoutLoyaltyRedemptionParams,
  type ReserveCheckoutLoyaltyRedemptionResult,
  type ReverseCheckoutLoyaltyRedemptionParams,
  type ReverseCheckoutLoyaltyRedemptionResult,
  type QuoteCheckoutLoyaltyRewardParams,
  type QuoteCheckoutLoyaltyRewardResult,
  type ReserveCheckoutLoyaltyRewardParams,
  type ReserveCheckoutLoyaltyRewardResult,
  type CommitCheckoutLoyaltyRewardParams,
  type ReleaseCheckoutLoyaltyRewardParams,
  type TransitionCheckoutLoyaltyRewardResult,
} from "@shopana/broker-types";
import { CheckoutRedemptionService } from "../application/checkout/CheckoutRedemptionService.js";
import { RewardEntitlementService } from "../application/rewards/RewardEntitlementService.js";
import { canonicalHash } from "../application/math.js";
import { LoyaltyDomainError } from "../application/errors.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";
import type {
  LoyaltyMaintenanceInput,
  LoyaltyMaintenanceResult,
} from "../workflows/LoyaltyMaintenanceWorkflow.js";
import type {
  ManualLoyaltyAdjustmentInput,
  ManualLoyaltyAdjustmentResult,
} from "../workflows/ManualAdjustmentWorkflow.js";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: readonly { message: string }[];
};

/**
 * Broker integration point for Loyalty reads and durable domain mutations.
 */
@Injectable()
export class LoyaltyBrokerActions extends BrokerActions {
  constructor(@InjectBroker("loyalty") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private get service(): CheckoutRedemptionService {
    return new CheckoutRedemptionService(this.kernel.repository);
  }

  @Action(LoyaltyActionNames.getCustomerAccount, { readOnly: true })
  async getCustomerLoyaltyAccount(
    params: GetCustomerLoyaltyAccountParams,
  ): Promise<GetCustomerLoyaltyAccountResult> {
    return this.withStore(params.storeId, `account:${params.customerId}`, () =>
      this.service.getCustomerAccount(params),
    );
  }

  @Action(LoyaltyCheckoutActionNames.quoteRedemption, { readOnly: true })
  async quoteCheckoutLoyaltyRedemption(
    params: QuoteCheckoutLoyaltyRedemptionParams,
  ): Promise<QuoteCheckoutLoyaltyRedemptionResult> {
    return this.withStore(params.context.storeId, params.context.correlationId, () =>
      this.service.quote(params),
    );
  }

  @Action(LoyaltyCheckoutActionNames.reserveRedemption)
  async reserveCheckoutLoyaltyRedemption(
    params: ReserveCheckoutLoyaltyRedemptionParams,
  ): Promise<ReserveCheckoutLoyaltyRedemptionResult> {
    const organizationId = await this.getOrganizationId(params.context.storeId);
    return this.broker.runWorkflow("loyalty.reserveCheckoutLoyaltyRedemption", params, {
      source: "content",
      resourceId: params.context.checkoutId,
      operation: "reserveCheckoutLoyaltyRedemption",
      contentHash: params.requestHash,
      organizationId,
    });
  }

  @Action(LoyaltyCheckoutActionNames.commitRedemption)
  async commitCheckoutLoyaltyRedemption(
    params: CommitCheckoutLoyaltyRedemptionParams,
  ): Promise<CommitCheckoutLoyaltyRedemptionResult> {
    const organizationId = await this.getOrganizationId(params.storeId);
    return this.broker.runWorkflow("loyalty.commitCheckoutLoyaltyRedemption", params, {
      source: "content",
      resourceId: params.reservationId,
      operation: "commitCheckoutLoyaltyRedemption",
      contentHash: params.requestHash,
      organizationId,
    });
  }

  @Action(LoyaltyCheckoutActionNames.releaseRedemption)
  async releaseCheckoutLoyaltyRedemption(
    params: ReleaseCheckoutLoyaltyRedemptionParams,
  ): Promise<ReleaseCheckoutLoyaltyRedemptionResult> {
    const organizationId = await this.getOrganizationId(params.storeId);
    return this.broker.runWorkflow("loyalty.releaseCheckoutLoyaltyRedemption", params, {
      source: "content",
      resourceId: params.reservationId,
      operation: "releaseCheckoutLoyaltyRedemption",
      contentHash: params.requestHash,
      organizationId,
    });
  }

  @Action(LoyaltyCheckoutActionNames.expireRedemptions)
  async expireCheckoutLoyaltyRedemptions(
    params: ExpireCheckoutLoyaltyRedemptionsParams,
  ): Promise<ExpireCheckoutLoyaltyRedemptionsResult> {
    const organizationId = await this.getOrganizationId(params.storeId);
    return this.broker.runWorkflow("loyalty.expireCheckoutLoyaltyRedemptions", params, {
      source: "content",
      resourceId: params.storeId,
      operation: "expireCheckoutLoyaltyRedemptions",
      content: params,
      organizationId,
    });
  }

  @Action(LoyaltyCheckoutActionNames.reverseRedemption)
  async reverseCheckoutLoyaltyRedemption(
    params: ReverseCheckoutLoyaltyRedemptionParams,
  ): Promise<ReverseCheckoutLoyaltyRedemptionResult> {
    const organizationId = await this.getOrganizationId(params.storeId);
    return this.broker.runWorkflow("loyalty.reverseCheckoutLoyaltyRedemption", params, {
      source: "content",
      resourceId: params.reservationId,
      operation: "reverseCheckoutLoyaltyRedemption",
      contentHash: params.requestHash,
      organizationId,
    });
  }

  @Action(LoyaltyCheckoutActionNames.quoteReward, { readOnly: true })
  async quoteCheckoutLoyaltyReward(
    params: QuoteCheckoutLoyaltyRewardParams,
  ): Promise<QuoteCheckoutLoyaltyRewardResult> {
    return this.withStore(params.context.storeId, params.context.correlationId, async () => {
      try {
        if (!params.context.customerId)
          throw new LoyaltyDomainError(
            "CUSTOMER_REQUIRED",
            "A customer is required for a loyalty reward",
          );
        const entitlement = await this.kernel.repository.reward.findEntitlementById(
          params.entitlementId,
        );
        if (!entitlement || entitlement.status !== "ISSUED")
          throw new LoyaltyDomainError(
            "ENTITLEMENT_NOT_AVAILABLE",
            "Reward entitlement is not available",
          );
        const account = await this.kernel.repository.account.findById(entitlement.accountId);
        if (
          !account ||
          account.customerId !== params.context.customerId ||
          account.status !== "ACTIVE"
        )
          throw new LoyaltyDomainError(
            "ENTITLEMENT_CUSTOMER_MISMATCH",
            "Reward entitlement does not belong to this customer",
          );
        if (
          Date.parse(entitlement.validFrom) > Date.parse(params.context.effectiveAt) ||
          (entitlement.validTo &&
            Date.parse(entitlement.validTo) <= Date.parse(params.context.effectiveAt))
        )
          throw new LoyaltyDomainError(
            "ENTITLEMENT_NOT_AVAILABLE",
            "Reward entitlement is outside its validity window",
          );
        const definition = await this.kernel.repository.reward.findDefinitionById(
          entitlement.rewardDefinitionId,
        );
        if (!definition)
          throw new LoyaltyDomainError(
            "REWARD_DEFINITION_NOT_FOUND",
            "Reward definition was not found",
          );
        const externalDiscountId =
          typeof definition.configuration.externalDiscountId === "string"
            ? definition.configuration.externalDiscountId
            : null;
        if (!externalDiscountId) {
          throw new LoyaltyDomainError(
            "REWARD_NOT_CHECKOUT_APPLICABLE",
            "This reward type is not redeemable through Checkout",
          );
        }
        if (!params.appliedDiscountIds.includes(externalDiscountId)) {
          throw new LoyaltyDomainError(
            "REWARD_DISCOUNT_NOT_APPLIED",
            "The Pricing discount linked to this reward is not applied to the checkout",
          );
        }
        const quote = {
          entitlementId: entitlement.id,
          entitlementRevision: entitlement.revision,
          accountId: account.id,
          rewardDefinitionId: definition.id,
          rewardType: definition.rewardType,
          pricingDiscountId: externalDiscountId,
          externalReference: entitlement.externalReference,
          configuration: entitlement.configurationSnapshot,
          expiresAt: entitlement.validTo,
          revision: canonicalHash({
            entitlementId: entitlement.id,
            revision: entitlement.revision,
            checkoutId: params.context.checkoutId,
            pricingQuoteRevision: params.context.pricingQuoteRevision,
            appliedDiscountIds: params.appliedDiscountIds,
          }),
        };
        return { status: "QUOTED" as const, quote };
      } catch (error) {
        return rewardRejected(error);
      }
    });
  }

  @Action(LoyaltyCheckoutActionNames.reserveReward)
  async reserveCheckoutLoyaltyReward(
    params: ReserveCheckoutLoyaltyRewardParams,
  ): Promise<ReserveCheckoutLoyaltyRewardResult> {
    return this.withStore(params.storeId, params.idempotencyKey, async () => {
      try {
        const entitlement = await this.kernel.repository.reward.findEntitlementById(
          params.quote.entitlementId,
        );
        const account = entitlement
          ? await this.kernel.repository.account.findById(entitlement.accountId)
          : null;
        if (!entitlement || !account || account.customerId !== params.customerId)
          throw new LoyaltyDomainError(
            "ENTITLEMENT_CUSTOMER_MISMATCH",
            "Reward entitlement does not belong to this customer",
          );
        const definition = await this.kernel.repository.reward.findDefinitionById(
          entitlement.rewardDefinitionId,
        );
        if (
          !definition ||
          params.quote.accountId !== account.id ||
          params.quote.rewardDefinitionId !== definition.id ||
          params.quote.pricingDiscountId !== definition.configuration.externalDiscountId
        ) {
          throw new LoyaltyDomainError(
            "REWARD_QUOTE_STALE",
            "Reward quote no longer matches its entitlement and Pricing discount",
          );
        }
        const updated = await new RewardEntitlementService(this.kernel.repository).transition({
          entitlementId: entitlement.id,
          expectedRevision: params.quote.entitlementRevision,
          transition: { type: "RESERVE", checkoutId: params.checkoutId },
          idempotencyKey: params.idempotencyKey,
          occurredAt: params.reservedAt,
          actorType: "CUSTOMER",
          actorId: params.customerId,
          reasonCode: "CHECKOUT_REWARD_RESERVED",
        });
        return {
          status: "RESERVED" as const,
          entitlementId: updated.id,
          entitlementRevision: updated.revision,
        };
      } catch (error) {
        return rewardRejected(error);
      }
    });
  }

  @Action(LoyaltyCheckoutActionNames.commitReward)
  async commitCheckoutLoyaltyReward(
    params: CommitCheckoutLoyaltyRewardParams,
  ): Promise<TransitionCheckoutLoyaltyRewardResult> {
    return this.transitionReward(
      params.storeId,
      params.idempotencyKey,
      params.entitlementId,
      params.committedAt,
      {
        type: "REDEEM",
        orderId: params.orderId,
        externalReference: params.externalReference ?? null,
      },
      "COMMITTED",
      params.checkoutId,
    );
  }

  @Action(LoyaltyCheckoutActionNames.releaseReward)
  async releaseCheckoutLoyaltyReward(
    params: ReleaseCheckoutLoyaltyRewardParams,
  ): Promise<TransitionCheckoutLoyaltyRewardResult> {
    return this.transitionReward(
      params.storeId,
      params.idempotencyKey,
      params.entitlementId,
      params.releasedAt,
      { type: "RELEASE" },
      "RELEASED",
      params.checkoutId,
    );
  }

  @Action("runLoyaltyMaintenance")
  async runLoyaltyMaintenance(params: LoyaltyMaintenanceInput): Promise<LoyaltyMaintenanceResult> {
    const organizationId = await this.getOrganizationId(params.storeId);
    return this.broker.runWorkflow("loyalty.maintenance", params, {
      source: "content",
      resourceId: params.storeId,
      operation: "loyaltyMaintenance",
      content: params,
      organizationId,
    });
  }

  @Action("adjustLoyaltyPoints")
  async adjustLoyaltyPoints(
    params: ManualLoyaltyAdjustmentInput,
  ): Promise<ManualLoyaltyAdjustmentResult> {
    const organizationId = await this.getOrganizationId(params.storeId);
    return this.broker.runWorkflow("loyalty.adjustPoints", params, {
      source: "content",
      resourceId: params.accountId,
      operation: "adjustLoyaltyPoints",
      contentHash: params.requestHash,
      organizationId,
    });
  }

  private async withStore<T>(
    storeId: string,
    requestId: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const store = await this.getStore(storeId);
    const context = new ServiceContext({
      requestId,
      kernel: this.kernel,
      loaders: new Loader(this.kernel.repository),
      store,
      locale: store.defaultLocale,
      currency: store.currencyCode,
    });
    return runWithContext(context, work);
  }

  private async getOrganizationId(storeId: string): Promise<string> {
    return (await this.getStore(storeId)).organizationId;
  }

  private async getStore(storeId: string): Promise<ContextStore> {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: storeId },
    );
    if (!result.store) {
      throw new Error(result.userErrors[0]?.message ?? `Store ${storeId} was not found`);
    }
    return result.store;
  }

  private async transitionReward(
    storeId: string,
    idempotencyKey: string,
    entitlementId: string,
    occurredAt: string,
    transition:
      { type: "RELEASE" } | { type: "REDEEM"; orderId: string; externalReference?: string | null },
    status: "COMMITTED" | "RELEASED",
    checkoutId: string,
  ): Promise<TransitionCheckoutLoyaltyRewardResult> {
    return this.withStore(storeId, idempotencyKey, async () => {
      try {
        const current = await this.kernel.repository.reward.findEntitlementById(entitlementId);
        if (!current)
          throw new LoyaltyDomainError("ENTITLEMENT_NOT_FOUND", "Reward entitlement was not found");
        if (current.reservedForCheckoutId !== checkoutId) {
          if (
            (status === "COMMITTED" && current.status === "REDEEMED") ||
            (status === "RELEASED" && current.status === "ISSUED")
          )
            return {
              status: "NOOP",
              entitlementId: current.id,
              entitlementRevision: current.revision,
            };
          throw new LoyaltyDomainError(
            "CHECKOUT_MISMATCH",
            "Reward entitlement is reserved for another checkout",
          );
        }
        const updated = await new RewardEntitlementService(this.kernel.repository).transition({
          entitlementId,
          transition,
          idempotencyKey,
          occurredAt,
          actorType: "SERVICE",
          reasonCode: `CHECKOUT_REWARD_${status}`,
        });
        return { status, entitlementId: updated.id, entitlementRevision: updated.revision };
      } catch (error) {
        return rewardRejected(error);
      }
    });
  }
}

function rewardRejected(error: unknown) {
  return {
    status: "REJECTED" as const,
    code: error instanceof LoyaltyDomainError ? error.code : "LOYALTY_REWARD_OPERATION_FAILED",
    message: error instanceof Error ? error.message : String(error),
    retryable: error instanceof LoyaltyDomainError ? error.retryable : true,
  };
}

/** Public broker action contracts. */
export {
  LoyaltyActionNames,
  LoyaltyActions,
  LoyaltyCheckoutActionNames,
  LoyaltyCheckoutActions,
} from "@shopana/broker-types";

export type {
  CommitCheckoutLoyaltyRedemptionParams,
  CommitCheckoutLoyaltyRedemptionResult,
  ExpireCheckoutLoyaltyRedemptionsParams,
  ExpireCheckoutLoyaltyRedemptionsResult,
  GetCustomerLoyaltyAccountParams,
  GetCustomerLoyaltyAccountResult,
  LoyaltyAccountBalanceSnapshot,
  LoyaltyAccountSnapshot,
  LoyaltyCheckoutContext,
  LoyaltyCheckoutMoney,
  LoyaltyProgramSnapshot,
  LoyaltyRedemptionQuote,
  LoyaltyRedemptionIneligibilityCode,
  LoyaltyRedemptionRejectionCode,
  QuoteCheckoutLoyaltyRedemptionParams,
  QuoteCheckoutLoyaltyRedemptionResult,
  QuoteCheckoutLoyaltyRewardParams,
  QuoteCheckoutLoyaltyRewardResult,
  LoyaltyRewardQuote,
  ReserveCheckoutLoyaltyRewardParams,
  ReserveCheckoutLoyaltyRewardResult,
  CommitCheckoutLoyaltyRewardParams,
  ReleaseCheckoutLoyaltyRewardParams,
  TransitionCheckoutLoyaltyRewardResult,
  ReleaseCheckoutLoyaltyRedemptionParams,
  ReleaseCheckoutLoyaltyRedemptionResult,
  ReserveCheckoutLoyaltyRedemptionParams,
  ReserveCheckoutLoyaltyRedemptionResult,
  ReverseCheckoutLoyaltyRedemptionParams,
  ReverseCheckoutLoyaltyRedemptionResult,
} from "@shopana/broker-types";
