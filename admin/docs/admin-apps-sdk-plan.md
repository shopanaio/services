# Admin Apps SDK — архитектурный и implementation plan

## Статус

- Статус документа: proposed.
- Область: Admin UI, Apps service, App release/build pipeline.
- Целевой runtime: Next.js 16 App Router + Turbopack host, Module Federation Runtime для client-only remote modules.
- Целевой UI stack: React 19, Ant Design, `antd-style`, `@ant-design/cssinjs`, AG Grid.
- Миграции совместимости и backfill не предусматриваются: проект не имеет production data и может перейти сразу на целевую модель.

## 1. Цель

Создать публичный `@shopana/admin-app-sdk`, через который установленное App может:

1. отрендерить свою главную страницу по canonical URL:

   ```text
   /:orgName/:storeName/apps/:appCode{/*appPath}
   ```

2. добавить components/actions в объявленные Admin extension points;
3. открыть собственную modal в общем Admin modal stack;
4. открыть разрешённую core modal, например карточку Product или Product picker;
5. использовать общие React, Ant Design, `antd-style`, CSS-in-JS cache, theme tokens, fonts и AG Grid, которыми владеет Admin host;
6. использовать notifications, confirmation dialogs, navigation и разрешённый API transport через host adapters;
7. загружаться, обновляться и отключаться без пересборки Admin.

Admin должен оставаться владельцем:

- React root и React contexts;
- Next routing;
- Ant Design `ConfigProvider` и `App`;
- `ThemeProvider`, theme algorithm, tokens и CSS-in-JS cache;
- global CSS и fonts;
- modal stack store и renderer;
- AG Grid modules, theme и license/runtime configuration;
- auth/session/store context;
- списка разрешённых core modals;
- списка разрешённых UI dependencies;
- App compatibility, permissions и failure isolation.

## 2. Не цели

В первую версию не входят:

- SSR или React Server Components из remote Apps;
- собственный Next.js router внутри App;
- отдельный React root для каждого trusted App;
- iframe runtime для недоверенных third-party Apps;
- доступ Apps к внутренним alias вроде `@/domains/...`;
- прямой доступ Apps к auth token, browser storage или внутреннему Apollo cache;
- возможность App заменить core layout, theme providers или modal renderer;
- возможность App регистрировать произвольное core modal type;
- загрузка source files App из Admin repository.

Все remote components являются trusted client components и исполняются в том же `window`, что и Admin.

## 3. Текущее состояние и ограничения

### 3.1 Admin root providers

Сейчас root строится как:

```text
ApolloProvider
  Theme
    AntdRegistry
      ThemeContextProvider
        antd-style ThemeProvider
          Ant Design ConfigProvider
            Ant Design App
              ClientLayoutResolver
                DomainLayout
                ModalStack
```

Это правильная основа: remote component должен быть отрендерен как descendant существующего React tree и автоматически получить те же provider contexts.

### 3.2 Theme

Текущий `Theme` владеет:

- light/dark algorithm;
- `cssVar.prefix = "ant"`;
- `hashed = false`;
- `zeroRuntime = true`;
- Safiro font stack;
- component-level token overrides;
- Ant Design `App` context для `message`, `notification`, `modal`.

Remote App не должен создавать второй `ConfigProvider`, `App`, `ThemeProvider` или CSS-in-JS cache.

### 3.3 Modal stack

Текущий modal stack уже поддерживает:

- push/pop;
- nested stack;
- lazy modal definitions;
- dirty state;
- close confirmation;
- modal payload context.

Но текущий registry:

- использует глобальные строковые type IDs;
- не имеет owner namespace;
- не различает core и App modals;
- не имеет public core-modal allowlist;
- не возвращает typed result вызывающей стороне;
- не умеет атомарно удалить все definitions одного App release;
- не умеет закрыть только modals удаляемого App.

SDK должен расширить эту модель, а не создавать второй modal system.

### 3.4 Apps contracts

Текущий backend plugin manifest описывает backend plugin (`code`, `version`, `domains`, `apiVersionRange`), но не UI release.

Текущий `InstalledApp` содержит `baseURL` и `meta`, но не содержит:

- Module Federation manifest URL;
- remote name;
- SDK compatibility range;
- page expose;
- App modal declarations;
- Admin extension contributions.

Backend plugin manifest и Admin UI release должны стать отдельными контрактами внутри общего App release.

## 4. Основные архитектурные решения

### 4.1 Admin никогда не читает App `src`

Путь:

```ts
"./OrderShipmentPanel": "./src/admin/order-shipment-panel.tsx"
```

используется только producer build.

В runtime Admin получает:

```json
{
  "remoteName": "novaposhta_admin",
  "manifestUrl": "https://cdn.shopana.io/apps/novaposhta/1.3.0/mf-manifest.json",
  "module": "./OrderShipmentPanel"
}
```

Admin загружает:

```text
novaposhta_admin/OrderShipmentPanel
```

Source path в runtime metadata отсутствует.

### 4.2 Два manifest уровня

Используются два независимых manifest:

1. `mf-manifest.json`
   - генерируется Module Federation producer;
   - содержит chunks, CSS assets, exposes и shared packages.

2. `shopana-app.manifest.json`
   - является platform contract;
   - содержит page, modals, extension contributions, permissions и SDK compatibility;
   - валидируется при publish;
   - сохраняется Apps service как immutable App release.

### 4.3 Один React tree

Remote exports React components, а не `mount(element)` lifecycle.

Это позволяет наследовать:

- Ant Design contexts;
- Admin App context;
- theme context;
- CSS-in-JS cache;
- modal context;
- host services context.

Обязательное условие — singleton instances для React и всех context-owning UI packages.

### 4.4 Host adapters вместо импорта Admin internals

SDK context содержит стабильные interfaces:

```ts
interface AdminAppHostServices {
  navigation: AdminAppNavigation;
  modals: AdminAppModals;
  notifications: AdminAppNotifications;
  api: AdminAppApiClient;
  permissions: AdminAppPermissions;
  grid: AdminAppGridRuntime;
}
```

Host передаёт реализации этих interfaces. SDK не импортирует:

- `admin/src/layouts/modals`;
- `admin/src/domains/...`;
- auth store;
- Apollo client internals;
- Next internal hooks.

### 4.5 Global host provider + per-App scope

Нужны два уровня provider:

```text
AdminAppsHostProvider
  └─ global host services and runtime registry

AdminAppScopeProvider
  └─ appCode, release version, permissions, basePath, route
```

`AdminAppScopeProvider` оборачивает каждый remote entry:

- App page;
- extension contribution;
- App-owned modal.

Это гарантирует, что `openAppModal("shipment.create")` автоматически получает owner namespace текущего App.

## 5. Целевая runtime topology

```text
Admin root
│
├─ ApolloProvider
├─ Theme / Antd App / CSS-in-JS cache
├─ AdminAppsHostProvider
│  ├─ ModuleFederationRuntime
│  ├─ AdminAppRuntimeRegistry
│  ├─ CoreModalAdapterRegistry
│  ├─ Admin navigation adapter
│  ├─ Notification adapter
│  └─ API/permission adapters
│
├─ ClientLayoutResolver
│  ├─ AppLayout
│  │  ├─ StoreProvider
│  │  ├─ InstalledAppsRuntimeSync
│  │  ├─ Sidebar
│  │  └─ Core page or AppRuntimePage
│  │
│  └─ ModalStack
│     ├─ Core modal
│     └─ Federated App modal
│        └─ AdminAppScopeProvider
```

`InstalledAppsRuntimeSync` загружает store-specific descriptors после resolution текущего store и синхронизирует global runtime registry.

`ModalStack` остаётся один и продолжает рендериться внутри host Theme и Ant Design `App`.

## 6. Package boundaries

### 6.1 Public package

Создать:

```text
packages/admin-app-sdk/
  package.json
  src/
    index.ts
    app/
      contracts.ts
      context.tsx
      hooks.ts
    page/
      contracts.ts
      app-page-shell.tsx
    extensions/
      contracts.ts
      define-extension.ts
    modals/
      contracts.ts
      context.tsx
      hooks.ts
      modal-layout.tsx
      modal-header.tsx
      core-modal-contracts.ts
    navigation/
      contracts.ts
    notifications/
      contracts.ts
    api/
      contracts.ts
    grid/
      admin-data-grid.tsx
      contracts.ts
    styles/
      contracts.ts
    host/
      host-provider.tsx
      app-scope-provider.tsx
      host-contracts.ts
    manifest/
      schema.ts
      types.ts
```

Package exports:

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./page": "./dist/page/index.js",
    "./modals": "./dist/modals/index.js",
    "./extensions": "./dist/extensions/index.js",
    "./grid": "./dist/grid/index.js",
    "./host": "./dist/host/index.js",
    "./manifest": "./dist/manifest/index.js"
  }
}
```

Apps не должны импортировать `./host`.

### 6.2 Admin host runtime

Создать:

```text
admin/src/apps/
  runtime/
    federation-runtime.ts
    app-runtime-registry.ts
    installed-apps-runtime-sync.tsx
    federated-component.tsx
    federated-page.tsx
    federated-modal.tsx
    federated-extension.tsx
    app-runtime-error-boundary.tsx
  modals/
    core-modal-adapters.ts
    app-modal-registration.ts
    modal-invocation-registry.ts
  extensions/
    app-extension-slot.tsx
    slot-contracts.ts
  page/
    app-runtime-page.tsx
  graphql/
    fragments.ts
    queries.ts
    operation-types.ts
  hooks/
    use-admin-app-descriptors.ts
  register.tsx
  domain.tsx
