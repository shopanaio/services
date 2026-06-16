import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";

@Injectable()
export class EventsBrokerActions extends BrokerActions {
  constructor(@InjectBroker("events") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  private get repository() {
    return this.kernel.repository;
  }

  @Action("cleanupDLQ")
  async cleanupDLQ(params: {
    batchSize?: number;
  }): Promise<{ deleted: number }> {
    const batchSize = params.batchSize ?? 1000;
    const deleted = await this.repository.cleanupExpiredDLQ(batchSize);
    return { deleted };
  }

  @Action("cleanupDomainEvents")
  async cleanupDomainEvents(params: {
    retentionDays?: number;
    batchSize?: number;
  }): Promise<{ deleted: number }> {
    const retentionDays = params.retentionDays ?? 90;
    const batchSize = params.batchSize ?? 5000;
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );
    const deleted = await this.repository.cleanupOldDomainEvents(
      cutoffDate,
      batchSize,
    );
    return { deleted };
  }
}
