import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  SERVICE_BROKER,
  ServiceBroker,
} from "@shopana/shared-kernel";
import type { FastifyInstance } from "fastify";
import { startServer } from "./api/graphql-admin/server.js";
import { config } from "./config.js";

@Injectable()
export class UsersNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UsersNestService.name);
  private graphqlServer: FastifyInstance | null = null;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    this.graphqlServer = await startServer({
      port: config.port,
    });

    this.logger.log("Users service started");
  }

  async onModuleDestroy() {
    if (this.graphqlServer) {
      await this.graphqlServer.close();
    }
    this.logger.log("Users service stopped");
  }
}
