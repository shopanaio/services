import { Injectable } from "@nestjs/common";
import type { DomainEvent, EventHandlerDelivery, EventHandlerResponse } from "@shopana/events";
import {
  CatchAllEventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import { parseAuditEvent } from "../domain/index.js";
import { Kernel } from "../kernel/Kernel.js";

interface CatchAllEventHandlerParams {
  readonly event: DomainEvent<string, Record<string, unknown>>;
  readonly delivery: EventHandlerDelivery;
}

@Injectable()
export class AuditEventHandlers extends EventHandlers {
  constructor(@InjectBroker("audit") broker: ServiceBroker) {
    super(broker);
  }

  @CatchAllEventHandler({ retry: { maxAttempts: 10 } })
  async handleEvent(
    params: CatchAllEventHandlerParams,
    context: BrokerCallContext,
  ): Promise<EventHandlerResponse> {
    // Audit is a projection of aggregate lifecycle events only. Other domain events
    // remain intentionally outside this activity trail.
    if (!hasAuditEnvelope(params.event.payload)) return { success: true };
    if (context.caller.kind !== "event" || !params.delivery?.idempotencyKey) {
      return {
        success: false,
        error: {
          message: "Audit ingestion requires a trusted event delivery",
          code: "AUDIT_EVENT_REJECTED",
          retryable: false,
        },
      };
    }
    try {
      await Kernel.getInstance().repository.entries.append(parseAuditEvent(params.event));
      return { success: true };
    } catch (error) {
      const validationError = isRejectedAuditEvent(error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : "Audit event ingestion failed",
          code: validationError ? "AUDIT_EVENT_REJECTED" : "AUDIT_EVENT_INGEST_FAILED",
          retryable: !validationError,
        },
      };
    }
  }
}

function hasAuditEnvelope(payload: Record<string, unknown>): boolean {
  return typeof payload.audit === "object" && payload.audit !== null;
}

function isRejectedAuditEvent(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: unknown }).code;
  return (
    error.name === "ZodError" ||
    error.message.includes("Audit ") ||
    error.message.includes("audit ") ||
    code === "23505"
  );
}
