import type { ServiceContext } from "../../context/types.js";
import type { AvailableRewardConnectionInput } from "../../repositories/reward/RewardRepository.js";
import type { StorefrontTransactionConnectionInput } from "./TransactionResolvers.js";

const registries = new WeakMap<ServiceContext, StorefrontResolverRegistry>();

export function getStorefrontResolverRegistry(ctx: ServiceContext): StorefrontResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;
  const registry = new StorefrontResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class StorefrontResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async account(id: string) {
    const { StorefrontLoyaltyAccountResolver } = await import("./AccountResolvers.js");
    return new StorefrontLoyaltyAccountResolver(id, this.ctx);
  }

  async transaction(id: string) {
    const { StorefrontLoyaltyTransactionResolver } = await import("./TransactionResolvers.js");
    return new StorefrontLoyaltyTransactionResolver(id, this.ctx);
  }

  async transactionConnection(input: StorefrontTransactionConnectionInput) {
    const { StorefrontTransactionConnectionResolver } = await import("./TransactionResolvers.js");
    return new StorefrontTransactionConnectionResolver(input, this.ctx);
  }

  async availableReward(id: string) {
    const { LoyaltyAvailableRewardResolver } = await import("./RewardResolvers.js");
    return new LoyaltyAvailableRewardResolver(id, this.ctx);
  }

  async availableRewardConnection(input: AvailableRewardConnectionInput) {
    const { LoyaltyAvailableRewardConnectionResolver } = await import("./RewardResolvers.js");
    return new LoyaltyAvailableRewardConnectionResolver(input, this.ctx);
  }
}
