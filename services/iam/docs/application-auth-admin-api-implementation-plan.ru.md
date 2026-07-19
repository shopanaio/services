# План реализации Admin API для application auth в IAM

Статус: проектный план  
Дата: 2026-07-19  
Сервис: `services/iam`  
Целевая область: административное управление application realms после завершения OAuth 2.1 / OIDC runtime

Связанные документы:

- [План OAuth 2.1 / OpenID Connect для `application_users`](./application-users-oauth-oidc-implementation-plan.ru.md) — обязательная предыдущая работа;
- [План API управления OAuth clients](./application-oauth-client-management-api-plan.ru.md) — детализированный подплан OAuth client management;
- [Compatibility и security spike OAuth Provider 1.6.23](./application-users-oauth-oidc-compatibility-spike.ru.md).

## 1. Место в последовательности реализации

Этот план выполняется **после полного завершения** плана OAuth 2.1 / OIDC для `application_users`. Предыдущий план создает и проверяет application-scoped runtime, модели, repositories, protocol policy, публичные HTTP endpoints, hosted UI, способы входа и Storefront validation. Для его contract-сценариев разрешена заранее подготовленная application-конфигурация и OAuth clients без пользовательского Admin API.

Настоящий план не меняет OAuth/OIDC protocol contract. Он добавляет административный GraphQL facade над уже готовыми domain services и repositories, чтобы organization admin мог управлять realm без ручной конфигурации и прямой работы с БД.

## 2. Цели

1. Дать organization admin полный Admin GraphQL API для application realms.
2. Использовать существующую platform Better Auth session и trusted organization context.
3. Проверять каждую операцию через Casbin и повторную organization/application ownership validation.
4. Не передавать platform admin credential в application Better Auth handler и не имперсонировать `application_user`.
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
  -> trusted admin actor + organization context
  -> Casbin permission
  -> organization/application ownership check
  -> application auth management service
  -> application-scoped repository/transaction
