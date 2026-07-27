# План headless OAuth interactions и Auth Components для IAM

Статус: проектный план  
Дата: 2026-07-27  
Сервис: `services/iam`  
Целевая область: headless login, signup, verification и consent для application realms  
Будущие пакеты: `packages/auth-core`, `packages/auth-react`

Связанные документы:

- [План OAuth 2.1 / OpenID Connect для `application_users`](./application-users-oauth-oidc-implementation-plan.ru.md);
- [Application auth OAuth/OIDC — operations](./application-users-oauth-oidc-integration.md);
- [План Admin API для application auth](./application-auth-admin-api-implementation-plan.ru.md);
- [План API управления OAuth clients](./application-oauth-client-management-api-plan.ru.md);
- [План social providers](./application-social-providers-refactoring-plan.ru.md).

## 1. Резюме решения

IAM должен предоставить headless interaction API, поверх которого можно строить
компоненты уровня Clerk:

```tsx
<ShopanaAuthProvider {...configuration}>
  <SignIn />
</ShopanaAuthProvider>
```

```tsx
<SignUp />
<Consent />
```

Headless API не заменяет OAuth 2.1 / OpenID Connect и не выдает application
session в обход Authorization Code flow. Он заменяет только presentation layer
hosted UI:

```text
OAuth client
  -> OAuth Authorization Code + S256 PKCE
  -> IAM authorization interaction
  -> SignIn / SignUp / Verification / Consent UI
  -> registered redirect_uri with code
  -> token exchange
```

Единый `ApplicationAuthInteractionService` становится владельцем orchestration.
Над ним работают два адаптера:

1. `ApplicationAuthHostedUiController` — существующий server-rendered HTML;
2. `ApplicationAuthInteractionController` — новый JSON API для SDK и
   пользовательских компонентов.

Better Auth остается владельцем:

- application user;
- credential/social account;
- application session;
- OAuth consent;
- authorization code;
- access/ID/refresh tokens;
- provider callback;
- email verification и password reset primitives.

IAM остается владельцем:

- публичного route manifest;
- application/client/origin policy;
- OAuth resource binding;
- authorization interaction;
- headless action contract;
- rate limiting;
- anti-enumeration;
- redirect validation;
- audit и безопасной ошибки;
- server-driven presentation metadata.

Внутренние Better Auth endpoints не публикуются как headless contract.

## 2. Мотивация

Текущий hosted UI реализован внутри
`src/api/http/application-auth/ui/ApplicationAuthHostedUiController.ts`.
Controller одновременно:

- читает и ротирует authorization context;
- создает CSRF;
- вызывает Better Auth;
- применяет rate limits;
- решает, какой шаг идет следующим;
- рендерит HTML;
- формирует browser redirects.

Такой controller безопасен для server-rendered UI, но не дает стабильного
headless contract. Простое добавление `Accept: application/json` в текущие
HTML routes создаст следующие проблемы:

- JSON и HTML начнут иметь неявно различающиеся состояния и ошибки;
- текущая authorization context cookie имеет `HttpOnly; SameSite=Lax` и не
  является надежным cross-site transport;
- текущие form routes требуют IAM same-origin `Origin`;
- внешний UI будет вынужден знать внутренний `oauth_query` Better Auth;
- внешний UI сможет случайно зависеть от undocumented Better Auth response;
- social callbacks, consent и redirect validation окажутся распределены между
  SDK и controller;
- изменение версии Better Auth станет breaking change публичного SDK.

Поэтому нужен IAM-owned interaction contract, не являющийся passthrough к
Better Auth.

## 3. Цели

1. Позволить storefront/application создавать собственные React UI для входа,
   регистрации, OTP и consent без обработки OAuth protocol internals.
2. Сохранить Authorization Code + S256 PKCE единственным пользовательским OAuth
   flow.
3. Сохранить IAM единственным владельцем credentials, sessions, consent и token
   lifecycle.
4. Использовать одну state machine для hosted HTML и headless JSON.
5. Не зависеть от third-party cookies для завершения headless interaction.
6. Не передавать password, OTP, provider token, authorization code или refresh
   token через URL, логи, audit либо browser-readable cookie.
7. Разрешать browser JavaScript читать headless responses только с exact
   `trustedOrigins`; не считать `Origin` аутентификацией небраузерного caller.
8. Сохранить application isolation во всех repository predicates и token
   bindings.
9. Предоставить framework-neutral `auth-core` и React adapter `auth-react`.
10. Сделать SDK server-driven: доступные методы и следующий шаг определяет IAM,
    а не компонент.
11. Сохранить стандартный hosted redirect flow для клиентов, которым headless
    UI не нужен.
12. Поддержать BFF и public SPA integration без смешивания их session storage
    policy.

## 4. Не входит в план

- implicit, password или `client_credentials` grants;
- отключение PKCE;
- Dynamic Client Registration;
- выдача token через Admin GraphQL;
- публикация Better Auth client/consent/account management endpoints;
- хранение client secret в browser SDK;
- использование local storage для password, OTP, access token или refresh
  token;
- универсальный visual design system;
- React Native, Flutter, native iOS или Android SDK в первой версии;
- magic links, passkeys, WebAuthn или MFA до отдельного protocol plan;
- iframe как основной способ доставки auth UI;
- third-party cookie как обязательная часть headless flow;
- произвольные OAuth providers, scopes или callback URL из browser input;
- произвольный HTML/CSS/JavaScript из application branding;
- изменение protocol policy v1;
- поддержка старой и новой interaction storage schema одновременно;
- backfill существующих interactions.

Проект не имеет stage/production данных. Миграция выполняется прямым cutover без
backward compatibility и backfill.

## 5. Термины

### 5.1. Application realm

Изолированная область authentication, принадлежащая одной `application`.
Имеет отдельные users, accounts, sessions, OAuth clients, consent, keys,
branding, trusted origins и issuer path.

### 5.2. OAuth client

Public или confidential client внутри application realm. Он задает:

- `client_id`;
- exact redirect URIs;
- post-logout redirect URIs;
- environment;
- first-party `skipConsent`;
- end-session policy.

### 5.3. Authorization interaction

Короткоживущая одноразовая server-side state machine, связывающая:

- application;
- OAuth client;
- redirect URI;
- state и nonce;
- S256 code challenge;
- resource;
- scopes;
- текущий UI step;
- при наличии — Better Auth application session;
- transport: `HOSTED`, `HEADLESS_BROWSER` или `HEADLESS_BFF`;
- exact trusted origin для `HEADLESS_BROWSER`;
- authenticated confidential client binding для `HEADLESS_BFF`.

### 5.4. Interaction credential

Случайный bearer secret, доступный только headless client. Он авторизует команды
конкретного interaction и не является:

- application session token;
- OAuth access token;
- authorization code;
- client secret.

### 5.5. Auth Components

UI adapters над `auth-core`, которые:

- отображают server-driven state;
- собирают пользовательский input;
- отправляют interaction action;
- не реализуют OAuth policy;
- не выбирают самостоятельно разрешенные auth methods;
- не обрабатывают confidential client credentials.

## 6. Архитектура

```text
┌─────────────────────────────────────────────────────────────────┐
│ OAuth client                                                    │
│                                                                 │
│  Custom UI                 Shopana React components             │
│      │                              │                           │
│      └──────────────┬───────────────┘                           │
│                     ▼                                           │
│              @shopana/auth-core                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS JSON
                      │ Authorization: Interaction <credential>
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│ IAM public application auth boundary                            │
│                                                                 │
│  ApplicationAuthInteractionController                           │
│                     │                                           │
│  ApplicationAuthHostedUiController                              │
│                     │                                           │
│                     ▼                                           │
│         ApplicationAuthInteractionService                       │
│          │              │              │                        │
│          ▼              ▼              ▼                        │
│  Interaction repo  Rate limiter  Redirect/origin policy         │
│          │                                                      │
│          ▼                                                      │
│  application-scoped Better Auth + OAuth Provider                │
└─────────────────────────────────────────────────────────────────┘
```

### 6.1. Обязательное разделение ответственности

`ApplicationAuthInteractionController`:

- HTTP method/path/content-type;
- exact CORS origin;
- request size;
- Zod parsing;
- interaction credential parsing;
- response serialization;
- `Cache-Control`, `Vary`, `nosniff`;
- request ID;
- mapping domain result в public JSON.

`ApplicationAuthInteractionService`:

- state transition;
- application/client/context binding;
- effective policy;
- Better Auth invocation;
- rate limiting orchestration;
- generic error normalization;
- context consumption;
- final redirect validation;
- audit command.

`ApplicationAuthInteractionRepository`:

- application-scoped lookup;
- credential hash comparison;
- TTL;
- optimistic state transition;
- session binding;
- terminal consumption;
- cleanup.

`ApplicationAuthPresentationService`:

- branding;
- supported locale;
- available auth methods;
- provider presentation metadata;
- scope catalog;
- client presentation;
- safe capabilities.

`ApplicationAuthHostedUiController`:

- HTML rendering;
- hosted context cookie;
- hosted action forms;
- HTML redirect.

`packages/auth-core`:

- JSON client;
- typed state machine;
- credential lifecycle;
- PKCE helpers для public SPA adapter;
- popup/redirect coordinator;
- no UI.

`packages/auth-react`:

- provider/context/hooks;
- default components;
- customization slots;
- accessibility и focus management;
- no protocol policy.

## 7. Главные архитектурные решения

### 7.1. REST, а не GraphQL

Headless interaction API является public authentication boundary и
реализуется REST routes внутри application issuer.

Причины:

- interaction credential имеет отдельную auth scheme;
- нужны точные method/path/content-type policies;
- нужны OAuth-style HTTP status и error semantics;
- нужен строгий CORS preflight allowlist;
- form/JSON body limits различаются;
- social redirect и terminal redirect являются HTTP concerns;
- Admin GraphQL не должен принимать password, OTP или interaction credential.

Admin GraphQL продолжает управлять application auth configuration, trusted
origins, providers и OAuth clients, но не пользовательскими interactions.

### 7.2. IAM-owned facade

Browser никогда не вызывает raw Better Auth endpoint как публичный SDK
contract. Controller вызывает `runtime.auth.handler()` внутренне и нормализует
результат.

Запрещено возвращать browser client:

- Better Auth `oauth_query`;
- внутренний consent reference;
- session ID;
- Better Auth error payload без нормализации;
- internal callback URL;
- raw plugin redirect до IAM validation.

### 7.3. Не зависеть от third-party cookies

Текущие application cookies используют `HttpOnly`, `Secure` в HTTPS и
`SameSite=Lax`. CORS с `credentials=true` не гарантирует доступность cookie,
если IAM и storefront являются cross-site.

Headless interaction поэтому использует explicit interaction credential в
`Authorization` header.

Application session, созданная Better Auth во время interaction, связывается
server-side с interaction. Если Better Auth требует session cookie для
последующего consent/continue, IAM сохраняет минимальный continuation credential
в зашифрованном виде на срок interaction и передает его только во внутренний
`runtime.auth.handler()`. Наличие session cookie в browser может улучшить
same-site повторный вход, но не является условием успешного headless flow.

Continuation credential не является новым видом постоянной сессии. Он:

- создается только из проверенного `Set-Cookie` Better Auth;
- шифруется application keyring с interaction-specific AAD;
- никогда не возвращается SDK;
- используется только Better Auth adapter;
- удаляется/становится недоступным при terminal consumption или expiry;
- инвалидируется вместе с application session.

### 7.4. Session integration отделена от presentation

Headless components завершают OAuth authorization и возвращают validated
redirect с code. Дальнейшая session strategy принадлежит OAuth client:

