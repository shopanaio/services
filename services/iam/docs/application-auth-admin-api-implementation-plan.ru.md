# План реализации Admin API для application auth в IAM

Статус: проектный план  
Дата: 2026-07-19  
Сервис: `services/iam`  
Целевая область: административное управление application realms после завершения OAuth 2.1 / OIDC
runtime

Связанные документы:

- [План OAuth 2.1 / OpenID Connect для `application_users`](./application-users-oauth-oidc-implementation-plan.ru.md)
  — обязательная предыдущая работа;
- [Рефакторинг application social providers](./application-social-providers-refactoring-plan.ru.md)
  — обязательный catalog-driven provider contract;
- [План API управления OAuth clients](./application-oauth-client-management-api-plan.ru.md) —
  детализированный подплан OAuth client management;
- [Compatibility и security spike OAuth Provider 1.6.23](./application-users-oauth-oidc-compatibility-spike.ru.md).

## 1. Место в последовательности реализации

Этот план выполняется **после полного завершения** плана OAuth 2.1 / OIDC для `application_users`.
Предыдущий план создает и проверяет application-scoped runtime, модели, repositories, protocol
policy, публичные HTTP endpoints, hosted UI, способы входа и token validation. Для его
contract-сценариев разрешена заранее подготовленная application-конфигурация и OAuth clients без
пользовательского Admin API.

Настоящий план не меняет OAuth/OIDC protocol contract. Он добавляет административный GraphQL facade
над уже готовыми domain services и repositories, чтобы organization admin мог управлять realm без
ручной конфигурации и прямой работы с БД.

## 2. Цели

1. Дать organization admin полный Admin GraphQL API для application realms.
2. Использовать существующую platform Better Auth session и текущий IAM contract, в котором
   `organizationId` приходит в Admin GraphQL input/arguments.
3. Проверять каждую операцию через Casbin и повторную organization/application ownership validation.
4. Не передавать platform admin credential в application Better Auth handler и не имперсонировать
   `application_user`.
5. Не раскрывать provider credentials, client secret hashes, password/OTP/session/token/code values.
6. Сохранять protocol policy предыдущего плана неизменяемой через обычные GraphQL inputs.
7. Аудировать все security-sensitive mutations без secret values.

## 3. Не входит в план

- изменение OAuth/OIDC protocol policy v1;
- включение `client_credentials`, implicit, password или custom grants;
- Dynamic Client Registration;
- выдача OAuth tokens через GraphQL;
- прием password, OTP или authorization code через Admin GraphQL;
- публичная HTTP-экспозиция внутренних management services;
- реализация экранов Admin frontend.

## 4. Архитектурная граница

```text
Admin client
  -> IAM Admin GraphQL
  -> platform Better Auth session
  -> trusted admin actor + client-provided organizationId
  -> Casbin permission
  -> organization/application ownership check
  -> application auth management service
  -> application-scoped repository/transaction
```

Admin GraphQL и `applicationAuthHttpPlugin` остаются sibling encapsulated Fastify plugins одного IAM
instance/listener. `buildAdminContextMiddleware` и GraphQL hooks действуют только внутри
`adminGraphqlPlugin`; `/graphql` не публикуется через public reverse proxy.

`organizationId` приходит в Admin GraphQL input/arguments согласно существующему IAM contract; этот
способ выбора organization не меняется в рамках настоящего плана. Значение `organizationId` является
client-provided tenant selector, а не trusted context: trusted actor берется только из
валидированной platform session. Application всегда повторно загружается по
`applicationId + organizationId`, после чего выполняются Casbin permission и ownership checks.
Application user session не авторизует ни одну административную операцию.

GraphQL resolvers следуют существующему IAM namespace и проектному resolver pattern. Resolver
отвечает за GraphQL boundary, validation и authorization orchestration; изменения выполняются domain
service через application-scoped repository, а не прямой записью из resolver.

## 5. Admin GraphQL contract

### 5.1. Applications и auth settings

Нужны операции:

- create/list/get/update/archive application;
- получить auth configuration;
- получить read-only canonical `application.resource`;
- обновить разрешенные auth methods и безопасные policy values;
- получить issuer, OIDC discovery URL, OAuth Authorization Server Metadata URL и рассчитанные
  callback URLs;
- управлять trusted origins;
- обновлять branding и localization.

`revision` служит только для cache/runtime generation и не принимается write mutations.

Auth configuration не содержит `googleEnabled`, `facebookEnabled` или будущих provider-specific
enable fields. Состояние social provider читается и изменяется только через отдельный generic
provider contract; persisted source of truth — `application_auth_provider.enabled`.

Application создается через Admin GraphQL или доверенный IAM provisioning action. IAM генерирует
`applicationId` и immutable `resource=urn:shopana:application:{applicationId}`. `resource`
возвращается Admin GraphQL только read-only и отсутствует во всех application/OAuth client mutation
inputs. Обычной операции изменения resource нет; изменение namespace или audience является отдельной
versioned protocol migration, а не административной настройкой.

