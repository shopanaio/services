import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  DATABASE_CLIENT,
  InjectBroker,
  ServiceBroker,
  type DatabaseClient,
} from "@shopana/shared-kernel";
import { WORKFLOW_REGISTRY, WorkflowRegistry } from "@shopana/shared-kernel";
import { Kernel } from "./kernel/Kernel.js";

@Injectable()
export class EventsNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsNestService.name);
  private kernel!: Kernel;

  constructor(
    @InjectBroker("events") private readonly broker: ServiceBroker,
    @Inject(WORKFLOW_REGISTRY) private readonly workflow: WorkflowRegistry,
    @Inject(DATABASE_CLIENT) private readonly dbClient: DatabaseClient
  ) {}

  async onModuleInit() {
    this.kernel = await Kernel.create(this.broker, this.workflow, this.dbClient);

    this.logger.log("Events service started");
  }

  async onModuleDestroy() {
    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("Events service stopped");
  }
}
