# План реализации OAuth Applications в IAM на базе Better Auth

## Статус

- **Состояние:** предлагается к реализации
- **Ответственный сервис:** IAM
- **Базовая версия:** `better-auth@1.6.23`
- **OAuth Provider:** `@better-auth/oauth-provider@1.6.23`
- **Основная цель:** реализовать модель OAuth Application, управление правилами доступа и настраиваемые JWT claims средствами Better Auth, не создавая собственный OAuth/OIDC server.
- **Стратегия запуска:** атомарная замена исходного auth-flow и schema baseline в pre-release окружении без пользователей и сохраняемых auth-данных.

## 1. Итоговое архитектурное решение

OAuth/OIDC должен быть реализован официальным плагином `@better-auth/oauth-provider`.

Не использовать deprecated-плагин `oidcProvider` из `better-auth/plugins`: в Better Auth 1.6 он помечен устаревшим и будет удалён в следующем major release.

Не создавать собственные аналоги:

- OAuth Application/Client;
- authorization code;
- access token;
- refresh token;
- consent;
- Client Credentials Flow;
- PKCE;
- JWT issuer;
- JWKS;
- token introspection;
- token revocation;
- OIDC discovery endpoints.

Всем этим управляет Better Auth OAuth Provider.

Shopana реализует только интеграционный слой:

- связь OAuth client с организацией Shopana;
- явное разделение organization-владельца client и organization контекста выданного пользователю токена;
- проверку административных действий через Casbin;
- реестр разрешённых scopes и audiences;
- получение organization/store context;
- application-specific требования к login, которых нет в OAuth Provider;
- безопасные custom claims через callbacks Better Auth;
- проверку JWT и scopes в gateway/subgraphs;
- GraphQL API и Admin UI поверх server API Better Auth;
- аудит security-sensitive операций.

### 1.1 Условия clean cutover

Реализация выполняется в pre-release окружении. Пользователей, accounts, sessions, access/refresh tokens, OAuth clients, grants, consents и Casbin bindings, которые требуется сохранить, нет.

Это schema/auth-flow replacement, а не data migration. Не реализовывать:

- import, conversion или backfill прежних auth-данных;
- dual read/write или compatibility adapters;
- параллельную выдачу legacy и OAuth tokens;
- grace period, purge campaign или runtime-механику отзыва несуществующих legacy sessions/tokens.

Generated Drizzle migration создаёт полную целевую IAM auth schema, включая core Better Auth models, OAuth Provider models и server-controlled session fields. Она может удалить obsolete pre-release auth/OIDC models или columns. Data migration и backfill отсутствуют.

До первой активации удалить legacy issuance/verification source code. Platform clients и актуальные RBAC definitions создаются server-controlled bootstrap. Пользователи, memberships, grants и consents после активации возникают только через новый flow.

Если до cutover появятся данные, которые требуется сохранить, этот план должен быть пересмотрен как отдельный migration plan; текущий документ не разрешает применять clean-slate допущения к непустому окружению.

## 2. Распределение ответственности

### 2.1 Better Auth

Better Auth отвечает за:

- пользователей, accounts и sessions;
- email/password и подключённые identity providers;
- OAuth clients;
- public и confidential clients;
- client secret generation и безопасное хранение;
- Authorization Code Flow;
- обязательный PKCE S256;
- Refresh Token Flow;
- Client Credentials Flow;
- consent;
- JWT access tokens;
- JWT ID tokens;
- scopes и resources/audiences;
- JWKS и ротацию signing keys;
- introspection и revocation;
- OAuth/OIDC discovery metadata;
- OIDC UserInfo и logout;
- rate limiting OAuth endpoints;
- pairwise subject identifiers при необходимости.

### 2.2 Shopana IAM

IAM отвечает за:

- регистрацию OAuth Provider в общей конфигурации Better Auth;
- Drizzle mapping схемы официального плагина;
- выбор поддерживаемых scopes и audiences;
- проверку владельца OAuth client через organization membership;
- server-only привязку каждого client к разрешённым audiences/resources;
- Casbin authorization для CRUD OAuth clients;
- проверку актуального membership при выдаче claims;
- mapping OAuth scopes на Shopana resources/actions;
- application-specific login policy;
- аудит и observability;
- одновременное подключение нового OAuth flow в Admin frontend.

### 2.3 Casbin

Casbin остаётся единственным источником fine-grained authorization.

OAuth scope отвечает на вопрос:

> Что приложение получило право запрашивать от имени пользователя?

Casbin отвечает на вопрос:

> Может ли этот пользователь выполнить конкретное действие над конкретным ресурсом в organization/store domain?

Наличие scope в JWT не заменяет Casbin check.

## 3. Целевая схема взаимодействия

```text
Admin / Storefront / Integration
              │
              ▼
Better Auth OAuth Provider
  ├── OAuth Client
  ├── Authorization Code + PKCE
  ├── Consent
  ├── Access/Refresh Tokens
  ├── JWT + JWKS
  └── Introspection/Revocation
              │
              ▼
Shopana IAM callbacks
  ├── clientReference → ownerOrganizationId
  ├── postLogin.consentReferenceId → authorizationOrganizationId
  ├── getOAuthProviderState → signed/canonical OAuth query
  ├── clientPrivileges → Casbin
  ├── mandatory resource guard
  ├── customAccessTokenClaims
  ├── customIdTokenClaims
  ├── customUserInfoClaims
  └── application login policy
              │
              ▼
Gateway / Subgraphs
  ├── signature / iss / aud / exp
  ├── required scopes
  └── Casbin resource authorization
```

## 4. Зависимости и версии

### 4.1 Обязательные зависимости

IAM должен использовать согласованные версии:

```json
{
  "better-auth": "1.6.23",
  "@better-auth/oauth-provider": "1.6.23"
}
```

Не использовать `latest` без фиксации версии в `package.json`.

### 4.2 Drizzle ORM

Better Auth 1.6.23 ожидает `drizzle-orm ^0.45.2`, тогда как проект сейчас использует `0.45.1`.

Перед подключением OAuth Provider:

1. проверить использование Drizzle во всех workspaces;
2. обновить Drizzle согласованно, без локального несовместимого дубликата;
3. выполнить build затронутых packages/services через `shopana-cli`;
4. не запускать standalone `tsc` или test-команды в рамках текущих правил проекта.

### 4.3 Типизация Better Auth

Сохранить явный публичный тип `createAuth`, добавленный после перехода на Better Auth 1.6. При добавлении OAuth Provider расширить tuple плагинов типом `ReturnType<typeof oauthProvider>`.

## 5. Конфигурация OAuth Provider

Целевая конфигурация должна строиться вокруг официального API:

```typescript
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import {
  getOAuthProviderState,
  oauthProvider,
} from "@better-auth/oauth-provider";

const auth = betterAuth({
  baseURL: config.oauth.publicOrigin,
  basePath: config.oauth.basePath,
  trustedOrigins: config.oauth.trustedOrigins,
  disabledPaths: ["/token"],

  session: {
    additionalFields: {
      activeOrganizationId: {
        type: "string",
        required: false,
        input: false,
      },
      lastStrongAuthenticationAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },

  plugins: [
    jwt({
      jwt: {
        issuer: config.oauth.issuer,
      },
      jwks: {
        keyPairConfig: {
          alg: "EdDSA",
          crv: "Ed25519",
        },
        rotationInterval: 60 * 60 * 24 * 30,
        gracePeriod: 60 * 60 * 24 * 7,
      },
      disableSettingJwtHeader: true,
    }),
    oauthProvider({
      loginPage: config.oauth.ui.signInUrl,
      consentPage: config.oauth.ui.consentUrl,

      validAudiences: [
        "https://admin-api.shopana.io",
        "https://storefront-api.shopana.io",
      ],

      accessTokenExpiresIn: 15 * 60,
      m2mAccessTokenExpiresIn: 10 * 60,
      clientCredentialGrantDefaultScopes: [],

      scopes: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "admin:read",
        "admin:write",
        "storefront:read",
      ],

      storeClientSecret: "hashed",
      storeTokens: "hashed",

      clientReference,
      clientPrivileges,
      postLogin: {
        page: config.oauth.ui.selectOrganizationUrl,
        shouldRedirect: shouldSelectAuthorizationOrganization,
        consentReferenceId: resolveConsentOrganizationId,
      },
      customAccessTokenClaims,
      customIdTokenClaims,
      customUserInfoClaims,
    }),
  ],
});
```

Конкретные URLs и scopes должны поступать из типизированной конфигурации Shopana, а не быть разбросаны строками по сервису.

`bearer()` не входит в целевую конфигурацию: OAuth Provider не требует его, а Better Auth session token не должен приниматься как API bearer. `disabledPaths: ["/token"]` отключает legacy JWT token endpoint, а не `<auth-base>/oauth2/token` Provider.