- BFF меняет code на tokens server-side и создает first-party HttpOnly cookie;
- public SPA меняет code с PKCE и применяет отдельный in-memory token strategy;
- confidential client никогда не передает client secret в browser.

`auth-core` не должен неявно выбирать BFF или SPA mode.

### 7.5. Server-driven UI

SDK отображает только то, что вернул IAM:

- текущий step;
- доступные actions;
- включенные методы;
- provider list;
- branding tokens;
- client name;
- consent scope descriptions;
- generic field/form errors.

SDK не вычисляет effective auth policy из Admin configuration.

### 7.6. Hosted и headless — два транспорта одной state machine

Hosted transport:

- подписанная `HttpOnly` context cookie;
- same-origin POST;
- action-specific CSRF;
- HTML response/303.

Headless transport:

- interaction bearer credential;
- exact trusted `Origin` для browser либо authenticated confidential
  server-start binding для BFF;
- JSON action;
- response state/validated redirect.

Business transitions и Better Auth operations должны быть общими.

## 8. State machine

### 8.1. Состояния

```typescript
type ApplicationAuthInteractionStep =
  | "SIGN_IN"
  | "SIGN_UP"
  | "EMAIL_OTP_CHALLENGE"
  | "EMAIL_VERIFICATION_PENDING"
  | "CONSENT"
  | "COMPLETE"
  | "DENIED"
  | "FAILED"
  | "EXPIRED";
```

`COMPLETE`, `DENIED`, `FAILED` и `EXPIRED` являются terminal.

### 8.2. Actions

```typescript
type ApplicationAuthInteractionAction =
  | "PASSWORD_SIGN_IN"
  | "PASSWORD_SIGN_UP"
  | "EMAIL_OTP_REQUEST"
  | "EMAIL_OTP_VERIFY"
  | "SOCIAL_SIGN_IN_START"
  | "SWITCH_TO_SIGN_IN"
  | "SWITCH_TO_SIGN_UP"
  | "VERIFICATION_RESEND"
  | "CONSENT_ALLOW"
  | "CONSENT_DENY"
  | "CANCEL";
```

Password reset и account connections остаются отдельными interaction kinds до
последующей унификации:

```typescript
type ApplicationAuthInteractionKind =
  | "OAUTH_AUTHORIZATION"
  | "PASSWORD_RESET"
  | "ACCOUNT_CONNECTION";
```

Первая поставка обязана полностью покрыть `OAUTH_AUTHORIZATION`.
`PASSWORD_RESET` может продолжать использовать hosted flow до отдельной фазы,
но React `<SignIn />` должен уметь вывести ссылку на hosted reset route.

### 8.3. Основные переходы

```text
START
  -> SIGN_IN
  -> SIGN_UP                  when prompt=create and signup is allowed
  -> CONSENT                  when a valid reusable application session exists
  -> COMPLETE                 when consent is not applicable or skipConsent is valid

SIGN_IN
  -> CONSENT                  successful sign-in, consent required
  -> COMPLETE                 successful sign-in, consent bypass/reuse
  -> SIGN_IN                  generic recoverable error
  -> SIGN_UP                  explicit switch, signup allowed
  -> EMAIL_OTP_CHALLENGE      OTP requested

SIGN_UP
  -> EMAIL_VERIFICATION_PENDING
                               generic accepted result when verification is required
  -> SIGN_IN                  generic accepted result when verification is not required
  -> SIGN_IN                  explicit switch

EMAIL_VERIFICATION_PENDING
  -> SIGN_IN                  one-time email callback confirms or handles existing account
  -> EMAIL_VERIFICATION_PENDING
                               generic resend result

EMAIL_OTP_CHALLENGE
  -> CONSENT                  successful sign-in, consent required
  -> COMPLETE                 successful sign-in, consent bypass/reuse
  -> EMAIL_OTP_CHALLENGE      invalid/expired code
  -> SIGN_IN                  explicit switch

CONSENT
  -> COMPLETE                 allow
  -> DENIED                   deny

Any non-terminal
  -> DENIED                   cancel; OAuth error access_denied
  -> FAILED                   non-recoverable integrity/dependency failure
  -> EXPIRED                  TTL exceeded
```

### 8.4. Transition invariants

Каждая команда должна:

1. загрузить active realm;
2. найти interaction по `applicationId + credentialHash`;
3. проверить transport-specific binding;
4. для `HEADLESS_BROWSER` проверить exact origin, для `HEADLESS_BFF` — что
   interaction создан authenticated server-start и credential не был выдан
   browser;
5. проверить `expiresAt > now` и `consumedAt IS NULL`;
6. проверить ожидаемый current step;
7. повторно загрузить active OAuth client;
8. повторно проверить redirect URI и resource binding;
9. применить current effective auth policy;
10. выполнить rate limit до Better Auth;
11. вызвать Better Auth только с server-owned callback/query fields;
12. определить следующий шаг;
13. для mutation атомарно claim action по `actionId + expectedRevision` до
    любого Better Auth/delivery side effect;
14. выполнить side effect с тем же server-generated `operationId`;
15. атомарно сохранить safe result и завершить transition;
16. consuming terminal transition выполнить атомарно вместе с encrypted terminal
    recovery result;
17. вернуть только safe presentation state.

Проверка `consumedAt IS NULL` относится к mutations. `GET current` использует
отдельный read-only lookup, который допускает terminal consumed row только пока
`terminalResultAvailableUntil > now`.

Каждая post-start mutation-команда содержит:

```typescript
interface InteractionMutationMeta {
  actionId: string; // random UUID/128-bit value, новый для намерения пользователя
  expectedRevision: number;
}
```

`actionId` генерируется SDK один раз и сохраняется до получения определенного
ответа. Повтор с тем же `actionId` и тем же canonical command hash возвращает
сохраненный safe result и не повторяет side effect. Тот же `actionId` с другим
payload отклоняется. Другой action при незавершенном claim возвращает conflict.

Одного optimistic CAS после вызова Better Auth недостаточно: parallel requests
могут оба создать session, отправить OTP или выпустить code до проигравшего CAS.
Поэтому adapter operation обязан быть idempotent по `operationId`. Phase 0 должна
доказать это для каждой Better Auth operation. Если installed plugin не принимает
idempotency key, IAM вводит version-locked operation ledger/unique persistence
guard перед публикацией route. Операция без доказуемой idempotency или безопасной
reconciliation не входит в public headless contract.

Ни одна команда не принимает из browser:

- application ID, отличный от path parameter;
- session ID;
- consent reference;
- return URL;
- callback URL;
- redirect URI после start;
- resource после start;
- scopes после start;
- signup override;
- provider scopes;
- Better Auth `oauth_query`.

## 9. Начало OAuth interaction

### 9.1. Endpoint

```http
POST /auth/applications/:applicationId/oauth2/interactions
Origin: https://store.example.com
Content-Type: application/json
```

Request:

```json
{
  "clientId": "shopana_public_client_id",
  "redirectUri": "https://store.example.com/oauth/callback",
  "responseType": "code",
  "scope": "openid profile email",
  "state": "random-state",
  "nonce": "random-nonce",
  "codeChallenge": "base64url-sha256",
  "codeChallengeMethod": "S256",
  "resource": "urn:shopana:application:application-uuid",
  "prompt": ["login"]
}
```

Ограничения:

- только `responseType=code`;
- только `codeChallengeMethod=S256`;
- `state` и `nonce` обязательны;
- exact registered `redirectUri`;
- exact application resource;
- scopes — уникальное непустое подмножество protocol policy v1;
- `clientId` принадлежит path application;
- client active, non-archived и hosted/headless eligible;
- для browser start `Origin` входит в exact application `trustedOrigins`;
- browser origin также согласован с redirect URI policy клиента;
- server start не принимает доверие из `Origin` и требует confidential client
  authentication;
- request body имеет строгую Zod schema без неизвестных полей;
- duplicate JSON keys отклоняются raw parser до semantic parsing либо
  подтверждается parser contract, исключающий ambiguity.

### 9.2. Повторное использование OAuth Provider validation

Start service не должен вручную копировать всю Better Auth authorize logic.
Он строит канонический authorize request и вызывает application-scoped
`runtime.auth.handler()` внутренне с `redirect: "manual"`.

Ожидаемые результаты классифицируются:

- signed redirect на IAM login/signup/consent;
- validated OAuth error redirect;
- direct completion;
- internal failure.

Signed query проверяется существующей IAM signature logic и преобразуется в
`ApplicationAuthInteraction`. Browser никогда его не получает.

До реализации обязателен executable compatibility spike для установленной
версии `@better-auth/oauth-provider`:

- authorize без application session;
- authorize с application session;
- prompt `login`, `create`, `consent`;
- reusable consent;
- `skipConsent`;
- invalid redirect;
- invalid scope/resource/PKCE;
- JSON-start internal invocation без browser cookie;
- session creation response и post-login continuation;
- provider callback continuation.

Если plugin не предоставляет стабильный internal result, IAM вводит
version-locked adapter рядом с `auth.ts`; protocol validation не дублируется в
controller.

### 9.3. Start response

```json
{
  "interaction": {
    "credential": "opaque-bearer-secret",
    "expiresAt": "2026-07-27T12:10:00.000Z",
    "step": "SIGN_IN",
    "revision": 1
  },
  "application": {
    "displayName": "Acme",
    "headline": "Welcome",
    "logoUrl": "https://cdn.example.com/logo.png",
    "primaryColor": "INDIGO",
    "backgroundColor": "WHITE",
    "locale": "en"
  },
  "actions": [
    {
      "id": "PASSWORD_SIGN_IN",
      "fields": ["email", "password"]
    },
    {
      "id": "EMAIL_OTP_REQUEST",
      "fields": ["email"]
    },
    {
      "id": "SOCIAL_SIGN_IN_START",
      "provider": "google"
    },
    {
      "id": "SWITCH_TO_SIGN_UP"
    }
  ]
}
```

`credential` возвращается только при start. Последующие responses его не
повторяют, если принята модель стабильного credential.

## 10. Interaction credential

### 10.1. Формат

Рекомендуемый формат:

```text
<public-interaction-id>.<256-bit-random-secret>
```

Public ID нужен только для indexed lookup. Secret проверяется constant-time
через HMAC/hash.

В БД хранятся:

- public ID;
- credential hash;
- credential key version;
- application ID;
- origin hash;
- expiry и consumed state.

Plaintext credential:

- не хранится;
- не логируется;
- не помещается в URL;
- не помещается в cookie;
- не включается в audit;
- не возвращается через error metadata.

### 10.2. HTTP auth scheme

```http
Authorization: Interaction <public-id.secret>
```

Не использовать `Bearer`, чтобы interaction credential нельзя было случайно
принять за OAuth access token.

### 10.3. Rotation decision

В v1 credential остается стабильным. После terminal transition он становится
read-only recovery credential на срок не более двух минут, затем окончательно
инвалидируется.

Причины:

- credential нельзя зафиксировать через browser cookie;
- он создается IAM с 256-bit entropy;
- TTL равен 10 минутам;
- exact origin обязателен для browser transport; BFF credential остается
  server-side;
- state transitions имеют optimistic revision;
- rotation после каждого action создает unrecoverable flow при потере HTTP
  response;
- безопасная retry-схема для rotated secret потребовала бы дополнительного
  replay storage.

Credential немедленно теряет право на mutation при:

- `COMPLETE` (read-only terminal recovery разрешен до recovery TTL);
- `DENIED` (read-only terminal recovery разрешен до recovery TTL);
- `FAILED` (только safe terminal error до recovery TTL);
- `CANCEL`;
- expiry или окончание terminal recovery TTL;
- realm/client disable;
- secret rotation, если invalidation policy этого требует.