```

### 6.3 App producer package

Пример:

```text
apps/novaposhta-admin/
  package.json
  module-federation.config.ts
  shopana-app.manifest.ts
  src/
    page.tsx
    modals/
      shipment-create-modal.tsx
    extensions/
      order-shipment-panel.tsx
      create-shipment-action.tsx
```

Конкретное расположение producer source может быть изменено. Runtime contract от этого не зависит.

## 7. App release manifest

### 7.1 Целевой shape

```ts
interface ShopanaAppReleaseManifest {
  schemaVersion: "1";
  code: string;
  version: string;
  displayName: string;
  backend?: {
    pluginCode: string;
    apiVersionRange: string;
  };
  adminUi?: {
    sdkVersionRange: string;
    remote: {
      name: string;
      manifestUrl: string;
    };
    page?: AdminAppPageDeclaration;
    navigation?: AdminAppNavigationDeclaration[];
    modals?: AdminAppModalDeclaration[];
    extensions?: AdminAppExtensionDeclaration[];
    requiredPermissions?: string[];
  };
}
```

### 7.2 Page declaration

```ts
interface AdminAppPageDeclaration {
  module: string;
  defaultPath?: string;
}
```

Пример:

```json
{
  "page": {
    "module": "./Page",
    "defaultPath": ""
  }
}
```

### 7.3 Modal declaration

```ts
interface AdminAppModalDeclaration {
  id: string;
  module: string;
  confirmOnDirtyClose?: boolean;
  closeConfirmMessage?: string;
  requiredPermissions?: string[];
}
```

Пример:

```json
{
  "id": "shipment.create",
  "module": "./ShipmentCreateModal",
  "confirmOnDirtyClose": true,
  "requiredPermissions": ["apps.novaposhta.shipment.create"]
}
```

### 7.4 Extension declaration

```ts
interface AdminAppExtensionDeclaration {
  id: string;
  slot: AdminExtensionPoint;
  module: string;
  priority?: number;
  requiredPermissions?: string[];
  conditions?: Record<string, unknown>;
}
```

### 7.5 Nova Poshta example

```json
{
  "schemaVersion": "1",
  "code": "novaposhta",
  "version": "1.3.0",
  "displayName": "Nova Poshta",
  "adminUi": {
    "sdkVersionRange": "^1.0.0",
    "remote": {
      "name": "novaposhta_admin",
      "manifestUrl": "https://cdn.shopana.io/apps/novaposhta/1.3.0/mf-manifest.json"
    },
    "page": {
      "module": "./Page"
    },
    "navigation": [
      {
        "id": "home",
        "label": "Nova Poshta",
        "path": "",
        "icon": "truck"
      }
    ],
    "modals": [
      {
        "id": "shipment.create",
        "module": "./ShipmentCreateModal",
        "confirmOnDirtyClose": true
      }
    ],
    "extensions": [
      {
        "id": "order-shipment-panel",
        "slot": "orders.details.fulfillment.after",
        "module": "./OrderShipmentPanel",
        "priority": 100
      }
    ]
  }
}
```

## 8. Apps service и discovery

### 8.1 App release storage

Apps service должен хранить immutable release records:

```text
AppRelease
├─ appCode
├─ version
├─ manifestSchemaVersion
├─ releaseManifest
├─ mfManifestUrl
├─ integrity metadata
├─ publishedAt
└─ status
```

Installation должна pin конкретный release:

```text
InstalledApp
├─ storeId
├─ appCode
├─ releaseVersion
├─ enabled
├─ grantedPermissions
└─ configuration
```

`baseURL` backend provider не использовать как UI asset URL.

### 8.2 Admin GraphQL contract

Добавить normalized read model:

```graphql
type AdminAppRemote {
  name: String!
  manifestUrl: String!
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
  requiredPermissions: [String!]!
}

type AdminAppExtension {
  id: String!
  slot: String!
  module: String!
  priority: Int!
  requiredPermissions: [String!]!
  conditions: JSON
}

type AdminAppUiDescriptor {
  appCode: String!
  displayName: String!
  version: String!
  sdkVersionRange: String!
  remote: AdminAppRemote!
  page: AdminAppPage
  navigation: [AdminAppNavigationItem!]!
  modals: [AdminAppModal!]!
  extensions: [AdminAppExtension!]!
  grantedPermissions: [String!]!
}

