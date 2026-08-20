import {
  DynamicModule,
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  OnApplicationShutdown,
} from "@nestjs/common";
import postgres, { type Sql } from "postgres";
import type { DbConfig } from "@shopana/shared-service-config";
import { buildDbUrl } from "@shopana/shared-service-config";

export const DATABASE_CLIENT = Symbol("DATABASE_CLIENT");
export const DATABASE_CONNECTION_OPTIONS = Symbol("DATABASE_CONNECTION_OPTIONS");

export type DatabaseClient = Sql;

/**
 * Immutable normalized connection settings for components that must create a
 * separate, explicitly budgeted Postgres.js pool (for example a DBOS
 * datasource). This provider contains no mutable postgres.Options instance.
 */
export interface DatabaseConnectionOptions {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly database: string;
  readonly max: number;
  readonly idle_timeout: number;
  readonly connect_timeout: number;
  readonly max_lifetime: number;
}

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
export const InjectDatabaseConnectionOptions = () => Inject(DATABASE_CONNECTION_OPTIONS);

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger("DatabaseModule");

  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly client: DatabaseClient,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    this.logger.log("Closing database connection pool...");
    await this.client.end();
    this.logger.log("Database connection pool closed");
  }
}

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseModuleOptions): DynamicModule {
    // Build connection string from config (without schema for shared pool)
    const connectionString = buildDbUrl({ ...options.db, schema: null });
    const connectionOptions: DatabaseConnectionOptions = Object.freeze({
      host: options.db.host,
      port: options.db.port,
      username: options.db.user,
      password: options.db.password,
      database: options.db.database,
      max: options.pool?.max ?? 20,
      idle_timeout: options.pool?.idle_timeout ?? 20,
      connect_timeout: options.pool?.connect_timeout ?? 30,
      max_lifetime: options.pool?.max_lifetime ?? 60 * 30,
    });

    // Create postgres.js client with pool settings
    const client = postgres(connectionString, {
      max: connectionOptions.max,
      idle_timeout: connectionOptions.idle_timeout,
      connect_timeout: connectionOptions.connect_timeout,
      max_lifetime: connectionOptions.max_lifetime,
      types: {
        // Return timestamps as strings instead of Date objects
        // postgres.js handles Date serialization automatically
        date: {
          to: 1184,
          from: [1082, 1114, 1184], // date, timestamp, timestamptz
          serialize: (x: unknown) => (x instanceof Date ? x.toISOString() : String(x)),
          parse: (x: string) => x, // Return as string, not Date
        },
      },
      onnotice: () => {},
    });

    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DATABASE_CLIENT,
          useValue: client,
        },
        {
          provide: DATABASE_CONNECTION_OPTIONS,
          useValue: connectionOptions,
        },
        DatabaseLifecycle,
      ],
      exports: [DATABASE_CLIENT, DATABASE_CONNECTION_OPTIONS],
    };
  }
}