`CANCEL` не является отдельным step: action атомарно переводит interaction в
`DENIED` с terminal reason `USER_CANCELLED` и тем же validated OAuth
`access_denied` redirect/recovery contract, что consent deny.

Если позже потребуется rotation, она вводится отдельной protocol version вместе
с idempotency/recovery contract.

### 10.4. Browser storage

`auth-core` хранит credential:

- по умолчанию только в памяти;
- опционально в `sessionStorage` для page reload resume;
- никогда в `localStorage`;
- никогда в URL/query/hash;
- никогда в analytics state.

`sessionStorage` mode документируется как trade-off: короткий TTL и resume
против доступности token для JavaScript при XSS.

## 11. Headless API contract

Все routes находятся под:

```text
/auth/applications/:applicationId/oauth2/interactions
```

### 11.1. Exact routes

```text
POST /oauth2/interactions
POST /oauth2/interactions/server
GET  /oauth2/interactions/current
POST /oauth2/interactions/password/sign-in
POST /oauth2/interactions/password/sign-up
POST /oauth2/interactions/email-otp/request
POST /oauth2/interactions/email-otp/verify
POST /oauth2/interactions/social/start
POST /oauth2/interactions/social/continue
POST /oauth2/interactions/verification/resend
GET  /oauth2/interactions/verification/continue
POST /oauth2/interactions/consent
POST /oauth2/interactions/switch
POST /oauth2/interactions/cancel
```

Dynamic route вида `/social/:provider` не нужен. Provider приходит в strict
body и проверяется через code-owned provider catalog плюс effective manifest.

`POST /oauth2/interactions` — публичный browser start; перечисленные выше
`Origin` requirements относятся к нему. Отдельный
`POST /oauth2/interactions/server` предназначен только для confidential BFF,
требует OAuth client authentication, не использует CORS/`Origin` как основание
доверия и возвращает credential только BFF. Оба route вызывают один start service
и применяют одинаковую authorize/redirect/resource/PKCE policy. Public client не
может использовать server route; public BFF использует публичный start без
дополнительных привилегий.

### 11.2. Current

```http
GET /oauth2/interactions/current
Authorization: Interaction <credential>
Origin: https://store.example.com
```

Возвращает safe текущий state для reload/resume. Для terminal interaction в
пределах recovery TTL возвращает сохраненный encrypted terminal result после
расшифровки в памяти; после recovery TTL возвращает `INTERACTION_CONSUMED`.

Для non-terminal state не возвращает:

- email, ранее введенный пользователем;
- password;
- OTP;
- session ID;
- OAuth signed query;
- state/nonce/code challenge;
- raw redirect URI;
- internal failure details.

Единственное исключение — terminal recovery response: он возвращает уже
validated OAuth redirect/error URL из encrypted terminal result и не раскрывает
отдельные raw protocol fields.

### 11.3. Password sign-in

```http
POST /oauth2/interactions/password/sign-in
Authorization: Interaction <credential>
Origin: https://store.example.com
Content-Type: application/json

{
  "actionId": "6cf5d921-82bd-42f2-8d2d-5d542c193832",
  "expectedRevision": 1,
  "email": "user@example.com",
  "password": "..."
}
```

Service:

1. нормализует email;
2. применяет application-scoped password sign-in rate limit;
3. строит signed OAuth continuation server-side;
4. вызывает Better Auth `/sign-in/email`;
5. извлекает/проверяет созданную application session;
6. связывает session с interaction;
7. продолжает OAuth provider flow;
8. возвращает `CONSENT`, `COMPLETE` или generic recoverable `SIGN_IN`.

Public ошибка не сообщает:

- существует ли email;
- неверен ли password;
- заблокирован ли конкретный account;
- какой internal provider error произошел.

### 11.4. Password sign-up

```json
{
  "actionId": "6cf5d921-82bd-42f2-8d2d-5d542c193833",
  "expectedRevision": 1,
  "name": "Alex",
  "email": "user@example.com",
  "password": "..."
}
```

Доступность определяется одновременно:

- realm active;
- registration mode open;
- password method `SIGN_UP` enabled.

Password signup имеет одинаковый observable result для существующего и нового
email:

- если verification обязательна — всегда `EMAIL_VERIFICATION_PENDING`;
- если verification не нужна — всегда `SIGN_IN`;
- headless signup никогда не использует auto-created session для немедленного
  перехода в consent/complete;
- если Better Auth создал session несмотря на adapter policy
  `autoSignIn=false`, adapter немедленно отзывает ее до ответа;
- response time использует тот же minimum floor.

Для нового email IAM отправляет verification message. Для существующего email IAM
не сообщает это API caller и отправляет владельцу нейтральное security message с
IAM-owned continue link. Оба вида ссылки используют одинаковый внешний callback:

```text
GET /auth/applications/:applicationId/oauth2/interactions/verification/continue
    ?handle=<one-time-verification-handle>
```

Handle хранится только hashed, имеет короткий TTL, связан с
`applicationId + interactionId + actionId + email-purpose` и не содержит основной
interaction credential. Callback атомарно consumes handle, выполняет Better Auth
verification только для нового unverified account и переводит active interaction
из `EMAIL_VERIFICATION_PENDING` в `SIGN_IN`. Ссылка существующего/уже verified
account выполняет тот же безопасный переход без раскрытия account state.
Открытие на другом устройстве не переносит application session: пользователь
возвращается в исходный flow и входит обычным способом.

Verification callback отвечает IAM-owned generic HTML с `Cache-Control: no-store`,
`Referrer-Policy: no-referrer` и strict CSP. Query целиком исключается из access
logs; handle удаляется из address bar немедленным same-origin clean redirect
после consume.

Browser не выбирает callback URL. Verification callback строится IAM.

`POST /verification/resend` принимает `InteractionMutationMeta`, возвращает тот
же generic state и ротирует старый verification handle. Public response не
показывает, было ли письмо отправлено и существует ли account.

### 11.5. Email OTP

Request:

```json
{
  "actionId": "6cf5d921-82bd-42f2-8d2d-5d542c193834",
  "expectedRevision": 1,
  "email": "user@example.com"
}
```

Verify:

```json
{
  "actionId": "6cf5d921-82bd-42f2-8d2d-5d542c193835",
  "expectedRevision": 2,
  "email": "user@example.com",
  "otp": "123456"
}
```

Сохраняются текущие invariants:

- только `type=sign-in`;
- 6 цифр;
- 5 минут;
- 3 попытки;
- rotation при resend;
- OTP хранится hashed;
- generic send result;
- minimum response floor;
- realm-specific HMAC rate-limit keys;
- email и OTP не попадают в URL/storage/log labels.

SDK может помнить email только в локальном React state текущего form; IAM
response его не отражает.

### 11.6. Switch

```json
{
  "actionId": "6cf5d921-82bd-42f2-8d2d-5d542c193836",
  "expectedRevision": 2,
  "target": "SIGN_UP"
}
```

Разрешенные targets:

- `SIGN_IN`;
- `SIGN_UP`.

Переход допускается только если target разрешен effective policy.

### 11.7. Consent

Consent state:

```json
{
  "interaction": {
    "step": "CONSENT",
    "expiresAt": "2026-07-27T12:10:00.000Z",
    "revision": 4
  },
  "application": {
    "displayName": "Acme"
  },
  "client": {
    "name": "Acme Storefront",
    "firstParty": false
  },
  "scopes": [
    {
      "id": "openid",
      "title": "Sign you in",
      "description": "Confirm your identity for this application"
    },
    {
      "id": "email",
      "title": "Email address",
      "description": "Read your verified email address"
    }
  ],
  "actions": [
    { "id": "CONSENT_ALLOW" },
    { "id": "CONSENT_DENY" }
  ]
}
```

Command:

```json
{
  "decision": "ALLOW",
  "actionId": "6cf5d921-82bd-42f2-8d2d-5d542c193837",
  "expectedRevision": 4
}
```

V1 не поддерживает выбор подмножества scopes на consent page. IAM передает
точный набор validated requested scopes.

После ответа:

1. service повторно проверяет session binding;
2. строит signed OAuth continuation;
3. вызывает Better Auth `/oauth2/consent`;
4. нормализует JSON/redirect plugin response;
5. проверяет target через exact registered redirect binding;
6. в рамках завершения action journal шифрует terminal result и атомарно consumes
   interaction;
7. возвращает terminal result.

### 11.8. Complete

```json
{
  "interaction": {
    "step": "COMPLETE",
    "terminalResultAvailableUntil": "2026-07-27T12:02:00.000Z"
  },
  "result": {
    "type": "OAUTH_REDIRECT",
    "redirectUrl": "https://store.example.com/oauth/callback?code=...&state=..."
  }
}
```

`redirectUrl` возвращается только после:

- exact client reload;
- exact redirect URI hash match;
- final OAuth redirect validation;
- state binding;
- terminal context consumption.

После `COMPLETE`/`DENIED` credential больше не разрешает mutations, но остается
read-only recovery credential до `terminalResultAvailableUntil` (не более двух
минут и не дольше общего interaction TTL). `GET current` с тем же credential
возвращает сохраненный terminal result, не вызывая Better Auth и не выпуская
новый code. Terminal result хранится encrypted at rest и удаляется после recovery
TTL. Это закрывает потерю HTTP response между выдачей authorization code и
получением JSON клиентом.

Повтор terminal response не делает authorization code многоразовым: token
endpoint по-прежнему consumes code ровно один раз. SDK очищает credential сразу
после успешного `window.location.assign`, но потеря ответа допускает safe
`resume()`.

SDK выполняет `window.location.assign(redirectUrl)`.

Authorization code неизбежно присутствует в validated callback URL согласно
Authorization Code flow, но:

- IAM response имеет `Cache-Control: no-store`;
- SDK не логирует URL;
- SDK не сохраняет URL;
- analytics hooks получают только terminal state без URL;
- callback application обязана удалить code/state из browser URL после
  обработки.

### 11.9. Deny

При `DENY` IAM использует стандартный OAuth error redirect:

```text
error=access_denied
state=<original exact state>
```

Redirect проходит ту же binding validation. SDK не конструирует OAuth error
самостоятельно.

## 12. Public response model

### 12.1. Discriminated union

```typescript
type ApplicationAuthInteractionResponse =
  | SignInInteraction
  | SignUpInteraction
  | EmailOtpInteraction
  | VerificationPendingInteraction
  | ConsentInteraction
  | CompleteInteraction
  | DeniedInteraction
  | FailedInteraction;
```

Каждый non-terminal response содержит:

```typescript
interface InteractionMeta {
  step: ApplicationAuthInteractionStep;
  revision: number;
  expiresAt: string;
}
```

### 12.2. Action descriptors

В первой версии action descriptors являются закрытым union, а не общей dynamic
form schema:

```typescript
type InteractionActionDescriptor =
  | { id: "PASSWORD_SIGN_IN"; fields: ["email", "password"] }
  | { id: "PASSWORD_SIGN_UP"; fields: ["name", "email", "password"] }
  | { id: "EMAIL_OTP_REQUEST"; fields: ["email"] }
  | { id: "EMAIL_OTP_VERIFY"; fields: ["email", "otp"] }
  | { id: "VERIFICATION_RESEND" }
  | { id: "SOCIAL_SIGN_IN_START"; provider: "google" | "facebook" }
  | { id: "SWITCH_TO_SIGN_IN" }
  | { id: "SWITCH_TO_SIGN_UP" }
  | { id: "CONSENT_ALLOW" }
  | { id: "CONSENT_DENY" }
  | { id: "CANCEL" };
```