extend type AppsQuery {
  adminUiApps: [AdminAppUiDescriptor!]!
  adminUiApp(code: String!): AdminAppUiDescriptor
}
```

Resolver возвращает только:

- Apps, установленные в текущем store;
- enabled releases;
- compatible releases;
- contributions, доступные текущему пользователю;
- immutable browser-accessible URLs.

Client-side filtering не является security boundary.

### 8.3 Runtime synchronization

При входе в store:

1. `InstalledAppsRuntimeSync` выполняет `adminUiApps`;
2. валидирует descriptor через SDK Zod schema;
3. проверяет `sdkVersionRange`;
4. регистрирует remotes metadata;
5. регистрирует lazy App modal definitions;
6. строит extension point index;
7. публикует navigation contributions;
8. не загружает JS remote до первого фактического использования.

При смене store:

1. новые descriptors загружаются до активации;
2. App-owned modals предыдущего store закрываются;
3. modal definitions и contributions предыдущего store удаляются по owner key;
4. Module Federation JS cache можно оставить до reload, но registry больше не должен ссылаться на release;
5. sidebar/navigation пересчитываются.

## 9. App page rendering

### 9.1 Canonical route

Зарегистрировать один host route:

```text
/:orgName/:storeName/apps/:appCode{/*appPath}
```

Next и текущий `ModuleRegistry` знают только `AppRuntimePage`.

### 9.2 Page component contract

```ts
interface AdminAppPageProps {
  app: {
    code: string;
    version: string;
  };
  route: {
    basePath: string;
    path: string[];
    searchParams: Record<string, string | string[] | undefined>;
  };
}

type AdminAppPageComponent = ComponentType<AdminAppPageProps>;
```

### 9.3 Render flow

```text
AppRuntimePage
├─ resolve appCode from path
├─ resolve descriptor from runtime registry
├─ installed/enabled/permission checks
├─ loadRemote(remoteName/page.module)
├─ AdminAppScopeProvider
└─ remote Page
```

Page remote является client-only. Initial render показывает host skeleton.

### 9.4 Routing ownership

App не использует Next Router напрямую.

SDK:

```ts
interface AdminAppNavigation {
  navigate(path: string, options?: { replace?: boolean }): void;
  navigateCore(path: string): void;
  back(): void;
}
```

Для App `novaposhta`:

```ts
navigation.navigate("settings");
```

Host переводит это в:

```text
/:orgName/:storeName/apps/novaposhta/settings
```

Запрещены:

- собственный `BrowserRouter`;
- прямое изменение `history`;
- absolute navigation без host adapter.

## 10. Modal SDK

### 10.1 Public modal API

```ts
interface AdminAppModals {
  openApp<
    TPayload extends Record<string, unknown>,
    TResult = void,
  >(
    modalId: string,
    payload: TPayload,
  ): AdminModalHandle<TResult>;

  openCore<TModal extends keyof CoreModalContractMap>(
    modalId: TModal,
    input: CoreModalContractMap[TModal]["input"],
  ): AdminModalHandle<
    CoreModalContractMap[TModal]["result"]
  >;
}

interface AdminModalHandle<TResult> {
  id: string;
  closed: Promise<AdminModalOutcome<TResult>>;
  requestClose(): void;
}

type AdminModalOutcome<TResult> =
  | { status: "resolved"; value: TResult }
  | { status: "cancelled" }
  | { status: "owner-unavailable" };
```

### 10.2 App modal context

Remote App modal:

```ts
interface AdminAppModalContext<TPayload, TResult> {
  id: string;
  payload: TPayload;
  isDirty: boolean;
  setDirty(value: boolean): void;
  updatePayload(value: Partial<TPayload>): void;
  resolve(value: TResult): void;
  cancel(): void;
  forceClose(): void;
}
```

Usage:

```tsx
import {
  AdminModalHeader,
  AdminModalLayout,
  useAdminApp,
  useAdminAppModal,
} from "@shopana/admin-app-sdk";

interface ShipmentCreatePayload {
  orderId: string;
  fulfillmentId: string;
}

interface ShipmentCreateResult {
  shipmentId: string;
}

export default function ShipmentCreateModal() {
  const app = useAdminApp();
  const modal = useAdminAppModal<
    ShipmentCreatePayload,
    ShipmentCreateResult
  >();

  return (
    <AdminModalLayout
      name="novaposhta-shipment-create"
      header={
        <AdminModalHeader
          title="Create Nova Poshta shipment"
          onClose={modal.cancel}
        />
      }
    >
      {/* Form rendered with host Ant Design/theme */}
    </AdminModalLayout>
  );
}
```

### 10.3 Namespacing

Public:

```text
shipment.create
```

Internal registered type:

```text
app:novaposhta@1.3.0:shipment.create
```

App не может:

- открыть modal другого App через `openApp`;
- зарегистрировать `core:*`;
- подменить существующую definition;
- использовать raw internal modal type.

### 10.4 Lazy App modal registration

Descriptor registration создаёт lazy definition:

```text
app:novaposhta@1.3.0:shipment.create
  └─ FederatedModal
      └─ loadRemote("novaposhta_admin/ShipmentCreateModal")
```

Remote module загружается только при первом `openApp`.

### 10.5 Core modal catalog

SDK содержит публичные types, Admin содержит adapters.

Первая версия:

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
    } | null;
  };

  "catalog.variant.picker": {
    input: {
      multiple?: boolean;
      selectedVariantIds?: string[];
    };
    result: {
      variantIds: string[];
    } | null;
  };

  "media.file.picker": {
    input: {
      multiple?: boolean;
      accept?: string[];
    };
    result: {
      fileIds: string[];
    } | null;
  };
}
```

