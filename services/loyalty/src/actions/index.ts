import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
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
} from "@shopana/broker-types";
import { CheckoutRedemptionService } from "../application/checkout/CheckoutRedemptionService.js";
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
      this.service.getCustomerAccount(params));
  }

  @Action(LoyaltyCheckoutActionNames.quoteRedemption, { readOnly: true })
  async quoteCheckoutLoyaltyRedemption(
    params: QuoteCheckoutLoyaltyRedemptionParams,
  ): Promise<QuoteCheckoutLoyaltyRedemptionResult> {
    return this.withStore(params.context.storeId, params.context.correlationId, () =>
      this.service.quote(params));
  }

  @Action(LoyaltyCheckoutActionNames.reserveRedemption)
  async reserveCheckoutLoyaltyRedemption(
    params: ReserveCheckoutLoyaltyRedemptionParams,
  ): Promise<ReserveCheckoutLoyaltyRedemptionResult> {
    return this.broker.runWorkflow(
      "loyalty.reserveCheckoutLoyaltyRedemption",
      params,
      {
        source: "content",
        resourceId: params.context.checkoutId,
        operation: "reserveCheckoutLoyaltyRedemption",
        contentHash: params.requestHash,
        tenantId: params.context.storeId,
      },
    );
  }

  @Action(LoyaltyCheckoutActionNames.commitRedemption)
  async commitCheckoutLoyaltyRedemption(
    params: CommitCheckoutLoyaltyRedemptionParams,
  ): Promise<CommitCheckoutLoyaltyRedemptionResult> {
    return this.broker.runWorkflow(
      "loyalty.commitCheckoutLoyaltyRedemption",
      params,
      {
        source: "content",
        resourceId: params.reservationId,
        operation: "commitCheckoutLoyaltyRedemption",
        contentHash: params.requestHash,
        tenantId: params.storeId,
      },
    );
  }

  @Action(LoyaltyCheckoutActionNames.releaseRedemption)
  async releaseCheckoutLoyaltyRedemption(
    params: ReleaseCheckoutLoyaltyRedemptionParams,
  ): Promise<ReleaseCheckoutLoyaltyRedemptionResult> {
    return this.broker.runWorkflow(
      "loyalty.releaseCheckoutLoyaltyRedemption",
      params,
      {
        source: "content",
        resourceId: params.reservationId,
        operation: "releaseCheckoutLoyaltyRedemption",
        contentHash: params.requestHash,
        tenantId: params.storeId,
      },
    );
  }

  @Action(LoyaltyCheckoutActionNames.expireRedemptions)
  async expireCheckoutLoyaltyRedemptions(
    params: ExpireCheckoutLoyaltyRedemptionsParams,
  ): Promise<ExpireCheckoutLoyaltyRedemptionsResult> {
    return this.broker.runWorkflow(
      "loyalty.expireCheckoutLoyaltyRedemptions",
      params,
      {
        source: "content",
        resourceId: params.storeId,
        operation: "expireCheckoutLoyaltyRedemptions",
        content: params,
        tenantId: params.storeId,
      },
    );
  }

  @Action(LoyaltyCheckoutActionNames.reverseRedemption)
  async reverseCheckoutLoyaltyRedemption(
    params: ReverseCheckoutLoyaltyRedemptionParams,
  ): Promise<ReverseCheckoutLoyaltyRedemptionResult> {
    return this.broker.runWorkflow(
      "loyalty.reverseCheckoutLoyaltyRedemption",
      params,
      {
        source: "content",
        resourceId: params.reservationId,
        operation: "reverseCheckoutLoyaltyRedemption",
        contentHash: params.requestHash,
        tenantId: params.storeId,
      },
    );
  }

  @Action("runLoyaltyMaintenance")
  async runLoyaltyMaintenance(
    params: LoyaltyMaintenanceInput,
  ): Promise<LoyaltyMaintenanceResult> {
    return this.broker.runWorkflow("loyalty.maintenance", params, {
      source: "content",
      resourceId: params.storeId,
      operation: "loyaltyMaintenance",
      content: params,
      tenantId: params.storeId,
    });
  }

  @Action("adjustLoyaltyPoints")
  async adjustLoyaltyPoints(
    params: ManualLoyaltyAdjustmentInput,
  ): Promise<ManualLoyaltyAdjustmentResult> {
    return this.broker.runWorkflow("loyalty.adjustPoints", params, {
      source: "content",
      resourceId: params.accountId,
      operation: "adjustLoyaltyPoints",
      contentHash: params.requestHash,
      tenantId: params.storeId,
    });
  }

  private async withStore<T>(
    storeId: string,
    requestId: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: storeId },
    );
    if (!result.store) {
      throw new Error(result.userErrors[0]?.message ?? `Store ${storeId} was not found`);
    }
    const context = new ServiceContext({
      requestId,
      kernel: this.kernel,
      loaders: new Loader(this.kernel.repository),
      store: result.store,
      locale: result.store.defaultLocale,
      currency: result.store.currencyCode,
    });
    return runWithContext(context, work);
  }
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
  ReleaseCheckoutLoyaltyRedemptionParams,
  ReleaseCheckoutLoyaltyRedemptionResult,
  ReserveCheckoutLoyaltyRedemptionParams,
  ReserveCheckoutLoyaltyRedemptionResult,
  ReverseCheckoutLoyaltyRedemptionParams,
  ReverseCheckoutLoyaltyRedemptionResult,
} from "@shopana/broker-types";
