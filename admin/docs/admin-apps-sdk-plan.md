# Admin Apps domain и внутренний Apps SDK — архитектурный план

## Статус

- Статус документа: proposed.
- Версия решения: v1.
- Область: Admin UI, `services/apps`, backend hosted Apps из `apps/*`,
  hosted App UI из `admin/src/domains/apps/<appCode>`, App build pipeline.
- Admin runtime: Next.js App Router + Turbopack host.
- Remote runtime: client-only Module Federation modules.
- UI stack: React, Ant Design, `antd-style`, `@ant-design/cssinjs`, AG Grid.
- Backward compatibility и backfill не предусматриваются.

Связанный backend-план:

```text
docs/apps-platform-architecture.ru.md
```

## 1. Резюме решения

В первой версии Apps SDK не создаётся как отдельный workspace/npm package.
Он реализуется непосредственно внутри Admin:

```text
admin/src/domains/apps/sdk
```

Apps становятся отдельным Admin domain:

```text
admin/src/domains/apps
```

Этот domain владеет:

- страницами управления установленными и доступными Apps;
- GraphQL operations и hooks для Apps control plane;
- синхронизацией установленных Apps текущего store;
- Module Federation runtime registry;
- загрузкой App pages, modals и extension contributions;
- внутренним Apps SDK;
- App-scoped adapters над modal stack, navigation, GraphQL и UI primitives;
- runtime error boundaries и telemetry.

Текущий модуль:

```text
admin/src/domains/system/apps
```

переносится в новый domain и больше не принадлежит `system`.

URL страницы управления Apps может остаться прежним:

```text
/:orgName/:storeName/system/integrations/apps
```

Но route registration, page, hooks и GraphQL принадлежат
`admin/src/domains/apps`, а не `admin/src/domains/system`.

Установленное App получает собственную runtime page:

```text
/:orgName/:storeName/apps/:appCode{/*appPath}
```

Admin остаётся владельцем Next routing, React tree, Ant Design providers,
theme, CSS-in-JS cache, modal stack, AG Grid configuration и security
boundary.

## 2. Цели v1

Установленное App должно уметь:

1. рендерить client component на своей странице;
2. поддерживать deep links внутри собственного `appPath`;
3. открывать свои modals в общем Admin modal stack;
4. открывать разрешённые core modals, например Product details и Product
   picker;
5. участвовать в стандартных Admin pages через typed extension points;
6. использовать Ant Design, `antd-style`, CSS-in-JS tokens и theme текущего
   Admin;
7. использовать AG Grid через host-owned wrapper;
8. использовать Admin navigation, notifications и GraphQL transport без
   доступа к auth token;
9. корректно отключаться при store switch, suspend и uninstall;
10. загружать remote JS только при первом фактическом использовании.

## 3. Не цели v1

В первую версию не входят:

- отдельный опубликованный package `@shopana/admin-app-sdk`;
- независимый от platform build frontend App release lifecycle;
- загрузка произвольных npm packages или исходных файлов в runtime;
- SSR и React Server Components из remote Apps;
- собственный Next.js runtime или router внутри App;
- отдельный React root для App;
- iframe sandbox для недоверенного third-party code;
- удалённая загрузка backend-кода;
- доступ App к auth token и secrets;
- прямой доступ App к внутренним Admin domains;
- возможность заменить core layout, theme providers или modal renderer;
- регистрация произвольных core modal IDs;
- произвольные UI slots, отсутствующие в Admin extension point catalog;
- полная runtime-выгрузка уже загруженного JavaScript без browser reload.

Module Federation runtime предназначен только для trusted Apps, которые входят
в platform repository и проходят build validation.

## 4. Связь с backend Apps architecture

Backend App и Admin remote являются двумя surfaces одного hosted App:

```text
Shopana App
├─ App manifest
├─ backend definition
├─ backend runtime hosted by services/apps
├─ optional GraphQL subgraph
└─ optional Admin UI artifact
```

Используется единая идентичность:

```text
appCode + version
```

И единая store-scoped installation:

```text
AppInstallation
├─ organizationId
├─ storeId
├─ appCode
├─ installedVersion
├─ status
├─ manifestHash
├─ grantedScopes
└─ configuration
```

Отдельные `AppRelease`, `InstalledUiApp` или frontend release pinning в v1 не
создаются.

### 4.1 Два execution plane

Backend plane:

- App package статически входит в bundled registry `services/apps`;
- один process-wide App instance обслуживает installations всех stores;
- App GraphQL schema входит в supergraph во время platform build;
- resolvers проверяют installation, store, scopes и user RBAC.