Автоматическая ротация signing keys JWT plugin по умолчанию не предполагается. `rotationInterval` задаётся явно, а `gracePeriod` должен превышать максимальный access/ID token TTL, допустимый clock skew и JWKS cache window. Clean-slate deployment создаёт новый первоначальный signing key без переноса прежних JWKS.

`loginPage`, `consentPage` и `postLogin.page` должны быть абсолютными внешними URLs Admin frontend из validated configuration. IAM не обслуживает HTML/SPA этих страниц.

JWT plugin должен использовать тот же canonical HTTPS issuer, что и OAuth Provider. Значения вроде `shopana-iam`, внутренний hostname или адрес отдельного pod не являются допустимым production issuer.

### 5.1 HTTP topology OAuth Provider

Для production v1 используется один browser origin с path-based routing. Значения задаются typed config, например:

```text
config.oauth.publicOrigin = https://admin.shopana.io
config.oauth.basePath = /api/auth

/api/auth/<public-allowlist> → IAM Fastify / Better Auth
/api/auth/* otherwise        → 404 до auth.handler
/.well-known/<allowlist>     → IAM Fastify
/graphql                     → Hive Gateway
остальные routes             → Admin frontend
```

Далее `<auth-base>` означает внешний `config.oauth.basePath` (`/api/auth` в примере). Любой Provider path используется только как `<auth-base>/oauth2/...`; root aliases `/oauth2/...` не создаются.

До добавления GraphQL facade IAM должен предоставить HTTP-контур Better Auth:

- смонтировать `auth.handler` в IAM Fastify server;
- направить в него только explicit public allowlist OAuth, session, JWKS и discovery paths согласно установленной версии и `basePath`;
- опубликовать маршруты через конкретный edge/reverse-proxy component без изменения canonical issuer;
- удалить недоверенные client-supplied forwarded headers и выставить `host`, `proto`, client IP и request ID доверенным proxy;
- использовать host-only cookie с `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` и предпочтительно `__Host-` prefix;
- не задавать cookie `Domain` и не включать broad cross-subdomain cookies;
- оставить production browser flow same-origin; dev origins разрешать только точным allowlist;
- не применять GraphQL authentication middleware к OAuth/session/discovery endpoints;
- проверить, что discovery metadata содержит внешние, а не внутренние URLs.

`baseURL`, issuer и endpoint URLs формируются только из `publicOrigin` и явного `basePath`; точным canonical issuer считается значение из discovery metadata. Gateway передаёт `cookie`, `origin`, `user-agent` и request ID только в IAM subgraph для OAuth Application management, но не broadcast-ит session cookie в другие subgraphs.

OAuth endpoints и GraphQL имеют разные middleware chains. Separate-origin production topology в первую версию не входит: она потребовала бы отдельного BFF/cross-origin cookie design и нового security review.

Public route allowlist v1 фиксируется без wildcard:

```text
<auth-base>/sign-up/email
<auth-base>/sign-in/email
<auth-base>/get-session

<auth-base>/oauth2/authorize
<auth-base>/oauth2/token
<auth-base>/oauth2/consent
<auth-base>/oauth2/continue
<auth-base>/oauth2/userinfo
<auth-base>/oauth2/introspect
<auth-base>/oauth2/revoke
<auth-base>/oauth2/public-client
<auth-base>/oauth2/public-client-prelogin

<auth-base>/shopana/organizations
<auth-base>/shopana/organization/bootstrap
<auth-base>/shopana/organization/select
<auth-base>/shopana/logout
<auth-base>/shopana/policy/complete

configured JWKS path
issuer-specific OAuth/OIDC discovery paths
```

Social-provider callback, email verification/reset и `end-session` paths добавляются в allowlist только одновременно с соответствующей реализованной feature; `end-session` дополнительно требует client `enableEndSession` и `id_token_hint` flow. Dynamic registration, client create/get/list/update/delete, secret rotation, admin OAuth endpoints и все неизвестные paths отклоняются до `auth.handler`. Allowlist хранится как version-pinned configuration и пересматривается при upgrade Provider.

Core `/sign-out` наружу не публикуется: он обошёл бы удаление OAuth refresh grants. `<auth-base>/shopana/logout` сначала выполняет lifecycle cleanup, затем вызывает core Better Auth sign-out in-process.

### 5.2 OAuth UI topology

Страницы login, consent и выбора organization принадлежат Admin frontend:

- `config.oauth.ui.signInUrl` ведёт на страницу входа Admin frontend;
- `config.oauth.ui.consentUrl` ведёт на страницу подтверждения scopes;
- `config.oauth.ui.selectOrganizationUrl` ведёт на страницу выбора authorization organization и выполнения дополнительных login requirements.

IAM обслуживает только Better Auth HTTP endpoints, включая authorization, token, consent/continue API, JWKS и discovery. Admin frontend обслуживает HTML, JavaScript и browser navigation для OAuth UI.

Reverse proxy должен маршрутизировать запросы по единому внешнему origin и path без подмены canonical issuer:

- OAuth/Better Auth paths фактического auth base path направляются в IAM Fastify;
- пути страниц из `config.oauth.ui.*` направляются в Admin frontend;
- Admin frontend вызывает consent/continue endpoints с `credentials: "include"` и передаёт только подписанный OAuth Provider параметр `oauth_query`;
- GraphQL authentication middleware не применяется к OAuth protocol endpoints.

Discovery metadata, redirects и cookies проверяются по внешним URLs, а не по внутренним адресам сервисов.

### 5.3 Typed configuration

`ServiceConfigSchema.passthrough()` не является достаточной OAuth validation. IAM добавляет отдельный Zod contract как минимум для:

- `publicOrigin`, `issuer` и `basePath`;
- UI/callback/logout URLs;
- exact trusted/dev origins;
- global audiences и scope registry;
- Admin redirect/post-logout URIs;
- access/M2M token TTL;
- maximum organization clients/list size;
- JWKS rotation/grace;
- cookie name/prefix и proxy trust policy;
- platform client allowlist и server-only allowed resources.

Config validation должна отклонять non-HTTPS production URLs, relative external URLs, wildcard origins/resources и несовпадение configured issuer с discovery issuer.

## 6. OAuth Client как Application

Официальная сущность Better Auth `oauthClient` является искомой сущностью Application.

Она должна использоваться для:

- `client_id`;
- client type/public versus confidential semantics;
- redirect URIs;
- token endpoint authentication method;
- grant types;
- response types;
- registered scopes;
- client metadata;
- client secret;
- consent behavior;
- PKCE requirements;
- end-session settings;
- owner/reference association;
- disabled state.

Не создавать параллельную таблицу `auth_application`.

### 6.1 Владение приложением

Первая версия поддерживает два вида ownership и не поддерживает user-owned clients:

```typescript
type OAuthClientOwnership =
  | { kind: "organization"; ownerOrganizationId: string }
  | { kind: "platform" };
```

Для organization-managed client `oauthClient.reference_id` равен `ownerOrganizationId` и используется только для CRUD ownership. Platform client использует зарезервированный server-controlled reference `platform:shopana`, исключённый из tenant CRUD.

Текущая IAM session не содержит `activeOrganizationId`. До подключения OAuth Provider IAM должен добавить nullable server-controlled additional session field с `input: false` и реализовать custom session HTTP endpoint `activeOrganizationSelect` внутри Better Auth/IAM auth chain. Endpoint использует только действительную session cookie, exact origin/CSRF protection и server-side membership check; bearer token на этом pre-authorization шаге ещё отсутствует. Он не должен принимать membership или organization header как доказательство доступа и очищает поле при удалении membership/organization.

Cookie-only GET endpoint `authorizationOrganizations` возвращает минимальный список `{ id, name }` только из актуальных memberships текущей session user. Он не принимает user/organization filters, не возвращает role/policy graph и использует same-origin/no-store response. Organization-selection UI не обращается за этим списком к bearer-protected GraphQL.

Для первого пользователя clean-slate окружения нужен отдельный pre-authorization onboarding endpoint, поскольку organization-bound token ещё нельзя получить. `organizationBootstrap` работает в той же cookie-only auth chain и:

- доступен только действительной session пользователя без memberships;
- использует exact origin, CSRF protection, Zod input и idempotency key;
- транзакционно создаёт organization, owner membership и обязательные system-role bindings;
- устанавливает `session.activeOrganizationId` server-side;
- публикует audit event и при retry возвращает тот же результат;
- не выдаёт token и не предоставляет site-admin privileges.

После появления хотя бы одного membership обычное создание организаций выполняется целевым авторизованным API, а bootstrap endpoint для этого пользователя закрыт.

После этого для владения приложением использовать встроенный `clientReference`:

```typescript
clientReference: async ({ user, session }) => {
  const organizationId = session?.activeOrganizationId as string | undefined;
  if (!user || !organizationId) {
    throw oauthManagementError("ACTIVE_ORGANIZATION_REQUIRED");
  }

  await assertOrganizationMembership(user.id, organizationId);
  return organizationId;
}
```

