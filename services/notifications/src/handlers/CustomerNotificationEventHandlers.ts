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
export class CustomerNotificationEventHandlers extends NotificationEventHandlersBase {
  constructor(
    @InjectBroker("notifications") broker: ServiceBroker,
    ingress: NotificationIngressService
  ) {
    super(broker, ingress);
  }

  @EventHandler("giftCardIssued", { retry: { maxAttempts: 5 } })
  giftCardIssued(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("giftCardRecipientAssigned", { retry: { maxAttempts: 5 } })
  giftCardRecipientAssigned(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("storeCreditIssued", { retry: { maxAttempts: 5 } })
  storeCreditIssued(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("customerAccountActivated", { retry: { maxAttempts: 5 } })
  customerAccountActivated(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("b2bAccessGranted", { retry: { maxAttempts: 5 } })
  b2bAccessGranted(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
}
