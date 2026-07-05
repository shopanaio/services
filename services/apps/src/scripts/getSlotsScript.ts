import type {
  TransactionScript,
  ScriptResult,
  Slot,
} from "@src/kernel/types";

/**
 * Parameters for getting slots by domain
 */
export interface GetSlotsParams {
  readonly storeId: string;
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
  const { storeId, domain } = params;
  const { slotsRepository, logger } = services;

  try {
    // Validate required parameters
    if (!storeId) {
      throw new Error("storeId is required but was not provided");
    }

    logger.debug({ storeId, domain }, "Getting slots for project");

    // Get slots from repository with optional domain filtering
    const slots = await slotsRepository.findAllSlots(storeId, domain);

    logger.debug(
      { storeId, domain, count: slots.length },
      "Successfully retrieved slots"
    );

    return {
      slots,
    };
  } catch (error) {
    logger.error(
      { storeId, domain, error },
      "Failed to get slots for project"
    );
    throw error;
  }
};
