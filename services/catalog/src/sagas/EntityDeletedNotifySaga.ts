import { Injectable } from "@nestjs/common";
import {
  BrokerSaga,
  Saga,
  SagaStep,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { Media, EntityRef } from "@shopana/broker-types";

export interface EntityDeletedNotifyInput {
  entityRef: EntityRef;
}

export interface EntityDeletedNotifyOutput {
  unlinkedCount: number;
}

@Injectable()
export class EntityDeletedNotifySaga extends BrokerSaga<
  EntityDeletedNotifyInput,
  EntityDeletedNotifyOutput
> {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
    super(broker);
  }

  @Saga("entityDeletedNotify")
  async run(input: EntityDeletedNotifyInput): Promise<EntityDeletedNotifyOutput> {
    return this.notifyMedia(input.entityRef);
  }

  @SagaStep()
  private async notifyMedia(entityRef: EntityRef): Promise<EntityDeletedNotifyOutput> {
    const result = await this.broker.call<Media.EntityDeletedResult, Media.EntityDeletedParams>(
      "media.entityDeleted",
      { entityRef },
    );
    this.logger.log(
      { unlinkedCount: result.unlinkedCount },
      "Entity deleted notification sent"
    );
    return { unlinkedCount: result.unlinkedCount };
  }
}
