/**
 * @shopana/broker-types
 *
 * Shared TypeScript types for broker actions and events.
 *
 * Usage:
 * ```typescript
 * import { Media, IAM } from "@shopana/broker-types/actions";
 * import { MediaEvents } from "@shopana/broker-types/events";
 *
 * // Or import specific types
 * import type { FileLinkParams, FileLinkResult } from "@shopana/broker-types/actions";
 *
 * await broker.call<Media.FileLinkResult, Media.FileLinkParams>("media.fileLink", params);
 * ```
 */

// Re-export everything for convenience
export * from "./shared.js";
export * from "./actions/index.js";
export * from "./events/index.js";
