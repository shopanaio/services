import { BaseType } from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";

/**
 * Base resolver class with pre-configured ServiceContext
 */
export abstract class UsersType<
  Value,
  Data = unknown,
> extends BaseType<Value, Data, ServiceContext> {}
