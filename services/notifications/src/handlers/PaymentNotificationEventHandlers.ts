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
export class PaymentNotificationEventHandlers extends NotificationEventHandlersBase {
  constructor(
    @InjectBroker("notifications") broker: ServiceBroker,
    ingress: NotificationIngressService
  ) {
    super(broker, ingress);
  }

  @EventHandler("pendingPaymentFailed", { retry: { maxAttempts: 5 } })
  pendingPaymentFailed(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("pendingPaymentSucceeded", { retry: { maxAttempts: 5 } })
  pendingPaymentSucceeded(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("paymentReminderDue", { retry: { maxAttempts: 5 } })
  paymentReminderDue(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
}
