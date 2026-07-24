import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BrokerModule } from "@shopana/shared-kernel";
import { NotificationBrokerActions } from "./actions/index.js";
import {
  eventHandlers,
  NotificationIngressService,
} from "./handlers/index.js";
import { NotificationsNestService } from "./notifications.nest-service.js";
import { NotificationScheduler } from "./schedulers/NotificationScheduler.js";
import { workflows } from "./workflows/index.js";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BrokerModule.forFeature({ serviceName: "notifications" }),
  ],
  providers: [
    NotificationsNestService,
    NotificationBrokerActions,
    NotificationIngressService,
    NotificationScheduler,
    ...eventHandlers,
    ...workflows,
  ],
})
export class NotificationsModule {}
