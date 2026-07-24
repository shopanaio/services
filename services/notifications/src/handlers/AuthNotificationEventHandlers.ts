import { Injectable } from "@nestjs/common";
import {
  EventHandler,
  InjectBroker,
  ServiceBroker,
  type BrokerCallContext,
} from "@shopana/shared-kernel";
import {
  NotificationIngressService,
  type NotificationHandlerParams,
} from "./NotificationIngressService.js";
import { NotificationEventHandlersBase } from "./NotificationEventHandlersBase.js";

@Injectable()
export class AuthNotificationEventHandlers extends NotificationEventHandlersBase {
  constructor(
    @InjectBroker("notifications") broker: ServiceBroker,
    ingress: NotificationIngressService
  ) {
    super(broker, ingress);
  }

  @EventHandler("customerNewLoginDetected", { retry: { maxAttempts: 5 } })
  customerNewLoginDetected(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
}
