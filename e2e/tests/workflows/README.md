# Broker workflows и sagas

Инвентаризация фактически объявленных durable broker entrypoints в `services/*/src`.
Снимок составлен по декораторам `@Workflow(...)` и `@Saga(...)`; примеры из `docs`,
knowledge base и unit tests не учитываются.

## Сводка

| Broker namespace | Workflows | Sagas | Всего |
| --- | ---: | ---: | ---: |
| `apps` | 2 | 0 | 2 |
| `catalog` | 6 | 3 | 9 |
| `checkout` | 3 | 0 | 3 |
| `customers` | 47 | 0 | 47 |
| `delivery` | 5 | 0 | 5 |
| `events` | 2 | 0 | 2 |
| `iam` | 13 | 4 | 17 |
| `listing` | 34 | 0 | 34 |
| `loyalty` | 11 | 0 | 11 |
| `media` | 3 | 0 | 3 |
| `notifications` | 4 | 0 | 4 |
| `order` | 2 | 0 | 2 |
| `payments` | 10 | 0 | 10 |
| `pricing` | 6 | 0 | 6 |
| `project` | 0 | 3 | 3 |
| `reviews` | 21 | 0 | 21 |
| **Итого** | **169** | **10** | **179** |

`order` — реальное broker-имя сервиса из `BrokerModule.forFeature`, хотя каталог
исходников называется `services/orders`. В `bootstrap` нет собственных production
workflow/saga (только тестовый broker). В `media`, `pricing` и остальных строках
учтены только зарегистрированные durable entrypoints, а не обычные broker actions.

В колонке «Idempotency» значение `default` означает отсутствие явной
`idempotencyStrategy` в декораторе. Квалифицированное имя образуется как
`<broker namespace>.<decorator name>`.

## Apps

| Полное имя | Тип | Idempotency | Реализация |
| --- | --- | --- | --- |
| `apps.installationLifecycle` | workflow | `content` | `AppInstallationLifecycleWorkflow` — [`AppInstallationLifecycleWorkflow.ts`](../../../services/apps/src/control-plane/AppInstallationLifecycleWorkflow.ts) |
| `apps.appActivation` | workflow | `default` | `AppWorkflowActivation` — [`AppWorkflowActivation.ts`](../../../services/apps/src/runtime/AppWorkflowActivation.ts) |

`apps.appActivation` — специальный динамический entrypoint: экземпляры создаются
app-runtime для manifest-defined workflows, а не как статические Nest providers.

## Catalog

| Полное имя | Тип | Idempotency | Реализация |
| --- | --- | --- | --- |
| `catalog.backRefNotify` | saga | `default` | `BackRefNotifySaga` — [`BackRefNotifySaga.ts`](../../../services/catalog/src/sagas/BackRefNotifySaga.ts) |
| `catalog.entityDeletedNotify` | saga | `default` | `EntityDeletedNotifySaga` — [`EntityDeletedNotifySaga.ts`](../../../services/catalog/src/sagas/EntityDeletedNotifySaga.ts) |
| `catalog.productCreate` | saga | `default` | `ProductCreateSaga` — [`ProductCreateSaga.ts`](../../../services/catalog/src/sagas/ProductCreateSaga.ts) |
| `catalog.categoryUpdate` | workflow | `default` | `CategoryUpdateWorkflow` — [`CategoryUpdateWorkflow.ts`](../../../services/catalog/src/workflows/CategoryUpdateWorkflow.ts) |
| `catalog.collectionRulesPreview` | workflow | `default` | `CollectionRulesPreviewWorkflow` — [`CollectionMutationWorkflows.ts`](../../../services/catalog/src/workflows/CollectionMutationWorkflows.ts) |
| `catalog.collectionMutate` | workflow | `default` | `CollectionMutationWorkflow` — [`CollectionMutationWorkflows.ts`](../../../services/catalog/src/workflows/CollectionMutationWorkflows.ts) |
| `catalog.collectionProductSync` | workflow | `default` | `CollectionProductSyncWorkflow` — [`CollectionMutationWorkflows.ts`](../../../services/catalog/src/workflows/CollectionMutationWorkflows.ts) |
| `catalog.productBulkEdit` | workflow | `default` | `ProductBulkEditWorkflow` — [`ProductBulkEditWorkflow.ts`](../../../services/catalog/src/workflows/ProductBulkEditWorkflow.ts) |
| `catalog.productUpdate` | workflow | `default` | `ProductUpdateWorkflow` — [`ProductUpdateWorkflow.ts`](../../../services/catalog/src/workflows/ProductUpdateWorkflow.ts) |

## Checkout

| Полное имя | Тип | Idempotency | Реализация |
| --- | --- | --- | --- |
| `checkout.maintainCheckout` | workflow | `content` | `CheckoutMaintenanceWorkflow` — [`CheckoutMaintenanceWorkflow.ts`](../../../services/checkout/src/workflows/CheckoutMaintenanceWorkflow.ts) |
| `checkout.monitorPlacedPayment` | workflow | `workflow` | `MonitorPlacedPaymentWorkflow` — [`MonitorPlacedPaymentWorkflow.ts`](../../../services/checkout/src/workflows/MonitorPlacedPaymentWorkflow.ts) |
| `checkout.placeOrder` | workflow | `client` | `PlaceOrderWorkflow` — [`PlaceOrderWorkflow.ts`](../../../services/checkout/src/workflows/PlaceOrderWorkflow.ts) |

## Customers

