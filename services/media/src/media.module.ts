import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { BrokerModule } from "@shopana/shared-kernel";
import { MediaBrokerActions } from "./actions";
import { MediaNestService } from "./media.nest-service";
import { FileGarbageCollectorScheduler } from "./scheduled/FileGarbageCollectorScheduler";
import { workflows } from "./workflows/index.js";
import { S3Client, S3_CLIENT } from "./infrastructure/S3Client.js";
import { cdnAdapterRegistry } from "./infrastructure/cdn/CdnAdapterRegistry.js";
import { createHmacSigningAdapter } from "./infrastructure/cdn/adapters/hmacSigningAdapter.js";
import { composedOptionsTransformAdapter } from "./infrastructure/cdn/adapters/composedOptionsTransformAdapter.js";
import { bunnyTransformAdapter } from "./infrastructure/cdn/adapters/bunnyTransformAdapter.js";
import { EnvSecretProvider } from "./infrastructure/secrets/EnvSecretProvider.js";

cdnAdapterRegistry.registerSigning(
  "hmac-v1",
  createHmacSigningAdapter(new EnvSecretProvider())
);
cdnAdapterRegistry.registerTransform(
  "composed-options-v1",
  composedOptionsTransformAdapter
);
cdnAdapterRegistry.registerTransform("bunny-v1", bunnyTransformAdapter);

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