Host adapter:

```text
catalog.product.details
  -> internal "product"
  -> { entityId: productId, mode }
```

Публичный contract не должен повторять текущие internal payload names.

### 10.6 Nested modals

App modal может:

- открыть другую modal того же App;
- открыть разрешённую core modal;
- использовать `AntdApp.useApp().modal.confirm()` для lightweight confirmation.

Все full-screen/domain workflows проходят через общий Modal Stack.

### 10.7 Modal result bridge

Добавить `ModalInvocationRegistry`, keyed by stack UUID:

- хранит deferred result вне Zustand state;
- resolve/cancel вызывается после фактического закрытия;
- очищается при unload App/store/logout;
- не сериализуется;
- гарантирует single settlement.

Modal stack store должен получить owner metadata:

```ts
interface ModalOwner {
  kind: "core" | "app";
  appCode?: string;
  releaseVersion?: string;
}
```

И operations:

```ts
closeByOwner(owner: ModalOwner): void;
removeDefinitionsByOwner(owner: ModalOwner): void;
```

## 11. Theme, Ant Design и CSS-in-JS

### 11.1 Обязательные shared singletons

Host регистрирует actual module instances для:

```text
react
react-dom
react/jsx-runtime
react/jsx-dev-runtime
antd
antd-style
@ant-design/cssinjs
@shopana/admin-app-sdk
ag-grid-community
ag-grid-react
```

При необходимости prefix/subpath sharing должен включать используемые producer imports, например `react-dom/client`.

Producer объявляет эти packages как:

- `peerDependencies`;
- Module Federation `shared`;
- `singleton: true`;
- `import: false` для production remote;
- compatible `requiredVersion`.

Publish validation отклоняет remote, если host-owned UI package попал в remote bundle.

### 11.2 Наследование providers

Remote component рендерится под host:

```text
ThemeProvider
ConfigProvider
Ant Design App
CSS-in-JS StyleProvider/cache
```

Поэтому App может:

```tsx
import { App as AntdApp, Button, Form } from "antd";
import { createStyles } from "antd-style";

const useStyles = createStyles(({ token }) => ({
  panel: {
    background: token.colorBgContainer,
    borderRadius: token.borderRadius,
    padding: token.padding,
  },
}));

function Component() {
  const { message, modal, notification } = AntdApp.useApp();
  const { styles } = useStyles();

  return <Button className={styles.panel}>Action</Button>;
}
```

Этот код должен получить те же instances и tokens, что и core Admin.

### 11.3 Запрещённые App providers

App build rules запрещают:

```tsx
<ConfigProvider />
<AntdApp />
<ThemeProvider />
<StyleProvider />
```

Также запрещены:

- `import "antd/dist/antd.css"`;
- reset CSS;
- global theme overrides;
- собственный CSS-in-JS cache;
- собственный light/dark state;
- изменение `--ant-*` variables на `:root`;
- global selectors для `html`, `body`, `#root`, `.ant-*`.

### 11.4 Разрешённые styles

Разрешены:

- Ant Design component props;
- `createStyles` из shared `antd-style`;
- CSS Modules с локальными selectors;
- host CSS variables;
- SDK layout primitives.

`createGlobalStyle` для Apps запрещён.

### 11.5 Host-owned UI package allowlist

Первая allowlist:

```text
react
react-dom
antd
antd-style
@ant-design/cssinjs
ag-grid-community
ag-grid-react
@shopana/admin-app-sdk
```

Дополнительные packages добавляются централизованно после проверки:

- singleton/context requirements;
- bundle size;
- CSS behavior;
- versioning policy;
- browser security.

Apps не импортируют `admin/src` и не используют `@/*`.

### 11.6 SDK UI primitives

В SDK должны быть доступны стабильные host-style primitives:

```text
AdminAppPageShell
AdminModalLayout
AdminModalHeader
AdminPaper
AdminPaperHeader
AdminEmptyState
AdminErrorState
AdminDataGrid
```

Первый обязательный набор:

- `AdminAppPageShell`;
- `AdminModalLayout`;
- `AdminModalHeader`;
- `AdminDataGrid`.

Core Admin должен использовать те же primitives. Нельзя поддерживать отдельные визуальные реализации для core и Apps.

## 12. AG Grid

### 12.1 Ownership

Admin владеет:

- `ag-grid-community` и `ag-grid-react` versions;
- module registration;
- theme selection;
- dark/light integration;
- locale text;
- global grid defaults;
- enterprise license, если она появится.

App не вызывает `ModuleRegistry.registerModules`.

### 12.2 Public wrapper