Это дает server-driven capabilities без создания произвольного remote form
language.

### 12.3. Error model

Transport error:

```json
{
  "error": {
    "code": "INTERACTION_EXPIRED",
    "message": "This authentication attempt has expired.",
    "requestId": "..."
  }
}
```

Recoverable form error:

```json
{
  "interaction": {
    "step": "SIGN_IN",
    "revision": 2,
    "expiresAt": "..."
  },
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "The request could not be completed. Check your details and try again."
  },
  "actions": []
}
```

Closed public codes:

```typescript
type ApplicationAuthInteractionErrorCode =
  | "INVALID_REQUEST"
  | "ORIGIN_NOT_ALLOWED"
  | "INTERACTION_NOT_FOUND"
  | "INTERACTION_EXPIRED"
  | "INTERACTION_CONSUMED"
  | "INTERACTION_STATE_CONFLICT"
  | "ACTION_IN_PROGRESS"
  | "ACTION_NOT_ALLOWED"
  | "AUTHENTICATION_FAILED"
  | "VERIFICATION_FAILED"
  | "RATE_LIMITED"
  | "TEMPORARILY_UNAVAILABLE";
```

Не создавать отдельные public codes `USER_NOT_FOUND`, `WRONG_PASSWORD`,
`EMAIL_ALREADY_EXISTS` без отдельного anti-enumeration review.

HTTP mapping:

| HTTP | Code | Значение |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` | malformed strict input |
| `401` | `INTERACTION_NOT_FOUND` | absent/invalid credential |
| `403` | `ORIGIN_NOT_ALLOWED`, `ACTION_NOT_ALLOWED` | policy rejection |
| `409` | `INTERACTION_STATE_CONFLICT`, `ACTION_IN_PROGRESS` | stale revision/invalid transition или незавершенный claimed action |
| `410` | `INTERACTION_EXPIRED`, `INTERACTION_CONSUMED` | expired либо terminal recovery TTL закончился |
| `429` | `RATE_LIMITED` | retry-after |
| `503` | `TEMPORARILY_UNAVAILABLE` | dependency unavailable |

Чтобы не создавать credential oracle, invalid public ID, invalid secret и
foreign application возвращают одинаковый `INTERACTION_NOT_FOUND`.

## 13. Presentation contract

### 13.1. Branding

Headless API использует текущий application branding:

- display name;
- headline;
- HTTPS logo URL;
- primary color token;
- background color token;
- locale.

Не возвращать:

- arbitrary HTML;
- arbitrary CSS;
- remote script;
- form action;
- unvalidated URL;
- raw translation catalog из database.

### 13.2. Scope catalog

Создать code-owned catalog рядом с OAuth claims policy:

```typescript
interface ApplicationOAuthScopePresentation {
  id: "openid" | "profile" | "email" | "offline_access";
  titleKey: ApplicationAuthUiMessageKey;
  descriptionKey: ApplicationAuthUiMessageKey;
  sensitive: boolean;
}
```

Catalog является единым для hosted consent и headless consent.

`offline_access` должен явно объяснять длительный доступ/refresh capability.

Unknown scope в interaction должен fail closed, даже если Better Auth его
неожиданно принял.

### 13.3. Provider presentation

Provider catalog расширяется безопасными presentation metadata:

- display label translation key;
- optional IAM-owned icon asset key;
- popup recommended boolean;
- link/continue label.

Не принимать icon URL, scopes или provider display name из browser.

### 13.4. Localization

V1 сохраняет текущую `en` locale. До добавления второй locale нужно:

- сделать public message keys closed union;
- использовать один catalog в hosted и React UI;
- определить locale negotiation;
- не принимать произвольную locale из query без allowlist;
- вернуть effective locale в interaction state.

## 14. Storage model

### 14.1. Прямой cutover

Текущая `application_authorization_context` является фактической interaction
model. Поскольку production данных нет, рекомендуется прямой rename/replacement:

```text
application_authorization_context
  -> application_auth_interaction
```

Не поддерживать одновременно legacy и новую таблицу. Не выполнять backfill.
Перед миграцией local/dev ephemeral данные удаляются штатным migration cutover.

Если rename ухудшает migration clarity, допустимо сохранить физическое имя
таблицы, но TypeScript model и service vocabulary должны стать `Interaction`.
Решение фиксируется до начала реализации и применяется один раз.

### 14.2. Предлагаемые поля

```text
id                          random 256-bit public interaction id
application_id              UUID, required
client_id                   string, required
kind                        OAUTH_AUTHORIZATION
transport                   HOSTED | HEADLESS_BROWSER | HEADLESS_BFF
credential_hash             nullable, required for both HEADLESS transports
credential_key_version      nullable, required for both HEADLESS transports
trusted_origin_hash         nullable, required for HEADLESS_BROWSER
notification_origin_hash    nullable, optional for HEADLESS_BFF popup UX only
redirect_uri_hash           required
post_login_return_path_hash required
state                       required
nonce                       required
code_challenge              required
code_challenge_method       S256
scopes                      non-empty array
resource                    exact application resource
step                        state enum/check
session_id                  nullable
continuation_ciphertext     nullable encrypted Better Auth continuation
continuation_key_version    nullable
revision                    positive integer
terminal_result_ciphertext  nullable encrypted safe OAuth redirect/error result
terminal_result_key_version nullable
terminal_result_available_until nullable
expires_at                  required
consumed_at                 nullable
terminal_reason             nullable closed value
created_at                  required
updated_at                  required
```

### 14.3. Constraints

- `credential_hash IS NOT NULL` iff transport is `HEADLESS_BROWSER` or
  `HEADLESS_BFF`;
- `trusted_origin_hash IS NOT NULL` iff `transport=HEADLESS_BROWSER`;
- `notification_origin_hash` для `HEADLESS_BFF` может содержать только exact
  current trusted origin, но используется лишь как `postMessage` destination и
  не авторизует request;
- `HEADLESS_BFF` создается только authenticated server-start для confidential
  client и никогда не возвращается через CORS browser response;
- continuation ciphertext и key version появляются/удаляются вместе;
- terminal result ciphertext, key version и availability появляются/удаляются
  вместе и разрешены только terminal step;
- `terminal_result_available_until <= expires_at` и не более двух минут после
  terminal transition;
- `code_challenge_method='S256'`;
- `cardinality(scopes) > 0`;
- `expires_at <= created_at + 10 minutes`;
- terminal step требует `consumed_at IS NOT NULL`;
- non-terminal step требует `consumed_at IS NULL`;
- `revision >= 1`;
- FK client/application сохраняет application scope;
- indexes всегда начинаются с `application_id`.

### 14.4. Credential hashing

Использовать realm/purpose-derived HMAC:

```text
HMAC(
  purposeSecret(applicationId, secretKeyVersion, "headless-interaction"),
  plaintextCredential
)
```

Credential key version хранится явно. Missing referenced root-key version
должна fail closed.

### 14.5. Server-side continuation credential

Compatibility spike должен определить минимальный набор Better Auth cookie,
необходимый для продолжения post-login consent. IAM не сохраняет весь
произвольный `Set-Cookie` response.

Разрешенный набор:

- точное application session cookie name;
- при доказанной необходимости — закрытый versioned список дополнительных
  Better Auth cookies;
- никаких provider cookies, OAuth tokens или caller-controlled cookie names.

Значение сериализуется в typed internal payload и шифруется через
`ApplicationAuthKeyring`:

```text
AAD =
  applicationId
  + interactionId
  + model "application-auth-interaction"
  + field "continuation"
```

При каждой internal Better Auth операции adapter:

1. загружает interaction;
2. расшифровывает continuation только в памяти;
3. строит internal `Cookie` header;
4. вызывает exact Better Auth operation;
5. проверяет, что session/user принадлежат application;
6. применяет разрешенную cookie rotation, если Better Auth обновил session;
7. повторно шифрует новый continuation либо очищает его при terminal step.

Plaintext continuation запрещен в:

- logs;
- audit;
- exceptions;
- metrics;
- API DTO;
- SDK;
- database snapshots без encryption envelope.

Terminal recovery result шифруется тем же keyring с отдельным purpose/AAD
`field "terminal-result"`. Он может содержать validated redirect с authorization
code, поэтому на него распространяются те же запреты logs/audit/metrics/DTO,
кроме целевого terminal API response. После `terminal_result_available_until`
ciphertext очищается cleanup job независимо от operational row retention.

Если compatibility spike подтвердит стабильный sessionless internal consent API,
continuation ciphertext не добавляется. Это решение должно быть доказано
executable contract и зафиксировано до migration; fallback к browser
third-party cookie запрещен.

### 14.6. Origin binding

Хранить hash нормализованного exact origin:

```text
sha256("https://store.example.com")
```

Каждый `HEADLESS_BROWSER` action:

- требует `Origin`;
- нормализует через тот же application origin parser;
- сравнивает hash constant-time;
- повторно проверяет, что origin все еще есть в current trusted origins.

Удаление trusted origin немедленно делает active interactions этого origin
неиспользуемыми.

`HEADLESS_BFF` не имеет `trusted_origin_hash`: он создается только после
confidential client authentication, а credential остается server-side. Его
actions авторизуются credential/application/client/state binding и не требуют
синтетического `Origin`. Optional notification origin принимается server start
только после client authentication и exact trusted-origin validation; он влияет
лишь на popup UX.

### 14.7. Verification и social navigation handles

Navigation handles не используют основную interaction credential и хранятся в
отдельных application-scoped таблицах. Общие invariants:

- random public ID плюс минимум 256-bit secret;
- в БД только purpose-derived HMAC/hash и key version;
- application/interaction/action/purpose binding;
- короткий фиксированный TTL;
- atomic one-time consume;
- raw handle отсутствует в logs/audit/metrics;
- foreign application, invalid secret, expired и replay имеют одинаковый
  unavailable response.

Verification handle additionally связывает normalized email hash и тип
`VERIFY_NEW_ACCOUNT | EXISTING_ACCOUNT_NOTICE`, который никогда не возвращается
browser API. Social handle использует schema из раздела 18 и передается только
form POST.

### 14.8. Cleanup

Cleanup удаляет interaction только когда:

- `expires_at` старше operational retention boundary; или
- `consumed_at` старше operational retention boundary.

Текущий 24-hour cleanup safety window сохраняется, если observability/audit
requirements не потребуют другого значения.

Cleanup не должен:

- продлевать interaction;
- восстанавливать consumed interaction;
- удалять active interaction;
- сканировать без application/time indexes.

Cleanup также:

- очищает terminal result ciphertext сразу после recovery TTL;
- удаляет expired/consumed verification и social handles;
- удаляет action journal только после interaction retention boundary;
- не удаляет `CLAIMED` action до reconciliation/indeterminate resolution.

## 15. Repository contract

Mutation side effects координируются отдельным
`application_auth_interaction_action` journal:

```text
interaction_id             required
application_id             required
action_id                  random UUID/128-bit, required
expected_revision          required
action                     closed enum
command_hash               HMAC canonical validated input
operation_id               server-generated, unique
status                     CLAIMED | COMPLETED | INDETERMINATE
result_ciphertext          nullable encrypted safe result
result_key_version         nullable
claimed_at                 required
completed_at               nullable
```

Unique constraints:

- `(application_id, interaction_id, action_id)`;
- `(application_id, operation_id)`;
- не более одного `CLAIMED` action на interaction.

Journal не хранит password, OTP, email или plaintext command. `command_hash`
нужен только для проверки, что retry с тем же action ID имеет идентичный
validated payload.

```typescript
interface ApplicationAuthInteractionRepository {
  createHeadless(
    applicationId: string,
    input: CreateHeadlessInteractionInput
  ): Promise<CreatedHeadlessInteraction>;

