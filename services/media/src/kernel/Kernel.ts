import type { Logger } from "@shopana/shared-kernel";
import { Kernel as BaseKernel } from "@shopana/shared-kernel";
import { createCache, type Cache } from "cache-manager";
import type { Repository } from "../repositories";
import type { MediaKernelServices } from "./types";

/**
 * Extended kernel for media microservice
 */
export class Kernel extends BaseKernel<MediaKernelServices> {
  public readonly repository: Repository;
  public readonly cache: Cache;

  constructor(repository: Repository, logger: Logger, broker: any) {
    super(broker, logger, { repository });
    this.repository = repository;
    this.cache = createCache({
      ttl: 5 * 60 * 1000, // 5 minutes default TTL
    });
  }
}

export { KernelError } from "./types";
export type {
  MediaKernelServices,
  ScriptContext,
  TransactionScript,
} from "./types";
