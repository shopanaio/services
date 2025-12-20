import { BaseType, Cache } from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";

export { Cache };

/**
 * Base resolver class with pre-configured ServiceContext
 */
export abstract class UsersType<
  Value,
  Data = unknown,
> extends BaseType<Value, Data, ServiceContext> {
  protected getCache() {
    return this.ctx.kernel.cache;
  }
}
