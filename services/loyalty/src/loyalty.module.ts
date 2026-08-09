import { Module } from "@nestjs/common";

/**
 * Contract-only Loyalty module.
 *
 * Runtime providers are intentionally absent until resolvers, repositories,
 * event handlers, and workflows are implemented in a later change.
 */
@Module({})
export class LoyaltyModule {}

export * from "./contracts/index.js";
