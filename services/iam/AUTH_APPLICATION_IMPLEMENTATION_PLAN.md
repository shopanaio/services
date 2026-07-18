# План реализации OAuth Applications в IAM на базе Better Auth

## Статус

- **Состояние:** предлагается к реализации
- **Ответственный сервис:** IAM
- **Базовая версия:** `better-auth@1.6.23`
- **OAuth Provider:** `@better-auth/oauth-provider@1.6.23`
- **Основная цель:** реализовать модель OAuth Application, управление правилами доступа и настраиваемые JWT claims средствами Better Auth, не создавая собственный OAuth/OIDC server.

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
- application-specific требования к login/MFA, которых нет в OAuth Provider;
- безопасные custom claims через callbacks Better Auth;
- проверку JWT и scopes в gateway/subgraphs;
- GraphQL API и Admin UI поверх server API Better Auth;
- аудит security-sensitive операций.

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
- opaque access tokens, когда они допустимы;
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
- Casbin authorization для CRUD OAuth clients;
- проверку актуального membership при выдаче claims;
- mapping OAuth scopes на Shopana resources/actions;
- application-specific login policy;
- аудит и observability;
- compatibility migration существующего Admin frontend.

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
  ├── clientPrivileges → Casbin
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

## 4. Зависимости и совместимость

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
import { bearer, jwt } from "better-auth/plugins";
import { oauthProvider } from "@better-auth/oauth-provider";