  createHeadlessTerminal(
    applicationId: string,
    input: CreateHeadlessTerminalInteractionInput
  ): Promise<CreatedRecoverableTerminalInteraction>;

  createHosted(
    applicationId: string,
    input: CreateHostedInteractionInput
  ): Promise<CreatedHostedInteraction>;

  findActiveByCredential(
    applicationId: string,
    publicId: string,
    credentialHash: string
  ): Promise<ApplicationAuthInteraction | null>;

  findReadableByCredential(
    applicationId: string,
    publicId: string,
    credentialHash: string,
    now: Date
  ): Promise<ApplicationAuthInteraction | null>;

  claimAction(
    applicationId: string,
    input: {
      interactionId: string;
      actionId: string;
      action: ApplicationAuthInteractionAction;
      commandHash: string;
      expectedRevision: number;
      expectedStep: ApplicationAuthInteractionStep;
    }
  ): Promise<ClaimActionResult>;

  completeAction(
    applicationId: string,
    input: {
      interactionId: string;
      actionId: string;
      operationId: string;
      expectedRevision: number;
      expectedStep: ApplicationAuthInteractionStep;
      nextStep: ApplicationAuthInteractionStep;
      sessionId?: string | null;
      encryptedSafeResult: EncryptedInteractionActionResult;
    }
  ): Promise<ApplicationAuthInteraction | null>;

  completeTerminalAction(
    applicationId: string,
    input: {
      interactionId: string;
      actionId: string;
      operationId: string;
      expectedRevision: number;
      expectedStep: ApplicationAuthInteractionStep;
      terminalStep: "COMPLETE" | "DENIED" | "FAILED";
      terminalReason: ApplicationAuthInteractionTerminalReason;
      encryptedTerminalResult: EncryptedInteractionTerminalResult;
      terminalResultAvailableUntil: Date;
    }
  ): Promise<boolean>;

  readCompletedAction(
    applicationId: string,
    interactionId: string,
    actionId: string
  ): Promise<EncryptedInteractionActionResult | null>;

  markActionIndeterminate(
    applicationId: string,
    interactionId: string,
    actionId: string
  ): Promise<void>;

  invalidateForSession(
    applicationId: string,
    userId: string,
    sessionId: string
  ): Promise<number>;

  cleanup(input: { before: Date; limit: number }): Promise<number>;
}
```

Repository никогда не делает lookup только по global interaction ID.

`findActiveByCredential` используется mutations и требует
`consumed_at IS NULL`. `findReadableByCredential` используется только
`GET current`: он дополнительно допускает consumed terminal row с encrypted
result и `terminal_result_available_until > now`.

Если authorize start сразу дает reusable-consent/`skipConsent` completion,
`createHeadlessTerminal` атомарно создает уже consumed interaction вместе с
encrypted terminal result и recovery TTL. Start response возвращает его
credential один раз; повторный `GET current` только читает тот же result.

`claimAction`, `completeAction` и `completeTerminalAction` являются atomic
compare-and-set по:

- application ID;
- interaction ID;
- revision;
- current step;
- active TTL;
- `consumed_at IS NULL`.

Claim записывается до Better Auth/email-provider side effect. Retry с тем же
`actionId + commandHash` получает completed result либо status
`ACTION_IN_PROGRESS`; mismatch hash отклоняется. После process crash
`CLAIMED` action не запускается повторно вслепую: adapter выполняет
operation-specific reconciliation по `operationId`. Недоказуемый исход помечает
interaction `FAILED`, а не повторяет потенциально необратимую операцию.

## 16. Service contract

```typescript
interface ApplicationAuthInteractionService {
  start(
    input: StartApplicationAuthInteractionInput,
    context: ApplicationAuthInteractionRequestContext
  ): Promise<StartApplicationAuthInteractionResult>;

  getCurrent(
    credential: ApplicationAuthInteractionCredential,
    context: ApplicationAuthInteractionRequestContext
  ): Promise<ApplicationAuthPublicInteraction>;

  passwordSignIn(
    credential: ApplicationAuthInteractionCredential,
    input: PasswordSignInInput,
    context: ApplicationAuthInteractionRequestContext
  ): Promise<ApplicationAuthPublicInteraction>;

  passwordSignUp(
    credential: ApplicationAuthInteractionCredential,
    input: PasswordSignUpInput,
    context: ApplicationAuthInteractionRequestContext
  ): Promise<ApplicationAuthPublicInteraction>;

  requestEmailOtp(
    credential: ApplicationAuthInteractionCredential,
    input: EmailOtpRequestInput,
    context: ApplicationAuthInteractionRequestContext
  ): Promise<ApplicationAuthPublicInteraction>;

  verifyEmailOtp(
    credential: ApplicationAuthInteractionCredential,
    input: EmailOtpVerifyInput,
    context: ApplicationAuthInteractionRequestContext
  ): Promise<ApplicationAuthPublicInteraction>;

  resendVerification(
    credential: ApplicationAuthInteractionCredential,
    input: VerificationResendInput,
    context: ApplicationAuthInteractionRequestContext
  ): Promise<ApplicationAuthPublicInteraction>;

  continueVerification(
    handle: ApplicationAuthVerificationHandle,
    context: ApplicationAuthNavigationRequestContext
  ): Promise<ApplicationAuthVerificationPageResult>;

  startSocialSignIn(
    credential: ApplicationAuthInteractionCredential,
    input: SocialSignInStartInput,
    context: ApplicationAuthInteractionRequestContext
  ): Promise<ApplicationAuthPublicInteraction>;

  continueSocialSignIn(
    handle: ApplicationAuthSocialContinuationHandle,
    context: ApplicationAuthNavigationRequestContext
  ): Promise<ApplicationAuthSocialProviderRedirect>;

  submitConsent(
    credential: ApplicationAuthInteractionCredential,
    input: ConsentDecisionInput,
    context: ApplicationAuthInteractionRequestContext
  ): Promise<ApplicationAuthPublicInteraction>;

  switchStep(
    credential: ApplicationAuthInteractionCredential,
    input: SwitchInteractionStepInput,
    context: ApplicationAuthInteractionRequestContext
  ): Promise<ApplicationAuthPublicInteraction>;

  cancel(
    credential: ApplicationAuthInteractionCredential,
    context: ApplicationAuthInteractionRequestContext
  ): Promise<ApplicationAuthPublicInteraction>;
}
```

Request context содержит только server-derived values:

```typescript
interface ApplicationAuthInteractionRequestContext {
  applicationId: string;
  origin?: string;
  transport: "HEADLESS_BROWSER" | "HEADLESS_BFF";
  authenticatedClientId?: string;
  ip: string;
  userAgent?: string;
  requestId: string;
}
```

Все mutation inputs расширяют `InteractionMutationMeta`. Для
`HEADLESS_BROWSER` controller выводит transport из route/start binding и требует
exact origin. Для `HEADLESS_BFF` server start предварительно аутентифицирует
confidential client, credential остается BFF, а последующие requests не требуют
browser `Origin`; одного caller-provided transport field не существует.
Navigation callback
context не доверяет `Origin` и содержит только server-derived application ID,
IP, user agent и request ID; авторизация выполняется одноразовым hashed handle.

## 17. Better Auth adapter

Создать отдельный internal adapter:

```text
src/api/http/application-auth/interactions/
  ApplicationAuthInteractionController.ts
  ApplicationAuthInteractionService.ts
  ApplicationAuthInteractionPresenter.ts
  BetterAuthApplicationInteractionAdapter.ts
  schemas.ts
  errors.ts
  types.ts
```

`BetterAuthApplicationInteractionAdapter` предоставляет стабильные IAM-owned
operations:

```typescript
interface BetterAuthApplicationInteractionAdapter {
  beginAuthorization(...): Promise<AuthorizationBeginResult>;
  signInWithPassword(operationId: string, ...): Promise<AuthenticationResult>;
  signUpWithPassword(operationId: string, ...): Promise<RegistrationResult>;
  requestEmailOtp(operationId: string, ...): Promise<DeliveryResult>;
  signInWithEmailOtp(operationId: string, ...): Promise<AuthenticationResult>;
  beginSocialSignIn(operationId: string, ...): Promise<SocialRedirectResult>;
  submitConsent(operationId: string, ...): Promise<AuthorizationCompletionResult>;
  readSession(...): Promise<ApplicationSessionResult>;
  reconcile(operationId: string, ...): Promise<ReconciledOperationResult>;
}
```

Adapter:

- знает Better Auth paths и version-specific response shapes;
- разбирает multiple `Set-Cookie` через закрытый allowlist;
- передает service только typed session binding и разрешенный continuation
  payload;
- восстанавливает internal Cookie header из расшифрованного continuation;
- не пропускает unvalidated redirect;
- нормализует plugin JSON/redirect variants;
- покрывается compatibility contract;
- является единственным местом, которое знает `oauth_query`.
- принимает journal `operationId`, не выполняет один и тот же logical side
  effect повторно и предоставляет operation-specific reconciliation после
  process crash.

Controller и React SDK не должны импортировать Better Auth types.

## 18. Social sign-in

### 18.1. Ограничение browser flow

Google/Facebook flow требует top-level navigation или popup. Полностью выполнить
его через XHR нельзя.

### 18.2. Start

```http
POST /oauth2/interactions/social/start
Authorization: Interaction <credential>
Origin: https://store.example.com

{
  "actionId": "6cf5d921-82bd-42f2-8d2d-5d542c193838",
  "expectedRevision": 1,
  "provider": "google",
  "mode": "popup"
}
```

Ответ:

```json
{
  "interaction": {
    "step": "SIGN_IN",
    "revision": 2,
    "expiresAt": "..."
  },
  "social": {
    "mode": "popup",
    "navigation": {
      "method": "POST",
      "url": "https://iam.example.com/auth/applications/.../oauth2/interactions/social/continue",
      "handle": "one-time-navigation-handle"
    }
  }
}
```

SDK открывает same-origin blank popup или начинает top-level navigation, создает
ephemeral HTML form и отправляет `handle` методом `POST`. Handle не помещается в
query, fragment, history, referrer или analytics и не является основным
interaction credential.

`POST /social/continue` является navigation route, а не CORS JSON route. Он:

1. принимает только form field `handle` с жестким size limit;
2. находит запись по public ID и constant-time hash;
3. атомарно consumes ее до provider redirect;
4. повторно проверяет application/interaction/provider/config revision;
5. строит Better Auth social request только из server-owned values;
6. отвечает `303` на provider с `Referrer-Policy: no-referrer`,
   `Cache-Control: no-store` и redacted access logging.

Social continuation хранится в отдельной таблице:

```text
application_auth_social_continuation
  application_id
  interaction_id
  action_id
  public_id
  handle_hash
  provider
  mode
  trusted_origin_hash
  configuration_revision
  provider_state_hash
  expires_at                 <= created_at + 2 minutes
  consumed_at
