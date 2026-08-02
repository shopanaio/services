import { Injectable } from "@nestjs/common";
import { Action, BrokerActions, InjectBroker, ServiceBroker, ZodSchema } from "@shopana/shared-kernel";
import { PricingCheckoutActionNames, type Pricing } from "@shopana/broker-types";
import type { ContextStore } from "@shopana/shared-context";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { BrokerCatalogMerchandiseAdapter } from "../checkout-pipeline/infrastructure/BrokerCatalogMerchandiseAdapter.js";
import { PricingCheckoutQuoteService } from "../checkout-pipeline/application/PricingCheckoutQuoteService.js";
import { calculateCheckoutPreliminaryQuoteParamsSchema, commitCheckoutDiscountUsageParamsSchema, expireCheckoutDiscountUsageParamsSchema, finalizeCheckoutPricingQuoteParamsSchema, releaseCheckoutDiscountUsageParamsSchema, reserveCheckoutDiscountUsageParamsSchema, reverseCheckoutDiscountUsageParamsSchema } from "../checkout-pipeline/schemas.js";
import { DiscountUsageReservationService } from "../checkout-pipeline/application/DiscountUsageReservationService.js";
import { PricingDiscountFunctionRunner } from "../checkout-pipeline/functions/PricingDiscountFunctionRunner.js";
import { DiscountUsageLifecycleService } from "../checkout-pipeline/application/DiscountUsageLifecycleService.js";

type GetStoreByIdResult = { store: ContextStore | null; userErrors: Array<{ code: string; message: string }> };

@Injectable()
export class PricingCheckoutBrokerActions extends BrokerActions {
  constructor(@InjectBroker("pricing") broker: ServiceBroker) { super(broker); }
  private get kernel(): Kernel { return Kernel.getInstance(); }
  private get service(): PricingCheckoutQuoteService { return new PricingCheckoutQuoteService(new BrokerCatalogMerchandiseAdapter(this.broker), this.kernel.repository.checkoutQuote, this.kernel.repository.discountEvaluation, this.kernel.repository.functionBinding, new PricingDiscountFunctionRunner(this.broker)); }

  @Action(PricingCheckoutActionNames.calculatePreliminaryQuote)
  @ZodSchema(calculateCheckoutPreliminaryQuoteParamsSchema)
  async calculateCheckoutPreliminaryQuote(params: Pricing.CalculateCheckoutPreliminaryQuoteParams): Promise<Pricing.CalculateCheckoutPreliminaryQuoteResult> {
    const store = await this.getStore(params.context.storeId); return runWithContext(this.context(store, params.context.correlationId), () => this.service.calculatePreliminaryQuote(params, store));
  }

  @Action(PricingCheckoutActionNames.finalizeQuote)
  @ZodSchema(finalizeCheckoutPricingQuoteParamsSchema)
  async finalizeCheckoutPricingQuote(params: Pricing.FinalizeCheckoutPricingQuoteParams): Promise<Pricing.FinalizeCheckoutPricingQuoteResult> {
    const store = await this.getStore(params.context.storeId); return runWithContext(this.context(store, params.context.correlationId), () => this.service.finalizeQuote(params, store));
  }

  @Action(PricingCheckoutActionNames.reserveUsage)
  @ZodSchema(reserveCheckoutDiscountUsageParamsSchema)
  async reserveCheckoutDiscountUsage(params: Pricing.ReserveCheckoutDiscountUsageParams): Promise<Pricing.ReserveCheckoutDiscountUsageResult> {
    const store = await this.getStore(params.storeId); return runWithContext(this.context(store, params.idempotencyKey), () => new DiscountUsageReservationService(this.kernel.db, this.kernel.repository.checkoutQuote).reserve(params));
  }

  @Action(PricingCheckoutActionNames.commitUsage)
  @ZodSchema(commitCheckoutDiscountUsageParamsSchema)
  async commitCheckoutDiscountUsage(params: Pricing.CommitCheckoutDiscountUsageParams): Promise<Pricing.CommitCheckoutDiscountUsageResult> { const store = await this.getStore(params.storeId); return runWithContext(this.context(store, params.idempotencyKey), () => new DiscountUsageLifecycleService(this.kernel.db, this.kernel.repository.checkoutQuote).commit(params)); }

  @Action(PricingCheckoutActionNames.releaseUsage)
  @ZodSchema(releaseCheckoutDiscountUsageParamsSchema)
  async releaseCheckoutDiscountUsage(params: Pricing.ReleaseCheckoutDiscountUsageParams): Promise<Pricing.ReleaseCheckoutDiscountUsageResult> { const store = await this.getStore(params.storeId); return runWithContext(this.context(store, `release:${params.reservationIds[0]}`), () => new DiscountUsageLifecycleService(this.kernel.db, this.kernel.repository.checkoutQuote).release(params)); }

  @Action(PricingCheckoutActionNames.expireUsage)
  @ZodSchema(expireCheckoutDiscountUsageParamsSchema)
  async expireCheckoutDiscountUsage(params: Pricing.ExpireCheckoutDiscountUsageParams): Promise<Pricing.ExpireCheckoutDiscountUsageResult> { const store = await this.getStore(params.storeId); return runWithContext(this.context(store, `expire:${params.effectiveAt}`), () => new DiscountUsageLifecycleService(this.kernel.db, this.kernel.repository.checkoutQuote).expire(params)); }

  @Action(PricingCheckoutActionNames.reverseUsage)
  @ZodSchema(reverseCheckoutDiscountUsageParamsSchema)
  async reverseCheckoutDiscountUsage(params: Pricing.ReverseCheckoutDiscountUsageParams): Promise<Pricing.ReverseCheckoutDiscountUsageResult> { const store = await this.getStore(params.storeId); return runWithContext(this.context(store, `reverse:${params.redemptionIds[0]}`), () => new DiscountUsageLifecycleService(this.kernel.db, this.kernel.repository.checkoutQuote).reverse(params)); }

  private async getStore(storeId: string): Promise<ContextStore> { const result = await this.broker.call<GetStoreByIdResult, { id: string }>("project.getStoreById", { id: storeId }); if (!result.store) throw new Error("Pricing checkout store was not found"); return result.store; }
  private context(store: ContextStore, requestId: string): ServiceContext { return new ServiceContext({ requestId, kernel: this.kernel, loaders: new Loader(this.kernel.repository), locale: store.defaultLocale, currency: store.currencyCode, store }); }
}
