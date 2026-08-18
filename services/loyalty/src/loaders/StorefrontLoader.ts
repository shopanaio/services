import DataLoader from "dataloader";
import {
  CatalogCheckoutActions,
  CustomersCheckoutActions,
  type Catalog,
  type Customers,
} from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { Repository } from "../repositories/Repository.js";
import type { EarningRuleUsage } from "../repositories/models/index.js";

export interface StorefrontLoaderOptions {
  broker: ServiceBroker;
  storeId: string;
  currencyCode: string;
  localeCode: string | null;
  effectiveAt: string;
}

export interface CustomerProgramKey {
  customerId: string;
  programId: string;
}

export interface EarningRuleUsageKey {
  earningRuleId: string;
  accountId: string;
}

export interface RewardDefinitionUsageKey {
  rewardDefinitionId: string;
  accountId: string;
}

export class StorefrontLoader {
  readonly activeProgram;
  readonly effectiveProgramVersion;
  readonly accountByCustomerProgram;
  readonly rewardEntitlement;
  readonly availableRewardEntitlements;
  readonly customerEligibility;
  readonly catalogProduct: DataLoader<
    string,
    Catalog.CatalogProductSnapshot | null
  >;
  readonly catalogVariant;
  readonly earningRuleUsage;
  readonly rewardDefinitionUsage;

