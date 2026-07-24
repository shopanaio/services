import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kernel, InjectBroker, ServiceBroker, NestLogger } from '@shopana/shared-kernel';
import { FastifyInstance } from 'fastify';
import { dumboPool, knexInstance } from './infrastructure/db/database';
import { SlotsRepository } from './infrastructure/repositories/slotsRepository';
import { startServer } from './api/server';
import { AppsPluginManager } from './infrastructure/plugins/pluginManager';
import { execute, type ExecuteParams, type ExecuteResult, type AppsKernelServices } from './scripts/execute';
import { AppsSecretStore } from "./infrastructure/secrets/AppsSecretStore.js";
import {
  configureNotificationProvider,
  executeAssigned,
  getMaskedNotificationProviderConfig,
  getNotificationProviderRouteStatus,
  testNotificationProvider,
} from "./scripts/index.js";
import type { Apps } from "@shopana/broker-types";
import type { BrokerCallContext } from "@shopana/shared-kernel";
import { getServiceConfig } from "@shopana/shared-service-config";

const { global } = getServiceConfig("apps");

@Injectable()
export class AppsNestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppsNestService.name);
  private kernel!: Kernel<AppsKernelServices>;
  private graphqlServer!: FastifyInstance;

  constructor(@InjectBroker('apps') private readonly broker: ServiceBroker) {}

  async onModuleInit() {
    const db = knexInstance;
    const slotsRepository = new SlotsRepository(dumboPool.execute, db);
    const secretMasterKey =
      process.env.APPS_SECRET_MASTER_KEY ??
      (global.environment === "production"
        ? ""
        : "shopana-development-apps-secret-key");
    if (!secretMasterKey) {
      throw new Error("APPS_SECRET_MASTER_KEY is required in production");
    }
    const secretStore = new AppsSecretStore(
      dumboPool.execute,
      db,
      secretMasterKey
    );
    const pluginManager = new AppsPluginManager(
      new NestLogger(this.logger) as any,
      (reference, scope) => secretStore.resolve(reference, scope)
    );

    this.kernel = new Kernel<AppsKernelServices>(
      this.broker,
      new NestLogger(this.logger),
      { slotsRepository, pluginManager, secretStore },
    );

    this.broker.register<ExecuteParams, ExecuteResult>(
      'execute',
      (params) => this.kernel.executeScript(execute, params!),
    );
    this.broker.register<Apps.ExecuteAssignedParams, Apps.ExecuteAssignedResult>(
      "executeAssigned",
      (params, context) => {
        this.assertNotificationsCaller(context);
        return this.kernel.executeScript(executeAssigned, params!);
      }
    );
    this.broker.register<
      Apps.ConfigureNotificationProviderParams,
      Apps.ConfigureNotificationProviderResult
    >("configureNotificationProvider", (params, context) => {
      this.assertNotificationsCaller(context);
      return this.kernel.executeScript(configureNotificationProvider, params!);
    });
    this.broker.register<
      Apps.NotificationProviderRouteStatusParams,
      Apps.NotificationProviderRouteStatusResult
    >("getNotificationProviderRouteStatus", (params, context) => {
      this.assertNotificationsCaller(context);
      return this.kernel.executeScript(
        getNotificationProviderRouteStatus,
        params!
      );
    });
    this.broker.register<
      Apps.GetMaskedNotificationProviderConfigParams,
      Apps.GetMaskedNotificationProviderConfigResult
    >("getMaskedNotificationProviderConfig", (params, context) => {
      this.assertNotificationsCaller(context);
      return this.kernel.executeScript(
        getMaskedNotificationProviderConfig,
        params!
      );
    });
    this.broker.register<Apps.TestNotificationProviderParams, unknown>(
      "testNotificationProvider",
      (params, context) => {
        this.assertNotificationsCaller(context);
        return this.kernel.executeScript(testNotificationProvider, params!);
      }
    );

    await db.raw('SELECT 1');
    this.graphqlServer = await startServer(this.broker as any, this.kernel as any);
    this.logger.log('Apps service started');
  }

  async onModuleDestroy() {
    if (this.graphqlServer) await this.graphqlServer.close();
    await knexInstance.destroy();
    this.logger.log('Apps service stopped');
  }

  private assertNotificationsCaller(context: BrokerCallContext): void {
    if (
      context.caller.kind !== "action" ||
      context.caller.service !== "notifications"
    ) {
      throw new Error("Notification provider action caller is not allowed");
    }
  }
}