### 5.2. Social providers

Нужны операции:

- получить закрытый enum поддерживаемых provider IDs из code-owned catalog;
- configure provider по этому enum без произвольных OAuth endpoints/options;
- enable/disable provider;
- rotate credentials;
- удалить credentials только после disable;
- получить status без secret;
- опционально выполнить безопасную configuration validation.

GraphQL response возвращает только `provider`, `supported`, `configured`, `enabled`, допустимую
masked client-id форму, scopes, exact callback URL, `updatedAt` и `updatedBy`. Provider secret и
upstream tokens никогда не возвращаются. Unknown provider отклоняется на GraphQL/domain boundary
через тот же code-owned catalog; Admin API не принимает authorization/token/profile endpoints или
произвольные Better Auth options.

### 5.3. OAuth clients

Полный контракт, storage policy и сценарии определены в
[подплане API управления OAuth clients](./application-oauth-client-management-api-plan.ru.md).

Обязательный верхнеуровневый scope:

- list/get clients;
- create public/confidential client;
- update name, redirect URI и post-logout URI;
- enable/disable/archive client;
- rotate confidential client secret с одноразовым возвратом;
- управлять `skipConsent` только для подтвержденных first-party clients.

Resolver после Casbin и ownership checks вызывает только `ApplicationOAuthClientManagementService`.
GraphQL input не содержит `resource`, `resources`, `grantTypes` или `responseTypes`. Management
service наследует `[application.resource]` и фиксирует:

```text
grant_types = ["authorization_code", "refresh_token"]
response_types = ["code"]
require_pkce = true
```

Эти значения возвращаются read-only. `client_credentials` нельзя включить ни через create/update, ни
через metadata.

### 5.4. Application users

Нужны операции:

- list/get user только внутри application;
- block/unblock;
- revoke all sessions;
- list linked accounts без credentials/tokens;
- unlink допустимый account;
- получить security metadata без PII из других applications.

Администратор не может получить password hash, OTP, provider token, session token, authorization
code или refresh token. Unlink не может удалить последний доступный login method.

### 5.5. Полный GraphQL SDL

