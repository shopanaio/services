import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { Media, EntityRef } from "@shopana/broker-types";

export interface BackRefNotifyInput {
  entityRef: EntityRef;
  fileIds: string[];
}

export interface BackRefNotifyOutput {
  unlinkedCount: number;
  linkedCount: number;
  skippedCount: number;
}

@Injectable()
export class BackRefNotifySaga extends BrokerSaga<BackRefNotifyInput, BackRefNotifyOutput> {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  @Saga("backRefNotify")
  async run(input: BackRefNotifyInput): Promise<BackRefNotifyOutput> {
    return this.syncFiles(input);
  }

  @SagaStep()
  private async syncFiles(input: BackRefNotifyInput): Promise<BackRefNotifyOutput> {
    const { entityRef, fileIds } = input;
    const uniqueFileIds = Array.from(new Set(fileIds));

    const result = await this.broker.call<Media.SyncEntityFilesResult, Media.SyncEntityFilesParams>(
      "media.syncEntityFiles",
      {
        entityRef,
        fileIds: uniqueFileIds,
      },
    );

    this.logger.log(
      {
        entityRef,
        unlinkedCount: result.unlinkedCount,
        linkedCount: result.linkedCount,
        skippedCount: result.skippedCount,
      },
      "BackRef sync completed"
    );

    return {
      unlinkedCount: result.unlinkedCount,
      linkedCount: result.linkedCount,
      skippedCount: result.skippedCount,
    };
  }
}
