import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { knexInstance } from "./infrastructure/db/database.js";

@Injectable()
export class AppsNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppsNestService.name);

  async onModuleInit() {
    await knexInstance.raw("SELECT 1");
    this.logger.log("Apps service started");
  }

  async onModuleDestroy() {
    await knexInstance.destroy();
    this.logger.log("Apps service stopped");
  }
}