Admin plane:

- browser получает UI descriptor только для текущего store;
- remote JS загружается через Module Federation лениво;
- App component рендерится внутри существующего React tree;
- UI registry очищается при смене installation context.

Backend static registry и frontend runtime loading не конфликтуют. Динамической
является активация App для store и загрузка browser artifact, но не состав
platform release.

### 4.2 Backend slots и Admin extension points

Это разные контракты:

```text
Backend capability slot
  -> выбирает App action для business operation

Admin extension point
  -> выбирает UI contribution для места на core page
```

Admin extension points не сохраняются в backend `platform.slots` и не
используют capability routing.

## 5. Target structure Admin domain

```text
admin/src/domains/apps/
├─ index.ts
├─ register.tsx
├─ management/
│  ├─ page/
│  ├─ components/
│  ├─ graphql/
│  │  ├─ fragments.ts
│  │  ├─ queries.ts
│  │  ├─ mutations.ts
│  │  ├─ operation-types.ts
│  │  └─ index.ts
│  ├─ hooks/
│  └─ mappers/
├─ runtime/
│  ├─ admin-apps-host-provider.tsx
│  ├─ installed-apps-runtime-sync.tsx
│  ├─ app-runtime-page.tsx
│  ├─ app-runtime-boundary.tsx
│  ├─ app-runtime-scope.ts
│  ├─ descriptor-schema.ts
│  ├─ federation/
│  │  ├─ runtime.ts
│  │  ├─ register-remote.ts
│  │  ├─ load-remote-module.ts
│  │  └─ errors.ts
│  ├─ registry/
│  │  ├─ app-registry.ts
│  │  ├─ modal-registry.ts
│  │  ├─ extension-registry.ts
│  │  └─ navigation-registry.ts
│  └─ telemetry/
├─ sdk/
│  ├─ index.ts
│  ├─ contracts.ts
│  ├─ create-app-sdk.ts
│  ├─ modal-api.ts
│  ├─ navigation-api.ts
│  ├─ graphql-api.ts
│  ├─ notifications-api.ts
│  ├─ extension-points.ts
│  ├─ core-modals.ts
│  └─ ui/
│     ├─ admin-data-grid.tsx
│     ├─ admin-app-page.tsx
│     ├─ admin-modal-layout.tsx
│     └─ types.ts
├─ <appCode>/
│  ├─ module-federation.config.ts
│  └─ src/
│     ├─ page.tsx
│     ├─ modals/
│     └─ extensions/
└─ test-support/
```

Правила границ:

- другие domains импортируют только `@/domains/apps`;
- internal files `runtime/*` и `sdk/*` не импортируются напрямую;
- `apps/index.ts` экспортирует только host components и extension point
  contracts, необходимые core Admin;
- hosted App UI импортирует из Apps SDK только type-only contract alias и не
  импортирует `runtime/*` или другие internal Admin domains;
- core Admin не импортирует source конкретного hosted App напрямую;
- public SDK contracts не содержат types из внутренних Admin domains;
- generated GraphQL API types импортируются напрямую из
  `@/graphql/types`, согласно Admin GraphQL conventions.

## 6. Как remote App использует внутренний SDK

### 6.1 SDK передаётся через props

Host создаёт scoped SDK object для конкретного App и installation:

```ts
interface AdminAppSdk {
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
```

Каждый remote entry получает SDK в props:

```ts
interface AdminAppPageProps {
  sdk: AdminAppSdk;
  route: {
    appPath: string;
    searchParams: Readonly<Record<string, string | string[]>>;
  };
}
```

```tsx
export default function NovaPoshtaPage({
  sdk,
  route,
}: AdminAppPageProps) {
  return (
    <sdk.ui.AppPage title="Nova Poshta">
      <Button
        onClick={() =>
          sdk.modals.openApp("shipment.create", {
            orderId: route.searchParams.orderId,
          })
        }
      >
        Create shipment
      </Button>
    </sdk.ui.AppPage>
  );
}
```

Runtime SDK не включается в remote bundle и не загружается как отдельный
federated module.

### 6.2 Type-only contract для producer

Чтобы App author получал TypeScript autocomplete без отдельного package, App
producer использует type-only alias:

```ts
import type {
  AdminAppPageProps,
  AdminAppModalProps,
  AdminExtensionProps,
} from "@shopana/admin-app-sdk";
```

В v1 `@shopana/admin-app-sdk` является compile-time alias на:

```text
admin/src/domains/apps/sdk/index.ts
```

Это не workspace package и не runtime dependency.

Обязательные ограничения:

- разрешены только `import type` из alias;
- runtime imports из alias отклоняются App UI validator;
- contracts не импортируют Next, Zustand, Apollo internals или Admin domains;
- type imports полностью удаляются producer build;
- Module Federation remote получает настоящий SDK object от host.

Такой контракт можно позднее перенести в отдельный package без изменения
remote component props.

## 7. App source layout

Backend source App остаётся в `apps/<appCode>`:

```text
apps/nova-poshta/
├─ app.manifest.ts
├─ build.config.json
├─ package.json
└─ src/
   ├─ index.ts
   ├─ NovaPoshtaApp.ts
   ├─ actions/
   ├─ workflows/
   └─ graphql/
```

Admin UI source этого App является частью Admin Apps domain:

```text
admin/src/domains/apps/nova-poshta/
├─ module-federation.config.ts
└─ src/
   ├─ page.tsx
   ├─ modals/
   │  └─ shipment-create-modal.tsx
   └─ extensions/
      ├─ order-shipment-panel.tsx
      └─ create-shipment-action.tsx
```

Связь backend и UI определяется единым `appCode + version`. App generator
создаёт backend source и Admin UI source в двух соответствующих roots.

Физическое расположение UI внутри Admin repository не означает статический
импорт в Admin host. Source конкретного App используется только отдельным App
UI producer build. Core Admin и runtime registries не импортируют его напрямую.

Browser runtime никогда не получает filesystem source path:

```text
admin/src/domains/apps/nova-poshta/src/page.tsx
```

Он получает только:

```text
remote name + mf-manifest URL + exposed module name
```

## 8. Единый App manifest

Admin UI становится optional section общего backend App manifest:

```ts
interface AppManifest {
  schemaVersion: 1;
  code: string;
  version: string;
  displayName: string;
  description?: string;
  lifecycle: AppLifecycleManifest;
  permissions: readonly string[];
  capabilities: readonly AppCapabilityManifest[];
  graphql?: AppGraphqlManifest;
  adminUi?: AdminUiManifest;
}
```

```ts
interface AdminUiManifest {
  sdkVersionRange: string;
  remoteName: string;
  page?: AdminAppPageDeclaration;
  navigation?: readonly AdminAppNavigationDeclaration[];
  modals?: readonly AdminAppModalDeclaration[];
  extensions?: readonly AdminAppExtensionDeclaration[];
  requiredScopes?: readonly string[];
}
```

Пример:

```ts
adminUi: {
  sdkVersionRange: "^1.0.0",
  remoteName: "nova_poshta_admin",
  page: {
    module: "./Page",
    defaultPath: "",
  },
  navigation: [
    {
      id: "nova-poshta",
      label: "Nova Poshta",
      path: "",
      order: 100,
    },
  ],
  modals: [
    {
      id: "shipment.create",
      module: "./ShipmentCreateModal",
      confirmOnDirtyClose: true,
      requiredScopes: ["orders:read", "delivery:write"],
    },
  ],
  extensions: [
    {
      id: "order-shipment-panel",
      point: "orders.details.shipping.after",
      module: "./OrderShipmentPanel",
      priority: 100,
      requiredScopes: ["orders:read"],
    },
  ],
}
```

Manifest не содержит абсолютный CDN URL и не содержит source paths.

## 9. Admin UI build artifact

App UI build создаёт:

```text
dist/admin/
├─ mf-manifest.json
├─ remoteEntry.js
├─ assets/*
└─ admin-ui.artifact.json
```

```ts
interface AdminUiBuildArtifact {
  appCode: string;
  appVersion: string;
  remoteName: string;
  mfManifestPath: string;
  contentHash: string;
  exposes: readonly string[];
}
```

Artifact metadata является частью bundled App registry текущего platform
release.

Browser URL вычисляет `services/apps`:

```text
manifestUrl =
  config.services.apps.adminUi.publicAssetsBaseUrl
  + mfManifestPath
```

`publicAssetsBaseUrl`:

- является deployment config;
- одинаков для installations текущего deployment;
- не хранится в tenant configuration;
- не передаётся App author как runtime input.

Assets публикуются по immutable path:

```text
/apps/<appCode>/<appVersion>/<contentHash>/mf-manifest.json
```

## 10. Backend control-plane contract

### 10.1 Persistence

Используется существующая целевая backend-модель:

```text
app_installations
app_installation_manifest_snapshots
app_installation_scopes
app_lifecycle_operations
```

Не добавляются:

```text
app_releases
installed_ui_apps
ui_release_version
```

Canonical manifest snapshot автоматически включает `adminUi`.

`installed_version` относится ко всему App:

- backend runtime;
- GraphQL schema;
- Admin UI artifact.

### 10.2 GraphQL descriptor

Apps control plane добавляет read model:

```graphql
type AdminAppRemote {
  name: String!
  manifestUrl: String!
  contentHash: String!
}

type AdminAppPage {
  module: String!
  defaultPath: String
}

type AdminAppModal {
  id: String!
  module: String!
  confirmOnDirtyClose: Boolean!
  closeConfirmMessage: String
  requiredScopes: [String!]!
}

type AdminAppExtension {
  id: String!
  point: String!
  module: String!
  priority: Int!
  requiredScopes: [String!]!
  conditions: JSON
}

type AdminAppUiDescriptor {
  installationId: ID!
  appCode: String!
  displayName: String!
  version: String!
  sdkVersionRange: String!
  remote: AdminAppRemote!
  page: AdminAppPage
  navigation: [AdminAppNavigationItem!]!
  modals: [AdminAppModal!]!
  extensions: [AdminAppExtension!]!
  grantedScopes: [String!]!
}

extend type AppsQuery {
  adminUiApps: [AdminAppUiDescriptor!]!
  adminUiApp(code: String!): AdminAppUiDescriptor
}
```

Resolver:

1. использует verified organization/store context;
2. читает bundled App definition;
3. находит installation текущего store;
4. требует status `ACTIVE`;
5. проверяет App runtime health;
6. берёт manifest snapshot и granted scopes;
7. фильтрует недоступные contributions;
8. вычисляет immutable browser URL;
9. возвращает normalized descriptor.

`SUSPENDED`, `UNINSTALLED`, incompatible и unhealthy App не получает активный
descriptor.

Client-side filtering не является security boundary. App GraphQL resolvers и
core actions повторно проверяют installation, store, scopes и RBAC.

## 11. Admin runtime lifecycle

`AdminAppsHostProvider` монтируется один раз внутри существующих root providers:

```text
ApolloProvider
  Theme
    AntdRegistry
      ThemeContextProvider
        antd-style ThemeProvider
          Ant Design ConfigProvider
            Ant Design App
              AdminAppsHostProvider
                ClientLayoutResolver
                  DomainLayout
                  ModalStack
```

Provider не создаёт второй React root или UI provider.

### 11.1 Store activation

При входе в store:

1. `InstalledAppsRuntimeSync` выполняет `adminUiApps`;
2. валидирует descriptors через Zod schema;
3. проверяет `sdkVersionRange`;
4. регистрирует remote metadata без загрузки remote JS;
5. регистрирует lazy App modal definitions;
6. строит extension point index;
7. публикует navigation contributions;
8. создаёт owner scope для каждого descriptor.

Owner key:

```text
app:<appCode>@<version>:<installationId>
```

### 11.2 Store switch, suspend и uninstall

При деактивации owner scope:

1. новые mounts блокируются;
2. App-owned modals закрываются;
3. unresolved modal promises завершаются typed cancellation result;
4. modal definitions удаляются;
5. extension contributions удаляются;
6. navigation contributions удаляются;
7. App SDK scope помечается disposed;
8. последующие вызовы старого SDK object отклоняются;
9. загруженный JavaScript может остаться в browser cache до reload.

## 12. App page routing

Admin регистрирует один локальный catch-all route:

```text
/:orgName/:storeName/apps/:appCode{/*appPath}
```

Route render flow:

```text
AppRuntimePage
  -> resolve descriptor by appCode
  -> verify ACTIVE installation and page declaration
  -> resolve owner scope
  -> register/load MF remote
  -> load page module
  -> create scoped AdminAppSdk
  -> render <RemotePage sdk={sdk} route={route} />
```

App не экспортирует Next page и не владеет browser history.

Navigation выполняется через:

```ts
sdk.navigation.openAppPath("shipments/123");
sdk.navigation.openCorePath("/orders/123");
sdk.navigation.replaceAppPath("settings");
```

SDK:

- добавляет canonical org/store prefix;
- запрещает выход на неизвестный external URL;
- валидирует core route allowlist;
- сохраняет App boundary.

## 13. Module Federation runtime

### 13.1 Host

Admin host:

- создаёт runtime instance один раз;
- регистрирует dynamic remotes по descriptor;
- lazy-loads exposed modules;
- применяет timeout/retry;
- проверяет allowed asset origin;
- логирует `appCode`, version, module и owner;
- кэширует успешную загрузку по immutable URL.

### 13.2 Producer

Remote producer:

- имеет globally unique `remoteName`;
- exports обычные React components;
- не exports Next routes, server modules или `mount(element)`;
- не создаёт отдельный React root;
- не включает host-owned UI libraries;
- не импортирует runtime implementation внутреннего SDK;
- использует только manifest-declared exposes.

### 13.3 Shared singletons

Host владеет и предоставляет как singleton:

- `react`;
- `react-dom`;
- `antd`;
- `@ant-design/icons`;
- `antd-style`;
- `@ant-design/cssinjs`;
- `@apollo/client`;
- `ag-grid-react`;
- `ag-grid-community`.

Версии определяет Admin release.

App producer не должен включать вторые копии этих dependencies в emitted
chunks.

## 14. Theme и styling contract

Remote component рендерится descendant существующих:

- Ant Design `ConfigProvider`;
- Ant Design `App`;
- `antd-style` ThemeProvider;
- `@ant-design/cssinjs` cache;
- Admin theme context;
- ApolloProvider.

Поэтому App может использовать:

```tsx
import { App, Button, Form, Select } from "antd";
import { createStyles } from "antd-style";
```

И получает:

- текущий light/dark algorithm;
- Admin design tokens;
- fonts;
- component overrides;
- CSS variables;
- `message`, `notification` и confirm APIs;
- правильные popup containers.

App запрещено:

- создавать собственный `ConfigProvider`;
- создавать собственный Ant Design `App`;
- создавать `ThemeProvider` или `StyleProvider`;
- менять global tokens;
- импортировать Admin global CSS;
- использовать global selectors;
- сбрасывать стили `html`, `body` или `#root`;
- полагаться на private Admin CSS class names.

Допускаются:

- Ant Design components;
- token-based `createStyles`;
- locally scoped CSS modules после validation;
- inline styles для вычисляемых layout values.

## 15. Host-owned UI API

SDK предоставляет небольшие stable wrappers:

```ts
interface AdminAppUiApi {
  AppPage: ComponentType<AdminAppPageLayoutProps>;
  ModalLayout: ComponentType<AdminAppModalLayoutProps>;
  DataGrid: ComponentType<AdminDataGridProps<unknown>>;
}
```

### 15.1 AG Grid

App использует:

```tsx
<sdk.ui.DataGrid
  rowData={rows}
  columnDefs={columns}
  getRowId={getRowId}
/>
```

`AdminDataGrid`:

- применяет текущую Admin AG Grid theme;
- использует host module registration;
- применяет locale и standard defaults;
- владеет license/runtime configuration;
- переключается между light/dark вместе с Admin.

App не вызывает `ModuleRegistry.registerModules`.

Raw AG Grid API может быть добавлен позднее как reviewed escape hatch.

## 16. Modal stack integration

Создавать второй modal system запрещено.

Существующий Admin modal stack расширяется:

- owner namespace;
- App modal definitions;
- typed result;
- owner-scoped cleanup;
- deterministic cancellation;
- public core modal adapters.

### 16.1 App-owned modals

Manifest:

```ts
{
  id: "shipment.create",
  module: "./ShipmentCreateModal",
  confirmOnDirtyClose: true,
}
```

Runtime registry преобразует ID:

```text
shipment.create
  ->
app:nova-poshta@1.0.0:<installationId>:shipment.create
```

API:

```ts
interface AdminAppModalApi {
  openApp<TPayload, TResult>(
    modalId: string,
    payload: TPayload,
  ): Promise<AdminModalResult<TResult>>;

  openCore<TKey extends keyof CoreModalContractMap>(
    modal: TKey,
    input: CoreModalContractMap[TKey]["input"],
  ): Promise<
    AdminModalResult<CoreModalContractMap[TKey]["result"]>
  >;

  closeCurrent<TResult>(result?: TResult): void;
  setCurrentDirty(dirty: boolean): void;
}
```

Remote modal получает:

```ts
interface AdminAppModalProps<TPayload = unknown> {
  sdk: AdminAppSdk;
  payload: TPayload;
}
```

App modal может открыть другую App modal или разрешённую core modal поверх
себя.

### 16.2 Core modal allowlist

SDK не раскрывает internal modal type strings.

Начальный public catalog:

```ts
interface CoreModalContractMap {
  "catalog.product.details": {
    input: {
      productId: string;
      mode?: "view" | "edit";
    };
    result: void;
  };

  "catalog.product.picker": {
    input: {
      multiple?: boolean;
      selectedProductIds?: string[];
    };
    result: {
      productIds: string[];
    };
  };

  "catalog.variant.picker": {
    input: {
      productId?: string;
      multiple?: boolean;
    };
    result: {
      variantIds: string[];
    };
  };

  "media.file.picker": {
    input: {
      multiple?: boolean;
      accept?: string[];
    };
    result: {
      fileIds: string[];
    };
  };
}
```

