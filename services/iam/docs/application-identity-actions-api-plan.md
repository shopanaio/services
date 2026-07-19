# IAM Application Identity Actions API — план реализации

Статус: design proposal  
Область: `services/iam`, `packages/broker-types`  
Дата: 2026-07-19

## 1. Цель

Добавить в IAM внутренний Actions API, через который другие сервисы Shopana смогут строить собственный identity/auth слой поверх изолированных `iam.application_user` realms.

API должен:

- работать через `ServiceBroker`, без прямого доступа других сервисов к IAM БД или Better Auth;
- всегда исполняться в обязательном `applicationId` scope;
- предоставлять полный transport-neutral lifecycle email/password authentication;
- получать текущего `ApplicationUser` по access token и возвращать только запрошенные поля;
- иметь GraphQL-подобные `selection`, `args`, nested selections, aliases, `data` и errors;
- использовать `@shopana/type-resolver` и resolver classes, как `catalog.query`;
- сохранять session revocation semantics: валидная JWT-подпись без живой IAM session недостаточна;
- не смешивать application users с platform/admin users и существующим `iam.authorize`.

## 2. Что уже есть

В IAM уже реализована основа application realm:

- `ApplicationAuthFactory` создаёт и кеширует Better Auth instance по `applicationId` и версии конфигурации;
- `createApplicationAuth()` задаёт отдельные cookies, audience, JWT claims и scoped adapter;
- `createScopedDrizzleAdapter()` принудительно добавляет `applicationId` ко всем auth reads/writes;
- таблицы `application_user`, `application_account`, `application_session`, `application_verification`, `application_jwks` физически изолированы по application;
- `ApplicationUserRepositoryFactory.forApplication(applicationId)` предоставляет scoped management repository;
- `AuthSessionRepositoryFactory.forApplication(applicationId)` умеет проверять и отзывать application sessions;
- JWT содержит `actor_type=application_user`, `application_id` и `sid`;
- `catalog.query` уже показывает нужный способ исполнения typed selection через root resolver и `BaseType.load()`.

Недостающие части:

- нет broker actions для application auth;
- нет resolver tree для application identity;
- нет application-scoped аналога `UserRepository.validateAccessJwt()`;
- нет repository, который загружает активную `iam.application` и строит доверенную `ApplicationAuthConfiguration`;
- нет typed contracts в `@shopana/broker-types`;
- существующий `ServiceContext.currentUser` описывает только platform user;
- существующий `iam.getCurrentUser` обслуживает только platform/admin realm.

## 3. Основные решения

### 3.1. Два action entry point

Предлагаемые action names:

- `iam.applicationQuery` — read-only operation, может содержать несколько root fields;
- `iam.applicationMutation` — side effects, ровно один root field на вызов.

Не использовать локальное имя `application.query`: текущий `ServiceBroker.qualifyAction()` считает любое имя с точкой уже fully-qualified и не добавит префикс `iam`.

Разделение query/mutation обязательно. `@shopana/type-resolver` исполняет поля одного уровня параллельно, поэтому несколько auth mutations в одном selection не будут иметь GraphQL mutation semantics. Правило «одна root mutation» делает порядок и retry behavior однозначными.

### 3.2. Realm выбирает IAM, а не вызывающий сервис

Caller передаёт только `applicationId`. IAM:

1. загружает активную `iam.application` вместе с активной organization;
2. строит конфигурацию realm из доверенных IAM данных;
3. передаёт её в `ApplicationAuthFactory.forApplication()`;
4. никогда не принимает от caller `issuer`, `audience`, `trustedOrigins`, cookie settings или provider secrets.

Для первого релиза core login/logout достаточно текущих defaults из `createApplicationAuth()` и `application.updatedAt` как `version`. Перед recovery, verification, email change и account delete потребуется расширить доверенную `ApplicationAuthConfiguration` опциями Better Auth `emailVerification`, `emailAndPassword.sendResetPassword` и `user.changeEmail/deleteUser`. Персистентная per-application auth configuration должна проектироваться отдельно; секреты social providers нельзя принимать через action params или хранить в открытом JSON.

### 3.3. Application principal отделён от platform principal

