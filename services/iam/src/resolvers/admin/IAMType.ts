import { BaseType, Cache, type CacheStore } from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";

export { Cache };

/**
 * Base resolver class with pre-configured ServiceContext
 */
export abstract class IAMType<Value, Data = unknown> extends BaseType<
  Value,
  Data,
  ServiceContext
> {
  protected getCache(): CacheStore {
    return this.ctx.kernel.cache as CacheStore;
  }
}
