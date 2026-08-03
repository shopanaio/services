import { asc, eq } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import {
  ConcurrencyError,
  StreamAlreadyExistsError,
} from "@src/application/errors/eventStoreErrors";
import type {
  AggregateOptions,
  AggregateResult,
  AppendOptions,
  EventStorePort,
} from "@src/application/ports/eventStorePort";
import type { OrderEvent } from "@src/domain/order/events";
import type { Database } from "@src/infrastructure/db/database";
import {
  deserializeOrderEvent,
  serializeOrderEvent,
} from "@src/infrastructure/eventStore/orderEventSerializer";
import { OrderCreateProjection } from "@src/infrastructure/projections/orderCreateProjection";
import { orderEvents, orderStreams } from "@src/repositories/models/index";

export class DrizzleOrderEventStoreAdapter implements EventStorePort {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>,
    private readonly createProjection: OrderCreateProjection,
  ) {}

  private get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  async aggregateStream<State, Event>(
    streamId: string,
    options: AggregateOptions<State, Event>,
  ): Promise<AggregateResult<State>> {
    const [stream] = await this.connection
      .select({ version: orderStreams.version })
      .from(orderStreams)
      .where(eq(orderStreams.streamId, streamId))
      .limit(1);
    const initialState = typeof options.initialState === "function"
      ? (options.initialState as () => State)()
      : options.initialState;
    if (!stream) {
      return { state: initialState, streamExists: false, streamVersion: 0n };
    }

    const rows = await this.connection
      .select({
        type: orderEvents.eventType,
        data: orderEvents.data,
        metadata: orderEvents.metadata,
      })
      .from(orderEvents)
      .where(eq(orderEvents.streamId, streamId))
      .orderBy(asc(orderEvents.version));
    const state = rows.reduce(
      (current, row) => options.evolve(current, deserializeOrderEvent(row) as Event),
      initialState,
    );
    return { state, streamExists: true, streamVersion: stream.version };
  }

  async appendToStream<Event>(
    streamId: string,
    events: Event[],
    options?: AppendOptions,
  ): Promise<void> {
    if (events.length === 0) return;

    await this.txManager.run(async () => {
      const expected = options?.expectedStreamVersion;
      let currentVersion: bigint;

      if (expected === "STREAM_DOES_NOT_EXIST") {
        const inserted = await this.connection
          .insert(orderStreams)
          .values({ streamId, version: 0n })
          .onConflictDoNothing()
          .returning({ streamId: orderStreams.streamId });
        if (inserted.length === 0) {
          throw new StreamAlreadyExistsError(streamId);
        }
        currentVersion = 0n;
      } else {
        const [stream] = await this.connection
          .select({ version: orderStreams.version })
          .from(orderStreams)
          .where(eq(orderStreams.streamId, streamId))
          .for("update")
          .limit(1);
        currentVersion = stream?.version ?? 0n;
        if (expected !== undefined && currentVersion !== expected) {
          throw new ConcurrencyError(
            streamId,
            expected.toString(),
            Number(currentVersion),
          );
        }
      }

      const domainEvents = events as OrderEvent[];
      const eventRows = domainEvents.map((event, index) => {
        const serialized = serializeOrderEvent(event);
        return {
          streamId,
          version: currentVersion + BigInt(index + 1),
          eventType: serialized.type,
          data: serialized.data,
          metadata: serialized.metadata,
          createdAt: event.metadata.now,
        };
      });
      await this.connection.insert(orderEvents).values(eventRows);

      const nextVersion = eventRows[eventRows.length - 1]!.version;
      await this.connection
        .update(orderStreams)
        .set({ version: nextVersion, updatedAt: new Date() })
        .where(eq(orderStreams.streamId, streamId));

      for (let index = 0; index < domainEvents.length; index += 1) {
        const event = domainEvents[index]!;
        if (event.type !== "order.created") {
          throw new Error(`Unsupported order projection event: ${event.type}`);
        }
        await this.createProjection.apply(event, currentVersion + BigInt(index + 1));
      }
    });
  }
}
