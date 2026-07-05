import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ListingProductEventHandlers } from "./handlers/ListingProductEventHandlers.js";
import { ListingNestService } from "./listing.nest-service.js";
import {
  ListingDeleteSellableItemIndexWorkflow,
  ListingSyncSellableItemIndexWorkflow,
} from "./workflows/listingIndexWorkflows.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "listing" })],
  providers: [
    ListingNestService,
    ListingProductEventHandlers,
    ListingSyncSellableItemIndexWorkflow,
    ListingDeleteSellableItemIndexWorkflow,
  ],
})
export class ListingModule {}
