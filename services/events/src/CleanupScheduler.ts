import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectBroker, ServiceBroker } from "@shopana/shared-kernel";

@Injectable()
export class CleanupScheduler {
  private readonly logger = new Logger(CleanupScheduler.name);

  constructor(@InjectBroker("events") private readonly broker: ServiceBroker) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredDLQEntries(): Promise<void> {
    let totalDeleted = 0;
    let deleted: number;

    do {
      const result = await this.broker.call<{ deleted: number }>(
        this.broker.qualifyAction("cleanupDLQ"),
        { batchSize: 1000 }
      );
      deleted = result.deleted;
      totalDeleted += deleted;
    } while (deleted > 0);

    if (totalDeleted > 0) {
      this.logger.log(`DLQ cleanup: deleted ${totalDeleted} expired entries`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupOldDomainEvents(): Promise<void> {
    const retentionDays = 90;
    const batchSize = 5000;

    let totalDeleted = 0;
    let deleted: number;

    do {
      const result = await this.broker.call<{ deleted: number }>(
        this.broker.qualifyAction("cleanupDomainEvents"),
        { retentionDays, batchSize }
      );
      deleted = result.deleted;
      totalDeleted += deleted;

      if (deleted > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } while (deleted > 0);

    if (totalDeleted > 0) {
      this.logger.log(
        `Domain events cleanup: deleted ${totalDeleted} events older than ${retentionDays} days`
      );
    }
  }
}