| Полное имя | Idempotency | Реализация |
| --- | --- | --- |
| `customers.customerComparisonVariantAdd` | `client` | `CustomerComparisonVariantAddWorkflow` — [`CustomerComparisonWorkflows.ts`](../../../services/customers/src/workflows/CustomerComparisonWorkflows.ts) |
| `customers.customerComparisonVariantRemove` | `client` | `CustomerComparisonVariantRemoveWorkflow` — [`CustomerComparisonWorkflows.ts`](../../../services/customers/src/workflows/CustomerComparisonWorkflows.ts) |
| `customers.customerComparisonCategoryClear` | `client` | `CustomerComparisonCategoryClearWorkflow` — [`CustomerComparisonWorkflows.ts`](../../../services/customers/src/workflows/CustomerComparisonWorkflows.ts) |
| `customers.customerCreate` | `default` | `CustomerCreateWorkflow` — [`CustomerCreateWorkflow.ts`](../../../services/customers/src/workflows/CustomerCreateWorkflow.ts) |
| `customers.customerDataRequestProcess` | `default` | `CustomerDataRequestProcessWorkflow` — [`CustomerDataRequestProcessWorkflow.ts`](../../../services/customers/src/workflows/CustomerDataRequestProcessWorkflow.ts) |
| `customers.customerDelete` | `default` | `CustomerDeleteWorkflow` — [`CustomerDeleteWorkflow.ts`](../../../services/customers/src/workflows/CustomerDeleteWorkflow.ts) |
| `customers.customerGroupCreate` | `default` | `CustomerGroupCreateWorkflow` — [`CustomerEntityCreateWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityCreateWorkflows.ts) |
| `customers.customerTagCreate` | `default` | `CustomerTagCreateWorkflow` — [`CustomerEntityCreateWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityCreateWorkflows.ts) |
| `customers.customerSegmentCreate` | `default` | `CustomerSegmentCreateWorkflow` — [`CustomerEntityCreateWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityCreateWorkflows.ts) |
| `customers.customerMergeCreate` | `default` | `CustomerMergeCreateWorkflow` — [`CustomerEntityCreateWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityCreateWorkflows.ts) |
| `customers.customerDataRequestCreate` | `default` | `CustomerDataRequestCreateWorkflow` — [`CustomerEntityCreateWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityCreateWorkflows.ts) |
| `customers.customerGroupDelete` | `default` | `CustomerGroupDeleteWorkflow` — [`CustomerEntityDeleteWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityDeleteWorkflows.ts) |
| `customers.customerTagDelete` | `default` | `CustomerTagDeleteWorkflow` — [`CustomerEntityDeleteWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityDeleteWorkflows.ts) |
| `customers.customerSegmentDelete` | `default` | `CustomerSegmentDeleteWorkflow` — [`CustomerEntityDeleteWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityDeleteWorkflows.ts) |
| `customers.customerMergeDelete` | `default` | `CustomerMergeDeleteWorkflow` — [`CustomerEntityDeleteWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityDeleteWorkflows.ts) |
| `customers.customerDataRequestDelete` | `default` | `CustomerDataRequestDeleteWorkflow` — [`CustomerEntityDeleteWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityDeleteWorkflows.ts) |
| `customers.customerGroupUpdate` | `default` | `CustomerGroupUpdateWorkflow` — [`CustomerEntityUpdateWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityUpdateWorkflows.ts) |
| `customers.customerTagUpdate` | `default` | `CustomerTagUpdateWorkflow` — [`CustomerEntityUpdateWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityUpdateWorkflows.ts) |
| `customers.customerSegmentUpdate` | `default` | `CustomerSegmentUpdateWorkflow` — [`CustomerEntityUpdateWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityUpdateWorkflows.ts) |
| `customers.customerMergeUpdate` | `default` | `CustomerMergeUpdateWorkflow` — [`CustomerEntityUpdateWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityUpdateWorkflows.ts) |
| `customers.customerDataRequestUpdate` | `default` | `CustomerDataRequestUpdateWorkflow` — [`CustomerEntityUpdateWorkflows.ts`](../../../services/customers/src/workflows/CustomerEntityUpdateWorkflows.ts) |
| `customers.customerExternalReferenceSync` | `default` | `CustomerExternalReferenceSyncWorkflow` — [`CustomerExternalReferenceSyncWorkflow.ts`](../../../services/customers/src/workflows/CustomerExternalReferenceSyncWorkflow.ts) |
| `customers.customerIamLifecycle` | `default` | `CustomerIamLifecycleWorkflow` — [`CustomerIamLifecycleWorkflow.ts`](../../../services/customers/src/workflows/CustomerIamLifecycleWorkflow.ts) |
| `customers.customerMergeProcess` | `default` | `CustomerMergeProcessWorkflow` — [`CustomerMergeProcessWorkflow.ts`](../../../services/customers/src/workflows/CustomerMergeProcessWorkflow.ts) |
| `customers.customerProvisionFromIam` | `default` | `CustomerProvisionFromIamWorkflow` — [`CustomerProvisionFromIamWorkflow.ts`](../../../services/customers/src/workflows/CustomerProvisionFromIamWorkflow.ts) |
| `customers.customerSegmentMaterialize` | `default` | `CustomerSegmentMaterializationWorkflow` — [`CustomerSegmentWorkerWorkflows.ts`](../../../services/customers/src/workflows/CustomerSegmentWorkerWorkflows.ts) |
| `customers.customerSegmentMaintenance` | `default` | `CustomerSegmentMaintenanceWorkflow` — [`CustomerSegmentWorkerWorkflows.ts`](../../../services/customers/src/workflows/CustomerSegmentWorkerWorkflows.ts) |
| `customers.customerStatisticsProject` | `default` | `CustomerStatisticsProjectionWorkflow` — [`CustomerStatisticsProjectionWorkflow.ts`](../../../services/customers/src/workflows/CustomerStatisticsProjectionWorkflow.ts) |
| `customers.customerUpdate` | `default` | `CustomerUpdateWorkflow` — [`CustomerUpdateWorkflow.ts`](../../../services/customers/src/workflows/CustomerUpdateWorkflow.ts) |
| `customers.storefrontAuthDeprovision` | `default` | `StorefrontAuthDeprovisionWorkflow` — [`StorefrontAuthDeprovisionWorkflow.ts`](../../../services/customers/src/workflows/StorefrontAuthDeprovisionWorkflow.ts) |
| `customers.storefrontAuthProvision` | `default` | `StorefrontAuthProvisionWorkflow` — [`StorefrontAuthProvisionWorkflow.ts`](../../../services/customers/src/workflows/StorefrontAuthProvisionWorkflow.ts) |
| `customers.storefrontCustomerUpdate` | `client` | `StorefrontCustomerUpdateWorkflow` — [`StorefrontCustomerWorkflows.ts`](../../../services/customers/src/workflows/StorefrontCustomerWorkflows.ts) |
| `customers.storefrontCustomerAddressCreate` | `client` | `StorefrontCustomerAddressCreateWorkflow` — [`StorefrontCustomerWorkflows.ts`](../../../services/customers/src/workflows/StorefrontCustomerWorkflows.ts) |
| `customers.storefrontCustomerAddressUpdate` | `client` | `StorefrontCustomerAddressUpdateWorkflow` — [`StorefrontCustomerWorkflows.ts`](../../../services/customers/src/workflows/StorefrontCustomerWorkflows.ts) |
| `customers.storefrontCustomerAddressDelete` | `client` | `StorefrontCustomerAddressDeleteWorkflow` — [`StorefrontCustomerWorkflows.ts`](../../../services/customers/src/workflows/StorefrontCustomerWorkflows.ts) |
| `customers.storefrontCustomerAddressDefaultSet` | `client` | `StorefrontCustomerAddressDefaultSetWorkflow` — [`StorefrontCustomerWorkflows.ts`](../../../services/customers/src/workflows/StorefrontCustomerWorkflows.ts) |
| `customers.storefrontCustomerMarketingConsentUpdate` | `client` | `StorefrontCustomerMarketingConsentUpdateWorkflow` — [`StorefrontCustomerWorkflows.ts`](../../../services/customers/src/workflows/StorefrontCustomerWorkflows.ts) |
| `customers.storefrontCustomerDataRequestCreate` | `client` | `StorefrontCustomerDataRequestCreateWorkflow` — [`StorefrontCustomerWorkflows.ts`](../../../services/customers/src/workflows/StorefrontCustomerWorkflows.ts) |
| `customers.storefrontCustomerDataRequestCancel` | `client` | `StorefrontCustomerDataRequestCancelWorkflow` — [`StorefrontCustomerWorkflows.ts`](../../../services/customers/src/workflows/StorefrontCustomerWorkflows.ts) |
| `customers.storefrontCustomerTaxIdentifierCreate` | `client` | `StorefrontCustomerTaxIdentifierCreateWorkflow` — [`StorefrontCustomerWorkflows.ts`](../../../services/customers/src/workflows/StorefrontCustomerWorkflows.ts) |
| `customers.storefrontCustomerTaxIdentifierUpdate` | `client` | `StorefrontCustomerTaxIdentifierUpdateWorkflow` — [`StorefrontCustomerWorkflows.ts`](../../../services/customers/src/workflows/StorefrontCustomerWorkflows.ts) |
| `customers.storefrontCustomerTaxIdentifierDelete` | `client` | `StorefrontCustomerTaxIdentifierDeleteWorkflow` — [`StorefrontCustomerWorkflows.ts`](../../../services/customers/src/workflows/StorefrontCustomerWorkflows.ts) |
| `customers.wishlistCreate` | `client` | `WishlistCreateWorkflow` — [`WishlistWorkflows.ts`](../../../services/customers/src/workflows/WishlistWorkflows.ts) |
| `customers.wishlistUpdate` | `client` | `WishlistUpdateWorkflow` — [`WishlistWorkflows.ts`](../../../services/customers/src/workflows/WishlistWorkflows.ts) |
| `customers.wishlistDelete` | `client` | `WishlistDeleteWorkflow` — [`WishlistWorkflows.ts`](../../../services/customers/src/workflows/WishlistWorkflows.ts) |
| `customers.wishlistProductAdd` | `client` | `WishlistProductAddWorkflow` — [`WishlistWorkflows.ts`](../../../services/customers/src/workflows/WishlistWorkflows.ts) |
| `customers.wishlistProductRemove` | `client` | `WishlistProductRemoveWorkflow` — [`WishlistWorkflows.ts`](../../../services/customers/src/workflows/WishlistWorkflows.ts) |

