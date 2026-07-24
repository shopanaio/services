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
export class CheckoutNotificationEventHandlers extends NotificationEventHandlersBase {
  constructor(
    @InjectBroker("notifications") broker: ServiceBroker,
    ingress: NotificationIngressService
  ) {
    super(broker, ingress);
  }

  @EventHandler("checkoutAbandoned", { retry: { maxAttempts: 5 } })
  checkoutAbandoned(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("checkoutPaymentFailed", { retry: { maxAttempts: 5 } })
  checkoutPaymentFailed(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("posCheckoutAbandoned", { retry: { maxAttempts: 5 } })
  posCheckoutAbandoned(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("posCartEmailRequested", { retry: { maxAttempts: 5 } })
  posCartEmailRequested(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
}
