/**
 * @shopana/broker-types
 *
 * Shared TypeScript types for broker actions and events.
 *
 * Usage:
 * ```typescript
 * import type { Apps, Media, IAM } from "@shopana/broker-types";
 *
 * const result = await broker.call<
 *   Apps.ExecuteCapabilityResult,
 *   Apps.ExecuteCapabilityParams
 * >(
 *   "apps.executeCapability",
 *   { storeId, capability: "commerce.function", operation: target, input }
 * );
 * ```
 */

export * from "./shared.js";
export * from "./collections.js";
export * from "./actions/index.js";
export * from "./events/index.js";
