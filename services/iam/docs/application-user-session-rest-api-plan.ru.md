# План управления application-user сессиями через Better Auth в IAM

Статус: проектный план

Дата: 2026-08-09

Сервис: `services/iam`

Целевая область: управление browser sessions пользователей application realm

Связанные документы:

- [План OAuth 2.1 / OpenID Connect для `application_users`](./application-users-oauth-oidc-implementation-plan.ru.md);
- [Application auth OAuth/OIDC — operations](./application-users-oauth-oidc-integration.md);
- [План headless OAuth interactions](./application-auth-headless-interactions-plan.ru.md).

## 1. Резюме решения

Управление application-user сессиями выполняет application-scoped экземпляр
Better Auth. IAM не создает параллельный REST session API, собственную модель
авторизации для session management или отдельный repository поверх Better Auth.

Публичный контракт использует штатные endpoints Better Auth 1.6.23:

| Метод | Endpoint относительно application `basePath` | Назначение |
|---|---|---|
| `GET` | `/list-sessions` | Список активных сессий текущего пользователя |
| `POST` | `/revoke-session` | Отзыв выбранной сессии по ее Better Auth token |
| `POST` | `/revoke-other-sessions` | Отзыв всех сессий, кроме текущей |
| `POST` | `/revoke-sessions` | Отзыв всех сессий текущего пользователя |
| `POST` | `/sign-out` | Завершение текущей browser session и очистка cookies |

Полные пути имеют вид:

```text
/auth/applications/:applicationId/list-sessions
/auth/applications/:applicationId/revoke-session
/auth/applications/:applicationId/revoke-other-sessions
/auth/applications/:applicationId/revoke-sessions
/auth/applications/:applicationId/sign-out
```

Все пять routes обслуживаются `auth.handler` Better Auth внутри существующего
`applicationAuthHttpPlugin`. Отдельный `applicationUserSessionHttpPlugin`, пути
`/api/v1/me/sessions`, OAuth scopes `sessions:read`/`sessions:write`, cursor и
Bearer guard не создаются.

Application OAuth access token не является credential для этих endpoints.
Операции авторизуются application-scoped Better Auth session cookie. Hosted
`GET/POST /logout` и OIDC `GET /oauth2/end-session` сохраняются как отдельные
flows, но завершение session в них также должно делегироваться Better Auth либо
его application-scoped adapter, а не выполнять независимое удаление.

## 2. Цели

1. Сделать Better Auth единственным владельцем публичных session-management
   commands и их authentication semantics.
2. Гарантировать application и user isolation через отдельный Better Auth
   runtime и scoped adapter.
3. При любом удалении application session отзывать связанные OAuth access и
   refresh token families через adapter lifecycle.
4. Сохранить штатные cookies, CSRF/origin checks, freshness checks, response
   shapes и клиентские методы Better Auth.
5. Публиковать live-state invalidation после успешного session mutation.
6. Не допускать появления новых Better Auth endpoints в публичном API без
   явного изменения versioned route manifest.
7. Не записывать session token, cookie или OAuth token в logs, metrics и audit.

## 3. Не входит в v1

- собственный versioned REST API `/api/v1/me/sessions`;
- Bearer-authenticated управление browser sessions;
- OAuth scopes `sessions:read` и `sessions:write`;
- pagination и signed cursor для списка сессий;
- преобразование Better Auth session в отдельный device/browser/os DTO;
- GeoIP и определение местоположения;
- пользовательские названия устройств;
- управление platform-admin sessions;
- управление сессиями другого application realm или другого пользователя;
- backward compatibility, dual routes, backfill и compatibility layer.

Stage/production application-auth данных нет. Изменения выполняются прямым
cutover.

## 4. Source of truth и границы ответственности

### 4.1. Better Auth

Better Auth владеет:

- чтением и проверкой текущей session из realm-scoped cookie;
- freshness и authoritative-session middleware;
- определением текущего `userId` и session token;
- проверкой принадлежности targeted session текущему пользователю;
- реализацией `listSessions`, `revokeSession`, `revokeOtherSessions`,
  `revokeSessions` и `signOut`;