Все 47 записей Customers — workflows.

## Delivery

| Полное имя | Idempotency | Реализация |
| --- | --- | --- |
| `delivery.configureProviderAccount` | `content` | `ConfigureDeliveryProviderAccountWorkflow` — [`ConfigureDeliveryProviderAccountWorkflow.ts`](../../../services/delivery/src/workflows/ConfigureDeliveryProviderAccountWorkflow.ts) |
| `delivery.publishShipmentOutbox` | `workflow` | `DeliveryShipmentOutboxWorkflow` — [`DeliveryShipmentOutboxWorkflow.ts`](../../../services/delivery/src/workflows/DeliveryShipmentOutboxWorkflow.ts) |
| `delivery.createShipment` | `content` | `CreateDeliveryShipmentWorkflow` — [`DeliveryShipmentWorkflows.ts`](../../../services/delivery/src/workflows/DeliveryShipmentWorkflows.ts) |
| `delivery.cancelShipment` | `content` | `CancelDeliveryShipmentWorkflow` — [`DeliveryShipmentWorkflows.ts`](../../../services/delivery/src/workflows/DeliveryShipmentWorkflows.ts) |
| `delivery.reconcileShipment` | `content` | `ReconcileDeliveryShipmentWorkflow` — [`DeliveryShipmentWorkflows.ts`](../../../services/delivery/src/workflows/DeliveryShipmentWorkflows.ts) |

## Events