Новый контекст должен использовать discriminated principal:

```ts
type IamPrincipal =
  | {
      kind: "platform";
      userId: string;
      sessionId: string;
      user: User;
    }
  | {
      kind: "application";
      applicationId: string;
      userId: string;
      sessionId: string;
      user: ApplicationUser;
    };
```

Application resolvers/scripts обязаны проверять `principal.kind === "application"` и совпадение `principal.applicationId === context.application.id`. Platform organization/RBAC scripts не должны принимать application principal.

Миграцию контекста следует делать совместимо: существующий admin GraphQL и platform actions продолжают работать через platform branch.

### 3.4. `applicationId` — scope, а не permission

Текущий in-process broker не сообщает IAM identity вызывающего сервиса. Поэтому знание `applicationId` нельзя считать правом на административное чтение всех пользователей realm.

В public identity contract v1 разрешены:

- `currentUser`, полученный только из проверенного access token;
- собственные sessions текущего пользователя;
- self-service mutations.

Произвольные `user(id)`, `users`, block/unblock и удаление другого пользователя должны остаться в отдельном management API, когда появится service capability/caller identity или явная IAM policy.

### 3.5. IDs не кодируются как GraphQL Global ID

Actions API похож на GraphQL по форме, но не является GraphQL transport. Как и `catalog.query`, он возвращает domain IDs. `ApplicationUser.id`, `ApplicationSession.id` и `applicationId` передаются без `GlobalId` encoding.

## 4. Контракт actions

### 4.1. Общие request types

```ts
interface ApplicationActionRequest {
  applicationId: string;
  auth?: {
    accessToken: string;
  };
  request?: {
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

interface ApplicationQueryParams extends ApplicationActionRequest {
  selection: ApplicationQuerySelection;
}

interface ApplicationMutationParams extends ApplicationActionRequest {
  selection: ApplicationMutationSelection;
}
```

`auth.accessToken` играет роль GraphQL/HTTP `Authorization` metadata и не дублируется в arguments каждого authenticated field. `refreshToken`, password reset token и verification token являются inputs конкретных mutations.

Если `request.requestId` отсутствует, IAM создаёт `crypto.randomUUID()`. Нельзя использовать `Date.now()` как уникальный request ID.

### 4.2. Общий response envelope

```ts
type ApplicationActionResult<TData> =
  | {
      ok: true;
      data: TData;
      errors: [];
      extensions: { requestId: string };
    }
  | {
      ok: false;
      data: null;
      errors: ApplicationActionError[];
      extensions: { requestId: string };
    };

interface ApplicationActionError {
  code:
    | "INVALID_INPUT"
    | "INVALID_SELECTION"
    | "APPLICATION_NOT_FOUND"
    | "APPLICATION_DISABLED"
    | "UNAUTHENTICATED"
    | "TOKEN_SCOPE_MISMATCH"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR";
  message: string;
  path?: string[];
  retryable: boolean;
}
```

Разделение ошибок:

- transport/contract/system failures попадают в top-level `errors`;
- ожидаемые auth/domain failures конкретной mutation попадают в `payload.userErrors`;
- raw Better Auth/DB error messages наружу не возвращаются;
- invalid credentials и неизвестный email должны иметь одинаковый публичный ответ, чтобы не создавать user enumeration oracle.

Partial top-level data в v1 не поддерживается: query либо проходит целиком, либо возвращает `data: null`. Это сохраняет typed discriminated result и соответствует текущему broker pattern.

## 5. Query schema

Root resolver: `ApplicationQueryResolver`.

| Field | Auth | Результат | Назначение |
|---|---:|---|---|
| `currentUser` | access token | `ApplicationUserResolver \| null` | Текущий активный application user |
| `currentSession` | access token | `ApplicationSessionResolver \| null` | Session из JWT `sid` после live validation |
| `sessions` | access token | `[ApplicationSessionResolver!]!` | Все живые sessions текущего пользователя |

`currentUser` обязан выполнить полный validation pipeline:

1. verify signature по `application_jwks`;
2. verify `issuer`, `audience`, expiry;
3. проверить `actor_type === "application_user"`;
4. проверить claim `application_id === params.applicationId`;
5. извлечь `sub` и `sid`;
6. вызвать `authSession.forApplication(applicationId).validate(sub, sid)`;
7. убедиться, что application, organization и user всё ещё active.

Публичные поля `ApplicationUserResolver`:

- `id`;
- `applicationId`;
- `name`;
- `firstName`;
- `lastName`;
- `email`;
- `emailVerified`;
- `image`;
- `status`;
- `createdAt`;
- `updatedAt`.

`globalUserId` не включать в identity contract: это внутренняя IAM link и потенциальная корреляция identities между realms.

Публичные поля `ApplicationSessionResolver`:

- `id`;
- `ipAddress`;
- `userAgent`;
- `expiresAt`;
- `isCurrent`;
- `createdAt`;
- `updatedAt`.

Session token никогда не возвращать из session query.

### Пример query

```ts
const result = await broker.call<
  IAM.ApplicationQueryResult,
  IAM.ApplicationQueryParams
>("iam.applicationQuery", {
  applicationId,
  auth: { accessToken },
  selection: {
    populate: {
      me: {
        fieldName: "currentUser",
        fields: ["id", "email", "emailVerified", "name"],
      },
      sessions: {
        fields: ["id", "expiresAt", "isCurrent"],
      },
    },
  },
});
```

Успешный ответ:

```ts
{
  ok: true,
  data: {
    me: {
      id: "application-user-id",
      email: "user@example.com",
      emailVerified: false,
      name: "User"
    },
    sessions: [
      { id: "session-id", expiresAt: "...", isCurrent: true }
    ]
  },
  errors: [],
  extensions: { requestId: "..." }
}
```

## 6. Mutation schema

Root resolver: `ApplicationMutationResolver`. В одном request допускается ровно один key в `selection.populate`.

### 6.1. Credentials и tokens

| Field | Auth | Input | Основной payload |
|---|---:|---|---|
| `signUp` | нет | `email`, `password`, `name?`, `firstName?`, `lastName?` | `user`, `token`, `userErrors` |
| `signIn` | нет | `email`, `password` | `user`, `token`, `userErrors` |
| `signOut` | access token | `allSessions?: boolean` | `success`, `revokedCount`, `userErrors` |
| `tokenRefresh` | нет | `refreshToken` | `token`, `userErrors` |

Token payload:

```ts
interface ApplicationAuthToken {
  accessToken: string;  // JWT, 15 minutes by current config
  refreshToken: string; // opaque Better Auth session token
  expiresIn: number;
  tokenType: "Bearer";
}
```

`tokenRefresh` обязан проверить application-scoped session до выпуска новой JWT. `signOut` отзывает session по проверенному JWT `sid`; caller не передаёт произвольный session token для current-session logout.

### 6.2. Account self-service

| Field | Auth | Input | Payload |
|---|---:|---|---|
| `userUpdate` | access token | `name?`, `firstName?`, `lastName?`, `image?` | `user`, `userErrors` |
| `emailChange` | access token | `newEmail`, `callbackURL?` | `user`, `verificationRequired`, `userErrors` |
| `passwordChange` | access token | `currentPassword`, `newPassword`, `revokeOtherSessions?` | `success`, `userErrors` |
| `accountDelete` | access token | `password?`, `verificationToken?` | `success`, `userErrors` |

Все mutations изменяют только `principal.userId` в текущем application realm. `applicationId` и user ID нельзя брать из mutation input.

### 6.3. Password recovery и email verification

| Field | Auth | Input | Payload |
|---|---:|---|---|
| `passwordResetRequest` | нет | `email`, `redirectTo` | `accepted`, `userErrors` |
| `passwordReset` | нет | `token`, `newPassword` | `success`, `userErrors` |
| `verificationEmailSend` | access token или email flow token | `email?`, `callbackURL` | `accepted`, `userErrors` |
| `emailVerify` | нет | `token` | `user`, `userErrors` |

До включения этих полей IAM должен иметь доверенный per-application email delivery adapter. Action не должен принимать callback function, SMTP credentials или arbitrary template HTML. `passwordResetRequest` всегда возвращает одинаковый `accepted` для существующего и неизвестного email.

