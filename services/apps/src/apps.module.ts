import { Module } from '@nestjs/common';
import {
  AppGraphQLServerFactory,
  AppsGraphQLIngress,
  AppSubgraphHost,
  AppSubgraphRegistry,
} from '@shopana/app-runtime';
import {
  BrokerModule,
  DATABASE_CLIENT,
  type DatabaseClient,
} from '@shopana/shared-kernel';
import { AppsNestService } from './apps.nest-service';
import { createDatabase } from './infrastructure/db/database.js';
import { Repository } from './repositories/Repository.js';
import { AppBrokerFacadeFactory } from './runtime/AppBrokerFacadeFactory.js';
import { AppRuntimeRegistry } from './runtime/AppRuntimeRegistry.js';
import { AppsRuntimeHost } from './runtime/AppsRuntimeHost.js';
import { AppsRuntimeRouter } from './runtime/AppsRuntimeRouter.js';
import {
  APP_INSTALLATION_CONTEXT_PROVIDER,
  DatabaseAppInstallationContextProvider,
} from './runtime/AppInstallationContextProvider.js';
import { AppSecretResolverFactory } from './runtime/AppSecretResolverFactory.js';
import { AppInstallationSecretStore } from './control-plane/AppInstallationSecretStore.js';
import { AppInstallationStore } from './control-plane/AppInstallationStore.js';
import { AppLifecycleService } from './control-plane/AppLifecycleService.js';
import { AppInstallationLifecycleWorkflow } from './control-plane/AppInstallationLifecycleWorkflow.js';
import { AppsPlatformActions } from './control-plane/AppsPlatformActions.js';
import { SalesChannelConnectionStore } from './sales-channels/control-plane/SalesChannelConnectionStore.js';
import { SalesChannelLifecycleService } from './sales-channels/control-plane/SalesChannelLifecycleService.js';
import { SalesChannelLifecycleWorkflow } from './sales-channels/control-plane/SalesChannelLifecycleWorkflow.js';
import { SalesChannelPlatformActions } from './sales-channels/control-plane/SalesChannelPlatformActions.js';
import { SalesChannelSpecificationService } from './sales-channels/control-plane/SalesChannelSpecificationService.js';
import { SalesChannelRuntimeRouter } from './sales-channels/runtime/SalesChannelRuntimeRouter.js';
import { OnlineStoreBootstrapWorkflow } from './sales-channels/control-plane/OnlineStoreBootstrapWorkflow.js';
import { OnlineStoreDeprovisionWorkflow } from './sales-channels/control-plane/OnlineStoreDeprovisionWorkflow.js';
import { OnlineStoreEventHandlers } from './sales-channels/control-plane/OnlineStoreEventHandlers.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'apps' })],
  providers: [
    AppsNestService,
    AppBrokerFacadeFactory,
    AppRuntimeRegistry,
    AppsRuntimeRouter,
    AppsRuntimeHost,
    {
      provide: Repository,
      inject: [DATABASE_CLIENT],
      useFactory: (client: DatabaseClient) =>
        Repository.create({ db: createDatabase(client) }),
    },
    AppInstallationStore,
    AppInstallationSecretStore,
    DatabaseAppInstallationContextProvider,
    AppSecretResolverFactory,
    AppLifecycleService,
    AppInstallationLifecycleWorkflow,
    AppsPlatformActions,
    SalesChannelConnectionStore,
    SalesChannelSpecificationService,
    SalesChannelLifecycleService,
    SalesChannelLifecycleWorkflow,
    SalesChannelRuntimeRouter,
    SalesChannelPlatformActions,
    OnlineStoreBootstrapWorkflow,
    OnlineStoreDeprovisionWorkflow,
    OnlineStoreEventHandlers,
    AppGraphQLServerFactory,
    AppSubgraphHost,
    AppSubgraphRegistry,
    AppsGraphQLIngress,
    {
      provide: APP_INSTALLATION_CONTEXT_PROVIDER,
      useExisting: DatabaseAppInstallationContextProvider,
    },
  ],
  exports: [
    AppRuntimeRegistry,
    AppsRuntimeRouter,
    Repository,
    AppInstallationStore,
    SalesChannelConnectionStore,
    SalesChannelLifecycleService,
    SalesChannelRuntimeRouter,
    AppSubgraphRegistry,
  ],
})
export class AppsModule {}
