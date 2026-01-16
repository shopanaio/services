import {
  DynamicModule,
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
  Logger,
} from '@nestjs/common';
import postgres, { type Sql } from 'postgres';
import type { DbConfig } from '@shopana/shared-service-config';
import { buildDbUrl } from '@shopana/shared-service-config';

export const DATABASE_CLIENT = Symbol('DATABASE_CLIENT');

export type DatabaseClient = Sql;

export interface DatabaseModuleOptions {
  /** Database connection config */
  db: DbConfig;
  /** postgres.js pool options */
  pool?: {
    max?: number;
    idle_timeout?: number;
    connect_timeout?: number;
    max_lifetime?: number;
  };
}

export const InjectDatabaseClient = () => Inject(DATABASE_CLIENT);

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger('DatabaseModule');

  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly client: DatabaseClient,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Closing database connection pool...');
    await this.client.end();
    this.logger.log('Database connection pool closed');
  }
}

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    const logger = new Logger('DatabaseModule');

    // Build connection string from config (without schema for shared pool)
    const connectionString = buildDbUrl({ ...options.db, schema: null });

    // Create postgres.js client with pool settings
    const client = postgres(connectionString, {
      max: options.pool?.max ?? 20,
      idle_timeout: options.pool?.idle_timeout ?? 20,
      connect_timeout: options.pool?.connect_timeout ?? 30,
      max_lifetime: options.pool?.max_lifetime ?? 60 * 30,
      types: {
        date: {
          to: 1184,
          from: [1114, 1184],
          serialize: (x: Date | string) => (x instanceof Date ? x.toISOString() : x),
          parse: (x: string) => x,
        },
      },
      onnotice: () => {},
    });

    logger.log(`Database pool initialized (max: ${options.pool?.max ?? 20} connections)`);

    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_CLIENT,
          useValue: client,
        },
        DatabaseLifecycle,
      ],
      exports: [DATABASE_CLIENT],
    };
  }
}