```tsx
interface AdminDataGridProps<TRow> {
  rowData: TRow[];
  columnDefs: ColDef<TRow>[];
  loading?: boolean;
  getRowId?: GetRowIdFunc<TRow>;
  onRowClicked?: (row: TRow) => void;
  height?: number | string;
}
```

`AdminDataGrid`:

- подставляет current Admin AG Grid theme;
- использует зарегистрированные host modules;
- применяет standard row height/default column definitions;
- изолирует Apps от изменений способа theme construction;
- оставляет advanced raw AG Grid API за отдельным reviewed escape hatch.

## 13. Extension points в core pages

### 13.1 Public slot catalog

UI extension points не используют существующий backend `platform.slots`.

SDK определяет:

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

### 13.2 Context rules

Slot context:

- передаёт stable IDs и небольшое количество display/condition primitives;
- не передаёт полный generated GraphQL object;
- не передаёт Apollo client;
- не передаёт auth token;
- не становится authorization boundary.

Пример:

```tsx
<AppExtensionSlot
  name="orders.details.fulfillment.after"
  context={{
    orderId: order.id,
    fulfillmentId: fulfillment.id,
    providerCode,
    status: fulfillment.status,
  }}
/>
```

### 13.3 Rendering

Slot:

1. выбирает compatible contributions;
2. применяет permissions и declarative conditions;
3. сортирует по `priority`, затем `appCode`, затем `id`;
4. lazy-loads каждый remote module;
5. оборачивает каждый contribution отдельным error boundary;
6. оборачивает contribution в `AdminAppScopeProvider`;
7. рендерит `null`, если contributions отсутствуют.

Ошибка одного App не скрывает core UI и другие contributions.

## 14. Public SDK usage

### 14.1 App page

```tsx
import { Button, Flex, Typography } from "antd";
import {
  AdminAppPageShell,
  AdminDataGrid,
  useAdminApp,
} from "@shopana/admin-app-sdk";

export default function NovaPoshtaPage() {
  const app = useAdminApp();

  return (
    <AdminAppPageShell
      title="Nova Poshta"
      actions={
        <Button
          type="primary"
          onClick={() =>
            app.modals.openApp("shipment.create", {
              orderId: "...",
              fulfillmentId: "...",
            })
          }
        >
          Create shipment
        </Button>
      }
    >
      <AdminDataGrid
        rowData={[]}
        columnDefs={[]}
      />
    </AdminAppPageShell>
  );
}
```

### 14.2 Open core Product modal

```tsx
const app = useAdminApp();

app.modals.openCore("catalog.product.details", {
  productId,
  mode: "view",
});
```

### 14.3 Product picker

```tsx
const handle = app.modals.openCore("catalog.product.picker", {
  multiple: true,
  selectedProductIds,
});

const outcome = await handle.closed;

if (outcome.status === "resolved" && outcome.value) {
  setProductIds(outcome.value.productIds);
}
```

### 14.4 Notifications

SDK предоставляет adapter:

```ts
app.notifications.success({
  message: "Shipment created",
});
```

Apps также могут использовать `AntdApp.useApp()`, но SDK adapter предпочтителен для telemetry и единообразных defaults.

## 15. API transport

UI SDK не должен отдавать remote App raw auth token.

Первая версия:

```ts
interface AdminAppApiClient {
  query<TResult>(
    operation: string,
    variables?: Record<string, unknown>,
  ): Promise<TResult>;

  mutate<TResult>(
    operation: string,
    variables?: Record<string, unknown>,
  ): Promise<TResult>;
}
```

Host:

- добавляет auth/store context;
- проверяет, что operation разрешён App;
- добавляет `appCode` telemetry;
- нормализует transport errors;
- не предоставляет прямой доступ к Apollo cache.

App-specific generated types могут жить в App producer package, но transport implementation принадлежит Admin.

## 16. Federation shared configuration

### 16.1 Host

Runtime-only host создаёт одну Federation instance:

```text
shopana_admin
```

И регистрирует:

- actual host shared module references;
- dynamic remotes;
- retry/fallback runtime plugins;
- logging/telemetry hooks;
- manifest URL policy.

### 16.2 Producer

Каждый App remote:

- имеет globally unique federation name;
- exposes только manifest-declared modules;
- не exposes Next pages или server modules;
- собирается отдельным Rspack/Rsbuild/Vite producer;
- создаёт immutable versioned output;
- не содержит host-owned UI libraries;
- содержит source maps только согласно deployment policy.

### 16.3 Compatibility

Проверяются:

- App SDK semver range;
- React major/minor contract;
- Ant Design compatibility через SDK release;
- manifest schema version;
- remote expose existence;
- required permissions;
- integrity and allowed origin.

При incompatibility App не загружается и получает deterministic compatibility error UI.

## 17. Failure isolation и lifecycle

Каждый remote boundary имеет состояния:

```text
idle
loading-manifest
loading-module
ready
failed
disabled
incompatible
permission-denied
```

