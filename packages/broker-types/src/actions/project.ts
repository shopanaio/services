export const ProjectRecommendationActionNames = {
  listActiveStores: "project.listActiveStores",
} as const;

export interface ListActiveStoresParams {
  afterStoreId?: string;
  first: number;
}

export interface ActiveStoreWorkflowContext {
  storeId: string;
  organizationId: string;
}

export interface ListActiveStoresResult {
  stores: ActiveStoreWorkflowContext[];
  nextCursor: string | null;
}