Ожидаемые отказы callback оформляются контролируемой Better Auth/API error, а не generic `Error`/500.

Любая tenant create/list/read/update/delete/disable/rotate операция требует действительную session с `activeOrganizationId`, актуальный organization membership и успешную Casbin-проверку. Platform clients не отображаются и не изменяются этим API.

`clientReference` обязан всегда возвращать проверенный `activeOrganizationId` или отклонять операцию. Возврат `undefined` недопустим для Shopana client management, поскольку Better Auth в этом случае может создать user-owned client через `user_id`.

`clientReference` не задаёт tenant context access token. Для user authorization tenant выбирается отдельно через `postLogin.consentReferenceId` и сохраняется как reference consent/authorization. Это значение называется `authorizationOrganizationId`.

Приложение, принадлежащее одной организации, может быть разрешено для работы с другой организацией только если это явно поддерживаемый third-party сценарий и пользователь состоит в целевой организации. Для internal organization-bound clients дополнительно проверять равенство `ownerOrganizationId === authorizationOrganizationId`. Для platform Admin client это равенство неприменимо: client не получает прав владельца в выбранной пользователем организации.

### 6.2 Platform clients

`adminCreateOAuthClient` не используется для deployment bootstrap: в версии `1.6.23` он требует действительную Better Auth session, не принимает заданный `client_id` и использует глобальный `generateClientId()`.

В clean-slate deployment Shopana Admin создаётся idempotent bootstrap seed через узкий IAM OAuth lifecycle repository по точной schema OAuth Provider `1.6.23`. Это разрешённое исключение из общего запрета прямой записи в OAuth tables.

Bootstrap:

- задаёт стабильный `clientId`, `reference_id = platform:shopana`, public-client settings, redirect URIs, scopes, PKCE и timestamps;
- записывает только server-controlled metadata, включая `allowedResources`;
- добавляет созданный ID в `cachedTrustedClients` configuration;
- выполняется до открытия OAuth HTTP routes;
- проверяет существующую запись на полное совпадение и fail-fast при drift.

`cachedTrustedClients` не создаёт client: он только кэширует уже существующую запись и делает её immutable для обычных/admin endpoints. Изменение platform client выполняется deployment configuration + controlled bootstrap/restart, а не tenant GraphQL CRUD.

Startup order фиксирован: apply schema migration → run idempotent platform seed → create Better Auth с `cachedTrustedClients` → открыть listener. Нельзя запускать auth instance с cached ID, для которого ещё нет записи в database.

Consent bypass допускается только для server-controlled platform allowlist. Organization admin не может установить trusted/cached/skip-consent flags или превратить tenant client в platform client.

### 6.3 Public clients

SPA, native и user-agent clients:

- не имеют client secret;
- используют `token_endpoint_auth_method: "none"`;
- обязаны использовать Authorization Code + PKCE S256;
- используют точное совпадение redirect URI с единственным стандартным исключением OAuth Provider для loopback redirect native clients;
- не получают доступ к server-only client metadata.

### 6.4 Confidential clients

Web/server applications:

- имеют client secret;
- используют `client_secret_basic` или разрешённый Better Auth метод;
- хранят secret только в виде hash;
- получают plaintext secret только при создании/ротации;
- поддерживают ограниченный срок жизни secret, если это доступно через OAuth client API.

## 7. Управление приложениями через Better Auth API

GraphQL resolvers не должны напрямую изменять OAuth tables.

Resolvers запускают IAM scripts через `Kernel.runScript`. Scripts выполняют Casbin authorization, вызывают server API Better Auth и публикуют audit events для:

- `createOAuthClient`;
- `getOAuthClient`;
- list OAuth clients;
- update OAuth client;
- delete OAuth client;
- generate/rotate client secret, если поддерживается соответствующим endpoint;
- Shopana-managed disable и bulk lifecycle операций.

Для полей, реально поддерживаемых установленным server API, использовать Better Auth client endpoints. `adminCreateOAuthClient`/`adminUpdateOAuthClient` требуют действительную session, не принимают фиксированный `client_id` и в `1.6.23` не поддерживают `disabled`. Generic Better Auth admin input наружу не передавать.

Узкий audited OAuth lifecycle repository разрешён только для возможностей, отсутствующих в server API `1.6.23`:

- idempotent bootstrap platform client с фиксированным ID;
- server-controlled `metadata.allowedResources` при невозможности безопасно записать его через server API;
- disable/enable lifecycle flag;
- bulk revoke refresh/opaque tokens и cleanup consent/policy state.

Repository version-pinned к schema `1.6.23`, не экспортируется resolver-ам и не превращается в generic table CRUD. Обычные create/read/update/delete/rotate операции по-прежнему проходят через Better Auth API.

GraphQL нужен как Shopana-facing facade для:

- единого admin API;
- federation naming;
- Zod validation на границе Shopana;
- Casbin authorization;
- audit events;
- скрытия restricted Better Auth fields.

Внешний edge не публикует Better Auth client-management endpoints (`create-client`, `update-client`, `delete-client`, list/get и rotate). Они вызываются только как server API из IAM scripts. Публично доступны OAuth protocol/session/discovery endpoints, а Shopana management доступен только через GraphQL facade. Это обеспечивает единые Zod inputs, restricted fields, Casbin и audit.

Better Auth client CRUD требует действительную Better Auth session. После перехода Admin на OAuth access tokens management requests используют одновременно:

- OAuth JWT в `Authorization` для обычной GraphQL authentication;
- secure httpOnly Better Auth session cookie для server API Better Auth.

GraphQL server формирует для `auth.api.*` allowlist исходных session headers текущего запроса: `cookie`, `origin`, `user-agent` и проверенные proxy headers. OAuth `Authorization: Bearer ...` не передаётся как Better Auth session token. Нельзя синтезировать session из `userId`, JWT claims или organization header. Management mutations должны использовать same-site cookie policy и CSRF protection.

### 7.1 Связывание OAuth JWT и Better Auth session

До resolver/script IAM GraphQL boundary создаёт одну проверенную management identity:

```typescript
interface OAuthApplicationManagementIdentity {
  principal: { kind: "user"; id: string };
  sessionId: string;
  clientId: string;
  organizationId: string;
  audience: string[];
  scopes: string[];
}
```

Boundary обязан:

1. проверить bearer JWT официальным resource client;
2. запретить M2M principal для tenant application management первой версии;
3. потребовать management audience и `admin:read`/`admin:write` согласно операции;
4. получить Better Auth session только из исходной secure cookie;
5. потребовать `jwt.userId === session.userId`;
6. потребовать обязательный Admin JWT `sid` и `jwt.sessionId === session.id`;
7. потребовать `jwt.organizationId === session.activeOrganizationId`;
8. повторно проверить актуальный organization membership;
9. передать один `principal`/`sessionId`/`organizationId` в GraphQL policy, script и audit.

`clientPrivileges` независимо повторяет session, membership и Casbin checks как defense in depth, но не выбирает другой tenant. JWT пользователя A с cookie пользователя B, JWT другой session того же пользователя, JWT organization A с active organization B и M2M bearer с browser session всегда отклоняются.

После смены `activeOrganizationId` старый organization-bound access token непригоден для management request. Admin проходит новый Authorization Code flow; refresh старого grant не меняет authorization organization.

### 7.2 GraphQL namespaces

Использовать `oauthApplicationQuery` и `oauthApplicationMutation`, чтобы не конфликтовать с сервисом `apps`.

```graphql
type OAuthApplicationQuery {
  applications: [OAuthApplication!]!

  application(clientId: String!): OAuthApplication
  availableScopes: [OAuthScope!]!
  availableAudiences: [OAuthAudience!]!
}

type OAuthApplicationMutation {
  applicationCreate(
    input: OAuthApplicationCreateInput!
  ): OAuthApplicationCreatePayload!

  applicationUpdate(
    input: OAuthApplicationUpdateInput!
  ): OAuthApplicationUpdatePayload!

  applicationDisable(
    input: OAuthApplicationDisableInput!
  ): OAuthApplicationDisablePayload!

  applicationDelete(
    input: OAuthApplicationDeleteInput!
  ): OAuthApplicationDeletePayload!

  applicationSecretRotate(
    input: OAuthApplicationSecretRotateInput!
  ): OAuthApplicationSecretRotatePayload!
}

```

`OAuthApplication` содержит GraphQL global `id: ID!` и отдельный protocol identifier `clientId: String!`. Mutation inputs принимают `clientId: String!`, а не смешивают OAuth identifier с Relay ID. Тип не возвращает secret hash, raw `reference_id`, `user_id`, private metadata или trusted flags. Plaintext secret существует только в create/rotate payload, возвращается один раз и помечается `Cache-Control: no-store`.