| Полное имя | Тип | Idempotency | Реализация |
| --- | --- | --- | --- |
| `events.emit` | workflow | `default` | `EventEmitWorkflow` — [`EventEmitWorkflow.ts`](../../../services/events/src/workflows/EventEmitWorkflow.ts) |
| `events.dispatch` | workflow | `default` | `EventDispatchWorkflow` — [`EventDispatchWorkflow.ts`](../../../services/events/src/workflows/EventDispatchWorkflow.ts) |

`events.emit` сохраняет событие и запускает durable dispatch; `events.dispatch`
доставляет persisted event зарегистрированным broker event handlers с доверенным
producer context.

## IAM

| Полное имя | Тип | Реализация |
| --- | --- | --- |
| `iam.organizationCreate` | saga | `OrganizationCreateSaga` — [`OrganizationCreateSaga.ts`](../../../services/iam/src/sagas/OrganizationCreateSaga.ts) |
| `iam.organizationDelete` | saga | `OrganizationDeleteSaga` — [`OrganizationDeleteSaga.ts`](../../../services/iam/src/sagas/OrganizationDeleteSaga.ts) |
| `iam.organizationUpdate` | saga | `OrganizationUpdateSaga` — [`OrganizationUpdateSaga.ts`](../../../services/iam/src/sagas/OrganizationUpdateSaga.ts) |
| `iam.userUpdateProfile` | saga | `UserUpdateProfileSaga` — [`UserUpdateProfileSaga.ts`](../../../services/iam/src/sagas/UserUpdateProfileSaga.ts) |
| `iam.applicationUserCreatedEvent` | workflow | `ApplicationUserCreatedEventWorkflow` — [`ApplicationUserCreatedEventWorkflow.ts`](../../../services/iam/src/workflows/ApplicationUserCreatedEventWorkflow.ts) |
| `iam.applicationUserUpdatedEvent` | workflow | `ApplicationUserUpdatedEventWorkflow` — [`ApplicationUserCreatedEventWorkflow.ts`](../../../services/iam/src/workflows/ApplicationUserCreatedEventWorkflow.ts) |
| `iam.applicationUserStatusChangedEvent` | workflow | `ApplicationUserStatusChangedEventWorkflow` — [`ApplicationUserCreatedEventWorkflow.ts`](../../../services/iam/src/workflows/ApplicationUserCreatedEventWorkflow.ts) |
| `iam.applicationUserDeletedEvent` | workflow | `ApplicationUserDeletedEventWorkflow` — [`ApplicationUserCreatedEventWorkflow.ts`](../../../services/iam/src/workflows/ApplicationUserCreatedEventWorkflow.ts) |
| `iam.createRoles` | workflow | `CreateRolesWorkflow` — [`OrganizationAccessWorkflows.ts`](../../../services/iam/src/workflows/OrganizationAccessWorkflows.ts) |
| `iam.assignRole` | workflow | `AssignRoleWorkflow` — [`OrganizationAccessWorkflows.ts`](../../../services/iam/src/workflows/OrganizationAccessWorkflows.ts) |
| `iam.memberInvite` | workflow | `MemberInviteWorkflow` — [`OrganizationAccessWorkflows.ts`](../../../services/iam/src/workflows/OrganizationAccessWorkflows.ts) |
| `iam.memberRemove` | workflow | `MemberRemoveWorkflow` — [`OrganizationAccessWorkflows.ts`](../../../services/iam/src/workflows/OrganizationAccessWorkflows.ts) |
| `iam.memberRoleChange` | workflow | `MemberRoleChangeWorkflow` — [`OrganizationAccessWorkflows.ts`](../../../services/iam/src/workflows/OrganizationAccessWorkflows.ts) |
| `iam.memberAccessRemove` | workflow | `MemberAccessRemoveWorkflow` — [`OrganizationAccessWorkflows.ts`](../../../services/iam/src/workflows/OrganizationAccessWorkflows.ts) |
| `iam.roleCreate` | workflow | `RoleCreateWorkflow` — [`OrganizationAccessWorkflows.ts`](../../../services/iam/src/workflows/OrganizationAccessWorkflows.ts) |
| `iam.roleUpdate` | workflow | `RoleUpdateWorkflow` — [`OrganizationAccessWorkflows.ts`](../../../services/iam/src/workflows/OrganizationAccessWorkflows.ts) |
| `iam.roleDelete` | workflow | `RoleDeleteWorkflow` — [`OrganizationAccessWorkflows.ts`](../../../services/iam/src/workflows/OrganizationAccessWorkflows.ts) |

Все IAM entrypoints используют `default` idempotency strategy.

## Listing

