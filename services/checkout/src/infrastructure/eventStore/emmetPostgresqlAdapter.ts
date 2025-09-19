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
import { checkoutCreateProjection } from "@src/infrastructure/projections/checkoutCreateProjection";
import {
  checkoutLineItemsProjection,
  checkoutLineItemsUpdatedProjection,
  checkoutLineItemsDeletedProjection,
  checkoutLineItemsClearedProjection,
  checkoutLineItemsPromoCodeAddedProjection,
  checkoutLineItemsPromoCodeRemovedProjection,
} from "@src/infrastructure/projections/checkoutLineItemsProjection";
// New projections
import { checkoutIdentityProjection } from "@src/infrastructure/projections/checkoutIdentityProjection";
import { checkoutNoteProjection } from "@src/infrastructure/projections/checkoutNoteProjection";
import { checkoutLanguageProjection } from "@src/infrastructure/projections/checkoutLanguageProjection";
import { checkoutCurrencyProjection } from "@src/infrastructure/projections/checkoutCurrencyProjection";
import {
  checkoutAppliedDiscountsAddedProjection,
  checkoutAppliedDiscountsRemovedProjection,
} from "@src/infrastructure/projections/checkoutAppliedDiscountsProjection";
import {
  checkoutDeliveryGroupAddressUpdatedProjection,
  checkoutDeliveryGroupMethodUpdatedProjection,
  checkoutDeliveryGroupRemovedProjection,
  checkoutDeliveryGroupAddressClearedProjection,
} from "@src/infrastructure/projections/checkoutDeliveryGroupsProjection";

const inline = (projection: any) => ({ type: "inline", projection }) as any;

export class EmmetPostgresqlEventStoreAdapter implements EventStorePort {
  private readonly store = getPostgreSQLEventStore(config.databaseUrl, {
    schema: { autoMigration: "CreateOrUpdate" },
    projections: [
      inline(idempotencyProjection),
      inline(idempotencyProjectionGeneric),
      inline(checkoutCreateProjection),
      inline(checkoutLineItemsProjection),
      inline(checkoutLineItemsUpdatedProjection),
      inline(checkoutLineItemsDeletedProjection),
      inline(checkoutLineItemsClearedProjection),
      // New projections
      inline(checkoutIdentityProjection),
      inline(checkoutNoteProjection),
      inline(checkoutLanguageProjection),
      inline(checkoutCurrencyProjection),
      // Applied Discounts projections
      inline(checkoutAppliedDiscountsAddedProjection),
      inline(checkoutAppliedDiscountsRemovedProjection),
      inline(checkoutLineItemsPromoCodeAddedProjection),
      inline(checkoutLineItemsPromoCodeRemovedProjection),
      // Delivery Groups projections
      inline(checkoutDeliveryGroupAddressUpdatedProjection),
      inline(checkoutDeliveryGroupAddressClearedProjection),
      inline(checkoutDeliveryGroupMethodUpdatedProjection),
      inline(checkoutDeliveryGroupRemovedProjection),
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
