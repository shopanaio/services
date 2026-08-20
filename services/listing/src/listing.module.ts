import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ListingProductBatchEventHandlers } from "./handlers/ListingProductBatchEventHandlers.js";
import { ListingProductEventHandlers } from "./handlers/ListingProductEventHandlers.js";
import { ListingStoreEventHandlers } from "./handlers/ListingStoreEventHandlers.js";
import { ListingCollectionEventHandlers } from "./handlers/ListingCollectionEventHandlers.js";
import { RecommendationOrderEventHandlers } from "./handlers/RecommendationOrderEventHandlers.js";
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
import { ListingCollectionProjectionWorkflow } from "./workflows/ListingCollectionProjectionWorkflow.js";
import { ListingBrokerActions } from "./actions/index.js";
import {
  RecommendationCalculationRunWorkflow,
  RecommendationCalculationTriggerWorkflow,
  RecommendationMutationWorkflow,
  RecommendationGlobalTriggerWorkflow,
  RecommendationManualBootstrapWorkflow,
  RecommendationManualScheduleWorkflow,
  RecommendationReferenceStateSyncWorkflow,
  RecommendationOrderFactIngestWorkflow,
  RecommendationSnapshotBuildWorkflow,
  RecommendationSnapshotFanOutWorkflow,
} from "./workflows/RecommendationWorkflows.js";
import { RecommendationScheduler } from "./scheduled/RecommendationScheduler.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "listing" })],
  providers: [
    ListingNestService,
    ListingProductEventHandlers,
    ListingProductBatchEventHandlers,
    ListingStoreEventHandlers,
    ListingCollectionEventHandlers,
    RecommendationOrderEventHandlers,
    ListingBatchProductIndexWorkflow,
    ListingSyncSellableItemIndexWorkflow,
    ListingDeleteSellableItemIndexWorkflow,
    ListingCollectionProjectionWorkflow,
    ListingBrokerActions,
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
    RecommendationOrderFactIngestWorkflow,
    RecommendationCalculationRunWorkflow,
    RecommendationCalculationTriggerWorkflow,
    RecommendationSnapshotBuildWorkflow,
    RecommendationSnapshotFanOutWorkflow,
    RecommendationMutationWorkflow,
    RecommendationManualBootstrapWorkflow,
    RecommendationManualScheduleWorkflow,
    RecommendationGlobalTriggerWorkflow,
    RecommendationReferenceStateSyncWorkflow,
    RecommendationScheduler,
  ],
})
export class ListingModule {}