| Полное имя | Реализация |
| --- | --- |
| `listing.resyncFacetAffectedProducts` | `FacetAffectedProductsResyncWorkflow` — [`FacetAffectedProductsResyncWorkflow.ts`](../../../services/listing/src/workflows/FacetAffectedProductsResyncWorkflow.ts) |
| `listing.facetCreate` | `FacetCreateWorkflow` — [`FacetMutationWorkflows.ts`](../../../services/listing/src/workflows/FacetMutationWorkflows.ts) |
| `listing.facetDelete` | `FacetDeleteWorkflow` — [`FacetMutationWorkflows.ts`](../../../services/listing/src/workflows/FacetMutationWorkflows.ts) |
| `listing.facetValueCreate` | `FacetValueCreateWorkflow` — [`FacetMutationWorkflows.ts`](../../../services/listing/src/workflows/FacetMutationWorkflows.ts) |
| `listing.facetValueUpdate` | `FacetValueUpdateWorkflow` — [`FacetMutationWorkflows.ts`](../../../services/listing/src/workflows/FacetMutationWorkflows.ts) |
| `listing.facetValueDelete` | `FacetValueDeleteWorkflow` — [`FacetMutationWorkflows.ts`](../../../services/listing/src/workflows/FacetMutationWorkflows.ts) |
| `listing.facetValueMerge` | `FacetValueMergeWorkflow` — [`FacetMutationWorkflows.ts`](../../../services/listing/src/workflows/FacetMutationWorkflows.ts) |
| `listing.facetValueUnmerge` | `FacetValueUnmergeWorkflow` — [`FacetMutationWorkflows.ts`](../../../services/listing/src/workflows/FacetMutationWorkflows.ts) |
| `listing.syncFacetReferenceState` | `FacetReferenceStateSyncWorkflow` — [`FacetReferenceStateSyncWorkflow.ts`](../../../services/listing/src/workflows/FacetReferenceStateSyncWorkflow.ts) |
| `listing.batchProductIndex` | `ListingBatchProductIndexWorkflow` — [`ListingBatchProductIndexWorkflow.ts`](../../../services/listing/src/workflows/ListingBatchProductIndexWorkflow.ts) |
| `listing.syncCollectionProjection` | `ListingCollectionProjectionWorkflow` — [`ListingCollectionProjectionWorkflow.ts`](../../../services/listing/src/workflows/ListingCollectionProjectionWorkflow.ts) |
| `listing.recommendationSnapshotBuild` | `RecommendationSnapshotBuildWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.recommendationSnapshotFanOut` | `RecommendationSnapshotFanOutWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.recommendationCalculationRun` | `RecommendationCalculationRunWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.recommendationCalculationTrigger` | `RecommendationCalculationTriggerWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.recommendationOrderFactIngest` | `RecommendationOrderFactIngestWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.recommendationPolicyUpsert` | `RecommendationPolicyUpsertWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.recommendationPolicySetEnabled` | `RecommendationPolicySetEnabledWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.manualRecommendationCreate` | `ManualRecommendationCreateWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.manualRecommendationUpdate` | `ManualRecommendationUpdateWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.manualRecommendationDelete` | `ManualRecommendationDeleteWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.recommendationReferenceStateSync` | `RecommendationReferenceStateSyncWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.recommendationManualBootstrap` | `RecommendationManualBootstrapWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.recommendationManualSchedule` | `RecommendationManualScheduleWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.recommendationGlobalTrigger` | `RecommendationGlobalTriggerWorkflow` — [`RecommendationWorkflows.ts`](../../../services/listing/src/workflows/RecommendationWorkflows.ts) |
| `listing.searchSynonymGroupCreate` | `SearchSynonymGroupCreateWorkflow` — [`SearchResourceMutationWorkflows.ts`](../../../services/listing/src/workflows/SearchResourceMutationWorkflows.ts) |
| `listing.searchSynonymGroupUpdate` | `SearchSynonymGroupUpdateWorkflow` — [`SearchResourceMutationWorkflows.ts`](../../../services/listing/src/workflows/SearchResourceMutationWorkflows.ts) |
| `listing.searchSynonymGroupDelete` | `SearchSynonymGroupDeleteWorkflow` — [`SearchResourceMutationWorkflows.ts`](../../../services/listing/src/workflows/SearchResourceMutationWorkflows.ts) |
| `listing.searchProductBoostCreate` | `SearchProductBoostCreateWorkflow` — [`SearchResourceMutationWorkflows.ts`](../../../services/listing/src/workflows/SearchResourceMutationWorkflows.ts) |
| `listing.searchProductBoostUpdate` | `SearchProductBoostUpdateWorkflow` — [`SearchResourceMutationWorkflows.ts`](../../../services/listing/src/workflows/SearchResourceMutationWorkflows.ts) |
| `listing.searchProductBoostDelete` | `SearchProductBoostDeleteWorkflow` — [`SearchResourceMutationWorkflows.ts`](../../../services/listing/src/workflows/SearchResourceMutationWorkflows.ts) |
| `listing.searchSettingsUpdate` | `SearchSettingsUpdateWorkflow` — [`SearchSettingsUpdateWorkflow.ts`](../../../services/listing/src/workflows/SearchSettingsUpdateWorkflow.ts) |
| `listing.syncSellableItemIndex` | `ListingSyncSellableItemIndexWorkflow` — [`listingIndexWorkflows.ts`](../../../services/listing/src/workflows/listingIndexWorkflows.ts) |
| `listing.deleteSellableItemIndex` | `ListingDeleteSellableItemIndexWorkflow` — [`listingIndexWorkflows.ts`](../../../services/listing/src/workflows/listingIndexWorkflows.ts) |

Все 34 Listing entrypoints — workflows с `default` strategy.

## Loyalty

| Полное имя | Реализация |
| --- | --- |
| `loyalty.reserveCheckoutLoyaltyRedemption` | `ReserveRedemptionWorkflow` — [`CheckoutRedemptionWorkflows.ts`](../../../services/loyalty/src/workflows/CheckoutRedemptionWorkflows.ts) |
| `loyalty.commitCheckoutLoyaltyRedemption` | `CommitRedemptionWorkflow` — [`CheckoutRedemptionWorkflows.ts`](../../../services/loyalty/src/workflows/CheckoutRedemptionWorkflows.ts) |
| `loyalty.releaseCheckoutLoyaltyRedemption` | `ReleaseRedemptionWorkflow` — [`CheckoutRedemptionWorkflows.ts`](../../../services/loyalty/src/workflows/CheckoutRedemptionWorkflows.ts) |
| `loyalty.expireCheckoutLoyaltyRedemptions` | `ExpireRedemptionsWorkflow` — [`CheckoutRedemptionWorkflows.ts`](../../../services/loyalty/src/workflows/CheckoutRedemptionWorkflows.ts) |
| `loyalty.reverseCheckoutLoyaltyRedemption` | `ReverseRedemptionWorkflow` — [`CheckoutRedemptionWorkflows.ts`](../../../services/loyalty/src/workflows/CheckoutRedemptionWorkflows.ts) |
| `loyalty.processExternalReward` | `ExternalRewardWorkflow` — [`ExternalRewardWorkflow.ts`](../../../services/loyalty/src/workflows/ExternalRewardWorkflow.ts) |
| `loyalty.maintenance` | `LoyaltyMaintenanceWorkflow` — [`LoyaltyMaintenanceWorkflow.ts`](../../../services/loyalty/src/workflows/LoyaltyMaintenanceWorkflow.ts) |
| `loyalty.adjustPoints` | `ManualAdjustmentWorkflow` — [`ManualAdjustmentWorkflow.ts`](../../../services/loyalty/src/workflows/ManualAdjustmentWorkflow.ts) |
| `loyalty.processOrderRewardEligible` | `OrderRewardEligibleWorkflow` — [`OrderRewardWorkflows.ts`](../../../services/loyalty/src/workflows/OrderRewardWorkflows.ts) |
| `loyalty.processOrderRewardReversed` | `OrderRewardReversedWorkflow` — [`OrderRewardWorkflows.ts`](../../../services/loyalty/src/workflows/OrderRewardWorkflows.ts) |
| `loyalty.closeStore` | `StoreCloseWorkflow` — [`StoreCloseWorkflow.ts`](../../../services/loyalty/src/workflows/StoreCloseWorkflow.ts) |