```graphql
enum ApplicationLifecycleStatus {
  ACTIVE
  ARCHIVED
}

enum ApplicationRegistrationMode {
  OPEN
  DISABLED
}

enum ApplicationConsentMode {
  EXPLICIT
}

scalar ApplicationAuthMethodId

enum ApplicationAuthMethodCapability {
  SIGN_IN
  SIGN_UP
  PASSWORD_RESET
}

enum ApplicationAuthPrimaryColor {
  BLUE
  INDIGO
  VIOLET
  EMERALD
}

enum ApplicationAuthBackgroundColor {
  WHITE
  SLATE
}

enum ApplicationAuthProviderName {
  GOOGLE
  FACEBOOK
}

enum ApplicationAuthProviderValidationStatus {
  VALID
  INVALID
  UNAVAILABLE
}

enum ApplicationOAuthClientType {
  PUBLIC
  CONFIDENTIAL
}

enum ApplicationOAuthClientEnvironment {
  DEVELOPMENT
  PRODUCTION
}

enum ApplicationOAuthTokenEndpointAuthMethod {
  NONE
  CLIENT_SECRET_BASIC
}

enum ApplicationUserStatus {
  ACTIVE
  BLOCKED
}

type Application implements Node @key(fields: "id") {
  id: ID!
  organizationId: ID!
  organization: Organization!
  name: String!
  displayName: String!
  description: String
  status: ApplicationLifecycleStatus!
  resource: String!
  revision: Int!
  auth: ApplicationAuthConfiguration!
  oauthClient(clientId: String!): ApplicationOAuthClient
  oauthClients(
    first: Int
    after: String
    last: Int
    before: String
    where: ApplicationOAuthClientWhereInput
    orderBy: [ApplicationOAuthClientOrderByInput!]
  ): ApplicationOAuthClientConnection!
  user(id: ID!): ApplicationUser
  users(
    first: Int
    after: String
    last: Int
    before: String
    where: ApplicationUserWhereInput
    orderBy: [ApplicationUserOrderByInput!]
  ): ApplicationUserConnection!
  createdAt: DateTime!
  updatedAt: DateTime!
  archivedAt: DateTime
}

extend type Organization {
  applications(
    first: Int
    after: String
    last: Int
    before: String
    where: ApplicationWhereInput
    orderBy: [ApplicationOrderByInput!]
  ): ApplicationConnection!
}

type ApplicationConnection {
  edges: [ApplicationEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ApplicationEdge {
  node: Application!
  cursor: String!
}

input ApplicationWhereInput {
  search: String
  status: [ApplicationLifecycleStatus!]
}

enum ApplicationOrderField {
  NAME
  DISPLAY_NAME
  CREATED_AT
  UPDATED_AT
}

input ApplicationOrderByInput {
  field: ApplicationOrderField!
  direction: SortDirection!
}

type ApplicationAuthConfiguration {
  applicationId: ID!
  realmEnabled: Boolean!
  registrationMode: ApplicationRegistrationMode!
  emailVerificationRequired: Boolean!
  consentMode: ApplicationConsentMode!
  accessTokenTtlSeconds: Int!
  idTokenTtlSeconds: Int!
  refreshTokenTtlSeconds: Int!
  sessionTtlSeconds: Int!
  branding: ApplicationAuthBranding!
  defaultLocale: LocaleCode!
  supportedLocales: [LocaleCode!]!
  trustedOrigins: [ApplicationAuthTrustedOrigin!]!
  protocolUrls: ApplicationAuthProtocolUrls!
  emailDelivery: ApplicationAuthEmailDeliveryConfiguration!
  authMethod(id: ApplicationAuthMethodId!): ApplicationAuthMethod!
  authMethods: [ApplicationAuthMethod!]!
  provider(name: ApplicationAuthProviderName!): ApplicationAuthProvider!
  providers: [ApplicationAuthProvider!]!
  revision: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ApplicationAuthMethod {
  id: ApplicationAuthMethodId!
  availableCapabilities: [ApplicationAuthMethodCapability!]!
  enabledCapabilities: [ApplicationAuthMethodCapability!]!
  configured: Boolean!
  revision: Int!
  updatedAt: DateTime
  updatedBy: ID
}

type ApplicationAuthBranding {
  displayName: String
  headline: String
  logoUrl: String
  primaryColor: ApplicationAuthPrimaryColor
  backgroundColor: ApplicationAuthBackgroundColor
}

type ApplicationAuthTrustedOrigin {
  origin: String!
  createdAt: DateTime!
}

type ApplicationAuthProviderCallbackUrl {
  provider: ApplicationAuthProviderName!
  url: String!
}

type ApplicationAuthProtocolUrls {
  issuer: String!
  oidcDiscoveryUrl: String!
  oauthAuthorizationServerMetadataUrl: String!
  authorizationUrl: String!
  tokenUrl: String!
  jwksUrl: String!
  revocationUrl: String!
  endSessionUrl: String!
  providerCallbackUrls: [ApplicationAuthProviderCallbackUrl!]!
}

type ApplicationAuthEmailDeliveryConfiguration {
  configured: Boolean!
  transportProfile: String
  senderIdentity: String
  emailVerificationTemplateId: String
  passwordResetTemplateId: String
  emailOtpSignInTemplateId: String
  updatedAt: DateTime
  updatedBy: ID
}

type ApplicationAuthProvider {
  applicationId: ID!
  provider: ApplicationAuthProviderName!
  supported: Boolean!
  configured: Boolean!
  enabled: Boolean!
  maskedClientId: String
  scopes: [String!]!
  callbackUrl: String!
  revision: Int!
  updatedAt: DateTime
  updatedBy: ID
}

type ApplicationAuthProviderValidation {
  provider: ApplicationAuthProviderName!
  status: ApplicationAuthProviderValidationStatus!
  reasonCode: String
  revision: Int!
  checkedAt: DateTime!
}

type ApplicationOAuthClient implements Node {
  id: ID!
  organizationId: ID!
  applicationId: ID!
  clientId: String!
  name: String!
  clientType: ApplicationOAuthClientType!
  environment: ApplicationOAuthClientEnvironment!
  redirectUris: [String!]!
  postLogoutRedirectUris: [String!]!
  resources: [String!]!
  grantTypes: [String!]!
  responseTypes: [String!]!
  tokenEndpointAuthMethod: ApplicationOAuthTokenEndpointAuthMethod!
  requirePkce: Boolean!
  protocolPolicyVersion: Int!
  skipConsent: Boolean!
  enableEndSession: Boolean!
  disabled: Boolean!
  archived: Boolean!
  revision: Int!
  createdAt: DateTime!
  updatedAt: DateTime!
  archivedAt: DateTime
  createdBy: ID!
  updatedBy: ID!
}

type ApplicationOAuthClientConnection {
  edges: [ApplicationOAuthClientEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ApplicationOAuthClientEdge {
  node: ApplicationOAuthClient!
  cursor: String!
}

input ApplicationOAuthClientWhereInput {
  search: String
  clientType: [ApplicationOAuthClientType!]
  environment: [ApplicationOAuthClientEnvironment!]
  disabled: Boolean
  archived: Boolean
}

enum ApplicationOAuthClientOrderField {
  NAME
  CREATED_AT
  UPDATED_AT
}

input ApplicationOAuthClientOrderByInput {
  field: ApplicationOAuthClientOrderField!
  direction: SortDirection!
}

type ApplicationUser implements Node {
  id: ID!
  applicationId: ID!
  name: String!
  firstName: String
  lastName: String
  email: Email!
  emailVerified: Boolean!
  imageUrl: String
  status: ApplicationUserStatus!
  security: ApplicationUserSecurityMetadata!
  linkedAccounts: [ApplicationUserLinkedAccount!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ApplicationUserSecurityMetadata {
  activeSessionCount: Int!
  linkedAccountCount: Int!
  hasPasswordLogin: Boolean!
}

type ApplicationUserLinkedAccount implements Node {
  id: ID!
  provider: String!
  isOnlyLoginMethod: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ApplicationUserConnection {
  edges: [ApplicationUserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type ApplicationUserEdge {
  node: ApplicationUser!
  cursor: String!
}

input ApplicationUserWhereInput {
  search: String
  status: [ApplicationUserStatus!]
  emailVerified: Boolean
}

enum ApplicationUserOrderField {
  NAME
  EMAIL
  CREATED_AT
  UPDATED_AT
}

input ApplicationUserOrderByInput {
  field: ApplicationUserOrderField!
  direction: SortDirection!
}

input ApplicationCreateInput {
  organizationId: ID!
  name: String!
  displayName: String!
  description: String
}

input ApplicationUpdateInput {
  organizationId: ID!
  applicationId: ID!
  name: String
  displayName: String
  description: String
}

input ApplicationArchiveInput {
  organizationId: ID!
  applicationId: ID!
}

input ApplicationAuthUpdateInput {
  organizationId: ID!
  applicationId: ID!
  registrationMode: ApplicationRegistrationMode
  emailVerificationRequired: Boolean
  accessTokenTtlSeconds: Int
  idTokenTtlSeconds: Int
  refreshTokenTtlSeconds: Int
  sessionTtlSeconds: Int
  branding: ApplicationAuthBrandingInput
  defaultLocale: LocaleCode
  trustedOrigins: [String!]
  emailDelivery: ApplicationAuthEmailDeliveryInput
}

input ApplicationAuthRealmEnabledSetInput {
  organizationId: ID!
  applicationId: ID!
  enabled: Boolean!
}

input ApplicationAuthMethodUpdateInput {
  organizationId: ID!
  applicationId: ID!
  methodId: ApplicationAuthMethodId!
  enabledCapabilities: [ApplicationAuthMethodCapability!]!
}

input ApplicationAuthBrandingInput {
  displayName: String
  headline: String
  logoUrl: String
  primaryColor: ApplicationAuthPrimaryColor
  backgroundColor: ApplicationAuthBackgroundColor
}

input ApplicationAuthEmailDeliveryInput {
  transportProfile: String!
  senderIdentity: String!
  emailVerificationTemplateId: String!
  passwordResetTemplateId: String!
  emailOtpSignInTemplateId: String!
}

input ApplicationAuthProviderConfigureInput {
  organizationId: ID!
  applicationId: ID!
  provider: ApplicationAuthProviderName!
  clientId: String!
  clientSecret: String!
  scopes: [String!]!
}

input ApplicationAuthProviderUpdateInput {
  organizationId: ID!
  applicationId: ID!
  provider: ApplicationAuthProviderName!
  enabled: Boolean
  scopes: [String!]
}

input ApplicationAuthProviderCredentialsRotateInput {
  organizationId: ID!
  applicationId: ID!
  provider: ApplicationAuthProviderName!
  clientId: String!
  clientSecret: String!
}

input ApplicationAuthProviderCredentialsDeleteInput {
  organizationId: ID!
  applicationId: ID!
  provider: ApplicationAuthProviderName!
}

input ApplicationAuthProviderValidateInput {
  organizationId: ID!
  applicationId: ID!
  provider: ApplicationAuthProviderName!
}

input ApplicationOAuthClientCreateInput {
  organizationId: ID!
  applicationId: ID!
  name: String!
  clientType: ApplicationOAuthClientType!
  environment: ApplicationOAuthClientEnvironment!
  redirectUris: [String!]!
  postLogoutRedirectUris: [String!]
  skipConsent: Boolean
  enableEndSession: Boolean
}

input ApplicationOAuthClientUpdateInput {
  organizationId: ID!
  applicationId: ID!
  clientId: String!
  name: String
  environment: ApplicationOAuthClientEnvironment
  redirectUris: [String!]
  postLogoutRedirectUris: [String!]
  enableEndSession: Boolean
}

input ApplicationOAuthClientEnabledSetInput {
  organizationId: ID!
  applicationId: ID!
  clientId: String!
  enabled: Boolean!
}

input ApplicationOAuthClientSkipConsentSetInput {
  organizationId: ID!
  applicationId: ID!
  clientId: String!
  skipConsent: Boolean!
}

input ApplicationOAuthClientSecretRotateInput {
  organizationId: ID!
  applicationId: ID!
  clientId: String!
}

input ApplicationOAuthClientArchiveInput {
  organizationId: ID!
  applicationId: ID!
  clientId: String!
}

input ApplicationUserStatusSetInput {
  organizationId: ID!
  applicationId: ID!
  userId: ID!
}

input ApplicationUserSessionsRevokeAllInput {
  organizationId: ID!
  applicationId: ID!
  userId: ID!
}

input ApplicationUserAccountUnlinkInput {
  organizationId: ID!
  applicationId: ID!
  userId: ID!
  accountId: ID!
}

type ApplicationCreatePayload {
  application: Application
  userErrors: [GenericUserError!]!
}

type ApplicationUpdatePayload {
  application: Application
  userErrors: [GenericUserError!]!
}

type ApplicationArchivePayload {
  application: Application
  userErrors: [GenericUserError!]!
}

type ApplicationAuthUpdatePayload {
  configuration: ApplicationAuthConfiguration
  userErrors: [GenericUserError!]!
}

type ApplicationAuthMethodPayload {
  authMethod: ApplicationAuthMethod
  userErrors: [GenericUserError!]!
}

type ApplicationAuthProviderPayload {
  provider: ApplicationAuthProvider
  userErrors: [GenericUserError!]!
}

type ApplicationAuthProviderValidationPayload {
  validation: ApplicationAuthProviderValidation
  userErrors: [GenericUserError!]!
}

type ApplicationOAuthClientPayload {
  client: ApplicationOAuthClient
  userErrors: [GenericUserError!]!
}

type ApplicationOAuthClientCreatePayload {
  client: ApplicationOAuthClient
  clientSecret: String
  userErrors: [GenericUserError!]!
}

type ApplicationOAuthClientSecretRotatePayload {
  client: ApplicationOAuthClient
  clientSecret: String
  userErrors: [GenericUserError!]!
}

type ApplicationUserPayload {
  user: ApplicationUser
  userErrors: [GenericUserError!]!
}

type ApplicationUserSessionsRevokeAllPayload {
  user: ApplicationUser
  revokedCount: Int!
  userErrors: [GenericUserError!]!
}

type ApplicationUserAccountUnlinkPayload {
  user: ApplicationUser
  unlinkedAccountId: ID
  userErrors: [GenericUserError!]!
}

type ApplicationQuery {
  application(organizationId: ID!, id: ID!): Application

  applications(
    organizationId: ID!
    first: Int
    after: String
    last: Int
    before: String
    where: ApplicationWhereInput
    orderBy: [ApplicationOrderByInput!]
  ): ApplicationConnection!
}

type ApplicationMutation {
  applicationCreate(input: ApplicationCreateInput!): ApplicationCreatePayload!

  applicationUpdate(input: ApplicationUpdateInput!): ApplicationUpdatePayload!

  applicationArchive(input: ApplicationArchiveInput!): ApplicationArchivePayload!

  applicationAuthUpdate(input: ApplicationAuthUpdateInput!): ApplicationAuthUpdatePayload!

  applicationAuthRealmEnabledSet(
    input: ApplicationAuthRealmEnabledSetInput!
  ): ApplicationAuthUpdatePayload!

  applicationAuthMethodUpdate(
    input: ApplicationAuthMethodUpdateInput!
  ): ApplicationAuthMethodPayload!

  applicationAuthProviderConfigure(
    input: ApplicationAuthProviderConfigureInput!
  ): ApplicationAuthProviderPayload!

  applicationAuthProviderUpdate(
    input: ApplicationAuthProviderUpdateInput!
  ): ApplicationAuthProviderPayload!

  applicationAuthProviderCredentialsRotate(
    input: ApplicationAuthProviderCredentialsRotateInput!
  ): ApplicationAuthProviderPayload!

  applicationAuthProviderCredentialsDelete(
    input: ApplicationAuthProviderCredentialsDeleteInput!
  ): ApplicationAuthProviderPayload!

  applicationAuthProviderValidate(
    input: ApplicationAuthProviderValidateInput!
  ): ApplicationAuthProviderValidationPayload!

  applicationOAuthClientCreate(
    input: ApplicationOAuthClientCreateInput!
  ): ApplicationOAuthClientCreatePayload!

  applicationOAuthClientUpdate(
    input: ApplicationOAuthClientUpdateInput!
  ): ApplicationOAuthClientPayload!

  applicationOAuthClientEnabledSet(
    input: ApplicationOAuthClientEnabledSetInput!
  ): ApplicationOAuthClientPayload!

  applicationOAuthClientSkipConsentSet(
    input: ApplicationOAuthClientSkipConsentSetInput!
  ): ApplicationOAuthClientPayload!

  applicationOAuthClientSecretRotate(
    input: ApplicationOAuthClientSecretRotateInput!
  ): ApplicationOAuthClientSecretRotatePayload!

  applicationOAuthClientArchive(
    input: ApplicationOAuthClientArchiveInput!
  ): ApplicationOAuthClientPayload!

  applicationUserBlock(input: ApplicationUserStatusSetInput!): ApplicationUserPayload!

  applicationUserUnblock(input: ApplicationUserStatusSetInput!): ApplicationUserPayload!

  applicationUserSessionsRevokeAll(
    input: ApplicationUserSessionsRevokeAllInput!
  ): ApplicationUserSessionsRevokeAllPayload!

  applicationUserAccountUnlink(
    input: ApplicationUserAccountUnlinkInput!
  ): ApplicationUserAccountUnlinkPayload!
}

extend type Query {
  applicationQuery: ApplicationQuery!
}

extend type Mutation {
  applicationMutation: ApplicationMutation!
}
```

