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
export class OrderNotificationEventHandlers extends NotificationEventHandlersBase {
  constructor(
    @InjectBroker("notifications") broker: ServiceBroker,
    ingress: NotificationIngressService
  ) {
    super(broker, ingress);
  }

  @EventHandler("orderCreated", { retry: { maxAttempts: 5 } })
  orderCreated(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("draftOrderInvoiceRequested", { retry: { maxAttempts: 5 } })
  draftOrderInvoiceRequested(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("orderFulfilled", { retry: { maxAttempts: 5 } })
  orderFulfilled(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("orderInvoiceRequested", { retry: { maxAttempts: 5 } })
  orderInvoiceRequested(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("orderEdited", { retry: { maxAttempts: 5 } })
  orderEdited(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("orderCancelled", { retry: { maxAttempts: 5 } })
  orderCancelled(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("orderPaymentReceiptRequested", { retry: { maxAttempts: 5 } })
  orderPaymentReceiptRequested(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("orderRefunded", { retry: { maxAttempts: 5 } })
  orderRefunded(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("orderStatusLinkRequested", { retry: { maxAttempts: 5 } })
  orderStatusLinkRequested(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("posReceiptRequested", { retry: { maxAttempts: 5 } })
  posReceiptRequested(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("posExchangeReceiptRequested", { retry: { maxAttempts: 5 } })
  posExchangeReceiptRequested(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("returnCreated", { retry: { maxAttempts: 5 } })
  returnCreated(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("returnRequestReceived", { retry: { maxAttempts: 5 } })
  returnRequestReceived(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("returnRequestApproved", { retry: { maxAttempts: 5 } })
  returnRequestApproved(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("returnRequestDeclined", { retry: { maxAttempts: 5 } })
  returnRequestDeclined(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("orderChangeRequestReceived", { retry: { maxAttempts: 5 } })
  orderChangeRequestReceived(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("cancellationRequestDeclined", { retry: { maxAttempts: 5 } })
  cancellationRequestDeclined(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("orderSalesAttributionEdited", { retry: { maxAttempts: 5 } })
  orderSalesAttributionEdited(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
  @EventHandler("draftOrderSubmitted", { retry: { maxAttempts: 5 } })
  draftOrderSubmitted(p: NotificationHandlerParams, c: BrokerCallContext) {
    return this.handle(p, c);
  }
}
