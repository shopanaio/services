import type { EventHandlerResponse } from "@shopana/events";
import {
  EventHandlers,
  type BrokerCallContext,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import {
  NotificationIngressService,
  type NotificationHandlerParams,
} from "./NotificationIngressService.js";

export abstract class NotificationEventHandlersBase extends EventHandlers {
  protected constructor(
    broker: ServiceBroker,
    private readonly ingress: NotificationIngressService
  ) {
    super(broker);
  }

  protected handle(
    params: NotificationHandlerParams,
    context: BrokerCallContext
  ): Promise<EventHandlerResponse<{ workflowId: string }>> {
    return this.ingress.enqueue(params, context);
  }
}