Все 11 Loyalty entrypoints — workflows с `default` strategy.

## Media

| Полное имя | Реализация |
| --- | --- |
| `media.fileDeleteCleanup` | `FileDeleteCleanupWorkflow` — [`FileDeleteCleanupWorkflow.ts`](../../../services/media/src/workflows/FileDeleteCleanupWorkflow.ts) |
| `media.fileGarbageCollector` | `FileGarbageCollectorWorkflow` — [`FileGarbageCollectorWorkflow.ts`](../../../services/media/src/workflows/FileGarbageCollectorWorkflow.ts) |
| `media.fileHardDelete` | `FileHardDeleteWorkflow` — [`FileHardDeleteWorkflow.ts`](../../../services/media/src/workflows/FileHardDeleteWorkflow.ts) |

Все три — workflows с `default` strategy.

## Notifications

| Полное имя | Idempotency | Реализация |
| --- | --- | --- |
| `notifications.enqueue` | `client` | `NotificationEnqueueWorkflow` — [`NotificationEnqueueWorkflow.ts`](../../../services/notifications/src/workflows/NotificationEnqueueWorkflow.ts) |
| `notifications.ingestEvent` | `content` | `NotificationIngestEventWorkflow` — [`NotificationIngestEventWorkflow.ts`](../../../services/notifications/src/workflows/NotificationIngestEventWorkflow.ts) |
| `notifications.deliver` | `content` | `NotificationDeliveryWorkflow` — [`NotificationDeliveryWorkflow.ts`](../../../services/notifications/src/workflows/NotificationDeliveryWorkflow.ts) |
| `notifications.deliverProvider` | `workflow` | `NotificationProviderDeliveryWorkflow` — [`NotificationProviderDeliveryWorkflow.ts`](../../../services/notifications/src/workflows/NotificationProviderDeliveryWorkflow.ts) |

## Orders (`order` namespace)

| Полное имя | Реализация |
| --- | --- |
| `order.publishLoyaltyRewardEligible` | `PublishOrderLoyaltyRewardEligibleWorkflow` — [`LoyaltyRewardWorkflows.ts`](../../../services/orders/src/workflows/LoyaltyRewardWorkflows.ts) |
| `order.publishLoyaltyRewardReversed` | `PublishOrderLoyaltyRewardReversedWorkflow` — [`LoyaltyRewardWorkflows.ts`](../../../services/orders/src/workflows/LoyaltyRewardWorkflows.ts) |

Оба — workflows с `default` strategy.

## Payments

| Полное имя | Idempotency | Реализация |
| --- | --- | --- |
| `payments.configureProviderAccount` | `content` | `ConfigurePaymentProviderAccountWorkflow` — [`ConfigurePaymentProviderAccountWorkflow.ts`](../../../services/payments/src/workflows/ConfigurePaymentProviderAccountWorkflow.ts) |
| `payments.confirmSession` | `workflow` | `ConfirmPaymentSessionWorkflow` — [`ConfirmPaymentSessionWorkflow.ts`](../../../services/payments/src/workflows/ConfirmPaymentSessionWorkflow.ts) |
| `payments.createCollection` | `workflow` | `CreatePaymentCollectionWorkflow` — [`CreatePaymentCollectionWorkflow.ts`](../../../services/payments/src/workflows/CreatePaymentCollectionWorkflow.ts) |
| `payments.createSession` | `workflow` | `CreatePaymentSessionWorkflow` — [`CreatePaymentSessionWorkflow.ts`](../../../services/payments/src/workflows/CreatePaymentSessionWorkflow.ts) |
| `payments.executeOperation` | `workflow` | `ExecutePaymentOperationWorkflow` — [`ExecutePaymentOperationWorkflow.ts`](../../../services/payments/src/workflows/ExecutePaymentOperationWorkflow.ts) |
| `payments.expireSession` | `workflow` | `ExpirePaymentSessionWorkflow` — [`ExpirePaymentSessionWorkflow.ts`](../../../services/payments/src/workflows/ExpirePaymentSessionWorkflow.ts) |
| `payments.monitorOperation` | `workflow` | `MonitorPaymentOperationWorkflow` — [`MonitorPaymentOperationWorkflow.ts`](../../../services/payments/src/workflows/MonitorPaymentOperationWorkflow.ts) |
| `payments.completeProviderOperation` | `workflow` | `CompleteProviderOperationWorkflow` — [`ProviderPaymentEventsWorkflows.ts`](../../../services/payments/src/workflows/ProviderPaymentEventsWorkflows.ts) |
| `payments.reportProviderEvent` | `workflow` | `ReportProviderEventWorkflow` — [`ProviderPaymentEventsWorkflows.ts`](../../../services/payments/src/workflows/ProviderPaymentEventsWorkflows.ts) |
| `payments.publishEvents` | `workflow` | `PublishPaymentEventsWorkflow` — [`PublishPaymentEventsWorkflow.ts`](../../../services/payments/src/workflows/PublishPaymentEventsWorkflow.ts) |