`getOAuthClients` версии `1.6.23` не предоставляет cursor pagination. Первая версия возвращает ограниченный quota список текущей организации без фиктивного Relay connection; pagination добавляется только вместе со стабильным source-level ordering/cursor strategy.

Список приложений всегда определяется текущим `activeOrganizationId` через `clientReference`. Произвольный `organizationId` не принимается как фильтр, чтобы не создавать второй источник tenant context.

Provider errors преобразуются в стабильные Shopana `userErrors { code field message }`. Этап включает IAM schema registration/codegen, federation compose и отдельный Admin codegen. `activeOrganizationSelect` не является OAuth Application GraphQL mutation и не попадает под dual-credential boundary раздела 7.1; его отдельный cookie-only contract описан в разделе 6.1.

### 7.3 Restricted fields

Через organization-level GraphQL API нельзя напрямую задавать:

- trusted/cached client status;
- `skip_consent` для стороннего приложения;
- произвольный issuer;
- непроверенный audience/resource;
- произвольные claims callbacks;
- plaintext storage mode;
- отключение PKCE;
- server-only private metadata.

## 8. Авторизация CRUD через Casbin

Для управления OAuth clients зарегистрировать Shopana resources:

```text
iam.oauth_applications: read | write | admin
iam.oauth_credentials: read | write | admin
iam.oauth_consents: read | write | admin
```

Ресурсы добавляются в статический registry/validators `@shopana/rbac` и в default organization-admin role. Матрица операций фиксируется явно:

| Операция | Resource/action |
| --- | --- |
| list/read application | `iam.oauth_applications/read` |
| create/update application | `iam.oauth_applications/write` |
| disable/delete application | `iam.oauth_applications/admin` |
| create/rotate/revoke secret | `iam.oauth_credentials/admin` |
| revoke consent | `iam.oauth_consents/write` |
| platform/trusted configuration | site-admin + deployment-only |

Проверку встроить в `clientPrivileges`:

```typescript
clientPrivileges: async ({ action, user, session, headers }) => {
  const organizationId = session?.activeOrganizationId;
  if (!organizationId || !user) return false;

  await assertOrganizationMembership(user.id, organizationId);

  const permission = mapClientAction(action);

  return casbin.enforce({
    organizationId,
    principal: { kind: "user", id: user.id },
    domain: "org",
    resource: permission.resource,
    action: permission.action,
  });
}
```

Точный callback не должен зависеть от GraphQL context. Он должен получать IAM dependencies через безопасную service factory/closure.

Проверки GraphQL resolver и `clientPrivileges` должны работать как defense in depth.

### 8.1 Представление principals в Casbin

Целевая Casbin model использует `sub, dom, obj, act`. Casbin policy schema и domain semantics остаются едиными для user и machine principals.

IAM должен расширить программный API `CasbinService`, чтобы он принимал типизированный principal, а не считал любой subject пользователем:

```typescript
export type AuthorizationPrincipal =
  | { kind: "user"; id: string }
  | { kind: "oauth-client"; id: string };

function formatCasbinSubject(principal: AuthorizationPrincipal): string {
  return `${principal.kind}:${principal.id}`;
}
```

Единый formatter должен применяться внутри Casbin boundary во всех операциях:

- `enforce`;
- назначение и удаление ролей;
- добавление и удаление direct policies;
- удаление всех bindings principal;
- audit и cache invalidation.

Для пользователей используется формат `user:{userId}`, для machine clients — `oauth-client:{clientId}`. Поскольку сохраняемых policies нет, старые subjects не мигрируются и не преобразуются; system roles/bindings создаются сразу в целевом формате.

Нельзя передавать заранее отформатированную строку в API, который дополнительно добавляет `user:`. Публичные методы Casbin integration должны принимать общий `AuthorizationPrincipal` и форматировать subject ровно один раз.

Typed principal является общей authorization foundation, а не локальным изменением `CasbinService`. До реализации `clientPrivileges` и resource verification его необходимо протянуть через:

- `@shopana/rbac` `AuthorizeParams`/`AuthProvider`;
- `@shopana/shared-kernel` policy execution;
- `@shopana/type-resolver` type policies;
- `@shopana/shared-context` и IAM `ServiceContext`;
- `iam.getCurrentPrincipal`, `iam.authorize` и batch broker DTO/actions;
- admin contexts/AuthProviders всех subgraphs;
- role/direct-policy operations, audit и authorization cache keys.

Строковый `subject` существует только внутри Casbin boundary после formatter. Site-admin/organization-owner bypass применяется только к `{ kind: "user" }`. Machine principal не проходит через `currentUser`, `isAdmin(userId)`, `isOwner(userId)` или другие user-only методы. Для machine role assignments использовать generic Casbin policy storage; не записывать OAuth client в физически user-specific `user_role`.

## 9. Scopes и Casbin permissions

### 9.1 Реестр scopes

Список поддерживаемых scopes задаётся в server configuration OAuth Provider.

Начальный набор должен быть небольшим и coarse-grained:

```text
openid
profile
email
offline_access
admin:read
admin:write
storefront:read
```

После согласования service boundaries допускается расширение:

```text
catalog:read
catalog:write
orders:read
orders:write
media:write
organization:admin
```

Не генерировать scope для каждого ID ресурса и каждой отдельной Casbin policy.

Каждый M2M client обязан иметь явный непустой набор non-OIDC scopes. `clientCredentialGrantDefaultScopes` задаётся пустым списком, чтобы Client Credentials Flow не наследовал глобальные `openid/profile/email/offline_access` при отсутствии client-specific scopes.

### 9.2 Mapping scopes на authorization requirements

Хранить mapping централизованно в IAM/RBAC package:

```typescript
const SCOPE_REQUIREMENTS = {
  "catalog:read": [
    { resource: "store.products", action: "read" },
  ],
  "catalog:write": [
    { resource: "store.products", action: "write" },
  ],
  "orders:write": [
    { resource: "store.orders", action: "write" },
  ],
} as const;
```

Shared resource-server middleware проверяет signature/issuer/audience/expiration и формирует verified principal. Требуемые scopes задаются operation-level metadata/decorator и проверяются до запуска resolver/script. В business operation дополнительно выполняется обычный Casbin check для фактического resource/domain.

Gateway выполняет внешнюю базовую проверку, но subgraphs не доверяют unsigned organization/user headers: каждый subgraph использует общий verified-token middleware либо подписанный внутренний context contract. Для v1 выбран общий verifier raw bearer JWT в IAM/admin subgraphs с JWKS caching; operation-specific scope и Casbin checks выполняются в фактическом resource service.

### 9.3 Scope expiration

Использовать встроенный `scopeExpirations` для высокорисковых scopes:

```typescript
scopeExpirations: {
  "organization:admin": "5m",
  "orders:write": "5m",
  "catalog:write": "10m",
}
```

Не создавать собственный TokenProfile только ради TTL, уже поддерживаемого OAuth Provider.

## 10. Audiences и JWT access tokens

### 10.1 Valid audiences

Зарегистрировать явный allowlist resources:

```typescript
validAudiences: [
  "https://admin-api.shopana.io",
  "https://storefront-api.shopana.io",
]
```

Production URLs должны поступать из validated service config.

`validAudiences` является только глобальным allowlist Provider. Он не означает, что любой client может получить token для любого Shopana API. Разрешённые конкретному client resources хранятся в server-only `oauthClient.metadata.allowedResources`, которое заполняет только IAM script/bootstrap/lifecycle repository.

### 10.2 Обязательный `resource`

В OAuth Provider `1.6.23` параметр `resource` поддерживается только в `<auth-base>/oauth2/token`, является optional и не хранится в OAuth client, authorization code или refresh token. Shopana делает его обязательным через Better Auth `hooks.before` для каждого:

- authorization-code exchange;
- refresh-token request;
- client-credentials request.

Отсутствующий или неизвестный `resource` отклоняется до выдачи token. Клиент обязан повторно передавать `resource` при каждом refresh. Передавать `resource` в `<auth-base>/oauth2/authorize` не требуется и контрактом `1.6.23` не поддерживается.

Pre-token guard выполняется до Provider side effects: authorization code не потребляется, refresh token не ротируется и новый refresh token не создаётся, пока resource policy не пройдена. Guard извлекает candidate client ID из body/Basic credentials, загружает его server-only metadata и может только отклонить запрос; он не считает client аутентифицированным и не выдаёт claims.

После guard Provider сам аутентифицирует client, связывает code/refresh token с ним и выбирает JWT branch. `customAccessTokenClaims` повторно проверяет тот же shared `assertClientResourceAllowed(resource, metadata.allowedResources)` уже на metadata аутентифицированного Provider client. Таким образом подмена body `client_id` не может расширить доступ, а policy failure не оставляет rotated/consumed credentials.