## 6. Permissions и audit

### 6.1. RBAC contract

Permissions следуют текущей модели `@shopana/rbac`: permission — это пара `resource + action`, а не
составная строка с произвольным action. Для organization domain используются только actions
`read | write | admin` с действующей Casbin-иерархией:

```text
admin -> write -> read
```

Новые organization resources:

- `org.applications` — metadata и lifecycle application;
- `org.application-auth` — realm/auth configuration, origins, branding и localization;
- `org.application-auth-providers` — social provider configuration и credentials;
- `org.application-oauth-clients` — OAuth clients, их lifecycle и secrets;
- `org.application-users` — application-user security administration.

Матрица GraphQL operation -> Casbin permission:

| Operations                                                             | Domain | Resource                         | Action  |
| ---------------------------------------------------------------------- | ------ | -------------------------------- | ------- |
| list/get application                                                   | `org`  | `org.applications`               | `read`  |
| create/update application                                              | `org`  | `org.applications`               | `write` |
| archive application                                                    | `org`  | `org.applications`               | `admin` |
| get auth configuration, resource и protocol URLs                       | `org`  | `org.application-auth`           | `read`  |
| update auth methods/policy, origins, branding/localization             | `org`  | `org.application-auth`           | `write` |
| enable/disable realm и security-sensitive realm lifecycle operations   | `org`  | `org.application-auth`           | `admin` |
| get provider status                                                    | `org`  | `org.application-auth-providers` | `read`  |
| enable/disable provider, update non-secret provider settings           | `org`  | `org.application-auth-providers` | `write` |
| configure, rotate, validate или delete provider credentials            | `org`  | `org.application-auth-providers` | `admin` |
| list/get OAuth client                                                  | `org`  | `org.application-oauth-clients`  | `read`  |
| create/update/enable/disable OAuth client                              | `org`  | `org.application-oauth-clients`  | `write` |
| rotate client secret, change `skipConsent`, archive/hard-delete client | `org`  | `org.application-oauth-clients`  | `admin` |
| list/get application user и linked-account status                      | `org`  | `org.application-users`          | `read`  |
| block/unblock application user                                         | `org`  | `org.application-users`          | `write` |
| revoke all sessions и unlink account                                   | `org`  | `org.application-users`          | `admin` |

