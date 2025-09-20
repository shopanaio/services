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
import { idempotencyProjection } from "@src/infrastructure/projections/idempotencyProjection";
import { idempotencyProjectionGeneric } from "@src/infrastructure/projections/idempotencyProjectionGeneric";
import { orderCreateProjection } from "@src/infrastructure/projections/orderCreateProjection";
import {
  orderLineItemsProjection,
  orderLineItemsUpdatedProjection,
  orderLineItemsDeletedProjection,
  orderLineItemsClearedProjection,
  orderLineItemsPromoCodeAddedProjection,
  orderLineItemsPromoCodeRemovedProjection,
} from "@src/infrastructure/projections/orderLineItemsProjection";
// New projections
import { orderIdentityProjection } from "@src/infrastructure/projections/orderIdentityProjection";
import { orderNoteProjection } from "@src/infrastructure/projections/orderNoteProjection";
import { orderLanguageProjection } from "@src/infrastructure/projections/orderLanguageProjection";
import { orderCurrencyProjection } from "@src/infrastructure/projections/orderCurrencyProjection";
import {
  orderAppliedDiscountsAddedProjection,
  orderAppliedDiscountsRemovedProjection,
} from "@src/infrastructure/projections/orderAppliedDiscountsProjection";
import {
  orderDeliveryGroupAddressUpdatedProjection,
  orderDeliveryGroupMethodUpdatedProjection,
  orderDeliveryGroupRemovedProjection,
  orderDeliveryGroupAddressClearedProjection,
} from "@src/infrastructure/projections/orderDeliveryGroupsProjection";

const inline = (projection: any) => ({ type: "inline", projection }) as any;

export class EmmetPostgresqlEventStoreAdapter implements EventStorePort {
  private readonly store = getPostgreSQLEventStore(config.databaseUrl, {
    schema: { autoMigration: "CreateOrUpdate" },
    projections: [
      inline(idempotencyProjection),
      inline(idempotencyProjectionGeneric),
      inline(orderCreateProjection),
      inline(orderLineItemsProjection),
      inline(orderLineItemsUpdatedProjection),
      inline(orderLineItemsDeletedProjection),
      inline(orderLineItemsClearedProjection),
      // New projections
      inline(orderIdentityProjection),
      inline(orderNoteProjection),
      inline(orderLanguageProjection),
      inline(orderCurrencyProjection),
      // Applied Discounts projections
      inline(orderAppliedDiscountsAddedProjection),
      inline(orderAppliedDiscountsRemovedProjection),
      inline(orderLineItemsPromoCodeAddedProjection),
      inline(orderLineItemsPromoCodeRemovedProjection),
      // Delivery Groups projections
      inline(orderDeliveryGroupAddressUpdatedProjection),
      inline(orderDeliveryGroupAddressClearedProjection),
      inline(orderDeliveryGroupMethodUpdatedProjection),
      inline(orderDeliveryGroupRemovedProjection),
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
    options: AggregateOptions<State, Event>,
  ): Promise<AggregateResult<State>> {
    return this.store.aggregateStream(streamId, options);
  }

  async appendToStream<Event>(
    streamId: string,
    events: Event[],
    options?: AppendOptions,
  ): Promise<void> {
    await this.store.appendToStream(streamId, events as any[], options);
  }
}
