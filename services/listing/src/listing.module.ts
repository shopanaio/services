import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ListingProductEventHandlers } from "./handlers/ListingProductEventHandlers.js";
import { ListingNestService } from "./listing.nest-service.js";
import {
  ListingDeleteSellableItemIndexWorkflow,
  ListingSyncSellableItemIndexWorkflow,
} from "./workflows/listingIndexWorkflows.js";
import { FacetReferenceStateSyncWorkflow } from "./workflows/FacetReferenceStateSyncWorkflow.js";
import { FacetAffectedProductsResyncWorkflow } from "./workflows/FacetAffectedProductsResyncWorkflow.js";
import {
  FacetCreateWorkflow,
  FacetDeleteWorkflow,
  FacetValueCreateWorkflow,
  FacetValueDeleteWorkflow,
  FacetValueMergeWorkflow,
  FacetValueUnmergeWorkflow,
  FacetValueUpdateWorkflow,
} from "./workflows/FacetMutationWorkflows.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "listing" })],
  providers: [
    ListingNestService,
    ListingProductEventHandlers,
    ListingSyncSellableItemIndexWorkflow,
    ListingDeleteSellableItemIndexWorkflow,
    FacetReferenceStateSyncWorkflow,
    FacetAffectedProductsResyncWorkflow,
    FacetCreateWorkflow,
    FacetDeleteWorkflow,
    FacetValueCreateWorkflow,
    FacetValueUpdateWorkflow,
    FacetValueDeleteWorkflow,
    FacetValueMergeWorkflow,
    FacetValueUnmergeWorkflow,
  ],
})
export class ListingModule {}
