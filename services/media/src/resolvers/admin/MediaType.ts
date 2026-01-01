import {
  BaseType,
  Cache,
  createExecutor,
  type CacheStore,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";

export { Cache };

/**
 * Base resolver class with pre-configured ServiceContext and executor.
 *
 * @template TValue - The type of the input value passed to the constructor
 * @template TData - The type of the loaded data entity
 *
 * @example
 * ```typescript
 * class FileResolver extends MediaType<string, File | null> {
 *   @Cache({ cacheName: "media:file", key: (r) => r.value })
 *   async $preload() {
 *     return this.$ctx.loaders.file.load(this.$props);
 *   }
 * }
 * ```
 */
export abstract class MediaType<TValue, TData = unknown> extends BaseType<
  TValue,
  TData,
  ServiceContext
> {
  static executor = createExecutor<ServiceContext>({});

  protected getCache(): CacheStore {
    return this.$ctx.kernel.cache as CacheStore;
  }
}
