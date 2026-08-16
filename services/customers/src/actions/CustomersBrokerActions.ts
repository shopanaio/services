import { Injectable } from "@nestjs/common";
import {
  CustomersComparisonActionNames,
  CustomersAdministrationActionNames,
  CustomersCheckoutActionNames,
  CustomersLoyaltyActionNames,
  type Customers,
} from "@shopana/broker-types";
import type { ContextStore } from "@shopana/shared-context";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  ZodSchema,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { ResolveCheckoutBuyerEligibilityScript } from "../checkout-pipeline/ResolveCheckoutBuyerEligibilityScript.js";
import {
  parseResolveBuyerEligibilityResult,
  resolveBuyerEligibilityParamsSchema,
} from "../checkout-pipeline/schemas.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";
import type { SegmentDependency } from "@shopana/customer-segment-dsl";

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: readonly { code: string; message: string }[];
};

@Injectable()
export class CustomersBrokerActions extends BrokerActions {
  constructor(@InjectBroker("customers") broker: ServiceBroker) {
    super(broker);
  }

  @Action(CustomersCheckoutActionNames.resolveBuyerEligibility, {
    readOnly: true,
  })
  @ZodSchema(resolveBuyerEligibilityParamsSchema)
  async resolveCheckoutBuyerEligibility(
    params: Customers.ResolveCheckoutBuyerEligibilityParams,
    callContext: BrokerCallContext
  ): Promise<Customers.ResolveCheckoutBuyerEligibilityResult> {
    const startedAt = Date.now();
    let result: Customers.ResolveCheckoutBuyerEligibilityResult;

    try {
      const store = await this.getStore(params.storeId);
      const kernel = Kernel.getInstance();
      const context = new ServiceContext({
        requestId:
          callContext.app?.correlationId ??
          `customers-checkout-eligibility-${Date.now()}`,
        kernel,
        loaders: new Loader(kernel.repository),
        locale: store.defaultLocale,
        currency: store.currencyCode,
        store,
      });
      result = await runWithContext(context, () =>
        kernel.runScript(ResolveCheckoutBuyerEligibilityScript, params)
      );
    } catch (error) {
      this.logger.error(
        {
          action: CustomersCheckoutActionNames.resolveBuyerEligibility,
          errorType: error instanceof Error ? error.name : "UnknownError",
        },
        "Customer checkout eligibility action failed"
      );
      result = {
        ok: false,
        code: "BUYER_ELIGIBILITY_RESOLUTION_FAILED",
        message: "Buyer eligibility could not be resolved.",
        retryable: true,
      };
    }

    const parsed = parseResolveBuyerEligibilityResult(params, result);
    this.logger.log({
      action: CustomersCheckoutActionNames.resolveBuyerEligibility,
      durationMs: Date.now() - startedAt,
      outcomeCode: parsed.ok ? "OK" : parsed.code,
      retryable: parsed.ok ? false : parsed.retryable,
    });
    return parsed;
  }