`organizationId` приходит из Admin GraphQL input/arguments, валидируется как tenant selector и
передается в `AuthProvider.authorize` вместе с trusted platform actor. Domain равен `org`;
application ID не кодируется в Casbin domain или resource. Tenant isolation обеспечивается
organization-filtered enforcer и обязательным application ownership predicate по
`applicationId + organizationId`; само наличие `organizationId` в input не доказывает доступ actor к
organization.

Для подключения permissions нужно:

1. Добавить resources в `packages/rbac/src/definitions.ts`.
2. Выдать `admin` для всех пяти resources стандартной organization-роли `admin`; роль `member` не
   получает их по умолчанию.
3. Обновить resource registry и существующие standard-role policies через штатную idempotent RBAC
   initialization/migration.
4. Инвалидировать Casbin enforcer cache после изменения policies.
5. Проверить матрицу для owner, organization `admin`, custom role с `read`/`write`/`admin`,
   organization `member`, unauthenticated actor и actor другой organization.

### 6.2. Audit

Чтение status и secret/security operations разделяются через actions `read` и `admin` одного
resource.

Текущий `ApplicationAuthAuditService` не является administrative audit boundary. Он сохраняет
текущую best-effort семантику для operational events публичного application-auth runtime
(`provider_callback`, `account_link`, `account_unlink`): optional `ApplicationAuthAuditPort`,
redacted fallback logging и отсутствие влияния delivery failure на protocol flow. Admin GraphQL не
расширяет этот сервис administrative actions и не использует его для аудита mutations.