- очисткой Better Auth cookies при `signOut`;
- HTTP status и JSON response штатных endpoints;
- browser client methods и session-update broadcasts.

В plan и коде используются публичные `auth.api.*`/`auth.handler` contracts.
Импорт внутренних файлов `better-auth/dist/*` в production-код запрещен.

### 4.2. IAM application-scoped adapter

`createScopedDrizzleAdapter()` владеет persistence и tenant isolation:

- каждая операция над `application_session` получает обязательный predicate
  текущего `applicationId`;
- Better Auth `userId` никогда не используется вне текущего application realm;
- удаление session проходит только через adapter deletion lifecycle;
- перед удалением session adapter удаляет связанные
  `application_oauth_access_token` и помечает связанные
  `application_oauth_refresh_token` revoked с `sessionId = null`;
- session и связанные token mutations выполняются в одной database transaction;
- после commit публикуется application-auth live-state invalidation;
- отсутствие либо отключение application/organization/realm закрывает чтение и
  mutation.

Better Auth остается владельцем операции, а IAM adapter расширяет ее
application-specific invariants. `AuthSessionRepository` не вызывается из
публичных session endpoints и не становится вторым command path.

### 4.3. HTTP boundary

`applicationAuthHttpPlugin` владеет только transport boundary:

- canonical application ID и active runtime loading;
- default-deny route manifest по `(method, normalized pathname)`;
- trusted origin, CORS, proxy/IP policy, request ID и outer rate limit;
- безопасное преобразование Fastify request/response в Fetch contract Better
  Auth без потери multiple `Set-Cookie` headers;
- лимиты URL, headers и body;
- redacted logs и metrics.

Plugin не переопределяет успешные response bodies Better Auth и не реализует
session business logic.

## 5. Публичный контракт Better Auth

Точная версия контракта: `better-auth@1.6.23`.

### 5.1. `GET /list-sessions`

Endpoint требует валидную свежую Better Auth session. При текущей конфигурации
application runtime `freshAge = 10 минут`; более старая session получает штатную
ошибку `SESSION_NOT_FRESH` и должна пройти существующий re-authentication flow.

Ответ — штатный массив Better Auth active sessions. IAM не добавляет cursor,
pagination или отдельный DTO. Точный response schema фиксируется generated
contract snapshot для установленной версии Better Auth.

Better Auth session response содержит credential `token`, необходимый штатному
`revoke-session`. Поэтому ответ является чувствительным:

- `Cache-Control: no-store` обязателен;
- token не копируется в telemetry, audit, URL, DOM attributes или local storage;
- клиент держит значение только в памяти до вызова revoke;
- UI не показывает token и не использует его как display ID;
- список доступен только trusted origins и текущей cookie session.

Текущая session определяется клиентом по token текущей session, полученному из
Better Auth session state. IAM не вводит публичный session ID alias.

### 5.2. `POST /revoke-session`

Request использует штатное тело Better Auth:

```json
{
  "token": "better-auth-session-token"
}
```

Better Auth получает authoritative current session, находит target session и
удаляет ее только если `target.userId === current.userId`. Неизвестный token,
token другого пользователя и уже удаленная session не раскрываются; штатный
ответ остается:

```json
{
  "status": true
}
```

UI не предлагает отзывать текущую session через этот endpoint. Для текущей
session используется `/sign-out`, чтобы Better Auth также очистил cookies.

### 5.3. `POST /revoke-other-sessions`

Better Auth получает authoritative current session, загружает активные sessions
текущего пользователя и удаляет все, token которых не равен token текущей
session. Штатный ответ:

```json
{
  "status": true
}
```

Операция не возвращает `revokedCount`. IAM не меняет response shape.

### 5.4. `POST /revoke-sessions`

Better Auth удаляет все sessions текущего пользователя, включая текущую.
Штатный ответ:

```json
{
  "status": true
}
```

После успеха клиент обязан очистить локальное auth state и перейти в signed-out
состояние. Этот endpoint не заменяет `/sign-out` для обычной кнопки «Выйти»;
он используется только для явного действия «Отозвать все сессии».

### 5.5. `POST /sign-out`

