import type {
  TransactionScript,
  KernelServices,
  ScriptResult,
  Slot,
} from "@src/kernel/types";

/**
 * Parameters for getting slots by domain
 */
export interface GetSlotsParams {
  readonly projectId: string;
  readonly domain?: string;
}

/**
 * Result of getting slots
 */
export interface GetSlotsResult {
  slots: Slot[];
}

/**
 * Transaction Script: Get slots for project, optionally filtered by domain
 */
export const getSlotsScript: TransactionScript<
  GetSlotsParams,
  GetSlotsResult
> = async (params, services) => {
  const { projectId, domain } = params;
  const { slotsRepository, logger } = services;

  try {
    // Validate required parameters
    if (!projectId) {
      throw new Error("projectId is required but was not provided");
    }

    logger.debug({ projectId, domain }, "Getting slots for project");

    // Get slots from repository with optional domain filtering
    const slots = await slotsRepository.findAllSlots(projectId, domain);

    logger.debug(
      { projectId, domain, count: slots.length },
      "Successfully retrieved slots"
    );

    return {
      slots,
    };
  } catch (error) {
    logger.error(
      { projectId, domain, error },
      "Failed to get slots for project"
    );
    throw error;
  }
};