Missing/forbidden resource возвращает контролируемую OAuth/API error (`invalid_target` либо согласованный стабильный code), а не generic 500. Guard является middleware вокруг official token endpoint, но не собственным token endpoint.

Opaque access tokens в Shopana flows не выпускаются и Shopana API их не принимают. Если позднее понадобится opaque-token flow, он требует отдельного architecture decision и обязательной introspection.

Resource servers Shopana должны:

- принимать только JWT access tokens;
- отклонять opaque tokens;
- проверять signature;
- проверять `iss`;
- проверять `aud`;
- проверять `exp` и `nbf`;
- требовать нужные scopes;
- проверять `azp`/client identity, когда это необходимо.

### 10.3 Resource client

Использовать официальный `oauthProviderResourceClient` или `verifyAccessToken` из поддерживаемого Better Auth OAuth API.

Не поддерживать собственный parser, который знает только один глобальный `JWT_AUDIENCE`.

`UserRepository.parseJwt()` удалить. Все consumers должны проверять access token через официальный resource client.

## 11. Custom JWT claims

### 11.1 Access token claims

Использовать официальный callback:

```typescript
customAccessTokenClaims: async ({
  user,
  scopes,
  referenceId,
  resource,
  metadata,
}) => {
  assertClientResourceAllowed(resource, metadata?.allowedResources);

  if (!user) {
    // M2M identity is represented by the provider-managed `azp` claim.
    // Tenant context is resolved by the resource server from verified `azp`.
    return {};
  }

  if (requiresOrganizationContext(scopes) && !referenceId) {
    throw oauthTokenError("organization_context_required");
  }
  if (referenceId) {
    await assertOrganizationMembership(user.id, referenceId);
  }

  return {
    ...(referenceId
      ? {
          "https://shopana.io/claims/org_id": referenceId,
          "https://shopana.io/claims/roles": await loadBoundedRoles(
            user.id,
            referenceId,
          ),
        }
      : {}),
  };
}
```

Callback access-token claims отклоняет выпуск токена, если:

- пользователь больше не состоит в организации;
- organization удалена или недоступна;
- обязательный organization context отсутствует.

Все ожидаемые resource/membership/organization denials преобразуются в стабильные OAuth/API errors. Generic `Error` в authorize/token callbacks запрещён, чтобы policy denial не превращался в необъяснимый HTTP 500.

Claims callback не получает `clientId` отдельным аргументом. Per-client login policy исполняется в `postLogin` через `getOAuthProviderState()` и server-side completion state; claims callback отвечает за client resource allowlist и актуальность membership/organization при issuance/refresh.

Здесь `referenceId` является `authorizationOrganizationId`, установленным через `postLogin.consentReferenceId`, а не `oauthClient.reference_id` владельца приложения.

Для `client_credentials` callback не получает consent reference и не должен самостоятельно придумывать organization claim. Стандартный claim `azp` устанавливается OAuth Provider. Resource server использует проверенный `azp` для получения `oauthClient.reference_id` через IAM и построения machine principal.

### 11.2 ID token claims

Использовать `customIdTokenClaims` только для identity/session данных, нужных OAuth client:

```typescript
customIdTokenClaims: async ({ user, scopes, metadata }) => ({
  locale: await resolveUserLocale(user.id),
});
```

Fine-grained permissions не помещать в ID token.

### 11.3 UserInfo claims

Использовать `customUserInfoClaims` для claims, доступных через `<auth-base>/oauth2/userinfo` согласно выданным scopes.

Не возвращать email/profile без соответствующего scope.

### 11.4 Зарезервированные claims

Не переопределять claims, которыми управляет OAuth Provider:

```text
sub iss aud exp iat nbf sid scope azp jti
```

Custom claims должны быть namespaced:

```text
https://shopana.io/claims/org_id
https://shopana.io/claims/store_id
https://shopana.io/claims/roles
https://shopana.io/claims/policy_version
```

### 11.5 Правила безопасности claims

- Claims формируются только server-side callbacks.
- Organization admin не может загружать JavaScript или шаблон кода.
- Не передавать client secret, provider tokens, password data и лишние PII.
- Ограничить количество roles и общий размер JWT.
- Не помещать полный Casbin policy graph в токен.
- Не считать roles/permissions в JWT источником истины для критических операций.
- Все дополнительные claims объявить в `advertisedMetadata.claims_supported`.

В `1.6.23` `advertisedMetadata.claims_supported` заменяет, а не дополняет built-in список. Конфигурация должна перечислять стандартные OIDC claims и Shopana custom claims вместе.

## 12. Application-specific login policy

OAuth Provider не является полноценным движком правил login на уровне каждого client. Для этой части допускается небольшой Shopana extension.

### 12.1 Companion policy table

Tables создаются пустыми в clean target schema baseline, чтобы activation не требовал второй schema mode. GraphQL fields и enforcement включаются только одновременно с реально исполняемыми настройками:

```text
iam.oauth_client_policy
  client_id
  require_email_verification
  max_authentication_age
  policy_version
  updated_at

iam.oauth_authorization_policy_state
  id
  session_id
  client_id
  authorization_request_hash
  authorization_organization_id
  policy_version
  completed_at
  consumed_at
  expires_at
```

Не дублировать в ней redirect URIs, scopes, audiences, client secrets, grants, tokens или consent.

`client_id` логически ссылается на Better Auth `oauthClient`.

`allowed_identity_providers` не входит в первый schema/API, пока IAM не хранит и не проверяет server-verified authentication method. Поле добавляется только одновременно с реальным enforcement.

### 12.2 Enforcement

Policy должна проверяться в реальном flow:

1. OAuth Provider выполняет login и передаёт только подписанный `oauth_query`;
2. `postLogin` callbacks получают client не аргументом: они вызывают async request-local `getOAuthProviderState()`, разбирают `client_id` из `state.query` и повторно загружают client из official adapter; callbacks выполняются после Provider validation исходного authorization request;
3. IAM загружает официальный `oauthClient` и `oauth_client_policy`, выбирает organization и создаёт короткоживущий one-time completion record, связанный с session, client, hash authorization request, organization и policy version;
4. IAM completion endpoint работает внутри Better Auth request pipeline, принимает подписанный `oauth_query` и действительную session; Provider hook сначала проверяет подпись и заполняет `getOAuthProviderState()`, после чего endpoint повторно загружает client и сверяет hash canonical query;
5. endpoint проверяет email verification, `lastStrongAuthenticationAt`, membership и другие реально поддержанные требования, затем отмечает record completed;
6. `postLogin.shouldRedirect` разрешает продолжение только при совпадающем completed record; прямой `<auth-base>/oauth2/continue` без выполненной policy снова приводит к redirect/controlled reject;
7. `postLogin.consentReferenceId` через тот же validated client проверяет membership и для organization-bound internal client равенство `ownerOrganizationId === authorizationOrganizationId`;
8. UI вызывает официальный `oauth2Continue({ postLogin: true, oauth_query })`; record одноразово потребляется и истекает вместе с authorization request;
9. при issuance/refresh `customAccessTokenClaims` повторно проверяет актуальные membership, organization и allowed resource.

Нельзя читать `client_id` или organization из неподписанных query parameters и нельзя считать UI redirect доказательством выполнения policy. Для `max_authentication_age` использовать server-controlled `session.lastStrongAuthenticationAt`, обновляемый только успешным sign-in/reauth flow.

Изменение policy требует bulk revoke связанных refresh tokens/consents через lifecycle repository и нового authorization flow. Уже выпущенные JWT не имеют server-side deny state и действуют не дольше короткого `exp`; критические операции могут проверять `policyVersion` online.

Не добавлять в GraphQL настройки, которые login flow пока не умеет исполнять.

## 13. Machine-to-machine applications

Использовать встроенный Client Credentials Flow.

Для machine client:

- нужен confidential OAuth client;
- user отсутствует;
- `customAccessTokenClaims` должен корректно обрабатывать `user === undefined`;
- client identity берётся из Better Auth token contract;
- scopes являются явными, непустыми, client-specific и не содержат OIDC user scopes;
- OAuth Provider добавляет проверенный `azp = clientId`;
- resource server получает owner organization client по `azp` через IAM registry/cache;
- Casbin проверяет типизированный OAuth-client principal через целевую Casbin model;
- интерактивная session и consent не используются.

В `client_credentials` OAuth Provider `1.6.23` устанавливает `azp = clientId`, но не устанавливает `sub`, поскольку user отсутствует.

Для OAuth client использовать стабильное внутреннее представление Casbin subject:

```text
oauth-client:{clientId}
```

`oauth-client:{clientId}` не является JWT claim. Его формирует resource server только после проверки JWT и строкового `azp`. Для user и machine principals используется одна целевая Casbin model, matcher, domain layout и policy schema.

Resource server строит principal только после проверки JWT и получения `clientId` из проверенного `azp`:

```typescript
const principal: AuthorizationPrincipal = {
  kind: "oauth-client",
  id: verifiedToken.azp,
};
```

Нельзя использовать для M2M `user:{clientId}` или передавать `oauth-client:{clientId}` как значение `userId` в user-only методы.

Для M2M необходимо реализовать lifecycle authorization policies:

- назначение client разрешённых ролей/permissions в его organization/domain;
- отдельные GraphQL operations или application role assignment для управления этими grants;
- запрет выдачи grants за пределами `oauthClient.reference_id`;
- удаление или деактивацию grouping/policy bindings при disable/delete client;
- audit каждого изменения machine permissions;
- cache invalidation при изменении client или Casbin policy.

Owner organization разрешается только для существующего, не удалённого organization. Удаление organization должно disable/delete принадлежащие ему clients, отозвать refresh/opaque tokens и consent, удалить machine bindings и очистить caches. Состояние suspension не обещается, пока его нет в organization model.

Наличие OAuth scope ограничивает верхнюю границу запрашиваемых действий, но не создаёт Casbin policy автоматически.

Не создавать собственный endpoint Client Credentials Flow.

## 14. Consent, introspection и revocation

Использовать официальные OAuth Provider endpoints.

### Consent

- Consent page реализуется в Admin frontend.
- UI показывает имя клиента, owner/reference и запрошенные scopes.
- Trusted first-party clients могут пропускать consent только через server-controlled config.
- Пользователь может отозвать consent через IAM API/UI.

### Introspection

- Shopana API не использует opaque tokens в первой версии.
- Endpoint сохраняется как protocol capability Provider, но не заменяет локальную JWT verification.
- Ограничить доступ к introspection согласно возможностям OAuth Provider.

### Revocation

- Официальный `<auth-base>/oauth2/revoke` использовать для client-initiated отзыва одного известного plaintext token confidential client-ом.
- В `1.6.23` этот endpoint требует client secret и не подходит public Admin client с `token_endpoint_auth_method: none`.
- Admin использует custom cookie/session-authenticated `adminLogout` endpoint: exact origin + CSRF, удаление всех `oauthRefreshToken` для `(clientId = shopana-admin, userId = session.userId, sessionId = session.id)` до core Better Auth sign-out в одной lifecycle operation. Plaintext token не требуется, поэтому logout отзывает и refresh tokens, потерянные браузером после reload.
- Endpoint не выполняет bulk revoke по `clientId`; revocation JWT access token не создаёт server-side deny state.
- При disable/delete client, изменении login policy или отзыве consent IAM lifecycle repository транзакционно блокирует новые grants, удаляет/помечает revoked связанные `oauthRefreshToken`, удаляет opaque token rows, consent и policy-completion records, а также очищает Casbin bindings/caches.
- Для JWT, выпущенных новым OAuth Provider, использовать явно настроенный TTL: 15 минут для user access token и 10 минут для M2M, с меньшим TTL для high-risk scopes.
- Уже выпущенные JWT действуют до `exp`; критические операции могут дополнительно проверять client/grant/policy version online.

## 15. Database schema и migrations

### 15.1 Source of truth

Provider-owned schema определяется `better-auth@1.6.23` и `@better-auth/oauth-provider@1.6.23`, а не проектируется вручную по аналогии с Auth0.

Target baseline включает:

- core `user`, `account`, `session`, `verification`, `jwks` models, необходимые новой конфигурации;
- `oauthClient`;
- `oauthAccessToken`;
- `oauthRefreshToken`;
- `oauthConsent`;
- дополнительные verification/authorization данные плагина.
- nullable `session.activeOrganizationId` и `session.lastStrongAuthenticationAt`;
- Shopana companion tables `oauth_client_policy` и `oauth_authorization_policy_state`.

Точный список provider fields брать из установленной версии `1.6.23`. Companion tables содержат только Shopana policy/lifecycle state и не дублируют OAuth clients, codes, tokens, scopes или consent.

`activeOrganizationId` и `lastStrongAuthenticationAt` объявляются в Better Auth `session.additionalFields` с `input: false`. Клиент не может изменить их через generic session update. `activeOrganizationId` меняет только Shopana operation после membership check; при удалении membership/organization значение очищается. FK `ON DELETE SET NULL` используется, если он совместим с adapter mapping, но не заменяет runtime membership/deleted check.

### 15.2 Интеграция с текущим Drizzle adapter

Так как IAM явно передаёт Drizzle schema в `drizzleAdapter`, необходимо:

1. получить schema core Better Auth и OAuth Provider для `1.6.23`;
2. добавить эквивалентные Drizzle models в IAM без изменения семантики provider fields;
3. добавить server-controlled session fields и Shopana companion tables;
4. передать models в adapter под точными ожидаемыми model names;
5. удалить obsolete pre-release legacy auth/OIDC models, не нужные target runtime;
6. сгенерировать единую baseline migration через `shopana-cli`;
7. не редактировать generated migration metadata вручную;
8. не реализовывать data conversion/backfill: целевые окружения пусты.

Критерий schema baseline: fresh database поднимается непосредственно в target schema, adapter видит все обязательные model names, server-only session fields нельзя записать client input-ом, legacy tables/models не нужны для startup.

### 15.3 Хранение secrets/tokens

- `storeClientSecret: "hashed"`.
- `storeTokens: "hashed"`.
- Plaintext secret возвращается только при создании/ротации.
- GraphQL response с secret не кэшируется.
- Secrets и tokens не попадают в logs/events.

## 16. Подключение OAuth-аутентификации Admin

Admin должен использовать только стандартный OAuth flow. GraphQL `signIn`, GraphQL `tokenRefresh` и Better Auth session token как refresh token не входят в целевую реализацию.

### 16.1 Создание first-party client

Idempotent bootstrap lifecycle repository создаёт platform trusted public client до открытия OAuth routes:

```text
name: Shopana Admin
client_id: shopana-admin
reference_id: platform:shopana
token_endpoint_auth_method: none
grant_types: authorization_code, refresh_token
require_pkce: true
scopes: openid profile email offline_access admin:read admin:write
server-only metadata.allowedResources:
  - https://admin-api.shopana.io
cachedTrustedClient: true
skipConsent: true
enable_end_session: false
```

`resource` не является полем OAuth client в `1.6.23`. Admin передаёт его только при code exchange и каждом refresh request. Redirect URIs и post-logout URIs задаются exact allowlist deployment configuration.

### 16.2 Новый frontend flow

Admin реализует обязательные routes:

```text
/oauth/start
/sign-in
/sign-up
/oauth/select-organization
/oauth/consent
/oauth/callback
/oauth/error
/logout
```

Clean-slate v1 использует Better Auth email/password self-registration для создания первого account/session, после чего `organizationBootstrap` создаёт initial organization/owner membership. Если product решит перейти на invite-only registration, до activation должен появиться отдельный invite provisioning contract; молчаливое отключение `/sign-up` нарушит onboarding flow этого плана.

Flow:

1. `/oauth/start` генерирует одноразовые `state`, `nonce`, PKCE verifier/challenge S256 и проверяет return path по allowlist.
2. `state`, `nonce`, verifier и return path хранятся в `sessionStorage`, не в URL или `localStorage`.
3. Admin открывает `<auth-base>/oauth2/authorize`. Если session отсутствует, Better Auth переводит на login page с подписанным `oauth_query`.
4. Sign-in/sign-up вызывают Better Auth HTTP API с `credentials: "include"`; session cookie устанавливается браузеру напрямую, после чего продолжается исходный authorization request.
5. Organization page получает minimal memberships через cookie-only `authorizationOrganizations` и вызывает `activeOrganizationSelect`; consent/policy pages используют только signed Provider state.
6. Callback проверяет одноразовый `state`, обменивает code с PKCE verifier и `resource=https://admin-api.shopana.io`, проверяет OIDC nonce и очищает временные значения.
7. JWT access token и OAuth refresh token хранятся только в памяти. Они не записываются в `localStorage`, IndexedDB или обычную cookie. После reload Admin начинает новый authorize flow, который использует существующую httpOnly Better Auth session.
8. Во время жизни вкладки refresh использует стандартный OAuth grant и каждый раз передаёт тот же `resource`. При `invalid_grant` локальные tokens очищаются и запускается новый authorize flow.
9. Все GraphQL transports, включая upload, используют bearer access token и same-origin `credentials: "include"`; IAM связывает token с session по правилам раздела 7.1.
10. Logout вызывает cookie/session-authenticated `adminLogout`, который удаляет все session-bound Admin refresh grants через lifecycle repository и завершает core Better Auth session. Admin v1 не использует Provider end-session и не требует `id_token_hint`; redirect допускается только из allowlist.

Если потребуется долговечное token storage, устойчивое к reload без повторного authorize, это отдельный BFF design. Persistent browser refresh token в scope первой версии не входит.

### 16.3 Правила clean cutover