### 6.4. Session management

| Field | Auth | Input | Payload |
|---|---:|---|---|
| `sessionRevoke` | access token | `sessionId` | `success`, `userErrors` |
| `sessionsRevokeOthers` | access token | — | `revokedCount`, `userErrors` |
| `sessionsRevokeAll` | access token | — | `revokedCount`, `userErrors` |

`sessionRevoke` проверяет, что session принадлежит `principal.userId` и тому же `applicationId`. По умолчанию текущую session следует отзывать через `signOut`; явный revoke текущей session допустим, но после него текущий access token перестаёт проходить live validation.

### 6.5. Social OAuth и account linking

Current Better Auth configuration допускает `socialProviders`, а таблица `application_account` уже поддерживает provider accounts. Однако browser redirect/callback, state, PKCE и cookies не являются transport-neutral broker semantics.

Поэтому не маскировать OAuth generic action вида `{ path, method, body, headers }`. Для social auth нужен отдельный контракт после выбора владельца HTTP callback:

- IAM-hosted application auth routes; либо
- явные `socialSignInStart` / `socialSignInComplete` actions с одноразовой IAM transaction и PKCE state.

До этого решения Actions API считается полным для email/password, tokens, verification, recovery, self-service и sessions. Account listing/link/unlink добавляются вместе с social auth, а не частично в core contract.

### Пример mutation

```ts
const result = await broker.call<
  IAM.ApplicationMutationResult,
  IAM.ApplicationMutationParams
>("iam.applicationMutation", {
  applicationId,
  request: { ipAddress, userAgent },
  selection: {
    populate: {
      signIn: {
        args: {
          input: { email: "user@example.com", password: "secret" },
        },
        populate: {
          user: { fields: ["id", "email", "name"] },
          token: {
            fields: ["accessToken", "refreshToken", "expiresIn", "tokenType"],
          },
          userErrors: { fields: ["code", "message", "field"] },
        },
      },
    },
  },
});
```

Mutation root method возвращает payload resolver, а не plain object. Иначе `type-resolver` не применит nested selection к `user`, `token` и `userErrors`.

## 7. Resolver architecture

Предлагаемая структура:

```text
services/iam/src/
  actions/
    ApplicationIdentityBrokerActions.ts
  resolvers/application/
    ApplicationType.ts
    ApplicationQueryResolver.ts
    ApplicationMutationResolver.ts
    ApplicationUserResolver.ts
    ApplicationSessionResolver.ts
    payloads/
      AuthPayloadResolver.ts
      UserPayloadResolver.ts
      SuccessPayloadResolver.ts
      TokenResolver.ts
      UserErrorResolver.ts
  scripts/application-auth/
    ApplicationSignUpScript.ts
    ApplicationSignInScript.ts
    ApplicationTokenRefreshScript.ts
    ApplicationUserUpdateScript.ts
    ApplicationPasswordChangeScript.ts
    ApplicationEmailChangeScript.ts
    ApplicationPasswordResetRequestScript.ts
    ApplicationPasswordResetScript.ts
    ApplicationVerificationEmailSendScript.ts
    ApplicationEmailVerifyScript.ts
    ApplicationAccountDeleteScript.ts
  repositories/application/
    ApplicationRepository.ts
  repositories/application-user/
    ApplicationIdentityRepository.ts
  auth/
    ApplicationAccessTokenService.ts
  context/
    principals.ts
```

`ApplicationType` использует отдельный executor. Нельзя автоматически наследовать platform `IAMType` authorization middleware: Casbin organization roles относятся к platform users. Application authorization, если понадобится, должна быть отдельной policy model.

```ts
export abstract class ApplicationType<TValue, TData = TValue>
  extends BaseType<TValue, TData, ApplicationServiceContext> {
  static executor = createExecutor<ApplicationServiceContext>({
    onError: "throw",
  });
}
```

Read resolvers возвращают другие resolver instances. Mutation scripts инкапсулируют Better Auth calls и domain error mapping. Direct password/account writes через Drizzle запрещены.

## 8. Execution flow

