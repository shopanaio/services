import {
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { sql } from "drizzle-orm";
import { Repository } from "./repositories/Repository.js";

@Injectable()
export class AppsNestService implements OnModuleInit {
  private readonly logger = new Logger(AppsNestService.name);

  constructor(private readonly repository: Repository) {}

  async onModuleInit() {
    await this.repository.db.execute(sql`SELECT 1`);
    this.logger.log("Apps service started");
  }
}
