import {
  BaseType,
  Cache,
  createExecutor,
  type CacheStore,
} from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";

export { Cache };

/**
 * Base resolver class with pre-configured ServiceContext and executor
 */
export abstract class IAMType<Value, Data = unknown> extends BaseType<
  Value,
  Data,
  ServiceContext
> {
  /**
   * Executor for IAM resolvers.
   * Add middleware here if needed (e.g., logging, metrics).
   */
  static executor = createExecutor<ServiceContext>({
    middleware: [],
  });

  protected getCache(): CacheStore {
    return this.ctx.kernel.cache as CacheStore;
  }
}
