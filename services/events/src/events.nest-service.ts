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
import { EventDispatchWorkflow } from "./workflows/EventDispatchWorkflow.js";

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

    const dispatchWorkflow = new EventDispatchWorkflow("eventDispatch", {
      kernel: this.kernel,
    });
    const workflowName = this.broker.qualifyAction("eventDispatch");
    this.workflow.register(workflowName, {
      instance: dispatchWorkflow,
      metadata: { name: "eventDispatch" },
    });

    this.logger.debug("Registered workflow: eventDispatch");
    this.logger.log("Events service started");
  }

  async onModuleDestroy() {
    if (this.workflow) {
      this.workflow.deregister(this.broker.qualifyAction("eventDispatch"));
    }

    if (this.kernel) {
      await this.kernel.close();
    }

    this.logger.log("Events service stopped");
  }
}
