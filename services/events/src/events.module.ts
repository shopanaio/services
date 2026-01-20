import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BrokerModule } from "@shopana/shared-kernel";
import { EventsBrokerActions } from "./EventsBrokerActions.js";
import { CleanupScheduler } from "./CleanupScheduler.js";
import { EventsNestService } from "./events.nest-service.js";

@Module({
  imports: [
    BrokerModule.forFeature({ serviceName: "events" }),
    ScheduleModule.forRoot(),
  ],
  providers: [EventsBrokerActions, CleanupScheduler, EventsNestService],
})
export class EventsModule {}
