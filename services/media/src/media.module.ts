import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BrokerModule } from "@shopana/shared-kernel";
import { MediaBrokerActions } from "./actions";
import { MediaNestService } from "./media.nest-service";
import { FileGarbageCollectorScheduler } from "./scheduled/FileGarbageCollectorScheduler";
import { workflows } from "./workflows/index.js";
import { S3Client, S3_CLIENT } from "./infrastructure/S3Client.js";

@Module({
  imports: [
    BrokerModule.forFeature({ serviceName: "media" }),
    ScheduleModule.forRoot(),
  ],
  providers: [
    MediaBrokerActions,
    MediaNestService,
    FileGarbageCollectorScheduler,
    ...workflows,
    {
      provide: S3_CLIENT,
      useFactory: () => new S3Client(),
    },
  ],
})
export class MediaModule {}