Core adapter:

- преобразует stable public ID во внутренний modal type;
- валидирует input;
- проверяет required scopes;
- нормализует result;
- не раскрывает внутренние domain objects.

## 17. GraphQL access

Remote App может использовать GraphQL только через текущий Admin session и
store context.

SDK предоставляет adapter:

```ts
interface AdminAppGraphqlApi {
  query<TData, TVariables>(
    document: TypedDocumentNode<TData, TVariables>,
    variables: TVariables,
  ): Promise<TData>;

  mutate<TData, TVariables>(
    document: TypedDocumentNode<TData, TVariables>,
    variables: TVariables,
  ): Promise<TData>;
}
```

Adapter:

- использует host Apollo client;
- не возвращает auth token;
- не разрешает менять gateway URL;
- добавляет telemetry metadata;
- завершает request ошибкой после dispose App scope.

Допускается прямое использование Apollo hooks только после фиксации shared
singleton contract. Предпочтительный v1 API — `sdk.graphql`.

Backend App GraphQL resolver всё равно проверяет:

```text
runtime READY
∩ installation ACTIVE
∩ current store
∩ manifest permissions
∩ granted scopes
∩ user RBAC
```

## 18. Admin extension points

SDK задаёт закрытый typed catalog:

```ts
interface AdminExtensionPointMap {
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
```

Core page вставляет host component:

```tsx
<AdminAppExtensionPoint
  point="orders.details.shipping.after"
  context={{
    orderId: order.id,
    fulfillmentId: fulfillment?.id,
  }}
/>
```

App получает только stable context, а не internal React state, Zustand stores
или mutable domain services.

Render flow:

```text
AdminAppExtensionPoint
  -> find active contributions for point
  -> check owner scope and permissions
  -> lazy-load declared module
  -> create scoped SDK
  -> render isolated contribution boundary
```

Ordering:

```text
priority ASC
appCode ASC
contributionId ASC
```

Ошибка одного contribution не ломает core page и другие Apps.

## 19. Apps management page

Новый Apps domain владеет management UI:

```text
admin/src/domains/apps/management
```

Он заменяет:

```text
admin/src/domains/system/apps
```

Management UI работает с backend control plane:

- available App definitions;
- installed Apps;
- installation status;
- required/granted scopes;
- install preview and consent;
- install/update/suspend/resume/uninstall operations;
- runtime and installation health.

GraphQL code следует структуре:

```text
management/graphql
management/hooks
management/mappers
management/page
```

Mocks удаляются после подключения control-plane GraphQL. API responses не
преобразуются в отдельные UI view models.

Route registration переносится из:

```text
admin/src/domains/system/register.tsx
```

в:

```text
admin/src/domains/apps/register.tsx
```

При этом Apps management page может остаться визуально в группе
`System -> Integrations`.

## 20. Security и failure isolation

Module Federation remote работает с same-page privileges. Это не sandbox.

Обязательные меры:

- только bundled trusted Apps;
- allowlist asset origins;
- CSP для script и connect sources;
- immutable content-addressed paths;
- descriptor и artifact hash validation;
- Zod validation backend descriptor;
- SDK version compatibility check;
- server-side permission enforcement;
- no secrets и auth tokens в props;
- no arbitrary module URLs из user input;
- no arbitrary core modal IDs;
- no arbitrary navigation;
- no global CSS;
- page/modal/contribution error boundaries;
- load timeout и retry;
- kill switch через App installation/runtime state;
- telemetry с `appCode`, version, installationId, module и mount type.

Remote failure не должна:

- ломать Admin layout;
- ломать modal stack;
- удалять core content;
- оставлять unresolved modal promise;
- мешать загрузке других Apps.

## 21. Build и validation

### 21.1 Build order

Целевой platform build:

1. shared packages;
2. backend App packages;
3. App Admin UI producers из `admin/src/domains/apps/<appCode>`;
4. generated bundled App registry и artifact metadata;
5. core services, включая `services/apps`;
6. GraphQL schema export/composition;
7. Admin host;
8. bootstrap.

Admin host не содержит hardcoded remote URLs и не требует списка конкретных
Apps для runtime routing.

### 21.2 App UI validator

Validator проверяет:

1. `adminUi` section общего App manifest;
2. уникальность page/modal/extension IDs;
3. известность extension point names;
4. наличие declared exposes в `mf-manifest.json`;
5. совпадение `appCode`, version и remote name;
6. `sdkVersionRange`;
7. отсутствие source paths в runtime artifact;
8. отсутствие host-owned libraries в emitted chunks;
9. отсутствие runtime imports из internal SDK alias;
10. отсутствие запрещённых providers;
11. отсутствие global CSS selectors;
12. immutable asset path;
13. allowed asset origin;
14. content hash;
15. manifest permissions/scopes format.

Build platform release завершается ошибкой при невалидном App UI artifact.

### 21.3 Publish

В v1 App UI не публикуется как независимый release.

Pipeline:

```text
build App backend
-> build App Admin remote
-> validate common manifest and artifact
-> upload immutable browser assets
-> generate bundled registry metadata
-> deploy services/apps and Admin
```

Версия App меняется вместе с platform build.

## 22. План реализации

### Этап 0. Зафиксировать contracts

1. Добавить `adminUi` в общий App manifest.
2. Добавить `AdminUiBuildArtifact`.
3. Зафиксировать descriptor GraphQL schema.
4. Зафиксировать `AdminAppSdk` props contract.
5. Зафиксировать initial core modal catalog.
6. Зафиксировать initial Orders extension point catalog.

Результат: backend, Admin host и App producer используют одну терминологию и
один `appCode + version`.

### Этап 1. Выделить Apps domain

1. Создать `admin/src/domains/apps`.
2. Перенести page, hooks, modals и GraphQL из
   `admin/src/domains/system/apps`.
3. Создать `apps/register.tsx`.
4. Удалить Apps ownership из `system/register.tsx`.
5. Сохранить management URL в `System -> Integrations`.
6. Добавить public barrel `domains/apps/index.ts`.

Результат: Apps является отдельным Admin domain.

### Этап 2. Создать internal SDK

1. Создать `admin/src/domains/apps/sdk`.
2. Добавить portable TypeScript contracts.
3. Создать scoped `AdminAppSdk` factory.
4. Добавить disposed-scope guard.
5. Настроить type-only alias `@shopana/admin-app-sdk`.
6. Запретить runtime imports из alias.
7. Добавить UI, navigation, GraphQL и notification adapters.

Результат: SDK существует внутри Admin и передаётся remote modules через
props.

### Этап 3. Backend UI descriptor

1. Расширить backend App manifest секцией `adminUi`.
2. Включить UI metadata в manifest snapshot/hash.
3. Добавить deployment public assets configuration.
4. Добавить `adminUiApps` и `adminUiApp`.
5. Фильтровать descriptors по installation state, health и scopes.
6. Не создавать отдельную release persistence.

Результат: Admin узнаёт Apps и URLs только от `services/apps`.

### Этап 4. Runtime host и page

1. Добавить `AdminAppsHostProvider`.
2. Добавить descriptor validation.
3. Реализовать owner-scoped registries.
4. Подключить Module Federation Runtime.
5. Добавить canonical catch-all App route.
6. Реализовать page lazy loading.
7. Добавить loading/error/incompatible states.
8. Реализовать store switch cleanup.

Результат: установленное App открывается на собственной странице.

### Этап 5. Modal SDK

1. Добавить owner к modal definitions и stack entries.
2. Добавить typed modal result.
3. Добавить owner-scoped unregister/close.
4. Добавить lazy remote modal loader.
5. Добавить core modal adapters.
6. Реализовать Product details и Product picker.
7. Сохранить nested stack и dirty close confirmation.

Результат: App использует тот же modal stack, что и core Admin.

### Этап 6. Theme и UI ownership

1. Зафиксировать Module Federation singleton allowlist.
2. Добавить producer externalization rules.
3. Создать `AdminAppPage`, `AdminModalLayout` и `AdminDataGrid`.
4. Запретить дополнительные providers и global CSS.
5. Проверить light/dark theme.
6. Проверить Ant Design messages, notifications, dropdowns и portals.
7. Проверить nested modals и AG Grid.

Результат: App визуально и функционально наследует Admin UI environment.

### Этап 7. Extension points

1. Реализовать extension registry.
2. Реализовать `AdminAppExtensionPoint`.
3. Добавить initial Orders point catalog.
4. Вставить points в Orders list/details/fulfillment/shipping.
5. Добавить isolated lazy rendering.
6. Реализовать Nova Poshta contributions.

Результат: Nova Poshta участвует в стандартных Orders pages без прямого
импорта App source.

### Этап 8. App build integration

