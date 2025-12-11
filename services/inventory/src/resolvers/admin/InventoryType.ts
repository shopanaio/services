import { BaseType } from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";

/**
 * Base resolver class with pre-configured ServiceContext
 * Eliminates the need to specify context type parameter in every resolver
 */
export abstract class InventoryType<
  Value,
  Data = unknown,
> extends BaseType<Value, Data, ServiceContext> {}