## Pricing

| Полное имя | Реализация |
| --- | --- |
| `pricing.discountCreate` | `DiscountCreateWorkflow` — [`DiscountCreateWorkflow.ts`](../../../services/pricing/src/workflows/DiscountCreateWorkflow.ts) |
| `pricing.discountDelete` | `DiscountDeleteWorkflow` — [`DiscountDeleteWorkflow.ts`](../../../services/pricing/src/workflows/DiscountDeleteWorkflow.ts) |
| `pricing.discountExternalReferenceCreate` | `DiscountExternalReferenceCreateWorkflow` — [`DiscountExternalReferenceWorkflows.ts`](../../../services/pricing/src/workflows/DiscountExternalReferenceWorkflows.ts) |
| `pricing.discountExternalReferenceUpdate` | `DiscountExternalReferenceUpdateWorkflow` — [`DiscountExternalReferenceWorkflows.ts`](../../../services/pricing/src/workflows/DiscountExternalReferenceWorkflows.ts) |
| `pricing.discountExternalReferenceDelete` | `DiscountExternalReferenceDeleteWorkflow` — [`DiscountExternalReferenceWorkflows.ts`](../../../services/pricing/src/workflows/DiscountExternalReferenceWorkflows.ts) |
| `pricing.discountUpdate` | `DiscountUpdateWorkflow` — [`DiscountUpdateWorkflow.ts`](../../../services/pricing/src/workflows/DiscountUpdateWorkflow.ts) |

Все шесть — workflows с `default` strategy.

## Project

| Полное имя | Тип | Реализация |
| --- | --- | --- |
| `project.storeCreate` | saga | `StoreCreateSaga` — [`StoreCreateSaga.ts`](../../../services/project/src/sagas/StoreCreateSaga.ts) |
| `project.storeDelete` | saga | `StoreDeleteSaga` — [`StoreDeleteSaga.ts`](../../../services/project/src/sagas/StoreDeleteSaga.ts) |
| `project.storeUpdate` | saga | `StoreUpdateSaga` — [`StoreUpdateSaga.ts`](../../../services/project/src/sagas/StoreUpdateSaga.ts) |

Все три используют `default` strategy.

## Reviews

| Полное имя | Реализация |
| --- | --- |
| `reviews.contentExternalReferenceCreate` | `ContentExternalReferenceCreateWorkflow` — [`ContentExternalReferenceCreateWorkflow.ts`](../../../services/reviews/src/workflows/ContentExternalReferenceCreateWorkflow.ts) |
| `reviews.contentExternalReferenceDelete` | `ContentExternalReferenceDeleteWorkflow` — [`ContentExternalReferenceDeleteWorkflow.ts`](../../../services/reviews/src/workflows/ContentExternalReferenceDeleteWorkflow.ts) |
| `reviews.storeConfigurationUpdate` | `StoreConfigurationUpdateWorkflow` — [`EntityUpdateWorkflows.ts`](../../../services/reviews/src/workflows/EntityUpdateWorkflows.ts) |
| `reviews.productQuestionSubscriptionUpdate` | `QuestionSubscriptionUpdateWorkflow` — [`EntityUpdateWorkflows.ts`](../../../services/reviews/src/workflows/EntityUpdateWorkflows.ts) |
| `reviews.contentRedact` | `ContentRedactWorkflow` — [`EntityUpdateWorkflows.ts`](../../../services/reviews/src/workflows/EntityUpdateWorkflows.ts) |
| `reviews.contentRevisionRestore` | `ContentRevisionRestoreWorkflow` — [`EntityUpdateWorkflows.ts`](../../../services/reviews/src/workflows/EntityUpdateWorkflows.ts) |
| `reviews.reviewRequestUpdate` | `ReviewRequestUpdateWorkflow` — [`EntityUpdateWorkflows.ts`](../../../services/reviews/src/workflows/EntityUpdateWorkflows.ts) |
| `reviews.contentReportUpdate` | `ContentReportUpdateWorkflow` — [`EntityUpdateWorkflows.ts`](../../../services/reviews/src/workflows/EntityUpdateWorkflows.ts) |
| `reviews.moderationCaseUpdate` | `ModerationCaseUpdateWorkflow` — [`EntityUpdateWorkflows.ts`](../../../services/reviews/src/workflows/EntityUpdateWorkflows.ts) |
| `reviews.contentExternalReferenceUpdate` | `ContentExternalReferenceUpdateWorkflow` — [`EntityUpdateWorkflows.ts`](../../../services/reviews/src/workflows/EntityUpdateWorkflows.ts) |
| `reviews.moderationCaseCreate` | `ModerationCaseCreateWorkflow` — [`ModerationCaseCreateWorkflow.ts`](../../../services/reviews/src/workflows/ModerationCaseCreateWorkflow.ts) |
| `reviews.productQuestionCreate` | `ProductQuestionCreateWorkflow` — [`ProductQuestionCreateWorkflow.ts`](../../../services/reviews/src/workflows/ProductQuestionCreateWorkflow.ts) |
| `reviews.productQuestionDelete` | `ProductQuestionDeleteWorkflow` — [`ProductQuestionDeleteWorkflow.ts`](../../../services/reviews/src/workflows/ProductQuestionDeleteWorkflow.ts) |
| `reviews.productQuestionUpdate` | `ProductQuestionUpdateWorkflow` — [`ProductQuestionUpdateWorkflow.ts`](../../../services/reviews/src/workflows/ProductQuestionUpdateWorkflow.ts) |
| `reviews.ratingCriterionCreate` | `RatingCriterionCreateWorkflow` — [`RatingCriterionCreateWorkflow.ts`](../../../services/reviews/src/workflows/RatingCriterionCreateWorkflow.ts) |
| `reviews.ratingCriterionDelete` | `RatingCriterionDeleteWorkflow` — [`RatingCriterionDeleteWorkflow.ts`](../../../services/reviews/src/workflows/RatingCriterionDeleteWorkflow.ts) |
| `reviews.ratingCriterionUpdate` | `RatingCriterionUpdateWorkflow` — [`RatingCriterionUpdateWorkflow.ts`](../../../services/reviews/src/workflows/RatingCriterionUpdateWorkflow.ts) |
| `reviews.reviewCreate` | `ReviewCreateWorkflow` — [`ReviewCreateWorkflow.ts`](../../../services/reviews/src/workflows/ReviewCreateWorkflow.ts) |
| `reviews.reviewDelete` | `ReviewDeleteWorkflow` — [`ReviewDeleteWorkflow.ts`](../../../services/reviews/src/workflows/ReviewDeleteWorkflow.ts) |
| `reviews.reviewRequestCreate` | `ReviewRequestCreateWorkflow` — [`ReviewRequestCreateWorkflow.ts`](../../../services/reviews/src/workflows/ReviewRequestCreateWorkflow.ts) |
| `reviews.reviewUpdate` | `ReviewUpdateWorkflow` — [`ReviewUpdateWorkflow.ts`](../../../services/reviews/src/workflows/ReviewUpdateWorkflow.ts) |

