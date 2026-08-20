import type { AdminOrderCommandResult } from "../../domain/admin/AdminOrderCommandContracts.js";
import type { AdminOrderExternalEffect } from "./AdminOrderCommandPorts.js";

export type AdminOrderOperationExecution = Readonly<{
  result: AdminOrderCommandResult;
  loadEffects: () => Promise<readonly AdminOrderExternalEffect[]>;
  performEffect: (effect: AdminOrderExternalEffect) => Promise<unknown>;
  recordAttempt: (
    attemptNumber: number,
    effect: AdminOrderExternalEffect,
    response: unknown,
    error?: unknown,
  ) => Promise<void>;
  applyEffect: (effect: AdminOrderExternalEffect, response: unknown) => Promise<void>;
  finish: (succeeded: boolean, error?: unknown) => Promise<number | null>;
  publish: (result: AdminOrderCommandResult) => Promise<unknown>;
}>;

/** Coordinates durable provider effects while persistence remains in transactional adapters. */
export async function executeAdminOrderOperation(
  execution: AdminOrderOperationExecution,
): Promise<AdminOrderCommandResult> {
  try {
    const effects = await execution.loadEffects();
    for (let index = 0; index < effects.length; index += 1) {
      const effect = effects[index]!;
      try {
        const response = await execution.performEffect(effect);
        await execution.recordAttempt(index + 1, effect, response);
        await execution.applyEffect(effect, response);
      } catch (error) {
        await execution.recordAttempt(index + 1, effect, null, error);
        throw error;
      }
    }
  } catch (error) {
    await execution.finish(false, error);
    throw error;
  }

  const finalOrderVersion = await execution.finish(true);
  const completedResult =
    finalOrderVersion === null
      ? execution.result
      : { ...execution.result, orderVersion: finalOrderVersion };
  await execution.publish(completedResult);
  return completedResult;
}