Обязательные механизмы:

- skeleton controlled by host;
- error boundary на page/modal/contribution;
- Retry без reload всей Admin;
- timeout для manifest/module load;
- telemetry с `appCode`, version, module, slot/route/modal ID;
- kill switch через Apps service;
- versioned immutable URLs;
- cleanup App modal definitions и contributions при store switch/uninstall;
- защита от duplicate registration;
- deterministic contribution ordering.

Remote App exception не должна:

- удалять core page;
- ломать ModalStack;
- оставлять unresolved modal promise;
- блокировать другие Apps.

## 18. Security model

Module Federation remote имеет same-page privileges. Поэтому runtime разрешён только trusted Apps, прошедшим publish validation.

Минимальные меры:

- allowlist origins для `manifestUrl`;
- CSP `script-src`/`connect-src` для App asset origins;
- immutable version paths;
- optional integrity metadata;
- manifest signature/hash validation;
- permission-filtered descriptors;
- API operations checked server-side;
- никаких secrets в manifest или props;
- никаких auth tokens в SDK;
- no arbitrary core modal IDs;
- no arbitrary navigation outside allowed Admin routes;
- no arbitrary global CSS.

Недоверенные Apps должны использовать отдельный cross-origin iframe runtime и не входят в этот SDK runtime.

## 19. Build и publish validation

Добавить App UI validator, который проверяет:

1. `shopana-app.manifest.json` по Zod schema;
2. уникальность page/modal/extension IDs;
3. известность extension point names;
4. наличие всех declared exposes в `mf-manifest.json`;
5. отсутствие source paths в release descriptor;
6. compatibility `sdkVersionRange`;
7. отсутствие host-owned packages в emitted chunks;
8. отсутствие запрещённых providers/imports;
9. отсутствие global CSS selectors;
10. versioned asset URLs;
11. remote name uniqueness;
12. permissions format.

App publish должен быть атомарным:

```text
build artifacts
-> validate
-> upload immutable assets
-> persist release manifest
-> mark release publishable
```

Не сохранять release, если upload или validation завершились частично.

## 20. План изменений по файлам

### 20.1 Новый SDK

```text
packages/admin-app-sdk/**
```

### 20.2 Admin root

Изменить:

```text
admin/src/app/layout.tsx
admin/src/registry/client.tsx
admin/src/layouts/app/components/layout/layout.tsx
```

Цель:

- добавить `AdminAppsHostProvider` внутри существующих Theme/Apollo providers;
- добавить store-specific `InstalledAppsRuntimeSync`;
- сохранить один global `ModalStack`.

### 20.3 Modal stack

Изменить:

```text
admin/src/layouts/modals/types.ts
admin/src/layouts/modals/store/modals.ts
admin/src/layouts/modals/registry/modal-registry.ts
admin/src/layouts/modals/components/modal.tsx
```

Добавить:

- owner metadata;
- close reason/result lifecycle;
- owner-scoped cleanup;
- public core modal adapter registry;
- lazy federated definitions.

### 20.4 Theme/UI

Переиспользовать:

```text
admin/src/ui-kit/theme/theme.tsx
admin/src/ui-kit/theme/antd-registry.tsx
admin/src/ui-kit/theme/global-style.tsx
admin/src/shared/hooks/use-ag-grid-theme.ts
```

Не создавать App-specific providers.

Стабильные primitives, необходимые Apps, перенести/выделить в SDK так, чтобы core Admin использовал ту же реализацию.

### 20.5 Apps domain

Добавить:

```text
admin/src/apps/**
admin/src/domains/apps/domain.tsx
admin/src/domains/apps/register.tsx
```

Canonical page route:

```text
/:orgName/:storeName/apps/:appCode{/*appPath}
```

### 20.6 Apps service

Добавить:

- App release model;
- Admin UI manifest schema;
- installed release pin;
- normalized GraphQL descriptors;
- compatibility and permission filtering;
- publish validation integration.

Не перегружать существующий backend `baseURL`.

## 21. Этапы реализации

### Этап 1. Контракты SDK

1. Создать package `@shopana/admin-app-sdk`.
2. Зафиксировать:
   - App identity;
   - page props;
   - host services;
   - modal API;
   - first core modal catalog;
   - extension point map;
   - release manifest schema.
3. Добавить package exports.
4. Подключить SDK к Admin как singleton dependency.

Результат: SDK компилируется, но remote loading ещё не активирован.

### Этап 2. Host provider и Federation runtime

1. Добавить `AdminAppsHostProvider`.
2. Создать runtime-only Module Federation instance.
3. Зарегистрировать actual shared modules.
4. Добавить dynamic remote registry и module cache.
5. Добавить runtime error normalization и telemetry.

Результат: Admin может загрузить вручную заданный sample remote component под текущим Theme.

### Этап 3. App page

