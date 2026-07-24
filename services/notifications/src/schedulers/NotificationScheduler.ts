import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { CronTime } from "cron";
import { Kernel } from "../kernel/Kernel.js";

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);
  private running = false;
  private retentionRunning = false;

  @Interval(60_000)
  async dispatchDueSchedules(): Promise<void> {
    if (this.running || !Kernel.isInitialized()) return;
    this.running = true;
    try {
      const kernel = Kernel.getInstance();
      const now = new Date().toISOString();
      const schedules = await kernel.repository.staff.findDueSchedules(now);
      for (const candidate of schedules) {
        const candidateRunAt = candidate.nextRunAt;
        if (!candidateRunAt) continue;
        await kernel.repository.txManager.run(async () => {
          const schedule =
            await kernel.repository.staff.claimDueSchedule({
              storeId: candidate.storeId,
              definitionKey: candidate.definitionKey,
              nextRunAt: candidateRunAt,
              expectedVersion: candidate.version,
            });
          if (!schedule?.nextRunAt) return;

          const scheduledAt = schedule.nextRunAt;
          const periodStart =
            schedule.lastRunAt ??
            new Date(
              Date.parse(scheduledAt) - 24 * 60 * 60 * 1_000
            ).toISOString();
          const nextRunAt = new CronTime(schedule.cron, schedule.timezone)
            .getNextDateFrom(new Date(scheduledAt), schedule.timezone)
            .toUTC()
            .toISO();
          if (!nextRunAt) {
            throw new Error(`No next run for schedule ${schedule.storeId}`);
          }

          const started = await kernel
            .getServices()
            .broker.startWorkflow(
              "notifications.storeOrderSummaryDispatch",
              {
                storeId: schedule.storeId,
                organizationId: schedule.organizationId,
                periodStart,
                periodEnd: scheduledAt,
              },
              {
                source: "content",
                organizationId: schedule.organizationId,
                resourceId: [
                  schedule.storeId,
                  schedule.definitionKey,
                  scheduledAt,
                ].join(":"),
                operation: "notifications.storeOrderSummaryDispatch",
                content: {
                  storeId: schedule.storeId,
                  periodStart,
                  periodEnd: scheduledAt,
                },
              }
            );
          const advanced =
            await kernel.repository.staff.markScheduleDispatched({
              storeId: schedule.storeId,
              definitionKey: schedule.definitionKey,
              lastRunAt: scheduledAt,
              nextRunAt,
              expectedVersion: schedule.version,
            });
          if (!advanced) {
            throw new Error(
              `Failed to advance schedule ${schedule.storeId}:${schedule.definitionKey}`
            );
          }
          this.logger.debug(
            `Started ${started.workflowId} for ${schedule.storeId}`
          );
        });
      }
    } catch (error) {
      this.logger.error(error, "Notification scheduler failed");
    } finally {
      this.running = false;
    }
  }

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
