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
export class DeliveryNotificationEventHandlers extends NotificationEventHandlersBase {
  constructor(
    @InjectBroker("notifications") broker: ServiceBroker,
    ingress: NotificationIngressService
  ) {
    super(broker, ingress);
  }

  @EventHandler("localPickupReady", { retry: { maxAttempts: 5 } })
  localPickupReady(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("localPickupCompleted", { retry: { maxAttempts: 5 } })
  localPickupCompleted(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("localDeliveryStarted", { retry: { maxAttempts: 5 } })
  localDeliveryStarted(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("localDeliveryCompleted", { retry: { maxAttempts: 5 } })
  localDeliveryCompleted(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("localDeliveryMissed", { retry: { maxAttempts: 5 } })
  localDeliveryMissed(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("shippingTrackingUpdated", { retry: { maxAttempts: 5 } })
  shippingTrackingUpdated(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("shipmentOutForDelivery", { retry: { maxAttempts: 5 } })
  shipmentOutForDelivery(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("shipmentDelivered", { retry: { maxAttempts: 5 } })
  shipmentDelivered(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("returnLabelCreated", { retry: { maxAttempts: 5 } })
  returnLabelCreated(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
}