Cutover является атомарной заменой source code и schema baseline. Production data migration не выполняется, потому что данных и пользователей нет. Development database при необходимости пересоздаётся из актуальных generated migrations.

В одном activation change:

1. поднять fresh target schema и выполнить platform Admin bootstrap;
2. включить OAuth HTTP routes, frontend PKCE flow и official resource verification;
3. удалить GraphQL `signIn`, `signUp`, `signOut`, `tokenRefresh`, их schema/resolvers/scripts/hooks и generated documents;
4. удалить session-token-as-refresh, fallback приёма Better Auth session token как API bearer и legacy token-prefix logging;
5. удалить локальный JWT parser, legacy `definePayload`, `bearer()` и старый issuer/audience contract;
6. заменить user-only `getCurrentUser`/shared context новым verified-principal contract;
7. удалить Admin Apollo refresh loop и access/refresh/session token `localStorage`;
8. не добавлять import/backfill/compatibility code для несуществующих auth-данных.

Core Better Auth `user`, `account`, `session`, `verification` и `jwks` сохраняются, поскольку нужны новому flow. Удаляются только obsolete source/schema elements. Старые и новые issuance/verification paths не сосуществуют ни в одном активируемом deployment.

## 17. Request context и resource server authorization

После проверки access token context должен содержать:

```typescript
interface AuthenticatedPrincipal {
  tokenSubject: string | null;
  authorizationPrincipal: AuthorizationPrincipal;
  userId: string | null;
  clientId: string;
  sessionId: string | null;
  organizationId: string | null;
  storeId: string | null;
  audience: string[];
  scopes: string[];
  tokenId: string | null;
}
```

Для user token `organizationId` берётся только из проверенного namespaced claim, основанного на `postLogin.consentReferenceId`.

Для user token `authorizationPrincipal` равен `{ kind: "user", id: userId }`.

Для M2M token `tokenSubject`, `userId` и `sessionId` равны `null`, `clientId` берётся из проверенного `azp`, `authorizationPrincipal` равен `{ kind: "oauth-client", id: clientId }`, а `organizationId` разрешается IAM по `oauthClient.reference_id`. Результат можно кратковременно кэшировать с обязательной invalidation при disable/delete client. Не пытаться добавлять machine `sub` через custom claims.

`tokenSubject` сохраняет исходный проверенный OAuth/JWT `sub`, если claim присутствует, и не используется как готовая строка Casbin subject. Casbin subject всегда формируется из `authorizationPrincipal` единым formatter из раздела 8.1.

Middleware должен использовать проверенный JWT payload, а не доверять headers с organization/store IDs.

Organization/store header может только выбрать context, после чего IAM/service проверяет соответствие token claims, membership и Casbin policy.

## 18. Аудит и observability

Публиковать security events для:

- OAuth client created/updated/disabled/deleted;
- client secret created/rotated/revoked;
- authorization approved/denied;
- consent granted/revoked;
- token issued/refreshed/revoked;
- Client Credentials authentication;
- invalid redirect URI;
- invalid audience/resource;
- rejected scope;
- application login policy failure;
- organization membership failure;
- JWT verification failure.

Логировать только безопасные identifiers:

- request ID;
- `client_id`;
- organization ID;
- user/service subject;
- grant type;
- scopes;
- audience;
- result/error code.

Не логировать authorization code, client secret, access token, refresh token или session token.

## 19. Этапы реализации

### Этап 0 — Architecture и contracts

- Зафиксировать single-origin edge topology, canonical issuer/basePath и конкретный edge component/config file.
- Зафиксировать публичные OAuth/session/discovery и закрытые management paths.
- Зафиксировать cookie/header forwarding только в IAM subgraph.
- Зафиксировать platform/organization ownership и bootstrap contract.
- Зафиксировать GraphQL types, management JWT/session binding и место scope enforcement.
- Проверить фактические options/callbacks/models `1.6.23`, включая `getOAuthProviderState`, resource behavior и ограничения admin APIs.

**Критерий завершения:** каждый внешний URL, path, cookie, header, client owner и authorization boundary имеет один документированный contract без альтернативной production topology.

### Этап 1 — Dependencies, typed config и target schema baseline

- Зафиксировать `better-auth@1.6.23` и добавить `@better-auth/oauth-provider@1.6.23`.
- Согласовать Drizzle ORM с peer requirements Better Auth во всех затронутых workspaces.
- Добавить строгий IAM OAuth Zod config.
- Добавить core/Provider models, server-controlled session fields и companion policy/state tables.
- Удалить obsolete pre-release auth/OIDC models.
- Сгенерировать одну clean-slate migration через `shopana-cli`, без data conversion/backfill.
- Выполнить build затронутых packages/IAM через `shopana-cli`.

**Критерий завершения:** fresh database поднимается непосредственно в target schema, а IAM собирается без Better Auth/Drizzle incompatibility.

### Этап 2 — Typed authorization principal и RBAC foundation

- Ввести общий `AuthorizationPrincipal` для user и OAuth client.
- Протянуть его через RBAC, shared kernel/context, type policies, broker DTO/actions и subgraph AuthProviders.
- Перевести `CasbinService` и role/direct-policy operations на единый formatter.
- Ограничить user-only owner/site-admin bypass типом user principal.
- Зарегистрировать OAuth IAM resources, validators, operation matrix и default organization-admin grants.

**Критерий завершения:** user principal работает через новый contract, machine principal представим end-to-end без `user:{clientId}` и без изменения Casbin model.

### Этап 3 — IAM HTTP Provider и edge

- Смонтировать Better Auth handler в IAM Fastify с отдельными OAuth/session/discovery middleware chains.
- Реализовать lifecycle repository и выполнить idempotent seed platform Admin client до `createAuth`/listener; UI и external activation пока остаются закрыты.
- Настроить path routing, trusted proxy, host-only cookie, CSRF/origin policy и route allowlist.
- Подключить OAuth Provider без external client registration и без публичных management endpoints.
- Настроить hashed storage, explicit JWKS rotation, discovery и audit middleware/hooks.
- Добавить минимальные Better Auth HTTP sign-in/sign-up/session operations, необходимые будущему UI.

**Критерий завершения:** discovery/JWKS публикуют canonical external URLs, Better Auth HTTP session cookie создаётся по same-origin policy, UI redirect URLs валидны. Полный consent/callback UI на этом этапе не требуется.

### Этап 4 — Tenant integration, claims и resource verification

- Реализовать cookie-only `organizationBootstrap`, `authorizationOrganizations`, `activeOrganizationSelect`, затем `clientReference` и platform ownership rules.
- Реализовать `postLogin`/`consentReferenceId` через `getOAuthProviderState()`.
- Реализовать `clientPrivileges` через новый typed Casbin API.
- Добавить lifecycle hooks до Admin activation: member removal очищает matching `session.activeOrganizationId`; organization deletion disable/delete все owned clients, отзывает refresh/consent/policy state и очищает sessions/caches.
- Добавить mandatory-resource hook и server-only client `allowedResources`.
- Реализовать access/ID/UserInfo claims и полный `claims_supported`.
- Внедрить официальный resource verifier, audience/scope enforcement и verified request context в gateway/subgraphs.
- Использовать audited lifecycle repository для неподдерживаемых Provider операций и добавить audit hooks.

**Критерий завершения:** owner и authorization organization разделены; удаление membership/organization закрывает session/client access; Shopana API принимает только Provider JWT с разрешённым client resource и исполняет scopes/Casbin.

### Этап 5 — GraphQL Application management

- Добавить финальный OAuth Application GraphQL contract.
- Реализовать IAM scripts как facade над Better Auth API и узким lifecycle repository.
- Реализовать binding OAuth JWT + Better Auth cookie session.
- Скрыть restricted fields и закрыть внешние Better Auth management endpoints.
- Добавить one-time secret payload, stable `userErrors`, quota list и audit events.
- Выполнить IAM codegen, federation compose и Admin codegen/build.

**Критерий завершения:** organization-scoped CRUD доступен только через совпадающие session/JWT tenant identity и Casbin; platform clients исключены из tenant API.

### Этап 6 — Admin OAuth UI и atomic source cutover

- Активировать заранее созданный platform Admin client из cached trusted allowlist и проверить deployment drift.
- Реализовать OAuth start/sign-in/sign-up/organization/consent/callback/error/logout routes.
- Реализовать PKCE, state, nonce, code exchange и in-memory refresh flow с обязательным `resource`.
- Перевести AuthGuard, Apollo и upload transport на OAuth bearer + same-origin credentials.
- Открыть OAuth routes и удалить полный legacy source inventory из раздела 16.3 в том же activation change.
- При необходимости пересоздать disposable development database; не мигрировать несуществующие auth-данные.
- Выполнить IAM, federation и Admin builds через проектные команды.

