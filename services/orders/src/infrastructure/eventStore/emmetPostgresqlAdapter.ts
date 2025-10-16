// TODO(workspace): Remove .js extension from TypeScript imports according to workspace rules
import type {
  EventStorePort,
  AggregateOptions,
  AggregateResult,
  AppendOptions,
} from "@src/application/ports/eventStorePort";
import { getPostgreSQLEventStore } from "@event-driven-io/emmett-postgresql";
import { config } from "@src/config";
import { dumboPool } from "@src/infrastructure/db/dumbo";
import { orderCreateProjection } from "@src/infrastructure/projections/orderCreateProjection";
import { orderIdempotencyProjection } from "@src/infrastructure/projections/idempotencyProjection";

const inline = (projection: any) => ({ type: "inline", projection } as any);

export class EmmetPostgresqlEventStoreAdapter implements EventStorePort {
  private readonly store = getPostgreSQLEventStore(config.databaseUrl, {
    schema: { autoMigration: "CreateOrUpdate" },
    projections: [
      inline(orderIdempotencyProjection),
      inline(orderCreateProjection),
    ],
    connectionOptions: { dumbo: dumboPool },
    hooks: {
      onAfterSchemaCreated: () => {
        return;
      },
    },
  });

  async aggregateStream<State, Event>(
    streamId: string,
    options: AggregateOptions<State, Event>
  ): Promise<AggregateResult<State>> {
    return this.store.aggregateStream(streamId, options as any);
  }

  async appendToStream<Event>(
    streamId: string,
    events: Event[],
    options?: AppendOptions
  ): Promise<void> {
    await this.store.appendToStream(streamId, events as any[], options);
  }
}
