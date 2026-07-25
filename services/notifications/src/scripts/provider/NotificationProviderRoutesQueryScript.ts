import type { Apps } from "@shopana/broker-types";
import { BaseAdminScript } from "../shared/BaseAdminScript.js";
import type { NotificationProviderRoutesView } from "./dto/index.js";

export class NotificationProviderRoutesQueryScript extends BaseAdminScript<
  Record<string, never>,
  NotificationProviderRoutesView
> {
  protected async execute(): Promise<NotificationProviderRoutesView> {
    return Promise.all(
      (["EMAIL", "SMS", "WEBHOOK"] as const).map((channel) =>
        this.services.broker.call<
          Apps.NotificationProviderRouteStatusResult,
          Apps.NotificationProviderRouteStatusParams
        >("apps.getNotificationProviderRouteStatus", {
          storeId: this.context.store.id,
          channel,
        })
      )
    );
  }
}