Better Auth читает signed session cookie, удаляет текущую session через adapter,
очищает полный Better Auth session cookie set и возвращает штатный ответ:

```json
{
  "success": true
}
```

Отсутствующая или уже недействительная cookie обрабатывается идемпотентно в
соответствии со штатным Better Auth contract. IAM не добавляет Bearer `sid`,
session ID в body либо дополнительную cookie-matching процедуру.

## 6. Authentication, freshness и CSRF/origin policy

Session endpoints принимают только Better Auth application session:

- cookie имеет application-specific prefix, realm `Path`, `HttpOnly`, `Secure`
  в production и утвержденный `SameSite`;
- cookie из другого application realm не проходит signature, name/path и scoped
  persistence checks;
- platform session, OAuth access token, refresh token и ID token не дают доступ;
- bearer plugin не добавляется в application Better Auth composition;
- `list-sessions` использует штатный Better Auth fresh-session middleware;
- revoke endpoints используют штатный authoritative sensitive-session
  middleware и обходят cookie cache;
- `sign-out` работает только с текущей Better Auth cookie.

Outer HTTP boundary разрешает browser requests только exact trusted origins.
State-changing POST routes проходят штатные Better Auth origin/CSRF checks;
отключать их и добавлять bypass для hosted UI запрещено.

Session management не участвует в OAuth consent и не зависит от OAuth client
scopes. Полномочие следует из интерактивной Better Auth session самого
application user.

## 7. Route manifest и CORS

В `createEffectiveApplicationAuthRouteManifest()` добавить exact entries:

```text
GET  /list-sessions
POST /revoke-session
POST /revoke-other-sessions
POST /revoke-sessions
POST /sign-out
```

Широкий prefix для session routes запрещен. Все другие Better Auth session,
admin и plugin endpoints остаются default-deny, пока не появится отдельное
решение и contract tests.

Для approved trusted origin:

- разрешены только методы и headers, необходимые соответствующему exact route;
- credentials включены, поскольку authorization выполняется cookie;
- preflight не вызывает Better Auth mutation;
- response содержит `Vary: Origin`;
- raw `Cookie`, session token и body не попадают в preflight logs.

Reverse-proxy external path manifest обновляется теми же пятью exact routes.
Неизвестный method/path получает `404` до `auth.handler`.

## 8. Transaction, OAuth token cleanup и invalidation

Каждая Better Auth session deletion в application realm проходит единый adapter
primitive:

1. В transaction выбрать target sessions с predicates
   `applicationId + Better Auth where`.
2. Удалить связанные application OAuth access token rows.
3. Пометить связанные refresh token rows revoked и отвязать `sessionId`.
4. Удалить target application session rows.
5. Commit transaction.
6. Опубликовать invalidation только для trusted IDs фактически выбранных rows.

Требования:

- token cleanup и session delete не могут частично commit-иться;
- targeted delete не переносит caller token в invalidation payload;
- repeated delete безопасен и не создает событие для неизвестной session;
- `revoke-other-sessions` может вызвать несколько Better Auth deletes, но adapter
  сохраняет isolation для каждого target; оптимизация bulk delete допускается
  только через поддерживаемый Better Auth adapter contract;
- invalidation удаляет локальные cache entries до завершения request и
  публикуется через настроенный distributed transport;
- ошибка publish наблюдаема и не откатывает уже committed mutation;
- hard TTL validation cache остается верхней границей stale acceptance.

Если для обязательного atomic cleanup штатный вызов Better Auth не использует
adapter transaction, transaction boundary реализуется внутри scoped adapter, а
не в отдельном HTTP service.

## 9. Schema и repository

Новая session table и новый session repository не создаются. Используются
существующие Better Auth модели:

- `application_session`;
- `application_oauth_access_token`;
- `application_oauth_refresh_token`.

Существующие индексы должны покрывать:

- `(application_id, token)` для `findSession`/target revoke;
- `(application_id, user_id)` для `listSessions` и bulk operations;
- OAuth rows по `(application_id, session_id)` для cleanup.

Если OAuth session lookup не покрыт индексом, миграция добавляет только нужные
composite indexes через IAM migration workflow. Backfill не создается.