```

Raw handle и provider state не логируются. Callback коррелируется по
Better Auth/provider state с server-side continuation record, а не по browser
interaction credential или caller-provided callback URL.

### 18.3. Provider callback

Provider callback остается exact catalog-derived IAM route.

После callback IAM:

1. проверяет provider state;
2. проверяет application/interaction/provider binding;
3. force-refreshes application configuration revision;
4. проверяет/создает Better Auth application session;
5. продолжает interaction;
6. возвращает popup на IAM-owned completion page;
7. отправляет `postMessage` exact trusted origin.

Сообщение:

```typescript
interface ShopanaAuthPopupMessage {
  type: "shopana.auth.interaction.updated.v1";
  applicationId: string;
  interactionPublicId: string;
}
```

Сообщение не содержит:

- interaction secret;
- session token;
- authorization code;
- provider access/refresh token;
- email.

Parent после сообщения вызывает `GET current` со своим credential.

### 18.4. Popup security

- popup page имеет strict CSP;
- `window.opener` используется только для exact `postMessage(targetOrigin)`;
- target origin берется server-side из interaction binding;
- parent проверяет `event.origin === IAM public origin`;
- parent проверяет message application/interaction public ID;
- continuation handle одноразовый и имеет короткий TTL;
- handle передается top-level form POST, а не в URL;
- query strings и form bodies navigation routes исключены из access logs;
- callback replay отклоняется;
- popup не принимает caller-provided callback URL;
- redirect mode остается обязательным fallback при popup block.

## 19. CORS и HTTP security

### 19.1. CORS

Для `HEADLESS_BROWSER` routes:

- `Origin` обязателен;
- `Access-Control-Allow-Origin` — exact origin, не `*`;
- `Vary: Origin`;
- методы — только exact `GET`/`POST`;
- headers — `Authorization`, `Content-Type`, `X-Request-Id`;
- `Access-Control-Allow-Credentials` не требуется interaction credential, но
  может оставаться только если конкретный route сознательно поддерживает
  same-site application session cookie;
- preflight сверяется с effective route manifest;
- disabled realm/method/provider route не появляется в manifest;
- preflight не раскрывает существование foreign application/client.

`HEADLESS_BFF` responses не доступны browser CORS: server-start и последующие
BFF calls не возвращают CORS headers и не требуют `Origin`.

`Origin` и CORS являются browser security boundary, а не аутентификацией
произвольного HTTP caller. Небраузерный client может подставить любой `Origin`.
Поэтому:

- start endpoint считается публичным и защищается client/redirect/resource/PKCE
  validation, body limits и rate limiting;
- последующие actions авторизуются interaction credential, а origin binding
  дополнительно ограничивает использование credential из browser;
- документация и audit не называют trusted origin доказательством identity;
- если BFF требуется непубличный start, он использует отдельный authenticated
  server-start contract, а не доверие к `Origin`.

Рекомендуется не использовать `Access-Control-Allow-Credentials: true` для
чистых headless interaction routes, чтобы явно показать отсутствие cookie
dependency. Если общий plugin добавляет credentials автоматически, поведение
разделяется по route class.

### 19.2. Response headers

Все JSON responses:

```text
Cache-Control: no-store
Pragma: no-cache
Content-Type: application/json; charset=utf-8
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Content-Security-Policy: default-src 'none'
```

Popup/redirect HTML сохраняет отдельную strict CSP.

### 19.3. Same-origin hosted forms

Существующий `assertSameOriginForm()` сохраняется для hosted transport.
Headless transport не пытается подделывать IAM `Origin`; он использует exact
trusted application origin.

### 19.4. CSRF

Headless actions защищены комбинацией:

- unguessable interaction credential в non-simple `Authorization` header;
- mandatory exact Origin;
- strict CORS;
- step/revision binding;
- short TTL.

Для небраузерного attacker защита action основывается на unguessable credential,
TTL и server-side state binding; `Origin` там не является доказательством.

Отдельный form CSRF token для headless JSON не нужен. Hosted forms продолжают
использовать action-specific CSRF.

## 20. Rate limiting и anti-abuse

Сохраняются текущие application-scoped rate limit ports и HMAC keys.

Добавить interaction-level buckets:

- starts по application/client/origin/IP;
- current reads по interaction/IP;
- invalid credential attempts по application/IP;
- state conflicts по interaction/IP;
- social starts по interaction/provider/IP;
- consent submissions по interaction/IP.

Password/OTP buckets остаются identity/IP-based согласно текущей policy.

Rate-limit key никогда не содержит raw:

- email;
- OTP;
- interaction credential;
- redirect URI;
- state;
- nonce;
- authorization code.

Interaction start должен иметь отдельный лимит, чтобы атакующий не создавал
неограниченные строки в БД.

## 21. Session и token strategy

### 21.1. BFF — рекомендуемый production mode

```text
Browser component
  -> application BFF attempt/proxy
  -> authenticated headless IAM BFF interaction
  -> application callback with code
  -> application BFF
  -> IAM token endpoint with verifier/client authentication
  -> BFF HttpOnly first-party session cookie
```

Для confidential client:

- browser создает same-origin attempt через application BFF;
- BFF генерирует verifier/state/nonce, хранит их server-side и вызывает
  authenticated `/oauth2/interactions/server`;
- interaction credential хранится BFF; browser получает только opaque
  first-party attempt handle и вызывает application-owned proxy routes;
- PKCE verifier хранится BFF;
- client secret хранится только BFF;
- browser не вызывает token endpoint с confidential credential.

Для public BFF client:

- verifier также лучше хранить server-side;
- browser получает только opaque attempt/session handle.
- BFF вызывает публичный start contract и не получает доверия только потому, что
  способен установить `Origin`; rate limits и вся public validation сохраняются.

`auth-core` предоставляет разные explicit adapters:

- direct SPA adapter говорит с IAM interaction routes;
- BFF browser adapter говорит только с application-owned attempt/proxy routes;
- BFF server helper говорит с IAM и хранит credential/verifier server-side.

Один `ShopanaAuthProvider` не смешивает эти transports.

### 21.2. Public SPA mode

`auth-core` может предоставить explicit SPA adapter:

- генерирует verifier/state/nonce через Web Crypto;
- отправляет challenge в start;
- хранит verifier и expected state в `sessionStorage` либо memory;
- callback проверяет state;
- меняет code на token с public client;
- access token хранит в memory;
- refresh token strategy определяется отдельным security contract.

SPA adapter не включается неявно при создании `ShopanaAuthProvider`.

### 21.3. Не делать

- не хранить refresh token в `localStorage`;
- не передавать verifier в analytics;
- не возвращать confidential secret в config bundle;
- не считать application session cookie на IAM domain сессией storefront;
- не устанавливать `SameSite=None` как универсальное решение third-party
  cookie blocking.

## 22. `packages/auth-core`

### 22.1. Назначение

Framework-neutral TypeScript client:

```typescript
const auth = createShopanaAuthClient({
  issuer,
  applicationId,
  clientId,
  redirectUri,
});
```

### 22.2. Public API

```typescript
interface ShopanaAuthClient {
  startAuthorization(input: StartAuthorizationInput): Promise<AuthState>;
  resume(): Promise<AuthState | null>;
  getState(): AuthState | null;
  subscribe(listener: (state: AuthState) => void): () => void;

  signInWithPassword(input: PasswordSignInInput): Promise<AuthState>;
  signUpWithPassword(input: PasswordSignUpInput): Promise<AuthState>;
  requestEmailOtp(input: EmailOtpRequestInput): Promise<AuthState>;
  verifyEmailOtp(input: EmailOtpVerifyInput): Promise<AuthState>;
  resendVerification(): Promise<AuthState>;
  startSocialSignIn(input: SocialSignInInput): Promise<AuthState>;
  submitConsent(decision: "ALLOW" | "DENY"): Promise<AuthState>;
  switchStep(target: "SIGN_IN" | "SIGN_UP"): Promise<AuthState>;
  cancel(): Promise<AuthState>;
  navigateToResult(): void;
  clear(): void;
}
```

### 22.3. Internal state

```typescript
interface AuthClientState {
  applicationId: string;
  interactionPublicId: string;
  interactionCredential: string;
  interaction: ApplicationAuthPublicInteraction;
  status: "idle" | "loading" | "ready" | "error";
}
```

Credential не включается в public serializable `AuthState`.

### 22.4. Transport

- native `fetch`;
- exact issuer origin allowlist;
- `redirect: "manual"` где browser позволяет;
- JSON content type;
- `Authorization: Interaction`;
- abort signals;
- timeout;
- каждая mutation генерирует `actionId`, добавляет текущий `expectedRevision` и
  сохраняет их до определенного ответа;
- автоматический network retry mutation по умолчанию выключен, но явный retry
  использует тот же `actionId` и поэтому не повторяет side effect;
- safe retry для `GET current`;
- после неопределенного terminal response `resume()` читает сохраненный terminal
  result в пределах recovery TTL;
- request ID correlation без sensitive values.

### 22.5. Hooks/events

Допустимые telemetry events:

```text
interaction_started
step_changed
social_popup_opened
interaction_completed
interaction_denied
interaction_failed
```

Payload не содержит:

- email/name;
- credential;
- password/OTP;
- code/redirect URL;
- provider response;
- state/nonce/verifier.

## 23. `packages/auth-react`

### 23.1. Компоненты

```tsx
<ShopanaAuthProvider>
  <SignIn />
  <SignUp />
  <Consent />