  constructor(
    repository: Repository,
    private readonly options?: StorefrontLoaderOptions,
  ) {
    this.activeProgram = new DataLoader(async (storeIds: readonly string[]) => {
      const row = await repository.program.findDefault();
      return storeIds.map((storeId) =>
        row && row.storeId === storeId ? row : null,
      );
    });

    this.effectiveProgramVersion = new DataLoader(async (programIds: readonly string[]) => {
      const rows = await repository.program.getEffectiveVersionsByProgramIds(
        programIds,
        options?.effectiveAt ?? new Date().toISOString(),
      );
      const byProgram = new Map(rows.map((row) => [row.programId, row]));
      return programIds.map((programId) => byProgram.get(programId) ?? null);
    });

    this.accountByCustomerProgram = new DataLoader<CustomerProgramKey, Awaited<ReturnType<Repository["account"]["findByCustomerAndProgram"]>>, string>(
      async (keys) => {
        const rows = await repository.account.getByCustomerIdsAndProgramIds(
          [...new Set(keys.map(({ customerId }) => customerId))],
          [...new Set(keys.map(({ programId }) => programId))],
        );
        const byKey = new Map(rows.map((row) => [accountKey(row.customerId, row.programId), row]));
        return keys.map((key) => byKey.get(accountKey(key.customerId, key.programId)) ?? null);
      },
      { cacheKeyFn: (key) => accountKey(key.customerId, key.programId) },
    );

    this.rewardEntitlement = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.reward.getEntitlementsByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });

    this.availableRewardEntitlements = new DataLoader(async (accountIds: readonly string[]) => {
      const rows = await repository.reward.listAvailableEntitlementsForAccounts(
        accountIds,
        options?.effectiveAt ?? new Date().toISOString(),
      );
      const grouped = new Map<string, typeof rows>();
      for (const row of rows) {
        grouped.set(row.accountId, [...(grouped.get(row.accountId) ?? []), row]);
      }
      return accountIds.map((accountId) => grouped.get(accountId) ?? []);
    });

    this.customerEligibility = new DataLoader(async (customerIds: readonly string[]) => {
      if (!options) return customerIds.map(() => null);
      return Promise.all(customerIds.map(async (customerId) => {
        const result = await options.broker.call<
          Customers.ResolveCheckoutBuyerEligibilityResult,
          Customers.ResolveCheckoutBuyerEligibilityParams
        >(CustomersCheckoutActions.resolveBuyerEligibility, {
          storeId: options.storeId,
          customerId,
          effectiveAt: options.effectiveAt,
        });
        return result.ok ? result : null;
      }));
    });

    this.catalogProduct = new DataLoader(async (productIds: readonly string[]) => {
      if (!options) return productIds.map(() => null);
      const result = await options.broker.call<
        Catalog.CatalogQueryResult,
        Catalog.CatalogQueryParams
      >("catalog.query", {
        storeId: options.storeId,
        selection: {
          populate: {
            products: {
              args: { first: Math.min(productIds.length, 100), where: { id: { _in: [...productIds] } } },
              populate: {
                edges: {
                  populate: {
                    node: {
                      fields: ["id", "revision", "status", "updatedAt"],
                      populate: {
                        categories: { fields: ["id"] },
                        tags: { fields: ["id"] },
                        features: { fields: ["id"] },
                        variants: {
                          fields: ["id"],
                          populate: {
                            prices: { fields: ["currencyCode", "amountMinor"] },
                            availability: { fields: ["availableForSale"] },
                            options: { fields: ["id"], populate: { values: { fields: ["id"] } } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!result.ok) throw new Error(`Catalog loyalty presentation failed: ${result.code}`);
      const rows = (result.data.products?.edges ?? []).flatMap((edge) =>
        edge?.node ? [edge.node] : [],
      );
      const byId = new Map(rows.map((row) => [row.id, row]));
      return productIds.map((id) => byId.get(id) ?? null);
    }, { maxBatchSize: 100 });

    this.catalogVariant = new DataLoader(async (variantIds: readonly string[]) => {
      if (!options) return variantIds.map(() => null);
      const result = await options.broker.call<
        Catalog.ResolveCheckoutMerchandiseResult,
        Catalog.ResolveCheckoutMerchandiseParams
      >(CatalogCheckoutActions.resolveMerchandise, {
        storeId: options.storeId,
        currencyCode: options.currencyCode,
        localeCode: options.localeCode,
        effectiveAt: options.effectiveAt,
        lines: variantIds.map((variantId) => ({
          lineId: variantId,
          variantId,
          componentSelection: null,
          purchase: { type: "ONE_TIME", sellingPlanId: null },
          quantity: 1,
          children: [],
        })),
      });
      if (!result.ok) throw new Error(`Catalog loyalty presentation failed: ${result.code}`);
      const byId = new Map<string, Catalog.ResolvedCheckoutMerchandiseLine | null>();
      for (const resolution of result.lines) {
        byId.set(
          resolution.status === "RESOLVED" ? resolution.line.variantId : resolution.variantId,
          resolution.status === "RESOLVED" ? resolution.line : null,
        );
      }
      return variantIds.map((id) => byId.get(id) ?? null);
    }, { maxBatchSize: 250 });

    this.earningRuleUsage = new DataLoader<EarningRuleUsageKey, {
      account: EarningRuleUsage | null;
      campaign: EarningRuleUsage | null;
    }, string>(async (keys) => {
      const scopes = [...new Set(keys.flatMap(({ accountId }) => [`account:${accountId}`, "campaign"]))];
      const rows = await repository.event.getCurrentUsages(
        [...new Set(keys.map(({ earningRuleId }) => earningRuleId))],
        scopes,
        options?.effectiveAt ?? new Date().toISOString(),
      );
      return keys.map(({ earningRuleId, accountId }) => ({
        account: rows.find((row) =>
          row.earningRuleId === earningRuleId && row.scopeKey === `account:${accountId}`
        ) ?? null,
        campaign: rows.find((row) =>
          row.earningRuleId === earningRuleId && row.scopeKey === "campaign"
        ) ?? null,
      }));
    }, { cacheKeyFn: ({ earningRuleId, accountId }) => `${earningRuleId}:${accountId}` });

    this.rewardDefinitionUsage = new DataLoader<RewardDefinitionUsageKey, {
      total: bigint;
      account: bigint;
    }, string>(async (keys) => {
      const rows = await repository.reward.getIssuanceCounts(
        [...new Set(keys.map(({ rewardDefinitionId }) => rewardDefinitionId))],
        [...new Set(keys.map(({ accountId }) => accountId))],
      );
      return keys.map(({ rewardDefinitionId, accountId }) => ({
        total: rows.find((row) =>
          row.rewardDefinitionId === rewardDefinitionId && row.accountId === null
        )?.quantity ?? 0n,
        account: rows.find((row) =>
          row.rewardDefinitionId === rewardDefinitionId && row.accountId === accountId
        )?.quantity ?? 0n,
      }));
    }, { cacheKeyFn: ({ rewardDefinitionId, accountId }) => `${rewardDefinitionId}:${accountId}` });
  }
}

function accountKey(customerId: string, programId: string): string {
  return `${customerId}:${programId}`;
}