1. Добавить Apps domain и generic route.
2. Реализовать `AppRuntimePage`.
3. Реализовать `AdminAppScopeProvider`.
4. Передать route/basePath/navigation adapters.
5. Добавить loading/error/incompatible/disabled UI.

Результат: sample App рендерится на своей canonical page и наследует Admin theme.

### Этап 4. Modal Stack integration

1. Добавить modal owner metadata.
2. Добавить invocation/result registry.
3. Реализовать App modal namespacing.
4. Реализовать lazy federated modal registration.
5. Реализовать `useAdminAppModal`.
6. Добавить core modal adapter registry.
7. Подключить Product details и Product picker.
8. Реализовать owner-scoped cleanup.

Результат: App page открывает свою modal, App modal открывает Product modal/picker, все элементы участвуют в одном nested stack.

### Этап 5. UI ownership

1. Зафиксировать shared singleton allowlist.
2. Добавить producer externalization rules.
3. Выделить `AdminAppPageShell`, `AdminModalLayout`, `AdminModalHeader`.
4. Реализовать `AdminDataGrid`.
5. Добавить App CSS/import validation.
6. Проверить light/dark, notifications, dropdown portals и nested modals.

Результат: Apps не создают свои providers и визуально совпадают с core Admin.

### Этап 6. Extension points

1. Добавить extension registry.
2. Добавить first Orders slot catalog.
3. Вставить slots в Orders list/details/fulfillment/shipping.
4. Добавить isolated lazy rendering.
5. Реализовать Nova Poshta contributions.

Результат: Nova Poshta участвует в стандартной Orders UI без прямых imports.

### Этап 7. Apps service discovery

1. Добавить App release persistence.
2. Добавить manifest publish validation.
3. Добавить installed release pinning.
4. Добавить GraphQL `adminUiApps`/`adminUiApp`.
5. Заменить hardcoded/sample descriptors в Admin.
6. Добавить store switch/uninstall lifecycle.

Результат: Admin узнаёт все remote URLs, pages, modals и contributions только от Apps service.

### Этап 8. Hardening

1. Добавить origin/CSP policy.
2. Добавить integrity metadata.
3. Добавить load timeouts/retries.
4. Добавить telemetry.
5. Добавить App kill switch.
6. Добавить deterministic cleanup при logout/store switch.
7. Добавить publish-time bundle inspection.

## 22. Acceptance criteria

### Page

- Установленный App открывается по `/:org/:store/apps/:appCode`.
- Deep link и browser refresh работают.
- Nested `appPath` работает без собственного App router.
- Uninstalled/disabled/incompatible App не загружает remote JS.

### Theme/UI

- App видит текущий light/dark theme.
- `Button`, `Form`, `Dropdown`, `Select`, `Table` используют core Admin tokens.
- `AntdApp.useApp().message/modal/notification` работает.
- App CSS-in-JS styles используют host tokens/cache.
- В DOM нет второго `ConfigProvider`, `ThemeProvider` или Ant Design `App`.
- В network/bundle нет второй копии React, Ant Design, `antd-style` или AG Grid.

### Modals

- App page открывает App-owned modal.
- App-owned modal наследует Theme и использует общий full-screen stack.
- App-owned modal может открыть core Product modal поверх себя.
- Product picker возвращает typed result.
- Dirty close confirmation работает для App modal.
- Store switch/uninstall закрывает только modals соответствующего App.
- Ошибка remote modal не ломает остальной stack.

### AG Grid

- App использует `AdminDataGrid`.
- Grid переключается между light/dark вместе с Admin.
- App не регистрирует AG Grid modules.
- Host defaults и locale применяются автоматически.

### Extension points

- Nova Poshta component рендерится в Orders slot только для установленного/enabled App.
- Contribution получает только stable context.
- Ошибка contribution не ломает Order modal.
- Contribution ordering deterministic.

### Discovery

- Admin не содержит source paths remote Apps.
- Admin не содержит hardcoded production remote URLs.
- Apps service возвращает immutable versioned manifest URL.
- Все declared page/modal/extension modules существуют в MF manifest.

## 23. Итоговая модель ответственности

| Область | Владелец |
|---|---|
| React root и contexts | Admin |
| Next routes и URL | Admin |
| Module Federation runtime | Admin |
| App source и producer build | App |
| App release manifest | App author, validated/stored by Apps service |
| Installed release selection | Apps service |
| Ant Design provider/theme | Admin |
| CSS-in-JS cache/tokens | Admin |
| AG Grid modules/theme | Admin |
| Modal stack renderer/store | Admin |
| App modal component | App |
| Core modal allowlist/adapters | Admin |
| Extension point names/contracts | Admin Apps SDK |
| Extension contribution implementation | App |
| Auth/store/API enforcement | Admin + backend services |

Целевая формула:

```text
App поставляет только components + declarative manifest.
Admin поставляет runtime + contexts + UI system + modal stack + permissions.
Apps service связывает установленный App release с browser assets.
```