</ShopanaAuthProvider>
```

Дополнительно:

```tsx
<AuthFlow />
<OAuthCallback />
<SocialButton />
<EmailOtpForm />
<EmailVerificationPending />
```

`<AuthFlow />` автоматически выбирает presentation по server step.
`<SignIn />`, `<SignUp />` и `<Consent />` являются ограниченными view wrappers
и не могут принудительно перевести interaction в запрещенный step.

### 23.2. Hooks

```typescript
useAuthInteraction()
useSignIn()
useSignUp()
useEmailVerification()
useConsent()
useAuthAppearance()
```

Пример:

```tsx
function CustomSignIn() {
  const { state, signInWithPassword } = useSignIn();

  if (state.step !== "SIGN_IN") {
    return null;
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await signInWithPassword({
          email: String(form.get("email")),
          password: String(form.get("password")),
        });
      }}
    >
      {/* application-owned markup */}
    </form>
  );
}
```

### 23.3. Customization

Поддержать:

- CSS variables;
- class name slots;
- render slots;
- provider button renderer;
- field renderer;
- locale message override только для SDK-owned generic copy;
- theme tokens.

Не разрешать customization изменять:

- destination form action;
- interaction endpoint;
- requested scopes;
- client/redirect/resource;
- consent decision semantics;
- hidden OAuth fields;
- provider callback;
- security footer requirement, если он является policy.

### 23.4. Accessibility

Default components:

- keyboard-only usable;
- visible focus;
- semantic labels;
- `aria-live` для status;
- `role=alert` для errors;
- focus первого invalid field;
- focus heading после step transition;
- no color-only status;
- reduced motion;
- mobile layout;
- password manager-compatible autocomplete;
- OTP autocomplete;
- popup-block fallback.

`<EmailVerificationPending />` показывает generic check-email state, позволяет
resend только через server-provided `VERIFICATION_RESEND` action и вызывает
`resume()` по явному действию пользователя/возврату focus. Компонент не сообщает,
создан ли новый account или существовал ли email.

### 23.5. SSR/hydration

Пакет не читает `window` при module import.

Browser-only операции:

- start/resume;
- popup;
- navigation;
- Web Crypto PKCE;
- session storage.

Next.js/React SSR должен иметь возможность отрендерить loading shell и
инициализировать interaction после hydration либо получить initial safe state
от application BFF.

## 24. Route manifest

Headless routes добавляются в effective application auth route manifest.

Base routes:

- browser start/confidential server start/current/cancel/switch;
- consent.

Policy-derived routes:

- password sign-in;
- password sign-up;
- email OTP request/verify;
- verification resend;
- social start.

Navigation routes являются отдельным manifest class:

- verification continue `GET`;
- social continue `POST`;
- exact catalog-derived provider callbacks.

Они не используют CORS preflight, принимают только one-time handle/provider state
и имеют отдельные no-store/referrer/log-redaction rules.

Если method/provider выключен:

- route отсутствует в effective manifest;
- preflight не разрешает route;
- request дает безопасный `404`/`ACTION_NOT_ALLOWED` до Better Auth согласно
  выбранному public enumeration contract;
- SDK не получает соответствующий action.

Forbidden Better Auth management routes остаются forbidden.

## 25. Рефакторинг hosted UI

### 25.1. Цель

После реализации interaction service hosted UI не должен самостоятельно
реализовывать authentication orchestration.

### 25.2. Последовательность

1. Извлечь presentation DTO и scope catalog.
2. Извлечь Better Auth adapter.
3. Извлечь interaction service для password sign-in.
4. Перевести hosted password sign-in на service.
5. Повторить для signup, OTP, social и consent.
6. Добавить headless controller над тем же service.
7. Удалить дублирующие private methods из hosted controller.

### 25.3. Hosted-specific behavior

Hosted renderer преобразует public/domain state в HTML:

- `SIGN_IN` -> login page;
- `SIGN_UP` -> signup page;
- `EMAIL_OTP_CHALLENGE` -> OTP page;
- `EMAIL_VERIFICATION_PENDING` -> generic check-email page;
- `CONSENT` -> consent page;
- terminal redirect -> 303;
- terminal error -> generic error HTML.

Hosted interaction использует cookie credential и CSRF, но его step transition
вызывает тот же service operation через trusted hosted request context.

### 25.4. Недопустимый промежуточный результат

Нельзя оставлять:

- старый HTML password flow и новый JSON password flow с разными services;
- два scope catalogs;
- две redirect validation functions;
- отдельную headless rate-limit policy;
- разные anti-enumeration messages;
- прямой Better Auth вызов из React SDK.

## 26. Application configuration и Admin API

### 26.1. Новые настройки

Не добавлять общий `headlessEnabled` без необходимости. Headless доступ
определяется:

- active realm;
- active OAuth client;
- exact trusted origin;
- enabled auth methods;
- protocol policy.

Если нужен operational kill switch, добавить:

```graphql
headlessInteractionsEnabled: Boolean!
```

как отдельный realm gate с audit/revision, а не browser input.

### 26.2. OAuth client trust

`skipConsent` остается IAM-controlled first-party policy.

Headless UI не получает возможность:

- устанавливать `skipConsent`;
- маркировать себя first-party;
- скрывать consent;
- менять scopes после start.

### 26.3. Trusted origins

Admin API уже управляет exact origins. Перед rollout нужно уточнить validation:

- HTTPS обязательно вне explicit localhost development;
- wildcard запрещен;
- path/query/fragment/userinfo запрещены;
- origin normalization единый для Admin API, CORS и interaction binding;
- удаление origin инвалидирует active headless use.

### 26.4. Public metadata

OIDC discovery и OAuth Authorization Server Metadata сохраняют стандартные
OAuth endpoints.

Headless interaction endpoint не нужно рекламировать как стандартный OAuth
metadata field. Shopana SDK получает его из issuer convention либо отдельного
versioned Shopana metadata:

```text
GET /auth/applications/:applicationId/.well-known/shopana-auth
```

В первой версии предпочтительнее issuer convention, чтобы не расширять public
metadata без необходимости.

## 27. Audit и observability

### 27.1. Audit events

Добавить redacted events:

```text
application_auth_interaction.started.v1
application_auth_interaction.completed.v1
application_auth_interaction.denied.v1
application_auth_interaction.failed.v1
application_auth_interaction.expired.v1
application_auth_interaction.social_started.v1
```

Audit fields:

- organization ID;
- application ID;
- OAuth client ID или safe hash согласно текущей audit policy;
- transport `hosted|headless-browser|headless-bff`;
- action/outcome;
- reason category;
- provider name при social action;
- request ID;
- configuration revision;
- secret key version.

Не включать:

- interaction ID/credential;
- email/name;
- IP в raw виде, если audit policy этого не требует;
- redirect URI;
- state/nonce/challenge;
- password/OTP;
- session/token/code;
- provider payload.

### 27.2. Metrics

Низкокардинальные metrics:

```text
iam_application_auth_interaction_started_total
iam_application_auth_interaction_transition_total{from,to,outcome}
iam_application_auth_interaction_duration_seconds{outcome}
iam_application_auth_interaction_active
iam_application_auth_interaction_expired_total
iam_application_auth_interaction_rate_limited_total{action}
iam_application_auth_social_popup_total{provider,outcome}
```

Не использовать application ID, client ID, email, origin или interaction ID как
metric labels.

### 27.3. Logging

Operational log:

- request ID;
- route template;
- method;
- status;
- step/action;
- reason category;
- latency.

Sensitive values не логируются даже на debug.

## 28. Security threat model

### 28.1. Credential theft

Защита:

- 256-bit secret;
- HTTPS;
- header, не URL;
- no-store;
- memory/session-only SDK storage;
- 10-minute TTL;
- exact origin;
- terminal consumption;
- read-only terminal recovery с encrypted result и отдельным коротким TTL;
- credential hash at rest.

Exact origin снижает риск browser misuse, но не останавливает небраузерного
attacker с уже украденным bearer credential. Для такого attacker решающими
остаются entropy, TTL, action journal и terminal/read-only state.

### 28.2. CSRF

Защита:

- non-simple Authorization header;
- CORS preflight;
- exact Origin;
- interaction binding;
- strict action schema.

### 28.3. XSS в storefront

Headless SDK не может полностью защититься от XSS application origin.

Снижение риска:

- short-lived interaction credential;
- не хранить password/OTP;
- no refresh token в default SDK storage;
- BFF recommended;
- no remote HTML;
- Content Security Policy guidance для consumers.

### 28.4. Redirect manipulation

Защита:

- exact redirect URI при start;
- store only hash;
- re-resolve against active client перед completion;
- validate Better Auth redirect;
- SDK не принимает redirect override;
- error redirect проходит ту же проверку.

### 28.5. Cross-application access

Каждый lookup включает:

- path application ID;
- interaction application ID;
- OAuth client application ID;
- session/user application ID;
- resource application ID.

Foreign credential/client/session возвращает безопасный unavailable response.

### 28.6. Session fixation

Headless credential создается IAM и не принимается от caller.

Better Auth session:

- должна принадлежать той же application;
- связывается с interaction server-side;
- session ID не возвращается;
- post-login continuation проверяет exact session binding.

### 28.7. Replay

- каждый mutation имеет `actionId + expectedRevision`;
- action claim записывается до side effect, completed retry возвращает сохраненный
  safe result;
- terminal interaction consumed atomic CAS вместе с encrypted recovery result;
- social continuation one-time;
- consent и остальные mutations требуют current revision;
- authorization code lifecycle остается Better Auth-owned one-time flow;
- callback replay не восстанавливает interaction.

### 28.8. Account enumeration

- generic password error;
- generic OTP send;
- minimum response floor;
- consistent HTTP mapping;
- invalid/foreign credential indistinguishable;
- rate-limit reason не раскрывает identity existence;
- password signup возвращает одинаковый step для existing/new email и никогда не
  auto-signs-in headless caller;
- verification/existing-account messages используют один внешний callback и
  одинаковый API result.

### 28.9. UI spoofing

- application/client names escaped в hosted UI;
- headless SDK рендерит text, не HTML;
- logo только validated HTTPS;
- consent всегда показывает client identity;
- optional IAM security attribution нельзя заменить произвольным HTML.

## 29. Failure semantics

### 29.1. Recoverable

- wrong credentials;
- invalid OTP;
- stale non-terminal revision;
- popup blocked;
- user remains on allowed step;
- потерянный terminal response читается через `GET current` в recovery TTL без
  повторного Better Auth side effect.

### 29.2. Terminal

- application/client disabled;
- redirect binding changed;
- resource mismatch;
- interaction expired;
- session/application mismatch;
- invalid signed OAuth continuation;
- consumed interaction replay;
- unknown scope/provider integrity failure.

### 29.3. Dependency failure

Database/rate-limit/keyring/Better Auth/provider failure:

- fail closed;
- no stale runtime fallback;
- action journal claim сохраняет operation ID до side effect;
- no blind mutation retry после indeterminate outcome;
- no partial terminal completion; если adapter не может reconcile operation,
  interaction атомарно становится `FAILED`;
- return generic `TEMPORARILY_UNAVAILABLE`;
- audit/log safe reason category;
- interaction может остаться active только если transition не был committed.

## 30. Implementation phases

### Phase 0. Compatibility и contract spike

1. Зафиксировать installed Better Auth/OAuth Provider version.
2. Проверить internal authorize response variants.
3. Проверить session creation/continuation без browser cookie dependency.
4. Определить минимальный allowlist Better Auth cookies для server-side
   continuation либо доказать sessionless internal continuation.
5. Проверить consent allow/deny JSON/redirect variants.
6. Проверить reusable consent и `skipConsent`.
7. Проверить social callback continuation.
8. Зафиксировать adapter contract и executable fixtures.
9. Утвердить interaction credential format.
10. Утвердить stable credential vs rotation decision.
11. Утвердить BFF и SPA integration boundaries.
12. Доказать idempotency/reconciliation contract каждой mutation operation по
    server-generated `operationId`.
13. Проверить email verification callback без переноса session между devices.
14. Зафиксировать terminal recovery result и двухминутный recovery TTL.

Критерий выхода: нет неизвестных plugin response shapes, влияющих на state
machine или final redirect.

### Phase 1. Domain model и storage

1. Ввести interaction enums/types.
2. Выполнить прямую migration текущей context model.
3. Добавить transport/credential/origin/revision/encrypted terminal recovery
   fields.
4. При необходимости добавить encrypted continuation fields и key-version
   constraints.
5. Реализовать constraints и indexes.
6. Реализовать credential codec/hash.
7. Реализовать application-scoped repository.
8. Перенести cleanup.
9. Добавить atomic claim/complete/terminal consume primitives.
10. Добавить action journal с claim/complete/indeterminate operations.
11. Добавить hashed verification и social continuation storage.

Критерий выхода: repository гарантирует TTL, isolation, origin binding,
claim-before-side-effect, one-time terminal consumption и read-only terminal
recovery.

### Phase 2. Better Auth adapter

1. Изолировать version-specific paths/shapes.
2. Перенести internal request construction.
3. Нормализовать multiple cookies.
4. Нормализовать sign-in/signup/OTP results.
5. Нормализовать consent result.
6. Реализовать validated redirect result.
7. Добавить adapter contract fixtures.
8. Добавить `operationId` idempotency/reconciliation fixtures, включая crash
   между side effect и journal completion.

Критерий выхода: interaction service не знает raw Better Auth response.

### Phase 3. Interaction service

1. Реализовать start.
2. Реализовать current.
3. Реализовать password sign-in.
4. Реализовать password sign-up.
5. Реализовать email OTP.
6. Реализовать verification resend/continue и одинаковый existing/new signup
   result.
7. Реализовать switch.
8. Реализовать consent.
9. Реализовать cancel.
10. Подключить action claim/idempotency.
11. Подключить rate limits.
12. Подключить audit.

Критерий выхода: полный password/OTP Authorization Code flow выполняется без
HTML renderer.

### Phase 4. Headless HTTP boundary

1. Добавить exact routes в manifest.
2. Добавить strict schemas.
3. Добавить Interaction auth parser.
4. Разделить CORS policy hosted/headless.
5. Добавить response presenter/error mapping.
6. Добавить no-store/security headers.
7. Добавить preflight matrix.
8. Добавить body/credential length limits.
9. Добавить authenticated confidential BFF server-start route.
10. Добавить terminal recovery read contract.

Критерий выхода: browser CORS доступен только trusted origin, небраузерный start
рассматривается как public, confidential server start требует client
authentication, unknown/disabled routes fail closed до Better Auth.

### Phase 5. Consent presentation

1. Создать scope catalog.
2. Создать localized scope copy.
3. Перевести hosted consent на catalog.
4. Вернуть headless consent DTO.
5. Проверить deny/allow/final redirect.
6. Проверить reused consent и `skipConsent`.

Критерий выхода: hosted/headless показывают одинаковые client/scopes и дают
одинаковый OAuth result.

### Phase 6. Social flow

1. Создать hashed one-time social continuation и top-level form POST route.
2. Реализовать redirect mode.
3. Реализовать popup coordinator.
4. Реализовать exact postMessage.
5. Реализовать callback audit.
6. Проверить provider disable/revision changes.
7. Проверить replay/application mismatch.

Критерий выхода: Google/Facebook проходят popup и redirect flow без раскрытия
interaction credential/provider token.

### Phase 7. Hosted UI migration

1. Перевести login на interaction service.
2. Перевести signup.
3. Перевести OTP.
4. Перевести social start.
5. Перевести consent.
6. Удалить дублирующую orchestration.
7. Сохранить HTML/CSP/accessibility behavior.

Критерий выхода: hosted и headless используют один domain flow.

### Phase 8. `packages/auth-core`

1. Создать package и generated/manual public types.
2. Реализовать transport.
3. Реализовать state store/subscriptions.
4. Реализовать memory/session resume.
5. Реализовать popup coordinator.
6. Реализовать safe navigation.
7. Добавить public SPA PKCE adapter отдельно.
8. Добавить BFF browser/server adapters отдельно.
9. Добавить action ID/revision lifecycle и terminal recovery resume.
10. Добавить redacted telemetry hooks.

Критерий выхода: vanilla TypeScript consumer проходит reference flow.

### Phase 9. `packages/auth-react`

1. Provider/context/hooks.
2. `<AuthFlow />`.
3. `<SignIn />`.
4. `<SignUp />`.
5. `<Consent />`.
6. Social buttons/popup fallback.
7. Email verification pending/resend/resume.
8. Appearance slots/tokens.
9. Accessibility.
10. SSR-safe imports/hydration.
11. Example application.

Критерий выхода: consumer может использовать default components или полностью
собственный markup через hooks.

### Phase 10. Hardening и rollout

1. Security negative matrix.
2. Multi-application isolation.
3. Rate-limit/load behavior.
4. Browser cookie independence.
5. Popup/browser compatibility.
6. Documentation BFF/SPA.
7. Operational dashboards/alerts.
8. Direct cutover migration.
9. Remove obsolete context/controller code.
10. Publish versioned SDK contract.

## 31. Проверка

Все development, migration, codegen, test, e2e и Playwright операции
выполняются через `shopana-cli` согласно правилам проекта.

### 31.1. Contract coverage

- start принимает только Authorization Code + S256 PKCE;
- exact resource обязателен;
- exact redirect URI обязателен;
- exact trusted origin обязателен для browser transport;
- unsupported/duplicate scope отклоняется;
- foreign client/application отклоняется;
- archived/disabled client отклоняется;
- disabled realm отклоняется;
- invalid credential indistinguishable от foreign credential;
- expired interaction недоступен; consumed terminal interaction readable только
  в recovery TTL;
- stale revision дает conflict;
- terminal transition one-time;
- parallel mutations допускают только один action claim;
- retry с тем же action ID возвращает тот же safe result;
- reuse action ID с другим payload отклоняется;
- crash после side effect проходит reconciliation без повторного side effect;
- terminal response loss восстанавливается через current без повторной выдачи
  code.

### 31.2. Password/signup

- password sign-in success/failure;
- registration open/disabled;
- sign-up method enabled/disabled;
- email verification required/not required;
- verification callback new/existing/already verified/expired/replayed;
- verification link на другом device не переносит session;
- verification resend ротирует старый handle и возвращает generic result;
- blocked user;
- session/application mismatch;
- no email enumeration;
- existing/new email дают одинаковый observable signup step и response timing
  floor;
- rate limit;
- application A credentials не работают в B.

### 31.3. OTP

- generic request response;
- delivery failure;
- invalid/expired/replayed OTP;
- attempt limits;
- resend rotation;
- application isolation;
- raw email/OTP отсутствуют в logs/storage/URLs.

### 31.4. Consent

- exact client name;
- known scope presentation;
- allow;
- deny;
- skipConsent только first-party;
- reusable consent;
- changed/disabled client до submit;
- redirect URI removed после start;
- interaction/session mismatch;
- final redirect validation.

### 31.5. Social

- enabled provider;
- disabled provider;
- popup;
- redirect fallback;
- popup blocked;
- exact postMessage origin;
- forged/replayed callback;
- provider/application mismatch;
- registration disabled;
- account owned by another user;
- no provider token leakage;
- social handle передается form POST и отсутствует в URL/history/referrer/logs;
- social handle expired/replayed/cross-application;

### 31.6. CORS/security

- trusted origin positive;
- unknown/subdomain/lookalike origin negative;
- wildcard absent;
- missing Origin negative;
- forged Origin не считается authentication для server caller;
- public browser start сохраняет полный rate-limit/protocol validation;
- confidential server start требует client authentication;
- preflight exact methods/headers;
- основной interaction и social continuation credentials отсутствуют в URL;
  verification email использует только отдельный one-time handle;
- no-store;
- no sensitive logs;
- body/credential length limits;
- duplicate/malformed body;
- clickjacking/CSP для popup pages.

### 31.7. SDK

- state discriminated union;
- no credential in public state serialization;
- no import-time `window`;
- resume behavior;
- abort/unmount;
- network error does not duplicate mutation;
- mutation retry сохраняет action ID;
- lost terminal response восстанавливается через resume;
- popup cleanup;
- callback state verification;
- accessibility keyboard/focus/alerts;
- React Strict Mode behavior;
- multiple component instances share one provider state.

### 31.8. Reference end-to-end flows

1. Public SPA client + password + consent + code exchange.
2. Public SPA client + OTP + consent + code exchange.
3. Public SPA client + Google popup + consent + code exchange.
4. Confidential BFF client + password + consent + server token exchange.
   Browser видит только first-party BFF attempt handle.
5. First-party client + `skipConsent`.
6. Existing consent reuse.
7. Deny returns OAuth error to exact redirect URI.
8. Interaction expires at every non-terminal step.
9. Realm/client/origin disabled during active interaction.
10. Parallel applications remain fully isolated.
11. Parallel same-interaction mutations выполняют один logical side effect.
12. Password signup с обязательной verification завершается через callback на
    том же и другом device без account enumeration.

## 32. Rollout

Поскольку production данных и users нет:

1. Завершить compatibility spike.
2. Закрыть публичный application auth listener на время migration.
3. Применить прямую interaction schema migration.
4. Выпустить IAM runtime и SDK совместимой версией.
5. Проверить hosted reference flow.
6. Проверить headless BFF reference flow.
7. Проверить headless SPA reference flow.
8. Включить headless routes только после exact trusted origins configuration.
9. Открыть public listener.
10. Наблюдать start/completion/expiry/rate-limit metrics.

Нет:

- dual read/write;
- legacy fallback;
- backfill;
- смешанного context формата;
- старого и нового service orchestration.

Rollback до появления публичных auth данных:

- закрыть listener;
- восстановить БД и предыдущий IAM artifact вместе;
- не запускать новый binary на старой schema или наоборот.

После появления OAuth data rollback заменяется forward fix; нельзя откатывать
schema отдельно от tokens/sessions/interactions.

## 33. Предлагаемая структура файлов

```text
services/iam/src/
  api/http/application-auth/
    interactions/
      ApplicationAuthInteractionController.ts
      ApplicationAuthInteractionService.ts
      ApplicationAuthInteractionPresenter.ts
      BetterAuthApplicationInteractionAdapter.ts
      credential.ts
      actionJournal.ts
      terminalRecovery.ts
      verificationContinuation.ts
      socialContinuation.ts
      errors.ts
      schemas.ts
      types.ts
    ui/
      ApplicationAuthHostedUiController.ts
      ApplicationAuthHostedUiPresenter.ts
      render.ts
      localization.ts
      assets.ts
  auth/
    applicationAuthInteractionPolicy.ts
    applicationOAuthScopeCatalog.ts
  repositories/
    ApplicationAuthInteractionRepository.ts
    ApplicationAuthInteractionActionRepository.ts
    ApplicationAuthNavigationContinuationRepository.ts
    models/application-auth.ts
  services/
    ApplicationAuthPresentationService.ts
  events/application-auth/
    ...

