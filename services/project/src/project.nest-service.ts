import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  Kernel,
  NestLogger,
  SERVICE_BROKER,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { FastifyInstance } from "fastify";
import { startServer } from "./api/graphql-admin/server.js";
import { config } from "./config.js";

@Injectable()
export class ProjectNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProjectNestService.name);
  private kernel!: Kernel;
  private graphqlServer: FastifyInstance | null = null;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.kernel = new Kernel(this.broker, new NestLogger(this.logger));

    this.graphqlServer = await startServer({
      port: config.port,
      grpcHost: config.platformGrpcHost,
      databaseUrl: config.databaseUrl,
    });

    this.logger.log("Project service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }
    this.logger.log("Project service stopped");
  }
}
