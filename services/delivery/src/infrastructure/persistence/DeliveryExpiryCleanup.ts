import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { Repository } from "../../repositories/Repository.js";

@Injectable()
export class DeliveryExpiryCleanup implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private readonly repository: Repository) {}
  onModuleInit(): void {
    this.timer = setInterval(
      () => {
        void this.cleanup();
      },
      60 * 60 * 1_000,
    );
    this.timer.unref();
  }
  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
  private async cleanup(): Promise<void> {
    const now = new Date().toISOString();
    await Promise.all([
      this.repository.optionBindings.deleteExpired(now),
      this.repository.rateCache.deleteExpired(now),
    ]);
  }
}