**Критерий завершения:** fresh account/session проходит OAuth authorize → Admin callback → GraphQL request; в source/runtime нет legacy issuance, parser, session-token-as-refresh или dual verification.

### Этап 7 — Application login policy

- Включить только реально исполняемые поля `oauth_client_policy`.
- Реализовать `getOAuthProviderState()` + one-time policy-completion state.
- Добавить email verification/recent-auth enforcement.
- При изменении policy выполнять bulk refresh/consent cleanup и требовать новый authorization flow.

**Критерий завершения:** UI невозможно обойти прямым `oauth2Continue`, а изменение policy реально меняет login behavior.

### Этап 8 — M2M и external clients

- Включить Client Credentials Flow только с explicit non-OIDC scopes и mandatory resource.
- Реализовать назначение/отзыв Casbin roles/policies для OAuth-client principal.
- Разрешать organization только по проверенному `azp` и активному owner client/organization.
- Добавить third-party consent, client disable/revocation UI и расширить уже существующий lifecycle cleanup удалением machine Casbin bindings.
- Добавить rate-limit/abuse monitoring.

**Критерий завершения:** machine и third-party clients используют стандартные OAuth flows; M2M JWT идентифицируется через `azp`, а Casbin subject формируется только внутри authorization boundary.

Этапы 1–5 являются implementation changes, но не отдельными production modes. До атомарной активации этапа 6 OAuth issuance и legacy flow не публикуются параллельно.

## 20. Сценарии проверки

При реализации должны быть предусмотрены сценарии:

- public client не имеет client secret;
- confidential client secret хранится как hash;
- redirect URI проверяется точно, кроме поддерживаемого OAuth Provider loopback-исключения для native client;
- Authorization Code Flow требует PKCE S256;
- token request без `resource`, включая refresh, отклоняется до opaque issuance;
- неизвестный resource и resource вне client `metadata.allowedResources` отклоняются;
- JWT получает корректный `aud`;
- resource server отклоняет opaque token;
- незарегистрированный scope отклоняется;
- high-risk scope сокращает TTL;
- organization admin не видит clients другой организации;
- organization admin не видит/не изменяет platform client;
- первый session-authenticated пользователь без memberships атомарно создаёт organization/owner membership через onboarding endpoint и продолжает OAuth flow;
- onboarding endpoint закрыт после появления membership и не выдаёт token/site-admin privilege;
- OAuth client нельзя создать или получить без проверенного `activeOrganizationId`;
- generic session update не может записать `activeOrganizationId`;
- user-owned OAuth client через `user_id` не создаётся;
- organization admin не изменяет trusted client;
- Casbin запрещает неразрешённый client CRUD;
- JWT user A + cookie session B отклоняется;
- JWT `sid` session A + cookie session B того же пользователя отклоняется;
- JWT organization A + session active organization B отклоняется;
- после смены active organization старый organization-bound access token отклоняется management boundary;
- удалённый member не получает новый token;
- удаление membership очищает matching active organization sessions;
- удаление organization блокирует owned user/M2M clients и отзывает refresh/consent state до Admin activation;
- custom claims не переопределяют reserved claims;
- email отсутствует без scope `email`;
- machine token выпускается без user session;
- M2M JWT содержит `azp`, не содержит user `sub`, а Casbin subject локально формируется как `oauth-client:{azp}`;
- machine principal получает organization только по проверенному `azp` и IAM client registry;
- user principal форматируется как `user:{userId}`, а machine principal — как `oauth-client:{clientId}`;
- OAuth client roles назначаются, проверяются и удаляются без добавления префикса `user:`;
- user и machine policies создаются в актуальном формате без переноса прежних Casbin bindings;
- удаление/disable machine client инвалидирует его Casbin bindings/cache;
- user token получает organization через `postLogin.consentReferenceId`, а не через client ownership;
- OAuth discovery/JWKS доступны по canonical external issuer;
- login, consent и organization-selection pages обслуживаются Admin frontend, а OAuth protocol endpoints — IAM;
- прямой `oauth2Continue` без server-side policy-completion state отклоняется/возвращается в policy flow;
- revocation блокирует refresh;
- отключённый client не получает новые tokens;
- fresh database поддерживает account/session → OAuth authorize → Admin callback → GraphQL request;
- legacy Admin source/runtime flow, parser и session-token-as-refresh отсутствуют;
- Admin не сохраняет OAuth access/refresh/session tokens в `localStorage`.

По текущим правилам проекта test-команды не запускать. Для проверки новой версии кода использовать соответствующий build через `shopana-cli`.

## 21. Критерии приёмки

Функциональность готова, когда:

1. IAM использует `@better-auth/oauth-provider`, а не deprecated `oidcProvider`.
2. В проекте нет собственной дублирующей реализации OAuth clients/tokens/consent/PKCE.
3. Organization clients принадлежат организации через `oauthClient.reference_id`; platform clients server-controlled и исключены из tenant CRUD; user-owned clients не поддерживаются.
4. Owner organization client и authorization organization user token разделены и проверяются независимо.
5. CRUD OAuth clients защищён Casbin через `clientPrivileges`, IAM scripts и GraphQL authorization; JWT user/organization связан с Better Auth session user/active organization.
6. Каждый token/refresh request требует `resource`, разрешённый глобально и конкретному client; Shopana access tokens выпускаются как JWT с явно заданными TTL.
7. Gateway/subgraphs проверяют signature, issuer, audience, expiration и scopes официальным resource client.
8. Custom access token claims формируются server-side callbacks Better Auth.
9. User organization context основан на `postLogin.consentReferenceId` и актуальном membership.
10. M2M organization context разрешается по проверенному `azp` через IAM client registry.
11. Единая целевая Casbin model, matcher и policy schema являются источником fine-grained authorization для user и machine principals.
12. `CasbinService` принимает типизированный principal и единообразно форматирует `user:{userId}` и `oauth-client:{clientId}` без двойных префиксов.
13. Единый `AuthorizationPrincipal` проходит end-to-end через shared context, broker и subgraph AuthProviders; user-only bypass недоступен machine principal.
14. Первый пользователь может создать initial organization/owner membership через cookie-only onboarding до получения organization-bound token.
15. Client secrets и token values хранятся безопасным способом Better Auth.
16. Admin использует Authorization Code + PKCE, state/nonce и стандартный Refresh Token Flow; tokens хранятся только в памяти.
17. Admin management требует совпадения JWT `userId`/`sid`/organization с cookie session.
18. Better Auth session cookie не используется как OAuth refresh token.
19. M2M использует встроенный Client Credentials Flow и управляемые Casbin bindings.
20. Application-specific login policy использует `getOAuthProviderState()` и одноразовый server-side completion state; UI continuation невозможно использовать как bypass.
21. Membership/organization deletion очищает sessions и owned client token/consent state до открытия Admin OAuth flow.
22. Security-sensitive операции аудируются без утечки secrets/tokens.
23. OAuth/JWKS/discovery endpoints публикуют canonical metadata через single-origin path topology; session cookie передаётся только IAM management boundary.
24. Platform Admin client создаётся idempotent bootstrap, а tenant API не может изменить его trusted/server-only fields.
25. IAM/federation/Admin успешно собираются через проектные build-команды.
26. Legacy GraphQL auth endpoints, issuance, verification, parser и session-token-as-refresh отсутствуют в source/runtime.
27. Fresh target schema не требует legacy tables/models или data migration.
28. План не содержит import/backfill/invalidation механики для несуществующих пользователей, sessions, tokens или Casbin bindings.

## 22. Рекомендуемое разделение на изменения

1. **Architecture/contracts:** single-origin edge, route ownership, cookie/header contract, ownership, GraphQL and scope boundaries.
2. **Dependencies/config/schema:** Better Auth/OAuth Provider/Drizzle alignment, typed config и clean target baseline migration.
3. **Authorization foundation:** typed principal во всех packages/services, Casbin formatter и OAuth RBAC resources.
4. **Provider HTTP/edge:** Fastify handler, proxy/cookie/CSRF policy, discovery/JWKS и route allowlist.
5. **Tenant/JWT integration:** active organization, `clientReference`, `getOAuthProviderState`, mandatory resource, claims и official verifier.
6. **Management API:** GraphQL facade, JWT/session binding, lifecycle repository, codegen/compose и audit.
7. **Admin OAuth activation:** platform bootstrap, полный PKCE UI, in-memory tokens и atomic legacy source removal.
8. **Login policies:** one-time completion state, email/recent-auth и bulk refresh/consent cleanup.
9. **External/M2M:** third-party consent, Client Credentials Flow, machine Casbin bindings, lifecycle и abuse hardening.

Каждое изменение расширяет Better Auth через официальные APIs/callbacks. Прямой доступ к provider tables допустим только через version-pinned bootstrap/lifecycle repository для возможностей, отсутствующих в server API `1.6.23`; собственный OAuth protocol/server не создаётся.