```

Admin GraphQL и `applicationAuthHttpPlugin` остаются sibling encapsulated Fastify plugins одного IAM instance/listener. `buildAdminContextMiddleware` и GraphQL hooks действуют только внутри `adminGraphqlPlugin`; `/graphql` не публикуется через public reverse proxy.

Application всегда повторно загружается по `applicationId`. `organizationId` берется из trusted admin context, а не из GraphQL input или произвольного claim. Application user session не авторизует ни одну административную операцию.

GraphQL resolvers следуют существующему IAM namespace и проектному resolver pattern. Resolver отвечает за GraphQL boundary, validation и authorization orchestration; изменения выполняются domain service через application-scoped repository, а не прямой записью из resolver.

## 5. Admin GraphQL contract

### 5.1. Applications и auth settings

Нужны операции:

- create/list/get/update/archive application;
- получить auth configuration;
- получить read-only canonical `application.resource`;
- обновить разрешенные auth methods и безопасные policy values;
- получить issuer, OIDC discovery URL, OAuth Authorization Server Metadata URL и рассчитанные callback URLs;
- управлять trusted origins;
- обновлять branding и localization.

Update принимает ожидаемую `revision` для optimistic concurrency.

Для Storefront application создается доверенным IAM provisioning action из `StoreCreateSaga`. IAM генерирует `applicationId` и immutable `resource=urn:shopana:application:{applicationId}`; Store передает только trusted owner binding и idempotency context. `resource` возвращается Admin GraphQL только read-only и отсутствует во всех application/OAuth client mutation inputs. Обычной операции изменения resource нет; изменение namespace или audience является отдельной versioned protocol migration, а не административной настройкой.

### 5.2. Social providers

Нужны операции:

- configure Google/Facebook provider;
- enable/disable provider;
- rotate credentials;
- удалить credentials только после disable;
- получить status без secret;
- опционально выполнить безопасную configuration validation.

GraphQL response возвращает только `configured`, `enabled`, допустимую masked client-id форму, scopes, callback URL, `updatedAt` и `updatedBy`. Provider secret и upstream tokens никогда не возвращаются.

### 5.3. OAuth clients

Полный контракт, storage policy и сценарии определены в [подплане API управления OAuth clients](./application-oauth-client-management-api-plan.ru.md).

Обязательный верхнеуровневый scope:

- list/get clients;
- create public/confidential client;
- update name, redirect URI, post-logout URI и Store binding;
- enable/disable/archive client;
- rotate confidential client secret с одноразовым возвратом;
- управлять `skipConsent` только для подтвержденных first-party clients.

Resolver после Casbin и ownership checks вызывает только `ApplicationOAuthClientManagementService`. GraphQL input не содержит `resource`, `resources`, `grantTypes` или `responseTypes`. Management service наследует `[application.resource]` и фиксирует:

```text
grant_types = ["authorization_code", "refresh_token"]
response_types = ["code"]
require_pkce = true
```

Эти значения возвращаются read-only. `client_credentials` нельзя включить ни через create/update, ни через metadata.

### 5.4. Application users

Нужны операции:

- list/get user только внутри application;
- block/unblock;
- revoke all sessions;
- list linked accounts без credentials/tokens;
- unlink допустимый account;
- получить security metadata без PII из других applications.

Администратор не может получить password hash, OTP, provider token, session token, authorization code или refresh token. Unlink не может удалить последний доступный login method.

## 6. Permissions и audit

Минимальный permission registry:

- `iam.application.read/write/archive`;
- `iam.application.auth.read/write`;
- `iam.application.provider.read/write`;
- `iam.application.oauth-client.read/write/rotate-secret`;
- `iam.application.user.read/block/revoke-session/unlink-account`.

Чтение status и ротация secret разделяются. Все write и secret operations создают audit event с actor, organization, application, operation, request ID, timestamp, безопасным diff и outcome category. Audit/logs/traces/metrics не содержат secret, credential, token, code, OTP или PII, не нужные для диагностики.

## 7. Validation и ошибки

- Ownership failures не раскрывают существование ресурса другой organization.
- Business/validation failures возвращаются через стандартные GraphQL `userErrors`.
- Unexpected database/crypto failures возвращаются как generic internal error и безопасно логируются.
- Store binding проверяется через internal Project action; Store и application должны принадлежать одной organization.
- URI проверяются exact match policy: HTTPS в production, localhost HTTP только для development, без wildcard/fragment/userinfo; mobile schemes — только по отдельной allowlist policy.
- Revision conflict предотвращает lost update.

## 8. Этапы реализации

### Этап 0. Зафиксировать GraphQL и authorization contract

1. Утвердить queries, mutations, payloads и `userErrors`.
2. Сопоставить каждую операцию с Casbin permission.
3. Зафиксировать trusted actor/organization context и ownership semantics.
4. Зафиксировать one-time secret response и redaction contract.
5. Утвердить internal Project action для Store ownership.

Критерий выхода: ни один client-controlled input не задает tenant, protocol grant, resource audience, signed claim или secret storage policy.

### Этап 1. Applications и auth settings

1. Добавить application CRUD/list/read/archive.
2. Добавить revisioned auth settings mutations.
3. Добавить read-only canonical resource и запрет его передачи/изменения через GraphQL DTO и repository.
4. Добавить origins, branding/localization и вычисляемые protocol URLs.
5. Добавить permissions и audit events.

Критерий выхода: organization admin настраивает application realm и не может изменить application другой organization.

### Этап 2. Providers

1. Добавить provider status/configuration mutations.
2. Реализовать enable/disable и credential rotation.
3. Добавить безопасную validation operation без раскрытия credentials/tokens.
4. Подключить cache invalidation и audit.

Критерий выхода: provider можно безопасно настроить без ручной БД, а secret невозможно прочитать обратно.

### Этап 3. OAuth clients

Выполнить этапы детализированного [плана API управления OAuth clients](./application-oauth-client-management-api-plan.ru.md), включая repository/service integration, GraphQL operations, Store ownership, one-time secret rotation и protocol-policy enforcement.

Критерий выхода: organization admin управляет clients своего application, но не может включить `client_credentials`, изменить grants/resource или получить сохраненный secret.

### Этап 4. Application user security actions

1. Добавить list/get application users.
2. Добавить block/unblock и revoke-all-sessions.
3. Добавить безопасные account list/unlink operations.
4. Подключить permissions, tenant isolation и audit.

Критерий выхода: security actions немедленно отражаются в live validation/refresh lifecycle и не раскрывают credentials или данные другого realm.

### Этап 5. Hardening и документация

1. Выполнить negative tenant/authorization/secret lifecycle scenarios.
2. Проверить redaction logs/traces/metrics/audit.
3. Проверить optimistic concurrency и cache rebuild после mutations.
4. Подготовить документацию organization admin и operations runbooks.

Критерий выхода: organization admin полностью управляет realm без DB/manual config в пределах protocol policy предыдущего плана.

## 9. Обязательные сценарии проверки

- platform admin session обязательна для Admin GraphQL operations;
- admin organization A не читает и не меняет application B;
- GraphQL возвращает ровно один application resource read-only и не принимает его через application/OAuth client input;
- Store provisioning input не принимает resource, а IAM формирует его как `urn:shopana:application:{applicationId}`;
- provider secrets/tokens отсутствуют в GraphQL/logs/errors/audit;
- config revision предотвращает lost update;
- confidential client secret показывается только при create/rotate;
- rotation инвалидирует старый secret;
- GraphQL не принимает и не изменяет grants/response types/resource policy клиента;
- `client_credentials` нельзя включить ни для public, ни для confidential client;
- Store другой organization нельзя привязать к client;
- block/revoke немедленно влияет на session/refresh validation;
- unlink не пересекает applications и не удаляет последний login method;
- application user session не авторизует management operation;
- `buildAdminContextMiddleware` вызывается для `/graphql` и не вызывается для public auth routes;
- public reverse proxy не публикует `/graphql`;
- audit покрывает все write/security mutations без secret values.

## 10. Предполагаемые изменения файлов

```text
services/iam/src/api/graphql-admin/application/*
services/iam/src/api/graphql-admin/application-auth/*
services/iam/src/api/graphql-admin/application-provider/*
services/iam/src/api/graphql-admin/application-oauth-client/*
services/iam/src/api/graphql-admin/application-user/*
services/iam/src/services/ApplicationOAuthClientManagementService.ts
services/iam/src/services/ApplicationAuthAuditService.ts
services/iam/src/casbin/*
services/iam/src/events/application-auth/*
services/e2e/.../iam/application-auth-admin/*
```

Точные пути resolver и action должны соответствовать существующей структуре IAM и проектному resolver pattern на момент реализации.

## 11. Definition of Done

1. Admin API реализован только после готовности предыдущего OAuth/OIDC runtime plan.
2. Organization admin управляет application settings, providers, OAuth clients и application user security actions через Admin GraphQL.
3. Каждая операция использует platform session, trusted organization context, Casbin и ownership checks.
4. Application user session и public application handler не дают административного доступа.
5. Protocol grants, PKCE и resource policy нельзя ослабить через GraphQL.
6. Provider/client secrets защищены, возвращаются только там, где предусмотрен one-time response, и отсутствуют в observability/audit.
7. Store ownership и tenant isolation подтверждены negative scenarios.
8. Revisioned mutations предотвращают lost update и корректно инвалидируют runtime cache.
9. Все security-sensitive writes аудируются.
10. Organization admin может полностью настроить realm без прямой работы с БД или конфигурационными файлами.