packages/auth-core/
  src/
    client.ts
    transport.ts
    state.ts
    storage.ts
    popup.ts
    pkce.ts
    errors.ts
    types.ts

packages/auth-react/
  src/
    provider/
    hooks/
    components/
      AuthFlow.tsx
      SignIn.tsx
      SignUp.tsx
      Consent.tsx
      EmailOtpForm.tsx
      EmailVerificationPending.tsx
      SocialButton.tsx
    appearance/
    localization/
```

Названия packages должны быть сверены с текущим npm workspace naming до
создания.

## 34. Критерии готовности

Решение считается готовым, когда:

1. Custom React UI завершает standard Authorization Code + S256 PKCE flow.
2. Компонент не получает Better Auth `oauth_query`, session ID или plugin
   response.
3. Headless flow не зависит от third-party cookie.
4. Browser JavaScript получает headless responses только с exact trusted origin;
   server caller не считается authenticated по `Origin`.
5. Interaction credential короткоживущий, hashed at rest и никогда не попадает
   в URL/log/audit.
6. Hosted и headless flows используют один interaction service.
7. Consent показывает code-owned descriptions только validated scopes.
8. Final redirect всегда повторно проверяется против active OAuth client.
9. Realm/client/provider/origin changes fail closed.
10. Password/OTP flows сохраняют rate limit и anti-enumeration.
11. Social popup не раскрывает credential/code/token через `postMessage`.
12. BFF documentation не передает confidential client secret в browser.
13. SPA adapter явно отделен и использует PKCE/state/nonce.
14. Application A не может прочитать или продолжить interaction B.
15. Все terminal transitions одноразовые.
16. Hosted UI сохраняет текущие CSP, no-store, accessibility и generic errors.
17. Default React components доступны, но consumer может построить полностью
    собственный UI через hooks.
18. В репозитории нет legacy interaction orchestration и dual schema.
19. Каждая mutation claim записана до side effect и idempotent/reconcilable по
    operation ID.
20. Потерянный terminal response восстанавливается без повторной выдачи code.
21. Email verification имеет one-time callback, resend и cross-device semantics;
    existing/new signup неразличимы для API caller.
22. Social continuation передается form POST, hashed at rest и отсутствует в
    URL/history/referrer/logs.
23. Confidential BFF использует authenticated server start и не передает
    interaction credential/verifier/client secret browser.

## 35. Итоговая рекомендуемая последовательность

```text
Compatibility spike
  -> unified interaction model
  -> Better Auth adapter
  -> shared interaction service
  -> headless REST boundary
  -> consent/scope presentation
  -> social popup/redirect
  -> hosted UI migration
  -> auth-core
  -> auth-react
  -> hardening and rollout
```

Главный принцип реализации: headless API является новым presentation transport
существующего OAuth authorization flow, а не альтернативной системой
authentication или упрощенным публичным доступом к Better Auth.
