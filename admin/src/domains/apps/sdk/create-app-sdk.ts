import type { DocumentNode } from "graphql";
import type {
  AdminAppGraphqlApi,
  AdminAppModalApi,
  AdminAppNavigationApi,
  AdminAppNotificationsApi,
  AdminAppSdk,
  AdminAppUiApi,
  TypedDocumentNodeLike,
} from "./contracts";
import type { AppRuntimeScope } from "../runtime/app-runtime-scope";

export interface CreateAdminAppSdkOptions {
  identity: AdminAppSdk["app"];
  context: AdminAppSdk["context"];
  scope: AppRuntimeScope;
  modals: AdminAppModalApi;
  navigation: AdminAppNavigationApi;
  graphql: {
    query<TVariables>(document: DocumentNode, variables: TVariables): Promise<unknown>;
    mutate<TVariables>(document: DocumentNode, variables: TVariables): Promise<unknown>;
  };
  notifications: AdminAppNotificationsApi;
  ui: AdminAppUiApi;
}

export function createAdminAppSdk({
  identity,
  context,
  scope,
  modals,
  navigation,
  graphql,
  notifications,
  ui,
}: CreateAdminAppSdkOptions): AdminAppSdk {
  const guard = <TArgs extends unknown[], TResult>(operation: (...args: TArgs) => TResult) => {
    return (...args: TArgs): TResult => {
      scope.assertActive();
      return operation(...args);
    };
  };

  const guardEffect = <TArgs extends unknown[]>(operation: (...args: TArgs) => void) => {
    return (...args: TArgs): void => {
      if (!scope.isActive) return;
      operation(...args);
    };
  };

  const guardedGraphql: AdminAppGraphqlApi = {
    query: guard(
      <TData, TVariables>(
        document: TypedDocumentNodeLike<TData, TVariables>,
        variables: TVariables,
      ) => graphql.query(document as DocumentNode, variables) as Promise<TData>,
    ),
    mutate: guard(
      <TData, TVariables>(
        document: TypedDocumentNodeLike<TData, TVariables>,
        variables: TVariables,
      ) => graphql.mutate(document as DocumentNode, variables) as Promise<TData>,
    ),
  };

  const sdk: AdminAppSdk = {
    app: Object.freeze({ ...identity }),
    context: Object.freeze({
      ...context,
      grantedScopes: Object.freeze([...context.grantedScopes]),
    }),
    modals: {
      openApp: <TPayload, TResult>(modalId: string, payload: TPayload) => {
        scope.assertActive();
        return modals.openApp<TPayload, TResult>(modalId, payload);
      },
      openCore: (modal, input) => {
        scope.assertActive();
        return modals.openCore(modal, input);
      },
      closeCurrent: guard(modals.closeCurrent),
      setCurrentDirty: guard(modals.setCurrentDirty),
    },
    navigation: {
      openAppPath: guardEffect(navigation.openAppPath),
      replaceAppPath: guardEffect(navigation.replaceAppPath),
      openCorePath: guardEffect(navigation.openCorePath),
    },
    graphql: guardedGraphql,
    notifications: {
      success: guardEffect(notifications.success),
      error: guardEffect(notifications.error),
      info: guardEffect(notifications.info),
      warning: guardEffect(notifications.warning),
    },
    ui,
  };

  return Object.freeze(sdk);
}