Administrative audit проходит через отдельный `ApplicationAuthAdminAuditPort`, который явно
вызывается management service. Автоматический Better Auth Infrastructure `dash()` не считается
покрытием Admin API: platform Better Auth здесь только валидирует admin session, а application
settings, providers, OAuth clients и user security actions изменяются Shopana services/repositories
вне Better Auth handler hooks.

До выбора storage adapter обязателен compatibility/contract spike Better Auth Infrastructure
Enterprise. Spike должен подтвердить на exact версии и enterprise contract:

1. Наличие supported server-side custom audit-record ingestion, а не только automatic tracked auth
   events.
2. Возможность передать closed Shopana schema: action, outcome/reason category, platform actor,
   organization, application, optional target, request ID, timestamp и allowlisted safe diff.
3. Durable acknowledgement, idempotency по `recordId`, ordering requirements и documented failure
   behavior.
4. Retention не менее 180 дней, organization isolation, access control, log drain/export, data
   residency и deletion/legal-hold contract.
5. Совместимость с fail-closed требованием: security-sensitive admin mutation не считается успешной,
   если durable audit record не гарантирован.
6. Отсутствие secret values в SDK diagnostics, retries, transport errors, provider dashboard и log
   drain payload.

По результату spike фиксируется один из двух adapters:

- `BetterAuthInfrastructureAdminAuditAdapter`, если supported custom ingestion и все гарантии
  подтверждены executable spike и enterprise contract;
- local transactional append-only adapter + durable export/outbox, если Better Auth не поддерживает
  custom records, нужную retention или fail-closed/atomic delivery contract.

Нельзя подменять durable administrative audit записью в Pino/logger. Если выбранный remote adapter
не может атомарно связать durable acknowledgement с IAM transaction, используется local
transaction/outbox; успешный remote append до откативающейся DB mutation не должен оставлять ложный
success record.

Admin audit record имеет closed versioned schema с `recordId`, `schemaVersion`, `occurredAt`,
`category=application_auth_admin`, closed `action`, `outcome`, closed `reasonCategory`,
`actorType=platform_admin`, stable platform `actorId`, `organizationId`, `applicationId`, optional
`targetType/targetId`, `requestId` и action-specific `safeDiff`. Platform actor не хешируется
application realm secret: его identity должна оставаться стабильной между applications и после realm
secret rotation.

Все write, admin и secret operations записывают success/failure admin audit record. `safeDiff`
формируется только из allowlist конкретного action; GraphQL input/variables, exception context, full
URI/query, email, secret, credential, token, code, OTP, provider response и ненужные PII не
сериализуются в audit/logs/traces/metrics.

## 7. Validation и ошибки

- Ownership failures не раскрывают существование ресурса другой organization.
- Business/validation failures возвращаются через стандартные GraphQL `userErrors`.
- Unexpected database/crypto failures возвращаются как generic internal error и безопасно
  логируются.
- URI проверяются exact match policy: HTTPS в production, localhost HTTP только для development, без
  wildcard/fragment/userinfo; mobile schemes — только по отдельной allowlist policy.
- Write mutations применяют изменения к текущему состоянию после проверки tenant scope и domain
  invariants.

## 8. Этапы реализации

### Этап 0. Зафиксировать GraphQL и authorization contract

1. Утвердить queries, mutations, payloads и `userErrors`.
2. Утвердить матрицу `GraphQL operation -> org resource -> read|write|admin` и добавить
   resources/standard-role policies в `@shopana/rbac`.
3. Зафиксировать trusted actor из platform session, существующую передачу `organizationId` через
   Admin GraphQL input/arguments и ownership semantics.
4. Зафиксировать one-time secret response и redaction contract.
5. Выполнить Better Auth Infrastructure Enterprise administrative-audit spike и зафиксировать
   `ApplicationAuthAdminAuditPort`, adapter, schema, retention и fail-closed/transaction contract.

Критерий выхода: client-controlled `organizationId` используется только как tenant selector и не
дает доступа без Casbin и ownership checks; ни один client-controlled input не задает protocol
grant, resource audience, signed claim или secret storage policy; administrative audit имеет
проверенный durable adapter и не полагается на automatic Better Auth tracked events.

### Этап 1. Applications и auth settings

1. Добавить application CRUD/list/read/archive.
2. Добавить revisioned auth settings mutations.
3. Добавить read-only canonical resource и запрет его передачи/изменения через GraphQL DTO и
   repository.
4. Добавить origins, branding/localization и вычисляемые protocol URLs.
5. Добавить permissions и durable admin audit records через `ApplicationAuthAdminAuditPort`.

Критерий выхода: organization admin настраивает application realm и не может изменить application
другой organization.

### Этап 2. Providers

1. Добавить generic provider status/configuration mutations с закрытым enum, синхронизированным с
   code-owned catalog.
2. Реализовать enable/disable и credential rotation.
3. Добавить безопасную validation operation без раскрытия credentials/tokens.
4. Подключить cache invalidation и durable admin audit records через
   `ApplicationAuthAdminAuditPort`.

Критерий выхода: provider можно безопасно настроить без ручной БД, а secret невозможно прочитать
обратно.

### Этап 3. OAuth clients

Выполнить этапы детализированного
[плана API управления OAuth clients](./application-oauth-client-management-api-plan.ru.md), включая
repository/service integration, GraphQL operations, one-time secret rotation, protocol-policy
enforcement и explicit durable audit через `ApplicationAuthAdminAuditPort` по contract раздела 6.2
настоящего плана.

Критерий выхода: organization admin управляет clients своего application, но не может включить
`client_credentials`, изменить grants/resource или получить сохраненный secret.

### Этап 4. Application user security actions

1. Добавить list/get application users.
2. Добавить block/unblock и revoke-all-sessions.
3. Добавить безопасные account list/unlink operations.
4. Подключить permissions, tenant isolation и durable admin audit records через
   `ApplicationAuthAdminAuditPort`.