```text
service
  -> broker.call("iam.applicationQuery|applicationMutation", params)
  -> Zod validation of outer params
  -> strict selection validation
  -> load active application + organization
  -> build trusted ApplicationAuthConfiguration
  -> ApplicationAuthFactory.forApplication(config)
  -> validate optional application access token once
  -> create ApplicationServiceContext and scoped loaders/repositories
  -> ApplicationQueryResolver.load() or ApplicationMutationResolver.load()
  -> resolver -> script/repository -> scoped Better Auth adapter
  -> selected payload fields only
  -> typed data/errors envelope
```

Access token validation нужно выполнять один раз при построении context, а не отдельно в `currentUser`, `currentSession` и каждой authenticated mutation.

## 9. Selection validation

Нельзя передавать `selection` напрямую в `BaseType.load()` без preflight validation. Runtime executor обращается к method name динамически и молча пропускает неизвестный method.

Добавить declarative allowlist/manifest для каждого resolver type и проверять:

- допустимые scalar fields;
- допустимые relation fields;
- обязательные/допустимые args;
- `fieldName` только из allowlist;
- запрет имён `constructor`, `$*`, `getCache`, `authProvider` и любых prototype/internal members;
- max depth, например 6;
- max selected nodes, например 100;
- max aliases одного field, например 10;
- max serialized request size на action boundary;
- наличие хотя бы одного selected field;
- ровно один root field для mutation;
- отсутствие side-effect fields в query resolver.

Selection contracts должны быть статически описаны в `packages/broker-types/src/actions/iam.ts` или отдельном `iam-application.ts`; runtime Zod schemas остаются в IAM service и проверяют ту же форму.

## 10. Security requirements

- Каждая repository query и Better Auth operation обязана быть scoped по `applicationId`.
- JWT из одного application никогда не принимается в другом, даже если `sub` совпал.
- Проверять не только JWT, но и live session/user/application/organization state.
- `blocked` application user не может войти, refresh token или использовать ранее выданную JWT; `setStatus("blocked")` уже удаляет его sessions.
- Passwords, refresh tokens, reset/verification tokens, OAuth codes и private JWK нельзя логировать.
- В structured logs оставлять только `requestId`, `applicationId`, operation, result code и duration; user ID — только при необходимости, email — не логировать.
- `ipAddress` и `userAgent` используются для session metadata и rate limiting, но считаются недоверенными caller metadata.
- Все public errors нормализуются; database constraint names и Better Auth stack traces остаются только во внутренних logs.
- Sign-up race должен завершаться стабильным `EMAIL_ALREADY_EXISTS`, а не raw unique-constraint error.
- Интерактивные auth mutations не запускать как DBOS workflows и не ретраить автоматически.
- `retryable=true` допустим только для инфраструктурной временной ошибки; invalid credentials/token и validation failures всегда non-retryable.

## 11. Изменения типов

В `@shopana/broker-types` добавить namespace types:

- `ApplicationQueryParams`, `ApplicationQueryResult`, `ApplicationQueryData`;
- `ApplicationMutationParams`, `ApplicationMutationResult`, `ApplicationMutationData`;
- typed selections для query, user, session, payload, token и user error;
- args/input types всех root mutations;
- stable error code unions;
- constants `IAM.ApplicationActionNames` и fully-qualified `IAM.ApplicationActions`.

Consumers не должны импортировать types из `@shopana/iam-service`.

Старые `iam.getCurrentUser`, `iam.authorize`, `iam.batchAuthorize`, `iam.createRoles` и `iam.assignRole` остаются без изменений. Новый API не является их replacement.

## 12. Этапы реализации

### Этап 1. Contract и realm bootstrap

1. Добавить broker types и action constants.
2. Добавить strict selection validator/manifest.
3. Добавить `ApplicationRepository.findActiveById()` с проверкой organization.
4. Добавить trusted config builder с `version=application.updatedAt`.
5. Ввести application principal/context без поломки platform context.
6. Зарегистрировать `ApplicationIdentityBrokerActions` в `IamModule`.

Результат: action boundary, realm isolation и error envelope существуют, resolver fields ещё минимальны.

### Этап 2. Read path

