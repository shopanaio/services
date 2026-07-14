import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ListingProductBatchEventHandlers } from "./handlers/ListingProductBatchEventHandlers.js";
import { ListingProductEventHandlers } from "./handlers/ListingProductEventHandlers.js";
import { ListingNestService } from "./listing.nest-service.js";
import { ListingBatchProductIndexWorkflow } from "./workflows/ListingBatchProductIndexWorkflow.js";
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
import { SearchSettingsUpdateWorkflow } from "./workflows/SearchSettingsUpdateWorkflow.js";
import {
  SearchProductBoostCreateWorkflow,
  SearchProductBoostDeleteWorkflow,
  SearchProductBoostUpdateWorkflow,
  SearchSynonymGroupCreateWorkflow,
  SearchSynonymGroupDeleteWorkflow,
  SearchSynonymGroupUpdateWorkflow,
} from "./workflows/SearchResourceMutationWorkflows.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "listing" })],
  providers: [
    ListingNestService,
    ListingProductEventHandlers,
    ListingProductBatchEventHandlers,
    ListingBatchProductIndexWorkflow,
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
    SearchSettingsUpdateWorkflow,
    SearchSynonymGroupCreateWorkflow,
    SearchSynonymGroupUpdateWorkflow,
    SearchSynonymGroupDeleteWorkflow,
    SearchProductBoostCreateWorkflow,
    SearchProductBoostUpdateWorkflow,
    SearchProductBoostDeleteWorkflow,
  ],
})
export class ListingModule {}