  @Action(CustomersComparisonActionNames.getSelection, { readOnly: true })
  async getCustomerComparisonSelection(
    params: Customers.GetCustomerComparisonSelectionParams,
    callContext: BrokerCallContext,
  ): Promise<Customers.GetCustomerComparisonSelectionResult> {
    if (
      callContext.caller.kind !== "action" ||
      callContext.caller.service !== "catalog"
    ) {
      return {
        ok: false,
        code: "CUSTOMER_COMPARISON_CALLER_FORBIDDEN",
        message: "Only Catalog may read persisted comparison selections",
        retryable: false,
      };
    }

    try {
      const store = await this.getStore(params.storeId);
      const kernel = Kernel.getInstance();
      const context = new ServiceContext({
        requestId:
          callContext.app?.correlationId ??
          `customers-comparison-selection-${Date.now()}`,
        kernel,
        loaders: new Loader(kernel.repository),
        locale: store.defaultLocale,
        currency: store.currencyCode,
        store,
      });
      return await runWithContext(context, async () => {
        const customer = await kernel.repository.customer.findById(
          params.customerId,
        );
        if (!customer || customer.lifecycleStatus !== "ACTIVE") {
          return {
            ok: false as const,
            code: "CUSTOMER_NOT_FOUND" as const,
            message: "Customer was not found",
            retryable: false,
          };
        }
        const selection = await kernel.repository.comparison.getSelection(
          params.customerId,
        );
        return {
          ok: true as const,
          revision: selection.revision,
          items: selection.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            position: item.position,
          })),
        };
      });
    } catch {
      return {
        ok: false,
        code: "CUSTOMER_COMPARISON_READ_FAILED",
        message: "Customer comparison selection could not be read",
        retryable: true,
      };
    }
  }

  @Action(CustomersLoyaltyActionNames.validateSegments, { readOnly: true })
  async validateLoyaltySegmentReferences(
    params: Customers.ValidateLoyaltySegmentReferencesParams,
    callContext: BrokerCallContext,
  ): Promise<Customers.ValidateLoyaltySegmentReferencesResult> {
    if (callContext.caller.kind !== "action" || callContext.caller.service !== "loyalty") {
      return { ok: false, code: "CUSTOMERS_LOYALTY_REFERENCE_VALIDATION_FAILED", message: "Only Loyalty may validate loyalty segment references", retryable: false };
    }
    try {
      const store = await this.getStore(params.storeId);
      const kernel = Kernel.getInstance();
      return runWithContext(new ServiceContext({
        requestId: callContext.app?.correlationId ?? `loyalty-segments-${Date.now()}`,
        kernel,
        loaders: new Loader(kernel.repository),
        locale: store.defaultLocale,
        currency: store.currencyCode,
        store,
      }), async () => {
        const ids = [...new Set(params.segmentIds)];
        const found = new Set((await kernel.repository.segment.getByIds(ids)).map(({ id }) => id));
        return { ok: true as const, missingSegmentIds: ids.filter((id) => !found.has(id)) };
      });
    } catch (error) {
      return { ok: false, code: "CUSTOMERS_LOYALTY_REFERENCE_VALIDATION_FAILED", message: error instanceof Error ? error.message : "Customer segment validation failed", retryable: true };
    }
  }

  @Action(CustomersAdministrationActionNames.rebuildStatistics)
  async rebuildCustomerStatistics(
    params: Customers.RebuildCustomerStatisticsParams,
    callContext: BrokerCallContext,
  ): Promise<Customers.RebuildCustomerStatisticsResult> {
    const forbidden = this.assertAdministrativeCaller(callContext);
    if (forbidden) return forbidden;
    try {
      const store = await this.getStore(params.storeId);
      const kernel = Kernel.getInstance();
      const requestId = callContext.app?.correlationId ??
        `customers-statistics-rebuild-${Date.now()}`;
      const context = new ServiceContext({
        requestId,
        kernel,
        loaders: new Loader(kernel.repository),
        locale: store.defaultLocale,
        currency: store.currencyCode,
        store,
      });
      const effectiveAt = new Date().toISOString();
      const result = await runWithContext(context, async () => {
        const customerIds = params.customerId
          ? [params.customerId]
          : await kernel.repository.statistics.projectedCustomerIds();
        if (
          params.customerId &&
          !(await kernel.repository.customer.exists(params.customerId))
        ) {
          return {
            ok: false as const,
            code: "CUSTOMER_NOT_FOUND" as const,
            message: "Customer was not found",
            retryable: false,
          };
        }
        let rebuiltCustomers = 0;
        for (const customerId of customerIds) {
          if (await kernel.repository.statistics.rebuildForCustomer(customerId)) {
            rebuiltCustomers += 1;
            await kernel.repository.segmentMaterialization.enqueueCustomer(
              customerId,
              new Set<SegmentDependency>([
                "statistics.order",
                "statistics.checkout",
                "statistics.refund",
              ]),
              `${requestId}:${customerId}`,
              effectiveAt,
            );
          }
        }
        return { ok: true as const, rebuiltCustomers };
      });
      if (result.ok && result.rebuiltCustomers > 0) {
        await this.startSegmentMaintenance(store, requestId, "statisticsRebuild");
      }
      return result;
    } catch (error) {
      this.logger.error({ error }, "Customer statistics rebuild failed");
      return {
        ok: false,
        code: "CUSTOMERS_REBUILD_FAILED",
        message: "Customer statistics could not be rebuilt",
        retryable: true,
      };
    }
  }

  @Action(CustomersAdministrationActionNames.rebuildDynamicSegments)
  async rebuildCustomerDynamicSegments(
    params: Customers.RebuildCustomerDynamicSegmentsParams,
    callContext: BrokerCallContext,
  ): Promise<Customers.RebuildCustomerDynamicSegmentsResult> {
    const forbidden = this.assertAdministrativeCaller(callContext);
    if (forbidden) return forbidden;
    try {
      const store = await this.getStore(params.storeId);
      const kernel = Kernel.getInstance();
      const requestId = callContext.app?.correlationId ??
        `customers-dynamic-segment-rebuild-${Date.now()}`;
      const context = new ServiceContext({
        requestId,
        kernel,
        loaders: new Loader(kernel.repository),
        locale: store.defaultLocale,
        currency: store.currencyCode,
        store,
      });
      const result = await runWithContext(context, async () => {
        if (
          params.customerId &&
          !(await kernel.repository.customer.exists(params.customerId))
        ) {
          return {
            ok: false as const,
            code: "CUSTOMER_NOT_FOUND" as const,
            message: "Customer was not found",
            retryable: false,
          };
        }
        const effectiveAt = new Date().toISOString();
        const invalidatedMemberships = params.customerId
          ? await kernel.repository.txManager.run(() =>
              kernel.repository.segmentMaterialization.enqueueCustomer(
                params.customerId!,
                new Set<SegmentDependency>(["customer.any"]),
                requestId,
                effectiveAt,
              ),
            )
          : await kernel.repository.txManager.run(async () => {
              const removed = await kernel.repository.segment.invalidateRuleMemberships();
              const segments = await kernel.repository.segment.listDynamic();
              for (const segment of segments) {
                if (segment.status === "ACTIVE") {
                  await kernel.repository.segmentMaterialization.schedule(
                    segment,
                    effectiveAt,
                    true,
                  );
                }
              }
              return removed;
            });
        return { ok: true as const, invalidatedMemberships };
      });
      if (result.ok) {
        await this.startSegmentMaintenance(store, requestId, "operatorRebuild");
      }
      return result;
    } catch (error) {
      this.logger.error({ error }, "Customer dynamic segment rebuild failed");
      return {
        ok: false,
        code: "CUSTOMERS_REBUILD_FAILED",
        message: "Customer dynamic segments could not be rebuilt",
        retryable: true,
      };
    }
  }

  private assertAdministrativeCaller(
    callContext: BrokerCallContext,
  ): Customers.CustomersAdministrationActionFailure | null {
    if (
      callContext.caller.kind === "action" &&
      ["bootstrap", "customers"].includes(callContext.caller.service)
    ) {
      return null;
    }
    return {
      ok: false,
      code: "CUSTOMERS_ADMIN_CALLER_FORBIDDEN",
      message: "Only the trusted platform administration boundary may rebuild projections",
      retryable: false,
    };
  }

  private async startSegmentMaintenance(
    store: ContextStore,
    requestId: string,
    operation: string,
  ): Promise<void> {
    await this.broker.startWorkflow(
      "customers.customerSegmentMaintenance",
      {
        context: {
          storeId: store.id,
          organizationId: store.organizationId,
          requestId,
        },
      },
      {
        source: "content",
        resourceId: store.id,
        operation: `customerSegment${operation}`,
        contentHash: requestId,
      },
    );
  }

  private async getStore(storeId: string): Promise<ContextStore> {
    const result = await this.broker.call<GetStoreByIdResult, { id: string }>(
      "project.getStoreById",
      { id: storeId }
    );
    if (!result.store) {
      throw new Error("Customers store was not found");
    }
    return result.store;
  }
}
