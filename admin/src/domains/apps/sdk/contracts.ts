import type { ComponentType, ReactNode } from "react";
import type {
  ColDef,
  GetRowIdParams,
  GridOptions,
} from "ag-grid-community";

export const ADMIN_APP_SDK_VERSION = "1.0.0";

export type AdminModalResult<TResult> =
  | { status: "submitted"; data: TResult }
  | { status: "cancelled"; reason: "closed" | "owner-disposed" };

export interface CoreModalContractMap {
  "catalog.product.details": {
    input: { productId: string; mode?: "view" | "edit" };
    result: void;
  };
  "catalog.product.picker": {
    input: { multiple?: boolean; selectedProductIds?: string[] };
    result: { productIds: string[] };
  };
  "catalog.variant.picker": {
    input: { productId?: string; multiple?: boolean };
    result: { variantIds: string[] };
  };
  "media.file.picker": {
    input: { multiple?: boolean; accept?: string[] };
    result: { fileIds: string[] };
  };
}

export interface AdminAppModalApi {
  openApp<TPayload, TResult>(
    modalId: string,
    payload: TPayload,
  ): Promise<AdminModalResult<TResult>>;
  openCore<TKey extends keyof CoreModalContractMap>(
    modal: TKey,
    input: CoreModalContractMap[TKey]["input"],
  ): Promise<AdminModalResult<CoreModalContractMap[TKey]["result"]>>;
  closeCurrent<TResult>(result?: TResult): void;
  setCurrentDirty(dirty: boolean): void;
}

export interface AdminAppNavigationApi {
  openAppPath(path: string): void;
  replaceAppPath(path: string): void;
  openCorePath(path: string): void;
}

export interface TypedDocumentNodeLike<TData, TVariables> {
  readonly kind: "Document";
  readonly __apiType?: (variables: TVariables) => TData;
}

export interface AdminAppGraphqlApi {
  query<TData, TVariables>(
    document: TypedDocumentNodeLike<TData, TVariables>,
    variables: TVariables,
  ): Promise<TData>;
  mutate<TData, TVariables>(
    document: TypedDocumentNodeLike<TData, TVariables>,
    variables: TVariables,
  ): Promise<TData>;
}

export interface AdminAppNotificationsApi {
  success(message: string, description?: string): void;
  error(message: string, description?: string): void;
  info(message: string, description?: string): void;
  warning(message: string, description?: string): void;
}

export interface AdminAppPageLayoutProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export interface AdminAppModalLayoutProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

export type AdminDataGridProps<TRowData> = Omit<
  GridOptions<TRowData>,
  "theme" | "rowData" | "columnDefs" | "getRowId"
> & {
  rowData: readonly TRowData[];
  columnDefs: readonly ColDef<TRowData>[];
  getRowId: (params: GetRowIdParams<TRowData>) => string;
  height?: number | string;
};

export interface AdminAppUiApi {
  AppPage: ComponentType<AdminAppPageLayoutProps>;
  ModalLayout: ComponentType<AdminAppModalLayoutProps>;
  DataGrid: <TRowData>(props: AdminDataGridProps<TRowData>) => ReactNode;
}

export interface AdminAppSdk {
  readonly app: {
    code: string;
    version: string;
    installationId: string;
  };
  readonly context: {
    organizationId: string;
    storeId: string;
    orgName: string;
    storeName: string;
    grantedScopes: readonly string[];
  };
  readonly modals: AdminAppModalApi;
  readonly navigation: AdminAppNavigationApi;
  readonly graphql: AdminAppGraphqlApi;
  readonly notifications: AdminAppNotificationsApi;
  readonly ui: AdminAppUiApi;
}

export interface AdminAppPageProps {
  sdk: AdminAppSdk;
  route: {
    appPath: string;
    searchParams: Readonly<Record<string, string | string[]>>;
  };
}

export interface AdminAppModalProps<TPayload = unknown> {
  sdk: AdminAppSdk;
  payload: TPayload;
}

export interface OrdersListToolbarContext {
  readonly selectedOrderIds: readonly string[];
}

export interface OrderRowActionsContext {
  readonly orderId: string;
}

export interface OrderDetailsContext {
  readonly orderId: string;
}

export interface FulfillmentContext {
  readonly orderId: string;
  readonly fulfillmentId: string;
}

export interface OrderShippingContext {
  readonly orderId: string;
  readonly fulfillmentId?: string;
}

export interface OrderPaymentContext {
  readonly orderId: string;
  readonly paymentId?: string;
}

export interface AdminExtensionPointMap {
  "orders.list.toolbar.actions": OrdersListToolbarContext;
  "orders.list.row.actions": OrderRowActionsContext;
  "orders.details.header.actions": OrderDetailsContext;
  "orders.details.primary.after": OrderDetailsContext;
  "orders.details.sidebar.after": OrderDetailsContext;
  "orders.details.fulfillment.actions": FulfillmentContext;
  "orders.details.fulfillment.after": FulfillmentContext;
  "orders.details.shipping.after": OrderShippingContext;
  "orders.details.payment.after": OrderPaymentContext;
}

export interface AdminExtensionProps<
  TPoint extends keyof AdminExtensionPointMap = keyof AdminExtensionPointMap,
> {
  sdk: AdminAppSdk;
  context: AdminExtensionPointMap[TPoint];
}

export type AdminAppPageComponent = ComponentType<AdminAppPageProps>;
export type AdminAppModalComponent = ComponentType<AdminAppModalProps>;
export type AdminAppExtensionComponent = ComponentType<AdminExtensionProps>;