`AuthSessionRepository` может оставаться для platform/admin или внутренних
не-Better-Auth use cases, но application customer UI не вызывает его для list,
revoke или sign-out.

## 10. Rate limiting

Используются два существующих уровня:

1. `applicationAuthHttpPlugin` ограничивает malformed/unknown traffic до runtime
   loading и Better Auth crypto/DB work.
2. Better Auth rate limiter применяет endpoint-specific application runtime
   policy.

Рекомендуемые authenticated лимиты:

| Endpoint | Лимит на application user |
|---|---|
| `list-sessions` | 30/min |
| `revoke-session` | 20/min |
| `revoke-other-sessions` | 10/min |
| `revoke-sessions` | 5/min |
| `sign-out` | 20/min |

Rate-limit key не содержит raw user ID, session token, cookie, IP или User-Agent.
Logout остается доступен через bounded emergency fallback при отказе shared
limiter.

## 11. Ошибки и cache headers

Публичные status/body session endpoints принадлежат Better Auth. IAM не
переписывает их в отдельный `application/problem+json` contract.

Outer boundary может вернуть transport errors до Better Auth:

- `404` для unavailable application или route вне manifest;
- `403` для untrusted Origin;
- `413` для oversized body;
- `429` для outer rate limit;
- `503` при недоступности обязательного runtime dependency.

Для всех session-management responses обязательны:

- `Cache-Control: no-store`;
- `Pragma: no-cache`;
- `X-Request-ID`;
- отсутствие credential data в error details.

Multiple `Set-Cookie` от Better Auth передаются без объединения. Ошибки adapter,
SQL и invalidation transport не возвращаются клиенту как raw dependency text.

## 12. Audit, logs и metrics

Mutation audit actions:

- `session_revoke`;
- `session_revoke_others`;
- `session_revoke_all`;
- `session_sign_out`.

Audit получает outcome после adapter mutation. Доставка audit остается
non-blocking и не меняет Better Auth response.

Разрешены application/organization IDs, action, stable outcome/reason category,
request ID и opaque HMAC actor ID. Запрещены:

- Better Auth session token и session cookie;
- session ID;
- OAuth access/refresh/ID tokens;
- IP, raw User-Agent и Origin;
- request body `/revoke-session`;
- dependency error text.

Metrics используют только endpoint, status, outcome и latency. Tenant/user/
session data не используется как label.

## 13. Клиентская интеграция customers

Customer account UI использует Better Auth client, созданный с base URL текущего
application realm. Прямые `fetch` wrappers и собственные REST DTO не создаются.

Поток экрана сессий:

1. Вызвать `listSessions()`.
2. Показать безопасные поля session: даты, IP/User-Agent при наличии; token не
   рендерить и не сохранять.
3. Для другой session вызвать `revokeSession({ token })`.
4. Для «Выйти на других устройствах» вызвать `revokeOtherSessions()`.
5. Для «Отозвать все сессии» вызвать `revokeSessions()`, очистить client auth
   state и перейти на login.
6. Для обычного выхода вызвать `signOut()`.

UI обрабатывает `SESSION_NOT_FRESH` единым существующим re-auth flow. Он не
пытается заменить Better Auth session OAuth access token либо refresh token.

## 14. Тестовый план

### 14.1. Better Auth contract

- route snapshot подтверждает methods, paths, request и response schemas для
  Better Auth 1.6.23;
- `list-sessions` возвращает только active sessions текущего user/application;
- stale session получает `SESSION_NOT_FRESH` на list;
- revoke routes используют authoritative store read, а не cookie cache;
- targeted revoke удаляет только session текущего пользователя;
- foreign/unknown/already-deleted token не раскрывает существование session;
- revoke-others сохраняет текущую session;
- revoke-sessions удаляет включая текущую;
- sign-out удаляет текущую session и передает все clear-cookie headers;
- platform cookie, OAuth tokens и cookie другого application не авторизуют
  endpoints.

### 14.2. Adapter и token lifecycle

- каждая session delete включает exact `applicationId` predicate;
- access tokens target session удаляются;
- refresh families target session получают revoked timestamp и `sessionId=null`;
- session/token mutation полностью commit-ится либо rollback-ится;
- session другого user/application и его token families не меняются;
- password reset, hosted logout, OIDC logout и Better Auth session endpoints
  проходят один deletion lifecycle;
