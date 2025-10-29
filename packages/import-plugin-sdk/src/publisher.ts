import type { InventoryUpdateTask } from "./task.js";
import { validateInventoryUpdateTask } from "./task.js";

export type InventoryUpdateSender = (
  task: InventoryUpdateTask
) => Promise<void>;

export interface InventoryUpdatePublisher {
  publish(task: InventoryUpdateTask): Promise<void>;
}

/**
 * Creates an inventory update publisher that validates each task before
 * delegating it to the provided sender implementation.
 */
export function createInventoryUpdatePublisher(
  sender: InventoryUpdateSender
): InventoryUpdatePublisher {
  return {
    async publish(task) {
      const payload = validateInventoryUpdateTask(task);
      await sender(payload);
    },
  };
}
