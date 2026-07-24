import { Injectable } from "@nestjs/common";
import {
  InjectBroker,
  ServiceBroker,
  Workflow,
} from "@shopana/shared-kernel";
import { MaterializationWorkflowBase } from "./MaterializationWorkflowBase.js";
import type {
  EnqueueWorkflowInput,
  MaterializationWorkflowResult,
} from "./types.js";

@Injectable()
export class NotificationEnqueueWorkflow extends MaterializationWorkflowBase {
  constructor(@InjectBroker("notifications") broker: ServiceBroker) {
    super(broker);
  }

  @Workflow("enqueue", { idempotencyStrategy: "client" })
  async run(
    input: EnqueueWorkflowInput
  ): Promise<MaterializationWorkflowResult> {
    const store = readStoreSnapshot(input.data);
    if (store.id !== input.storeId) {
      throw new Error("NOTIFICATION_STORE_SNAPSHOT_MISMATCH");
    }
    const context = {
      storeId: input.storeId,
      organizationId: input.organizationId,
      locale: input.locale,
      defaultLocale: store.defaultLocale,
      requestId: `notification-action-${input.idempotencyKey}`,
      displayName: store.displayName,
      timezone: store.timezone,
    };
    const materialized = await this.materialize({
      context,
      params: {
        ...input,
        sourceIdempotencyKey: input.idempotencyKey,
      },
    });
    const result: MaterializationWorkflowResult = {
      occurrenceIds: materialized.occurrenceId
        ? [materialized.occurrenceId]
        : [],
      deliveryIds: materialized.deliveryIds,
      skipped: materialized.skippedReason
        ? [{ key: input.key, reason: materialized.skippedReason }]
        : [],
    };
    for (const deliveryId of result.deliveryIds) {
      await this.startDelivery({ ...context, deliveryId });
    }
    return result;
  }
}

function readStoreSnapshot(data: Record<string, unknown>) {
  const store = data.store as Record<string, unknown> | undefined;
  if (
    !store ||
    typeof store.id !== "string" ||
    typeof store.displayName !== "string" ||
    typeof store.defaultLocale !== "string" ||
    typeof store.timezone !== "string"
  ) {
    throw new Error("NOTIFICATION_DATA_STORE_REQUIRED");
  }
  return store as {
    id: string;
    displayName: string;
    defaultLocale: string;
    timezone: string;
  };
}