- invalidation публикуется только после commit и только для реально найденных
  trusted session IDs;
- parallel/repeated deletes безопасны;
- transport failure наблюдаем, committed mutation сохраняется, stale cache
  ограничен hard TTL.

### 14.3. HTTP security

- пять exact routes разрешены manifest и обслуживаются Better Auth;
- unknown method/path и прочие Better Auth management endpoints дают `404` до
  handler;
- encoded slash, duplicate slash, dot segment и double encoding не обходят
  manifest;
- trusted origin и CORS credentials работают только для exact allowlist;
- CSRF/origin checks Better Auth не отключены;
- oversized/malformed JSON отклоняется без mutation;
- `Set-Cookie` headers не объединяются;
- все ответы имеют no-store/request ID contract;
- response/log/audit/metrics не раскрывают session token или cookie.

### 14.4. Customer UI

- список не рендерит и не сохраняет session token;
- revoke вызывает штатный Better Auth client method;
- revoke-others обновляет список без logout текущего браузера;
- revoke-all и sign-out очищают client auth state;
- `SESSION_NOT_FRESH` запускает re-auth flow;
- network/error retry не переключается на custom IAM session API.

По правилам проекта во время подготовки документа build/test не запускаются.
Команды реализации, миграций и целевых тестов выполняются через `shopana-cli`.

## 15. Этапы реализации

### Этап 1. Зафиксировать Better Auth contract

1. Снять executable route/schema snapshot Better Auth 1.6.23.
2. Добавить пять exact routes в effective и reverse-proxy manifests.
3. Зафиксировать cookie, freshness, origin/CSRF и no-store contracts.

Критерий выхода: каждый session endpoint однозначно принадлежит Better Auth, а
остальные Better Auth routes остаются default-deny.

### Этап 2. Укрепить scoped adapter lifecycle

1. Сделать session + OAuth token cleanup атомарным внутри adapter transaction.
2. Проверить индексы для session token/user и OAuth session ID.
3. Подключить post-commit invalidation и redacted audit hooks.
4. Удалить application customer session command calls к
   `AuthSessionRepository`.

Критерий выхода: любой Better Auth session delete одинаково отзывает связанные
OAuth token families без cross-application доступа.

### Этап 3. Customer UI

1. Подключить Better Auth client к application realm.
2. Реализовать list/revoke/revoke-others/revoke-all/sign-out штатными client
   methods.
3. Добавить re-auth flow для `SESSION_NOT_FRESH` и безопасную работу с token
   только в памяти.

Критерий выхода: customers UI не использует custom session REST API и не
раскрывает session credential.

### Этап 4. Contract и E2E verification

1. Добавить Better Auth route/adapter/HTTP contract tests.
2. Добавить один целевой Playwright customer session-management scenario.
3. Обновить operational documentation и alerts invalidation/audit failures.
4. Запустить проверки через `shopana-cli` в рамках реализации.

Критерий выхода: positive, isolation, failure и credential-redaction matrix
проходит для всех пяти Better Auth endpoints.

## 16. Зафиксированные решения

- Owner публичных session commands: Better Auth.
- Credential: application-scoped Better Auth cookie session.
- Public API: штатные `listSessions`, `revokeSession`,
  `revokeOtherSessions`, `revokeSessions`, `signOut`.
- Custom `/api/v1/me/sessions` API не создается.
- OAuth scopes для session management не создаются.
- Customer UI использует Better Auth client, а не прямой custom REST wrapper.
- List response следует versioned Better Auth contract; pagination отсутствует.
- Target revoke использует Better Auth session token и никогда его не логирует.
- Session deletion отзывает связанные application OAuth access/refresh token
  families внутри scoped adapter transaction.
- Cross-application isolation обеспечивается runtime + scoped adapter.
- Hosted logout и OIDC end-session делегируют тому же adapter lifecycle.
- Route exposure остается exact/default-deny и версионируется вместе с Better
  Auth composition.
- Backward compatibility и backfill не создаются.