Критерий выхода: security actions немедленно отражаются в live validation/refresh lifecycle и не
раскрывают credentials или данные другого realm.

### Этап 5. Hardening и документация

1. Выполнить negative tenant/authorization/secret lifecycle scenarios.
2. Проверить redaction logs/traces/metrics/audit.
3. Проверить cache rebuild после mutations.
4. Подготовить документацию organization admin и operations runbooks.

Критерий выхода: organization admin полностью управляет realm без DB/manual config в пределах
protocol policy предыдущего плана.

## 9. Обязательные сценарии проверки

- platform admin session обязательна для Admin GraphQL operations;
- admin organization A не читает и не меняет application B;
- GraphQL возвращает ровно один application resource read-only и не принимает его через
  application/OAuth client input;
- application create/provisioning input не принимает resource, а IAM формирует его как
  `urn:shopana:application:{applicationId}`;
- provider secrets/tokens отсутствуют в GraphQL/logs/errors/audit;
- unknown provider enum/value отклоняется до repository mutation;
- provider нельзя enable без сохраненных credentials, catalog-approved scopes и provider-specific
  security validation;
- config revision предотвращает lost update;
- confidential client secret показывается только при create/rotate;
- rotation инвалидирует старый secret;
- GraphQL не принимает и не изменяет grants/response types/resource policy клиента;
- `client_credentials` нельзя включить ни для public, ни для confidential client;
- block/revoke немедленно влияет на session/refresh validation;
- unlink не пересекает applications и не удаляет последний login method;
- application user session не авторизует management operation;
- `buildAdminContextMiddleware` вызывается для `/graphql` и не вызывается для public auth routes;
- public reverse proxy не публикует `/graphql`;
- automatic Better Auth `dash()` events не считаются administrative audit без явной записи через
  `ApplicationAuthAdminAuditPort`;
- administrative audit покрывает success/failure всех write/security mutations без secret values;
- ошибка durable admin audit отклоняет/откатывает mutation без ложного success record;
- ошибка operational `ApplicationAuthAuditPort` не ломает public auth protocol flow и увеличивает
  durable failure counter;
- audit retention, organization access control и log drain/export соответствуют зафиксированному
  enterprise/local adapter contract.

## 10. Предполагаемые изменения файлов

```text
services/iam/src/api/graphql-admin/application/*
services/iam/src/api/graphql-admin/application-auth/*
services/iam/src/api/graphql-admin/application-provider/*
services/iam/src/api/graphql-admin/application-oauth-client/*
services/iam/src/api/graphql-admin/application-user/*
services/iam/src/services/ApplicationOAuthClientManagementService.ts
services/iam/src/services/ApplicationAuthAdminAuditPort.ts
services/iam/src/infrastructure/audit/BetterAuthInfrastructureAdminAuditAdapter.ts
services/iam/src/infrastructure/audit/LocalApplicationAuthAdminAuditAdapter.ts
services/iam/src/repositories/ApplicationAuthAdminAuditRepository.ts
services/iam/src/repositories/models/application-auth-admin-audit.ts
services/iam/src/casbin/*
services/iam/migrations/*
packages/rbac/src/definitions.ts
e2e/tests/iam-api/application-auth-admin/*
```

Реализуется только один infrastructure adapter, выбранный по результату этапа 0. Local
repository/model/migration нужны только если Better Auth Enterprise не подтвердит custom ingestion и
требуемые delivery/atomicity guarantees. Текущий `ApplicationAuthAuditService` в рамках этого плана
не изменяется. Точные пути resolver и action должны соответствовать существующей структуре IAM и
проектному resolver pattern на момент реализации.

## 11. Definition of Done

1. Admin API реализован только после готовности предыдущего OAuth/OIDC runtime plan.
2. Organization admin управляет application settings, providers, OAuth clients и application user
   security actions через Admin GraphQL.
3. Каждая операция использует trusted actor из platform session, `organizationId` из Admin GraphQL
   input/arguments, Casbin и ownership checks.
4. Application user session и public application handler не дают административного доступа.
5. Protocol grants, PKCE и resource policy нельзя ослабить через GraphQL.
6. Provider/client secrets защищены, возвращаются только там, где предусмотрен one-time response, и
   отсутствуют в observability/audit.
7. Tenant isolation подтверждена negative scenarios.
8. Revisioned mutations предотвращают lost update и корректно инвалидируют runtime cache.
9. Все security-sensitive writes явно аудируются через `ApplicationAuthAdminAuditPort`; durable
   audit failure отклоняет/откатывает mutation, а operational `ApplicationAuthAuditService`
   сохраняет best-effort protocol semantics.
10. Все operations используют зарегистрированную пару `org.* resource + read|write|admin`; standard
    organization `admin` и custom roles получают ожидаемые permissions после Casbin cache
    invalidation.
11. Organization admin может полностью настроить realm без прямой работы с БД или конфигурационными
    файлами.
12. Добавление catalog-approved provider не создает отдельный GraphQL field, application
    configuration column или provider-specific mutation.
