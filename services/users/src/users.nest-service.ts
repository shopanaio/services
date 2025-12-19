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
import { getServiceConfig } from "@shopana/shared-service-config";
import type { FastifyInstance } from "fastify";
import { startServer } from "./api/graphql-admin/server.js";

const { service } = getServiceConfig("users");

@Injectable()
export class UsersNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UsersNestService.name);
  private graphqlServer: FastifyInstance | null = null;

  constructor(@Inject(SERVICE_BROKER) private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    const casdoor = service.casdoor;
    console.log("[USERS] casdoor config:", casdoor ? "present" : "missing");

    this.graphqlServer = await startServer({
      port: service.ports?.admin_graphql ?? 0,
      repository: casdoor
        ? {
            endpoint: casdoor.endpoint,
            clientId: casdoor.client_id,
            clientSecret: casdoor.client_secret,
            certificate: casdoor.certificate,
            organizationName: casdoor.organization_name,
            applicationName: casdoor.application_name,
          }
        : undefined,
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