1. Реализовать `ApplicationAccessTokenService` для `application_jwks`.
2. Добавить live session validation через `AuthSessionRepository`.
3. Добавить application user/session loaders.
4. Реализовать `ApplicationQueryResolver`, user/session resolvers.
5. Поддержать aliases и field projection.

Результат: сервис может построить свой authenticated context через `currentUser`.

### Этап 3. Core authentication

1. Реализовать scoped identity repository поверх `ApplicationAuthFactory`.
2. Добавить `signUp`, `signIn`, `tokenRefresh`, `signOut` scripts.
3. Добавить payload/token/user-error resolvers.
4. Нормализовать Better Auth errors.
5. Проверить session metadata и no-secret logging.

Результат: полный login/logout/token lifecycle application user.

### Этап 4. Self-service и sessions

1. Добавить profile/email/password mutations.
2. Добавить list/revoke current/other/all sessions.
3. Добавить account delete policy.
4. Проверить немедленную инвалидизацию access JWT после session revoke/block.

### Этап 5. Recovery и verification

1. Спроектировать доверенную per-application mail delivery configuration.
2. Подключить Better Auth callbacks для verification/reset messages.
3. Добавить reset/verify actions и anti-enumeration behavior.
4. Версионировать конфигурацию и invalidation `ApplicationAuthFactory` cache.

### Этап 6. Social auth

1. Зафиксировать владельца browser callback.
2. Выбрать IAM routes либо start/complete action protocol.
3. Добавить provider account query/link/unlink только вместе с безопасным callback flow.

## 13. Проверки и сценарии покрытия

Подготовить отдельный contract/e2e spec для application actions со следующими сценариями:

- sign-up создаёт user/account/session только в выбранном application;
- одинаковый email допустим в двух applications;
- duplicate email в одном application возвращает стабильный user error;
- sign-in возвращает application-scoped JWT claims и refresh token;
- `currentUser` возвращает только выбранные поля;
- alias меняет response key, но вызывает разрешённый resolver method;
- токен application A отклоняется в application B;
- platform JWT отклоняется application action;
- expired/revoked session отклоняет ещё не истёкшую JWT;
- blocked user не может sign-in/refresh/query;
- deleted application или organization не обслуживает auth;
- refresh выпускает новую access JWT только для живой session;
- sign-out/revoke operations немедленно инвалидируют access JWT;
- session list не раскрывает session token;
- неизвестное field, internal method, слишком глубокий/большой selection отклоняются;
- mutation с нулём или двумя root fields отклоняется;
- malformed inputs возвращают стабильный path/code;
- invalid email/password не раскрывает существование account;
- response и logs не содержат password, private JWK или reset/refresh tokens вне явного token payload.

Для проверки реализации использовать project build через `shopana-cli`; не запускать `tsc` отдельно. Changeset вручную не редактировать.

## 14. Definition of Done

- Сервис-потребитель может выполнить sign-up, sign-in, refresh, sign-out и получить current application user без импорта IAM internals.
- Query/mutation requests и responses типизированы в `@shopana/broker-types`.
- GraphQL-подобный selection действительно управляет формой результата, включая nested payloads и aliases.
- Mutation action гарантирует один side effect на вызов.
- Любой read/write физически ограничен одним активным application realm.
- JWT проходит issuer/audience/realm/live-session validation.
- Platform users и application users не смешиваются в context, repositories и authorization.
- Нельзя выбрать internal resolver methods или получить лишние поля через произвольный `fieldName`.
- Business errors стабильны и не раскрывают чувствительные детали.
- Core API не зависит от HTTP cookies/redirects; social transport вынесен в явно спроектированный extension.

## 15. Не входит в этот API

- platform/admin authentication;
- organization/store Casbin RBAC (`iam.authorize` остаётся отдельным API);
- административный поиск/листинг/block/unblock application users;
- передача Better Auth config или provider secrets от caller;
- generic proxy к Better Auth HTTP routes;
- локальная проверка JWT в каждом сервисе через выдачу private/shared keys.

Если application users потребуется domain authorization, для него нужен отдельный application policy model и отдельный plan; нельзя переиспользовать platform organization roles только по совпадению user ID.