Все 21 Reviews entrypoints — workflows с `default` strategy.

## Saga steps и компенсации

Эта секция перечисляет все 10 sagas и позволяет сразу видеть фактическую границу
автоматического rollback. Шаг без указанной компенсации не откатывается самой saga.

| Saga | Durable steps | Компенсации |
| --- | --- | --- |
| `catalog.backRefNotify` | `syncFiles` | нет |
| `catalog.entityDeletedNotify` | `notifyMedia` | нет |
| `catalog.productCreate` | `createProduct`, `createInventoryItems`, `syncProductBackRefs` | `compensateCreateInventoryItems` |
| `iam.organizationCreate` | `createOrganization`, `createMediaAssetGroup` | `compensateCreateOrganization`, `compensateCreateMediaAssetGroup` |
| `iam.organizationDelete` | `deleteOrganization`, `deleteMediaAssetGroup`, `unlinkBackRefs` | нет |
| `iam.organizationUpdate` | `updateOrganization`, `linkLogoBackRef`, `cleanupLogoBackRef`, `unlinkLogoBackRef` | `compensateLinkLogoBackRef`, `compensateCleanupLogoBackRef` |
| `iam.userUpdateProfile` | `updateUserProfile`, `linkAvatarBackRef`, `cleanupAvatarBackRef`, `unlinkAvatarBackRef` | `compensateLinkAvatarBackRef`, `compensateCleanupAvatarBackRef` |
| `project.storeCreate` | `generateId`, `createStore`, `createMediaAssetGroup` | `compensateCreateStore`, `compensateCreateMediaAssetGroup` |
| `project.storeDelete` | `deleteStore`, `deleteMediaAssetGroup`, `notifyEntityDeleted` | нет |
| `project.storeUpdate` | `updateContactDetails`, `updateAddress`, `updateBrand`, `updateOrderProcessing`, `updateDefaults`, `updateCurrencySettings`, `acquireStoreRevision`, `captureStoreUpdateSnapshot`, `linkBrandMedia`, `unlinkBrandMedia`, `emitStoreConfigurationUpdated` | все mutating steps кроме snapshot/event имеют парные `compensate*` methods |

## Основные межсервисные цепочки

- `checkout.placeOrder` создаёт `payments.createCollection` и
  `payments.createSession`; отдельный `checkout.monitorPlacedPayment` вызывает
  `payments.createSession`, `payments.executeOperation` и
  `payments.expireSession`, а также подтверждает либо компенсирует inventory,
  delivery, discounts и loyalty reservations.
- Payment workflows публикуют доменные события через `payments.publishEvents`,
  который вызывает `events.emit`; provider callbacks проходят через
  `payments.completeProviderOperation`/`payments.reportProviderEvent` и при
  необходимости запускают `payments.confirmSession`.
- `catalog.productCreate` создаёт inventory items и синхронизирует media backrefs;
  `catalog.productUpdate` запускает `catalog.backRefNotify` и `events.emit`;
  `catalog.productBulkEdit` fan-out запускает `catalog.productUpdate`.
- `project.storeCreate` вызывает IAM role workflows и `events.emit`;
  store update/delete также публикуют события, после чего consumers запускают
  свои projection/cleanup workflows.
- `order.publishLoyaltyRewardEligible` и
  `order.publishLoyaltyRewardReversed` публикуют события через `events.emit`, а
  Loyalty обрабатывает их в `loyalty.processOrderRewardEligible` и
  `loyalty.processOrderRewardReversed`.
- `media.fileGarbageCollector` запускает `media.fileHardDelete`, а hard delete —
  `media.fileDeleteCleanup`; cleanup публикует событие через `events.emit`.
- `notifications.deliver` fan-out запускает
  `notifications.deliverProvider` для конкретных routes/providers.

## Покрытие сервисов без entrypoints

На момент этой инвентаризации production-деклараций `@Workflow`/`@Saga` нет в:

- `bootstrap`;
- сервисах `stock`, `warehouse` и других доменах, которые реализованы внутри
  существующих service packages, но не имеют отдельного broker namespace;
- общих пакетах `packages/*` — там находится framework/registry и примеры, а не
  service-owned entrypoints.

## Как поддерживать инвентаризацию

При добавлении, удалении или переименовании `@Workflow`/`@Saga` нужно обновить:

1. строку соответствующего сервиса;
2. итоговые счётчики;
3. saga steps/компенсации, если меняется saga;
4. межсервисную цепочку, если меняется `broker.runWorkflow()`/`runSaga()`.

Быстрая проверка источников:

```bash
rg -n --glob 'services/*/src/**/*.ts' '@(Workflow|Saga)\(' services
rg -n --glob 'services/*/src/**/*.ts' '\.run(Workflow|Saga)\(' services
```
