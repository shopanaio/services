import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { Kernel } from "../kernel/Kernel.js";

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);
  private retentionRunning = false;

  @Interval(15 * 60_000)
  async enforceRetention(): Promise<void> {
    if (this.retentionRunning || !Kernel.isInitialized()) return;
    this.retentionRunning = true;
    try {
      const now = Date.now();
      const day = 24 * 60 * 60 * 1_000;
      const result =
        await Kernel.getInstance().repository.privacy.runRetentionCleanup({
          authenticationCutoff: new Date(now - 7 * day).toISOString(),
          defaultCutoff: new Date(now - 30 * day).toISOString(),
          authenticationRenderedCutoff: new Date(
            now - 60 * 60 * 1_000
          ).toISOString(),
          defaultRenderedCutoff: new Date(now - day).toISOString(),
        });
      if (
        result.occurrencesPurged > 0 ||
        result.renderedDeliveriesPurged > 0 ||
        result.webhookSecretsPurged > 0
      ) {
        this.logger.log(
          `Retention cleanup purged ${result.occurrencesPurged} occurrences, ${result.renderedDeliveriesPurged} rendered deliveries, and ${result.webhookSecretsPurged} expired webhook secrets`
        );
      }
    } catch (error) {
      this.logger.error(error, "Notification retention cleanup failed");
    } finally {
      this.retentionRunning = false;
    }
  }
}