const auth = betterAuth({
  baseURL: config.oauth.issuer,
  trustedOrigins: config.oauth.trustedOrigins,
  disabledPaths: ["/token"],

  plugins: [
    bearer(),
    jwt({
      jwt: {
        issuer: config.oauth.issuer,
      },
      jwks: {
        keyPairConfig: {
          alg: "EdDSA",
          crv: "Ed25519",
        },
      },
      disableSettingJwtHeader: true,
    }),
    oauthProvider({
      loginPage: "/sign-in",
      consentPage: "/oauth/consent",

      validAudiences: [
        "https://admin-api.shopana.io",
        "https://storefront-api.shopana.io",
      ],

      accessTokenExpiresIn: 15 * 60,
      m2mAccessTokenExpiresIn: 10 * 60,

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
        page: "/oauth/select-organization",
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

JWT plugin должен использовать тот же canonical HTTPS issuer, что и OAuth Provider. Значения вроде `shopana-iam`, внутренний hostname или адрес отдельного pod не являются допустимым production issuer.

### 5.1 HTTP topology OAuth Provider

До добавления GraphQL facade IAM должен предоставить публичный HTTP-контур Better Auth:

- смонтировать `auth.handler` в IAM Fastify server;
- направить в него `/oauth2/*`, `/jwks` и `/.well-known/*` согласно фактическому auth base path;
- опубликовать эти маршруты через внешний gateway/reverse proxy без изменения canonical issuer;
- корректно передавать `host`, `proto`, client IP и request ID через trusted proxy configuration;
- настроить secure/httpOnly/SameSite cookies, `trustedOrigins` и production CORS policy;
- не применять GraphQL authentication middleware к OAuth/discovery endpoints;
- проверить, что discovery metadata содержит внешние, а не внутренние URLs.

OAuth endpoints и GraphQL могут находиться на одном Fastify instance, но их middleware chains должны быть разделены.

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

`oauthClient.reference_id` означает organization-владельца приложения и используется только для CRUD ownership. Назовём это значение `ownerOrganizationId`.

Текущая IAM session не содержит `activeOrganizationId`. До подключения OAuth Provider IAM должен добавить его как server-controlled additional session field и реализовать авторизованную операцию переключения активной организации. Операция обязана проверить актуальный `organizationMember` и не должна принимать membership на доверии от клиента.

После этого для владения приложением использовать встроенный `clientReference`:

```typescript
clientReference: ({ session }) => {
  return session?.activeOrganizationId as string | undefined;
}
```

`reference_id` OAuth client соответствует `organizationId` Shopana.

Если OAuth client принадлежит конкретному пользователю, Better Auth использует user ownership. Если OAuth client принадлежит организации, источником владения является `reference_id`.

Не дублировать `organizationId` в отдельной таблице без необходимости.

`clientReference` не задаёт tenant context access token. Для user authorization tenant выбирается отдельно через `postLogin.consentReferenceId` и сохраняется как reference consent/authorization. Это значение называется `authorizationOrganizationId`.

Приложение, принадлежащее одной организации, может быть разрешено для работы с другой организацией только если это явно поддерживаемый third-party сценарий и пользователь состоит в целевой организации. Для internal organization-bound clients дополнительно проверять равенство `ownerOrganizationId === authorizationOrganizationId`.

### 6.2 Platform clients

Shopana Admin и другие first-party clients должны создаваться как trusted/cached clients через поддерживаемый Better Auth механизм.

Для них допускается:

- фиксированный стабильный `client_id`;
- запрет редактирования через обычный client CRUD;
- consent bypass только для явно доверенных first-party applications;
- инициализация при bootstrap/deployment;
- отдельная проверка site admin для конфигурационных изменений.

Нельзя разрешать organization admin устанавливать trusted или skip-consent flags.

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

Resolvers запускают IAM scripts через `Kernel.runScript`. Scripts выполняют Casbin authorization, вызывают server API Better Auth и публикуют audit events:

- `createOAuthClient`;
- `getOAuthClient`;
- list OAuth clients;
- update OAuth client;
- delete/disable OAuth client;
- generate/rotate client secret, если поддерживается соответствующим endpoint;
- consent/revocation endpoints.

Для обычных полей использовать пользовательские OAuth client endpoints. Server-only `adminCreateOAuthClient`/`adminUpdateOAuthClient` допускаются только внутри IAM scripts для trusted client bootstrap или restricted полей вроде `disabled`, после явной проверки owner, site-admin/Casbin permissions и allowlist обновляемых полей. Generic admin update input наружу не передавать.

GraphQL нужен как Shopana-facing facade для:

- единого admin API;
- federation naming;
- Zod validation на границе Shopana;
- Casbin authorization;
- audit events;
- скрытия restricted Better Auth fields.

Обычные `/oauth2/create-client`, `/oauth2/update-client`, `/oauth2/delete-client` и rotate endpoints остаются официальными endpoints Better Auth и защищаются тем же `clientPrivileges`. GraphQL facade не должен создавать расходящуюся модель ownership.

Better Auth client CRUD требует действительную Better Auth session. После перехода Admin на OAuth access tokens management requests используют одновременно:

- OAuth JWT в `Authorization` для обычной GraphQL authentication;
- secure httpOnly Better Auth session cookie для server API Better Auth.

GraphQL server формирует для `auth.api.*` allowlist исходных session headers текущего запроса: `cookie`, `origin`, `user-agent` и проверенные proxy headers. OAuth `Authorization: Bearer ...` не передаётся как Better Auth session token. Нельзя синтезировать session из `userId`, JWT claims или organization header. Management mutations должны использовать same-site cookie policy и CSRF protection.

### 7.1 GraphQL namespaces

Использовать `oauthApplicationQuery` и `oauthApplicationMutation`, чтобы не конфликтовать с сервисом `apps`.

```graphql
type OAuthApplicationQuery {
  applications(first: Int, after: String): OAuthApplicationConnection!

  application(clientId: ID!): OAuthApplication
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

Названия GraphQL types могут содержать `Application`, но persistence и business source of truth остаются в Better Auth `oauthClient`.

Список приложений всегда определяется текущим `activeOrganizationId` через `clientReference`. Произвольный `organizationId` не принимается как фильтр, чтобы не создавать второй источник tenant context.

### 7.2 Restricted fields

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

Проверку встроить в `clientPrivileges`:

```typescript
clientPrivileges: async ({ action, user, session, headers }) => {
  const organizationId = session?.activeOrganizationId;
  if (!organizationId || !user) return false;

  await assertOrganizationMembership(user.id, organizationId);

  return casbin.enforce({
    organizationId,
    subject: user.id,
    domain: "org",
    resource: "iam.oauth_applications",
    action: mapClientAction(action),
  });
}
```

Точный callback не должен зависеть от GraphQL context. Он должен получать IAM dependencies через безопасную service factory/closure.

Проверки GraphQL resolver и `clientPrivileges` должны работать как defense in depth.

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

На request boundary проверяются scope и audience. В business operation дополнительно выполняется обычный Casbin check для фактического resource/domain.

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

### 10.2 Обязательный `resource`

Клиенты Shopana должны передавать `resource` при authorization/token flow.

Для валидного resource OAuth Provider выпускает JWT access token, который API проверяет локально через JWKS.

Resource servers Shopana должны:

- принимать только JWT access tokens;
- отклонять opaque tokens;
- проверять signature;
- проверять `iss`;
- проверять `aud`;
- проверять `exp` и `nbf`;
- требовать нужные scopes;
- проверять `azp`/client identity, когда это необходимо.

Opaque tokens оставить только для flows, где явно используется introspection и это согласовано архитектурно.

### 10.3 Resource client

Использовать официальный `oauthProviderResourceClient` или `verifyAccessToken` из поддерживаемого Better Auth OAuth API.

Не поддерживать собственный parser, который знает только один глобальный `JWT_AUDIENCE`.

Текущий `UserRepository.parseJwt()` должен быть заменён или делегировать проверку официальному resource client.

## 11. Custom JWT claims

### 11.1 Access token claims

Использовать официальный callback:

```typescript
customAccessTokenClaims: async ({
  user,
  scopes,
  referenceId,
}) => {
  if (!user) {
    // M2M identity is represented by the provider-managed `azp` claim.
    // Tenant context is resolved by the resource server from verified `azp`.
    return {};
  }

  if (requiresOrganizationContext(scopes) && !referenceId) {
    throw new Error("Organization context is required for Shopana scopes");
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
- organization suspended/deleted;
- обязательный organization context отсутствует.

Состояние OAuth client проверяет сам OAuth Provider. Application login policy исполняется в `postLogin` flow, а не внутри claims callback, потому что callback не получает `clientId`, session assurance state или grant type.

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

Использовать `customUserInfoClaims` для claims, доступных через `/oauth2/userinfo` согласно выданным scopes.

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

## 12. Application-specific login policy

OAuth Provider не является полноценным движком правил MFA/login на уровне каждого client. Для этой части допускается небольшой Shopana extension.

### 12.1 Companion policy table

Создать только при наличии реально исполняемых настроек:

```text
iam.oauth_client_policy
  client_id
  require_email_verification
  mfa_mode                 // off | optional | required
  max_authentication_age
  allowed_identity_providers
  policy_version
  updated_at
```

Не дублировать в ней redirect URIs, scopes, audiences, client secrets, grants, tokens или consent.

`client_id` логически ссылается на Better Auth `oauthClient`.

### 12.2 Enforcement

Policy должна проверяться в реальном flow:

1. OAuth Provider выполняет login и передаёт только подписанный `oauth_query`;
2. `postLogin.shouldRedirect` определяет необходимость выбора organization и дополнительных login requirements;
3. страница `postLogin.page` получает client только через проверенный OAuth Provider flow, загружает `oauth_client_policy` и требует email verification/MFA/recent authentication;
4. после успешного выполнения страница вызывает официальный `oauth2Continue({ postLogin: true })`;
5. `postLogin.consentReferenceId` возвращает проверенный `activeOrganizationId` для Shopana scopes или отклоняет flow;
6. при выпуске и refresh access token `customAccessTokenClaims` повторно проверяет актуальный membership и состояние organization;
7. изменение login policy отзывает связанные refresh tokens/grants и требует нового authorization flow; уже выпущенные JWT доживают не дольше настроенного короткого TTL.

Нельзя читать `client_id`, organization или результат MFA из неподписанных query parameters. Для `max_authentication_age` хранить и проверять server-side authentication time/assurance state, связанный с Better Auth session. Не пытаться проверять MFA policy через `customAccessTokenClaims`: его контракт не содержит необходимых данных.

Не добавлять в GraphQL настройки, которые login flow пока не умеет исполнять.

## 13. Machine-to-machine applications

Использовать встроенный Client Credentials Flow.

Для machine client:

- нужен confidential OAuth client;
- user отсутствует;
- `customAccessTokenClaims` должен корректно обрабатывать `user === undefined`;
- subject/client identity берётся из Better Auth token contract;
- scopes ограничиваются зарегистрированными scopes клиента;
- OAuth Provider добавляет проверенный `azp = clientId`;
- resource server получает owner organization client по `azp` через IAM registry/cache;
- Casbin проверяет service-account/client subject без изменения существующей Casbin model;
- интерактивная session и consent не используются.

Если Casbin требует отдельный subject, использовать стабильное значение:

```text
oauth-client:{clientId}
```

Текущая Casbin model `sub, dom, obj, act` не меняется. `oauth-client:{clientId}` является только новым форматом `sub`.

Для M2M необходимо реализовать lifecycle authorization policies:

- назначение client разрешённых ролей/permissions в его organization/domain;
- отдельные GraphQL operations или application role assignment для управления этими grants;
- запрет выдачи grants за пределами `oauthClient.reference_id`;
- удаление или деактивацию grouping/policy bindings при disable/delete client;
- audit каждого изменения machine permissions;
- cache invalidation при изменении client или Casbin policy.

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

- Использовать для opaque tokens только в явно разрешённых flows.
- Не выполнять introspection каждого JWT-запроса.
- Ограничить доступ к introspection согласно возможностям OAuth Provider.

### Revocation

- Использовать официальный revocation endpoint для access/refresh tokens.
- Отключение OAuth client должно блокировать новые authorization/refresh operations.
- Для уже выпущенных JWT использовать явно настроенный TTL: 15 минут для user access token и 10 минут для M2M, с меньшим TTL для high-risk scopes.
- Критические операции могут дополнительно проверять client/grant online.

## 15. Database schema и migrations

### 15.1 Source of truth

Схема OAuth tables определяется `@better-auth/oauth-provider`, а не проектируется вручную по аналогии с Auth0.

Ожидаемые модели включают:

- `oauthClient`;
- `oauthAccessToken`;
- `oauthRefreshToken`;
- `oauthConsent`;
- дополнительные verification/authorization данные плагина.

Точный список полей брать из установленной версии `1.6.23`.

### 15.2 Интеграция с текущим Drizzle adapter

Так как IAM явно передаёт Drizzle schema в `drizzleAdapter`, необходимо:

1. получить schema официального OAuth Provider для `1.6.23`;
2. добавить эквивалентные Drizzle models в IAM без изменения семантики полей;
3. передать models в adapter под ожидаемыми model names;
4. сгенерировать migration через `shopana-cli`;
5. не редактировать generated migration metadata вручную;
6. не создавать старые таблицы deprecated `oidcProvider`, если миграция с него не требуется.

### 15.3 Хранение secrets/tokens

- `storeClientSecret: "hashed"`.
- `storeTokens: "hashed"`.
- Plaintext secret возвращается только при создании/ротации.
- GraphQL response с secret не кэшируется.
- Secrets и tokens не попадают в logs/events.

## 16. Миграция существующей аутентификации Admin

Сейчас Admin получает JWT через GraphQL `signIn` и использует Better Auth session token как refresh token. Этот flow должен быть заменён стандартным OAuth flow.

### 16.1 Создание first-party client

Создать trusted public client:

```text
name: Shopana Admin
client_id: shopana-admin
token_endpoint_auth_method: none
grant_types: authorization_code, refresh_token
require_pkce: true
resource: https://admin-api.shopana.io
scopes: openid profile email offline_access admin:read admin:write
```

### 16.2 Новый frontend flow

1. Admin инициирует `/oauth2/authorize` с PKCE S256.
2. Если session отсутствует, Better Auth переводит пользователя на login page.
3. После login пользователь возвращается в authorization flow.
4. Authorization code обменивается на tokens через `/oauth2/token`.
5. Admin использует JWT access token для GraphQL.
6. Refresh выполняется стандартным OAuth refresh token grant.
7. Better Auth session cookie сохраняется как secure httpOnly cookie и используется только для browser authorization flow и OAuth Application management; она не возвращается приложению как refresh token.

### 16.3 Compatibility window

Миграция выполняется поэтапно:

1. подключить OAuth Provider и создать Admin client;
2. сохранить текущий GraphQL auth flow;
3. добавить OAuth flow в Admin;
4. переключить Admin на OAuth access/refresh tokens;
5. прекратить выпуск legacy JWT;
6. поддерживать проверку legacy JWT не дольше их максимального TTL;
7. удалить GraphQL `tokenRefresh` и session-token-as-refresh behavior;
8. удалить глобальный JWT `definePayload`, если он больше не используется другими first-party flows.

Не сохранять оба token issuance flow на неопределённый срок.

## 17. Request context и resource server authorization

После проверки access token context должен содержать:

```typescript
interface AuthenticatedPrincipal {
  subject: string;
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

Для M2M token `userId` и `sessionId` равны `null`, `clientId` берётся из проверенного `azp`, а `organizationId` разрешается IAM по `oauthClient.reference_id`. Результат можно кратковременно кэшировать с обязательной invalidation при disable/delete client.

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

### Этап 0 — Dependency alignment

- Зафиксировать `better-auth@1.6.23`.
- Добавить `@better-auth/oauth-provider@1.6.23`.
- Согласовать Drizzle ORM с peer requirements Better Auth.
- Выполнить IAM build через `shopana-cli`.

**Критерий завершения:** IAM собирается без Better Auth/Drizzle peer incompatibility.

### Этап 1 — OAuth HTTP topology и Provider schema

- Зафиксировать canonical external issuer/baseURL и auth base path.
- Смонтировать `auth.handler` и маршруты OAuth/JWKS/discovery с отдельной middleware chain.
- Настроить trusted proxy, cookies, trusted origins и CORS.
- Подключить `oauthProvider` сначала без открытия external client registration.
- Добавить официальные OAuth Provider models в IAM Drizzle schema.
- Сгенерировать migration через `shopana-cli`.
- Проверить hashed storage configuration.
- Проверить discovery и JWKS routing в Fastify/Nest bootstrap.

**Критерий завершения:** OAuth Provider инициализируется, schema соответствует версии `1.6.23`, а discovery/JWKS возвращают canonical external URLs.

### Этап 2 — Shopana configuration и Casbin

- Определить valid audiences.
- Определить начальный scope registry.
- Реализовать `clientReference`.
- Добавить server-controlled `activeOrganizationId` в Better Auth session и безопасное переключение organization.
- Реализовать `postLogin` и `consentReferenceId` для authorization organization context.
- Реализовать `clientPrivileges` через Casbin.
- Зарегистрировать IAM resources.
- Добавить audit hooks.

**Критерий завершения:** organization admin управляет только OAuth clients своей организации.

### Этап 3 — JWT claims и resource verification

- Реализовать `customAccessTokenClaims`.
- Реализовать `customIdTokenClaims`.
- Реализовать `customUserInfoClaims`.
- Настроить `advertisedMetadata.claims_supported`.
- Внедрить официальный access-token verification в IAM/gateway/subgraphs.
- Расширить request context.

**Критерий завершения:** Shopana API принимает application-specific JWT и корректно проверяет audience/scopes/Casbin.

### Этап 4 — GraphQL management API

- Добавить OAuth Application GraphQL types.
- Реализовать resolvers через IAM scripts как facade над Better Auth API.
- Передавать Better Auth session cookie в server API без синтеза session из JWT claims.
- Скрыть restricted fields.
- Добавить secret rotation response с однократным plaintext.
- Добавить audit events.

**Критерий завершения:** приложения управляются через Admin API без прямой записи в OAuth tables.

### Этап 5 — Admin OAuth migration

- Создать trusted public Admin client.
- Подключить OAuth Provider client к Admin frontend.
- Реализовать Authorization Code + PKCE.
- Перевести GraphQL requests на новый JWT access token.
- Перевести refresh на OAuth grant.
- Закрыть legacy issuance после compatibility window.

**Критерий завершения:** Admin не использует session token Better Auth как refresh token.

### Этап 6 — Application login policy

- Добавить `oauth_client_policy` только для реально исполняемых полей.
- Интегрировать policy в login/authorize flow.
- Добавить MFA/email verification/recent-auth enforcement.
- При изменении policy отзывать связанные refresh tokens/grants и требовать новый authorization flow.

**Критерий завершения:** изменение application policy реально меняет login behavior.

### Этап 7 — M2M и external clients

- Включить Client Credentials Flow.
- Определить Casbin subject для OAuth client.
- Реализовать назначение и отзыв Casbin roles/policies для OAuth client subject.
- Реализовать разрешение organization по проверенному `azp`.
- Добавить consent UI для third-party user clients.
- Добавить client revocation и operational UI.
- Добавить rate-limit/abuse monitoring.

**Критерий завершения:** machine и third-party clients используют стандартный OAuth 2.1 flow без кастомных token endpoints.

## 20. Сценарии проверки

При реализации должны быть предусмотрены сценарии:

- public client не имеет client secret;
- confidential client secret хранится как hash;
- redirect URI проверяется точно, кроме поддерживаемого OAuth Provider loopback-исключения для native client;
- Authorization Code Flow требует PKCE S256;
- неизвестный resource отклоняется;
- JWT получает корректный `aud`;
- resource server отклоняет opaque token;
- незарегистрированный scope отклоняется;
- high-risk scope сокращает TTL;
- organization admin не видит clients другой организации;
- organization admin не изменяет trusted client;
- Casbin запрещает неразрешённый client CRUD;
- удалённый member не получает новый token;
- custom claims не переопределяют reserved claims;
- email отсутствует без scope `email`;
- machine token выпускается без user session;
- machine principal получает organization только по проверенному `azp` и IAM client registry;
- удаление/disable machine client инвалидирует его Casbin bindings/cache;
- user token получает organization через `postLogin.consentReferenceId`, а не через client ownership;
- OAuth discovery/JWKS доступны по canonical external issuer;
- revocation блокирует refresh;
- отключённый client не получает новые tokens;
- legacy Admin flow удаляется после migration window.

По текущим правилам проекта test-команды не запускать. Для проверки новой версии кода использовать соответствующий build через `shopana-cli`.

## 21. Критерии приёмки

Функциональность готова, когда:

1. IAM использует `@better-auth/oauth-provider`, а не deprecated `oidcProvider`.
2. В проекте нет собственной дублирующей реализации OAuth clients/tokens/consent/PKCE.
3. OAuth clients принадлежат пользователю или организации через механизм Better Auth.
4. Owner organization client и authorization organization user token разделены и проверяются независимо.
5. CRUD OAuth clients защищён Casbin через `clientPrivileges`, IAM scripts и GraphQL authorization.
6. Access tokens выпускаются как JWT для зарегистрированных Shopana resources с явно заданными TTL.
7. Gateway/subgraphs проверяют signature, issuer, audience, expiration и scopes официальным resource client.
8. Custom access token claims формируются server-side callbacks Better Auth.
9. User organization context основан на `postLogin.consentReferenceId` и актуальном membership.
10. M2M organization context разрешается по проверенному `azp` через IAM client registry.
11. Casbin model не меняется и остаётся источником fine-grained authorization для user и machine principals.
12. Client secrets и token values хранятся безопасным способом Better Auth.
13. Admin использует Authorization Code + PKCE и стандартный Refresh Token Flow.
14. Better Auth session cookie не используется как OAuth refresh token.
15. M2M использует встроенный Client Credentials Flow и управляемые Casbin bindings.
16. Application-specific login policy реализована через официальный `postLogin` continuation flow.
17. Security-sensitive операции аудируются без утечки secrets/tokens.
18. OAuth/JWKS/discovery endpoints публикуют canonical external issuer metadata.
19. IAM service успешно собирается через `shopana-cli`.

## 22. Рекомендуемое разделение на изменения

1. **Dependencies:** Better Auth, OAuth Provider и Drizzle alignment.
2. **Provider topology/schema:** public routing, issuer, plugin configuration, Drizzle models и migration.
3. **Tenant and authorization integration:** active organization session, `clientReference`, `postLogin.consentReferenceId`, `clientPrivileges`, scopes и Casbin.
4. **JWT integration:** audiences, claims и resource verification.
5. **Management API:** GraphQL facade и Admin UI.
6. **Admin migration:** Authorization Code + PKCE и legacy removal.
7. **Login policies:** MFA/email/recent-auth per client.
8. **External/M2M:** consent, Client Credentials Flow, machine Casbin bindings и operational hardening.

Каждое изменение должно расширять Better Auth через официальные APIs и callbacks, а не заменять его собственным OAuth implementation.
