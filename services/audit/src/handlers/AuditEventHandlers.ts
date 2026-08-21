import { Injectable } from "@nestjs/common";
import type { DomainEvent, EventHandlerDelivery, EventHandlerResponse } from "@shopana/events";
import {
  CatchAllEventHandler,
  EventHandlers,
  InjectBroker,
  ServiceBroker,
  type BrokerCallContext,
} from "@shopana/shared-kernel";

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
    void params;
    void context;
    return { success: true };
  }
}
