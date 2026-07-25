import { Module } from '@nestjs/common';
import {
  BrokerModule,
  DATABASE_CLIENT,
  type DatabaseClient,
} from '@shopana/shared-kernel';
import { AppsNestService } from './apps.nest-service';
import { createDatabase } from './infrastructure/db/database.js';
import { Repository } from './repositories/Repository.js';
import { AppInstallationRepository } from './repositories/installation/AppInstallationRepository.js';
import { AppInstallationSecretRepository } from './repositories/secret/AppInstallationSecretRepository.js';
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
import { AppLifecycleService } from './control-plane/AppLifecycleService.js';
import { AppInstallationLifecycleWorkflow } from './control-plane/AppInstallationLifecycleWorkflow.js';
import { AppsPlatformActions } from './control-plane/AppsPlatformActions.js';

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
    {
      provide: AppInstallationRepository,
      inject: [Repository],
      useFactory: (repository: Repository) => repository.installation,
    },
    {
      provide: AppInstallationSecretRepository,
      inject: [Repository],
      useFactory: (repository: Repository) => repository.secret,
    },
    AppInstallationSecretStore,
    DatabaseAppInstallationContextProvider,
    AppSecretResolverFactory,
    AppLifecycleService,
    AppInstallationLifecycleWorkflow,
    AppsPlatformActions,
    {
      provide: APP_INSTALLATION_CONTEXT_PROVIDER,
      useExisting: DatabaseAppInstallationContextProvider,
    },
  ],
  exports: [
    AppRuntimeRegistry,
    AppsRuntimeRouter,
    Repository,
    AppInstallationRepository,
  ],
})
export class AppsModule {}
