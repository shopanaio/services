/**
 * @shopana/broker-types
 *
 * Shared TypeScript types for broker actions and events.
 *
 * Usage:
 * ```typescript
 * import type { Apps, Media, IAM } from "@shopana/broker-types";
 *
 * const result = await broker.call<Apps.ExecuteResult, Apps.ExecuteParams>(
 *   "apps.execute",
 *   { domain: "inventory", operation: "getOffers", params }
 * );
 * ```
 */

export * from "./shared.js";
export * from "./actions/index.js";
export * from "./events/index.js";