1. Добавить source unit `admin/src/domains/apps/<appCode>` в App generator.
2. Добавить MF producer build в unified App tooling.
3. Генерировать `admin-ui.artifact.json`.
4. Добавить App UI validator.
5. Публиковать immutable assets.
6. Добавить artifact metadata в bundled registry.
7. Добавить dev watch для App backend и Admin remote.

Результат: App backend и UI собираются как один App текущего platform release.

### Этап 9. Hardening

1. Добавить CSP и asset origin policy.
2. Добавить hash/integrity verification.
3. Добавить timeout/retry.
4. Добавить telemetry.
5. Добавить deterministic cancellation.
6. Добавить runtime kill switch.
7. Добавить bundle inspection.

## 23. Acceptance criteria

### Domain

- Apps код находится в `admin/src/domains/apps`.
- `admin/src/domains/system/apps` отсутствует.
- System domain не владеет Apps hooks, GraphQL или runtime.
- Management page остаётся доступной из `System -> Integrations`.

### Page

- `ACTIVE` App открывается по
  `/:orgName/:storeName/apps/:appCode`.
- Deep link и browser refresh работают.
- Nested `appPath` работает без App router.
- Suspended, uninstalled, unhealthy или incompatible App не загружает remote
  JS.

### SDK

- Runtime SDK создаётся внутри Admin.
- Remote получает scoped SDK через props.
- Отдельный SDK package отсутствует.
- Remote использует только type-only internal alias.
- Disposed SDK scope не выполняет новые операции.

### Theme

- App видит текущую light/dark theme.
- Ant Design components используют Admin tokens.
- `App.useApp()` использует host message/modal/notification context.
- CSS-in-JS использует host theme/cache.
- В DOM нет второго `ConfigProvider`, `ThemeProvider` или Ant Design `App`.
- В remote chunks нет второй копии React, Ant Design или AG Grid.

### Modals

- App page открывает App-owned modal.
- App modal использует общий full-screen modal stack.
- App modal открывает core Product modal поверх себя.
- Product picker возвращает typed result.
- Dirty close confirmation работает.
- Store switch/uninstall закрывает только modals соответствующего owner.
- Remote modal error не ломает modal stack.

### AG Grid

- App использует `sdk.ui.DataGrid`.
- Grid получает current Admin theme, defaults и locale.
- App не регистрирует AG Grid modules.

### Extensions

- Nova Poshta contribution рендерится только для `ACTIVE` installation.
- Contribution получает stable Orders context и scoped SDK.
- Ошибка contribution не ломает Order page/modal.
- Ordering deterministic.
- UI extension points не создают backend capability slots.

### Discovery

- Admin host, runtime descriptors и bundled registry не содержат filesystem
  source paths конкретных Apps.
- Hosted App UI source находится в
  `admin/src/domains/apps/<appCode>`.
- Admin не содержит hardcoded production remote URLs.
- `services/apps` возвращает immutable manifest URL.
- Descriptor соответствует общей App version и installation.
- Все declared modules существуют в MF manifest.
- Отдельная `AppRelease` persistence отсутствует.

## 24. Ownership

| Область | Владелец |
|---|---|
| App identity, version и common manifest | App definition |
| Backend runtime | `services/apps` |
| Installation lifecycle | `services/apps` control plane |
| App GraphQL schema/resolvers | App package |
| GraphQL hosting и guards | `services/apps` |
| Admin UI source | `admin/src/domains/apps/<appCode>` |
| Admin UI artifact build | App build tooling |
| Browser asset hosting metadata | bundled App registry + deployment config |
| Apps management UI | `admin/src/domains/apps/management` |
| Module Federation runtime | `admin/src/domains/apps/runtime` |
| Internal SDK | `admin/src/domains/apps/sdk` |
| React root and contexts | Admin |
| Theme and CSS-in-JS cache | Admin |
| Modal stack | Admin |
| Core modal implementations | соответствующие core domains |
| Core modal public adapters | Admin Apps SDK |
| Extension point locations | core Admin domains |
| Extension registry and rendering | Admin Apps domain |
| AG Grid modules/theme/license | Admin |
| App authorization | backend scopes/RBAC |

## 25. Возможное развитие после v1

После стабилизации contracts допускается вынести только portable часть:

```text
admin/src/domains/apps/sdk/contracts
  ->
packages/admin-app-sdk
```

Runtime implementations остаются в Admin и после такого выделения.

Критерии для package extraction:

- props contracts стабилизированы;
- минимум два App используют SDK;
- modal и extension point catalogs не меняются хаотично;
- build tooling умеет публиковать совместимую SDK version;
- появился реальный сценарий разработки App вне текущего monorepo.

До выполнения этих условий отдельный package создаёт лишний release lifecycle
и не используется.
