# План REST API управления application-user сессиями в IAM

Статус: проектный план

Дата: 2026-08-09

Сервис: `services/iam`

Целевая область: application-scoped user sessions и OAuth token lifecycle

Связанные документы:

- [План OAuth 2.1 / OpenID Connect для `application_users`](./application-users-oauth-oidc-implementation-plan.ru.md);
- [Application auth OAuth/OIDC — operations](./application-users-oauth-oidc-integration.md);
- [План headless OAuth interactions](./application-auth-headless-interactions-plan.ru.md);
- [План API управления OAuth clients](./application-oauth-client-management-api-plan.ru.md).

## 1. Резюме решения

IAM предоставляет versioned REST API, через который application user может:

- просмотреть свои активные сессии внутри одной application realm;
- отозвать выбранную другую сессию;
- отозвать все сессии, кроме текущей;
- завершить текущую Bearer-сессию.

API принадлежит IAM и не является passthrough к Better Auth. Новые exact routes
регистрируются отдельным Fastify plugin и никогда не передаются в Better Auth
handler. Существующие OIDC `end_session_endpoint` и hosted logout остаются
отдельным browser redirect flow без изменения публичного контракта.

Application OAuth access token является единственным credential. Cookie не
аутентифицирует REST-запрос и не расширяет его полномочия. Cookie читается только
перед self-logout, чтобы при точном совпадении с Bearer `sid` очистить browser
session cookies.

Управление другими сессиями является отдельной OAuth capability:

- `POST /logout` требует валидный application-user access token и отзывает только
  его собственный `sid`;
- list требует scope `sessions:read`;
- targeted revoke и revoke-others требуют scope `sessions:write`.

Scopes выдаются только через существующий Authorization Code + S256 PKCE flow и
явный consent. Пропуск consent разрешён только существующей IAM-controlled
first-party policy. Наличие trusted `Origin`, cookie или `client_id` само по себе
не предоставляет session-management capability.

## 2. Цели

1. Не допустить cross-application и cross-user чтение или mutation.
2. Не давать произвольному OAuth client управление сессиями только из-за наличия
   обычного `openid profile email` access token.
3. Синхронно отзывать session и все связанные с её `sid` access/refresh token
   families.
4. Не возвращать успех до локальной cache invalidation и подтверждения
   настроенного distributed invalidation transport.
5. Сохранить безопасный повтор targeted revoke и revoke-others после timeout,
   transport failure или неизвестного клиенту результата.
6. Не публиковать raw token, cookie, secret, session ID или персональные device
   данные в logs, metrics и audit.
7. Сохранить существующий hosted/OIDC logout как независимый flow.
8. Ограничивать malformed, invalid и preflight traffic до application runtime,
   JWT crypto и DB lookup, а не только после успешной аутентификации.

## 3. Не входит в v1

- platform-admin sessions;
- сессии другой application realm;
- изменение OAuth client management через REST;
- GeoIP, страна, город или приблизительная геолокация;
- push-уведомления о входе;
- пользовательские названия устройств;
- refresh token как API credential;
- cookie-only REST authentication;
- backward compatibility, dual read/write и backfill.

Stage/production application-auth данных нет. Schema и scope registry меняются
прямым cutover.

## 4. Публичный REST API

Базовый путь:

```text
/auth/applications/:applicationId/api/v1
```

| Метод | Endpoint | OAuth authorization | Успех |
|---|---|---|---|
| `GET` | `/me/sessions?limit=25&cursor=...` | `sessions:read` | `200` |
| `DELETE` | `/me/sessions/:sessionId` | `sessions:write` | `204` |
| `DELETE` | `/me/sessions` | `sessions:write` | `200` |
| `POST` | `/logout` | любой активный application-user access token | `204` |
| `OPTIONS` | только для четырёх exact paths | trusted origin preflight | `204` |

`HEAD`, произвольные подмаршруты, path normalization aliases и неизвестные
методы не поддерживаются. Fastify не должен автоматически публиковать `HEAD`.

Общий HTTP envelope является строгим:

- `GET /me/sessions` принимает только однократные `limit` и `cursor`; остальные
  endpoints не принимают никаких query parameters;
- ни один из четырёх endpoints не принимает request body. Наличие ненулевого
  `Content-Length`, `Transfer-Encoding`, фактических body bytes или
  `Content-Type` отклоняется как `400 invalid_request` до handler mutation;
- для non-OPTIONS запроса в `rawHeaders` должен находиться ровно один
  `Authorization` header. Нельзя полагаться на уже объединённое Fastify/Node
  значение; duplicate, comma-joined и folded представления получают единый
  `401 invalid_token`;
- `OPTIONS` также не принимает query/body и валидируется только как preflight;
- `Accept` либо отсутствует, либо допускает соответствующий JSON/problem media
  type или `*/*`; неподдерживаемое значение получает `406` с REST problem;
- лимиты raw URL, каждого header, общего header block и decoded path parameter
  задаются в plugin и проверяются до runtime/DB lookup.

### 4.1. Session representation

```json
{
  "id": "opaque-session-id",
  "current": true,
  "ipAddress": "203.0.113.10",
  "userAgent": "Mozilla/5.0 ...",
  "device": {
    "type": "desktop",
    "vendor": null,
    "model": null
  },
  "browser": {
    "name": "Chrome",
    "version": "126.0"
  },
  "os": {
    "name": "macOS",
    "version": "14.5"
  },
  "createdAt": "2026-08-09T10:15:30.000Z",
  "updatedAt": "2026-08-09T11:15:30.000Z",
  "expiresAt": "2026-09-08T10:15:30.000Z"
}
```

Контракт:

- все даты — UTC RFC 3339 strings;
- `ipAddress` и `userAgent` — `string | null`;
- raw User-Agent перед возвратом ограничивается утверждённой длиной и очищается
  от control characters;
- `device.type` — `desktop | mobile | tablet | bot | unknown`;
- `vendor`, `model`, browser/os `name` и `version` — `string | null`;
- parser failure никогда не ломает list: возвращается `unknown` и nullable поля;
- raw session token, access/refresh token, authorization code и client secret
  никогда не входят в DTO.

User-Agent разбирается на response boundary через exact direct IAM dependency
`ua-parser-js`. Mapping из parser-specific значений в публичный enum принадлежит
IAM, поэтому обновление dependency не должно незаметно менять REST contract.

### 4.2. List

```json
{
  "items": [],
  "pageInfo": {
    "hasNextPage": false,
    "nextCursor": null
  }
}
```

Правила:

- `limit` по умолчанию `25`, диапазон `1..100`;
- неизвестные и повторяющиеся query parameters отклоняются;
- выбираются только строки с точными predicates
  `applicationId + userId + expiresAt > now`;
- сортировка: `(updatedAt DESC, id DESC)`;
- repository читает `limit + 1` строку;
- `current` вычисляется только сравнением session ID с проверенным Bearer `sid`;
- пустая страница возвращает `items: []`, `hasNextPage: false`,
  `nextCursor: null`.

Pagination является weakly consistent keyset pagination. Persistence boundary
обязан сохранять invariant `updatedAt` монотонно не уменьшается; его изменение
назад запрещено repository/adapter contract. Поэтому уже выданная строка не
дублируется на следующей странице.
Новая либо обновлённая между запросами строка может переместиться перед cursor и
не попасть в текущий проход. Snapshot isolation между HTTP-запросами не
обещается; клиент начинает новый проход для актуального списка.

### 4.3. Подписанный cursor

Base64url используется только как transport encoding, а не как защита. Wire
format имеет вид `base64url(payloadBytes).base64url(mac)` без padding. Payload —
UTF-8 JSON array с фиксированным порядком полей и без whitespace:

```text
["session-cursor", schemaVersion, keyVersion, issuedAtEpochSeconds,
 expiresAtEpochSeconds, updatedAtRfc3339, sessionId]
```

HMAC key выводится из application realm secret с отдельным purpose
`session-pagination-cursor`. MAC вычисляется над однозначно framed bytes:

```text
ASCII("shopana:iam:session-cursor:v1") || 0x00 ||
uuidBytes(applicationId) ||
u32be(byteLength(userIdUtf8)) || userIdUtf8 ||
u32be(byteLength(payloadBytes)) || payloadBytes
```

Таким образом, переменные поля не конкатенируются без length prefix.
`applicationId` и `userId` входят в MAC context, но не сериализуются в cursor.
Opaque `sessionId` сохраняется byte-exact и не подвергается Unicode normalization.
Decoder после strict parse повторно сериализует tuple и требует byte-for-byte
совпадения с исходным payload, поэтому альтернативные JSON encodings не
принимаются. Cursor:

- требует `expiresAt = issuedAt + 900` секунд, допускает не более 30 секунд clock
  skew для `issuedAt` и никогда не живёт дольше текущей key version;
- имеет жёсткий лимит encoded cursor `2048` bytes, payload `1024` bytes,
  `sessionId` `512` UTF-8 bytes и `userId` `512` UTF-8 bytes;
- декодируется в strict schema;
- проверяет MAC constant-time до использования `updatedAt/sessionId` в query;
- криптографически привязан к текущим `applicationId` и `userId`;
- принимает только текущую key version;
- не содержит raw token или иных credentials.

Истечение TTL или rotation realm key инвалидирует cursor. Клиент получает
`400 invalid_cursor` и начинает list заново. Malformed, non-canonical, tampered,
чужой, oversized, expired, выпущенный недопустимо далеко в будущем и cursor
устаревшей key version имеют одну и ту же публичную ошибку.

### 4.4. Targeted revoke

`DELETE /me/sessions/:sessionId`:

- сравнивает `sessionId` с Bearer `sid` до DB lookup;
- для текущей session возвращает `409 current_session_requires_logout`;
- для существующей другой session атомарно удаляет session и связанные с её
  `sid` access tokens, а все связанные refresh families помечает revoked;
- для неизвестного, уже удалённого, чужого user или другого realm возвращает
  тот же `204`;
- не сообщает `revokedCount` и не раскрывает существование ID;
- при ненулевом DB effect публикует `kind=session` invalidation для trusted ID
  реально удалённой строки;
- при нулевом DB effect публикует `kind=user` invalidation текущего
  `applicationId + userId`, не перенося caller-provided ID в событие.

Path ID декодируется ровно один раз, имеет ограничение длины и не может содержать
slash, NUL или control characters. Невалидная форма получает generic `404`, а не
DB lookup.

### 4.5. Revoke other sessions

`DELETE /me/sessions` атомарно отзывает все sessions и связанные token families
текущего `applicationId + userId`, кроме проверенного Bearer `sid`.

```json
{
  "revokedCount": 3
}
```

`revokedCount` считает удалённые session rows, а не tokens. Текущая session
проверяется внутри той же transaction и сохраняется. Повтор возвращает
`200 { "revokedCount": 0 }` и всё равно обеспечивает user invalidation.

### 4.6. Self logout

`POST /logout` отзывает session из проверенного Bearer claim `sid`. Указание
session ID в body/query запрещено. Удаление session отзывает все access tokens и
все refresh families, связанные с этим `sid`, независимо от количества clients
или token families. Другие sessions и application realms не затрагиваются.

Cookie handling выполняется строго в таком порядке:

1. Валидировать Bearer и зафиксировать `applicationId`, `userId`, `sid`.
2. До DB mutation передать cookie в application-scoped Better Auth
   `GET /get-session` через внутренний handler.
3. Считать cookie совпавшей только при exact match application, user и session
   ID с Bearer claims.
4. Malformed, expired, отсутствующую или несовпадающую cookie игнорировать; она
   не меняет status и authorization результата.
5. Выполнить revoke transaction и invalidation.
6. Только при ранее подтверждённом совпадении вернуть clear-cookie headers.

Общий cookie helper используется hosted и REST logout и остаётся единственным
владельцем имён, `Path`, `HttpOnly`, `SameSite`, `Secure`, `Max-Age=0` и expiry.
REST logout очищает тот же application-realm cookie set: `session_token`,
`session_data`, `account_data`, `dont_remember` и безопасно очищаемый logout
context. Cookie другого realm или несовпадающей browser session не очищается.

## 5. Authentication и authorization

Boundary принимает ровно один `Authorization: Bearer <token>` header. Missing,
duplicate, malformed, oversized и non-JWT credentials получают одинаковый
`401 invalid_token`.

`ApplicationTokenValidationService.validateAccessToken()` проверяет:

- compact JWT syntax, approved algorithm, `kid` и application-scoped signature;
- exact issuer и audience из загруженного active application runtime;
- `application_id` равный canonical path parameter;
- `actor_type = application_user`;
- `client_id = azp`;
- timestamps;
- active application, organization, realm, client, user и session;
- active refresh family, когда token содержит family binding;
- scope registry и required endpoint scope.

Refresh token, platform-admin token, ID token и token другого realm не могут
аутентифицировать API.

В protocol scope registry добавляются:

- `sessions:read` — просмотр sessions и device metadata;
- `sessions:write` — отзыв других sessions.

Scope descriptions являются code-owned и показываются существующими hosted и
headless consent surfaces. OAuth client не может назначить scope сам себе через
metadata. `sessions:write` не подразумевает `sessions:read`: клиент запрашивает
каждую необходимую capability явно.

## 6. Ошибки и headers

Любая REST ошибка имеет `Content-Type: application/problem+json`:

```json
{
  "type": "https://shopana.io/problems/invalid-cursor",
  "title": "Invalid cursor",
  "status": 400,
  "detail": "The pagination cursor is invalid.",
  "code": "invalid_cursor",
  "requestId": "req-..."
}
```

`detail` содержит только стабильное generic описание. Stack, SQL, dependency
message и внутренние IDs не возвращаются.

| Status | Stable codes |
|---|---|
| `400` | `invalid_request`, `invalid_limit`, `invalid_cursor` |
| `401` | `invalid_token` |
| `403` | `insufficient_scope`, `origin_not_allowed` |
| `404` | `route_not_found`, `application_unavailable` |
| `406` | `not_acceptable` |
| `409` | `current_session_requires_logout` |
| `429` | `rate_limit_exceeded` |
| `503` | `rate_limit_unavailable`, `invalidation_unavailable`, `dependency_unavailable` |

`401` всегда содержит корректный RFC 6750 `WWW-Authenticate: Bearer` с generic
`error="invalid_token"`. `403 insufficient_scope` содержит
`error="insufficient_scope"` и требуемый `scope`. Другие `403` не перечисляют
scope.

Все ответы, включая errors, `204` и preflight, получают:

- `Cache-Control: no-store`;
- `Pragma: no-cache`;
- `X-Request-ID`.

`429` и retriable `503` получают целочисленный `Retry-After`. `204` не содержит
body и `Content-Type`.

## 7. Transaction и invalidation

Одна IAM transaction:

1. блокирует и повторно проверяет текущую session, когда это требуется;
2. удаляет целевые access tokens;
3. помечает связанные refresh families revoked и отвязывает их от session;
4. удаляет session rows.

После commit request path немедленно публикует invalidation через существующий
`ApplicationAuthLiveStateInvalidationBus.publishRequired()`:

- targeted revoke с DB effect и logout используют `kind=session` с trusted ID
  реально найденной tenant-scoped строки;
- targeted revoke без DB effect использует `kind=user` без caller-provided target;
- revoke-others использует `kind=user` независимо от `revokedCount`;
- local subscribers выполняются до ответа;
- configured distributed transport должен подтвердить publish;
- повторная cache invalidation семантически идемпотентна.

Если transport не подтвердил publish, mutation уже могла быть committed. API
возвращает `503 invalidation_unavailable`; это documented outcome-unknown, а не
утверждение об отсутствии mutation. Targeted revoke и revoke-others можно
безопасно повторить: zero-effect повтор публикует user-level invalidation и
снова ожидает transport acknowledgement.

После committed self-logout тот же Bearer уже inactive, поэтому последовательный
повтор получает `401 invalid_token`, а не `204`. Если publish не был подтверждён,
удалённые session и tokens остаются неактивными в primary database, а stale
validation cache других реплик исчезает не позднее существующего hard TTL в 30
секунд. Два параллельных logout, успевших пройти authentication до первого
commit, остаются безопасными и могут завершиться `204` либо documented `503`.

Production требует настроенный distributed transport как startup/configuration
invariant; local transport допустим только в development/E2E. Гарантия v1 —
синхронная попытка доставки с acknowledgement либо ограниченная 30 секундами
eventual convergence через существующий validation cache TTL.

## 8. Repository и schema

Переиспользовать application-scoped `AuthSessionRepository`:

- сохранить существующие transactional `revokeSession` и
  `revokeOtherSessions` semantics;
- выделить единый internal mutation primitive, принимающий только trusted
  `applicationId`, `userId`, `currentSessionId` и optional target ID;
- добавить cursor list operation без нового параллельного session repository.

Все SQL predicates содержат `applicationId + userId`; lookup только по
`sessionId` запрещён.

Добавить индекс:

```text
(application_id, user_id, updated_at DESC, id DESC)
```

Миграции создаются IAM migration workflow через `shopana-cli`. Backfill и
compatibility layer не создаются.

## 9. Fastify routing и Better Auth boundary

Добавить `applicationUserSessionHttpPlugin` sibling существующего
`applicationAuthHttpPlugin` и зарегистрировать exact routes до публичного
application-auth catch-all.

Требования:

- exact REST route всегда выигрывает у wildcard, включая `POST .../api/v1/logout`;
- REST plugin имеет собственные body/query/path limits и error handler;
- Better Auth raw body parser и OAuth error schema не протекают в REST plugin;
- REST paths отсутствуют в Better Auth versioned route manifest;
- unknown `/api/v1/*` возвращает REST problem `404`, не Better Auth response;
- reverse proxy публикует только существующий application-auth wildcard
  boundary; `/graphql` и внутренние IAM routes остаются закрытыми.

Добавить executable route ownership contract на method + normalized pathname,
чтобы обновление Fastify или Better Auth не изменило handler незаметно.

## 10. CORS

При отсутствии `Origin` запрос рассматривается как non-browser Bearer request.
При наличии `Origin` разрешается только exact match с active application
`trustedOrigins`. `null`, wildcard, suffix/prefix matching и отражение
непроверенного Origin запрещены.

Preflight поддерживает только утверждённые exact route/method пары:

- methods: `GET`, `DELETE`, `POST`, `OPTIONS` в зависимости от route;
- request headers: `Authorization`, `X-Request-ID`; `Content-Type` не разрешён,
  поскольку REST endpoints v1 не принимают body;
- credentials: `true`, поскольку matching browser cookie может быть очищена при
  self-logout;
- exposed headers: `X-Request-ID`, `Retry-After`, `WWW-Authenticate`.

Responses добавляют `Vary: Origin`; preflight также добавляет
`Access-Control-Request-Method` и `Access-Control-Request-Headers`. Preflight не
использует cookie или Bearer для authentication, но проверяет application,
trusted origin, exact route, method и headers. CSRF token не требуется, потому
что mutation авторизуется только явным Bearer header; CORS не считается защитой
от non-browser caller.

## 11. Rate limiting

Rate limiting состоит из pre-auth и authenticated уровней. Pre-auth выполняется
до application runtime loading, JWT verification и DB lookup и использует
service-level secret с purpose `session-rest-preauth-rate-limit`, не realm secret.
Он включает bounded local LRU buckets:

| Boundary | Subject | Limit |
|---|---|---|
| весь REST plugin instance | один global bucket | 2000/min |
| canonical application path | `HMAC(applicationId)` | 400/min |

Количество local subjects жёстко ограничено; eviction не сбрасывает global
bucket. После canonical path parsing тот же application aggregate применяется в
shared limiter независимо от того, существует application или валиден token.
После извлечения trusted proxy-aware network address добавляется
`HMAC(applicationId + networkSubject)` с лимитом `120/min`. Raw address не
сохраняется и не логируется. Если trusted network subject безопасно определить
нельзя, запрос остаётся под global/application aggregate и не создаёт
caller-controlled fallback key. Random credential fingerprint не используется
как единственная защита, чтобы rotation случайных token строк не обходил лимит.

Preflight использует application aggregate и отдельный
`HMAC(applicationId + normalizedOrigin)` bucket `120/min`; oversized/malformed
Origin отклоняется до создания subject. Exhaustion любого pre-auth bucket
возвращает generic `429` без раскрытия существования application или token.

После успешной аутентификации добавляются HMAC-keyed operation buckets через
существующий `ApplicationAuthRateLimiter`:

| Operation | Subject | Limit |
|---|---|---|
| list | `applicationId + HMAC(userId)` | 60/min |
| targeted/revoke-others | `applicationId + HMAC(userId)` | 20/min |
| logout | `applicationId + HMAC(userId)` | 20/min |

HMAC key authenticated уровня выводится с отдельным purpose
`session-rest-rate-limit`; raw user, session, IP и token не входят в key.
Application ID является namespace, но не заменяет HMAC subject. Успешный запрос
должен пройти оба уровня; authenticated bucket не заменяет pre-auth aggregate.

При отказе shared limiter:

- list и revoke mutations используют существующий tighter bounded emergency
  fallback;
- logout также остаётся доступен через tighter fallback, чтобы отказ limiter не
  удерживал пользователя в сессии;
- pre-auth local global/application buckets продолжают действовать независимо от
  shared limiter, а shared failure включает tighter bounded network/application
  fallback без создания неограниченных subjects;
- exhaustion fallback возвращает `429`, а невозможность безопасно создать
  fallback — `503 rate_limit_unavailable`.

## 12. Audit, logs и metrics

Security audit получает действия:

- `session_revoke`;
- `session_revoke_others`;
- `session_logout`.

List не создаёт security audit record: его observability ограничена redacted
logs/metrics, чтобы не увеличивать объём персональных access records без
отдельной retention policy.

Mutation audit передаётся после commit через существующий
`ApplicationAuthAuditService`. Audit delivery остаётся non-blocking и не меняет
HTTP result; failure записывается существующим redacted log и отдельным failure
counter. HTTP success ожидает local/distributed invalidation acknowledgement,
но не внешний audit sink.

Разрешённые поля:

- opaque HMAC actor ID;
- application/organization IDs;
- action, domain outcome `committed_effect | committed_no_effect`, stable reason
  category;
- request ID;
- `revokedCount` для массовой операции.

Запрещены IP, raw User-Agent, session/token IDs, cursor, Authorization, Cookie,
client secret и dependency error text.

Структурированные logs содержат endpoint name, method, status, outcome,
application ID и request ID. Metrics содержат endpoint/outcome/status и latency;
user, client, session, IP, Origin и User-Agent запрещены как labels. Invalidation
transport failure и audit delivery failure имеют отдельные counters без
tenant-sensitive payload.

## 13. Тестовый план

Добавить repository/HTTP contract tests и один целевой Playwright e2e spec.

### 13.1. Authentication и authorization

- обычный token без session scope получает `403 insufficient_scope` на
  list/revoke, но может завершить собственный `sid` через logout;
- `sessions:read` не разрешает mutation;
- `sessions:write` не разрешает list;
- consent и first-party skip-consent policy выдают только запрошенные approved
  scopes;
- token другого application, platform-admin token, ID/refresh token,
  expired/revoked token и malformed/duplicate Bearer получают `401`;
- disabled client/application/user/session/family fail closed;
- exact issuer, audience, actor type и application binding проверяются;
- malformed/invalid Bearer flood исчерпывает pre-auth bucket до повторных runtime,
  crypto и DB operations; varying random credentials не обходят application
  aggregate;
- bounded local subject registry не растёт от случайных application IDs, а
  exhaustion не раскрывает существование application.

### 13.2. List и cursor

- возвращаются только active sessions текущих application/user;
- `current` совпадает только с Bearer `sid`;
- desktop/mobile/tablet/bot/unknown UA стабильно маппятся;
- nullable IP/UA и parser failure безопасны;
- raw UA очищается и ограничивается по длине;
- pagination не дублирует rows и корректно формирует `limit + 1` page info;
- изменение `updatedAt` между страницами соответствует документированной weak
  consistency и не создаёт дубль;
- malformed, non-canonical JSON, tampered, oversized, expired, future-issued,
  чужой и старой key version cursor получают одинаковый `400 invalid_cursor`;
- framing tests доказывают, что разные границы `applicationId/userId/payload` не
  образуют одинаковый MAC input, а TTL/clock-skew проверяются на границах;
- duplicate/unknown query parameters и limit вне диапазона отклоняются.

### 13.3. Mutations и tokens

- targeted revoke удаляет session/access tokens и отзывает все связанные refresh
  families;
- session другого user/realm не изменяется и не раскрывается;
- текущая session через targeted route получает `409` без DB mutation;
- revoke-others сохраняет Bearer `sid` и отзывает все остальные families;
- logout отзывает все families текущего `sid`, но не другие sessions/realms;
- старые access и refresh tokens становятся inactive;
- повторные targeted/revoke-others и параллельные logout безопасны;
- последовательный logout тем же уже отозванным Bearer получает `401`, а stale
  validation cache после неподтверждённого publish ограничен hard TTL 30 секунд;
- targeted unknown ID возвращает `204` и не раскрывает существование;
- zero-effect targeted retry публикует user invalidation без caller target;
- revoke-others публикует user invalidation и при ненулевом, и при нулевом DB
  effect;
- `revokedCount` считает sessions, не tokens.

### 13.4. Cookie

- matching cookie определяется до revoke и затем очищается полным общим helper;
- absent, malformed, expired, other-user, other-session и other-realm cookie не
  очищаются и не меняют mutation result;
- cookie никогда не заменяет Bearer и не добавляет scope;
- `Secure`, `HttpOnly`, `SameSite`, path, expiry и имена совпадают у hosted и
  REST logout.

### 13.5. Invalidation, audit и failures

- session/access/refresh mutation полностью commit-ится либо rollback-ится;
- transport failure после commit возвращает documented
  `503 invalidation_unavailable`;
- HTTP retry targeted/revoke-others при уже удалённой session повторно публикует
  user invalidation;
- повторная доставка invalidation безопасна;
- request не возвращает success до local dispatch и distributed ack;
- при post-commit invalidation failure HTTP получает `503`, mutation остаётся
  committed, а stale validation cache ограничен hard TTL 30 секунд;
- audit delivery не содержит запрещённых полей, остаётся non-blocking, а failure
  учитывается отдельным counter;
- pre-auth и authenticated limiter fallback сохраняют logout, ограничивают
  invalid traffic и возвращают корректные `429/503`.

### 13.6. HTTP boundary

- exact REST routes обслуживает REST plugin, а не Better Auth wildcard;
- unknown methods/routes, encoded slash, double decoding и non-canonical
  application ID отклоняются;
- body, `Content-Type`, `Transfer-Encoding` и query на mutation routes
  отклоняются до mutation; list принимает только однократные `limit/cursor`;
- duplicate/comma-joined Authorization обнаруживается через `rawHeaders`, а
  неподдерживаемый `Accept` возвращает `406 not_acceptable`;
- CORS разрешает только exact trusted origins/methods/headers;
- проверяются `Vary`, allow/expose headers и credentials;
- проверяются `400/401/403/404/406/409/429/503`, `Retry-After`,
  `WWW-Authenticate`, `Cache-Control`, `Pragma`, `X-Request-ID`;
- `204` не содержит body/content type;
- responses, logs, metrics и audit не содержат credential, cookie, secret,
  cursor или внутренних ошибок.

По правилам проекта во время подготовки документа build/test не запускаются.
Команды реализации, миграций и целевых тестов выполняются через `shopana-cli`.

## 14. Этапы реализации

### Этап 1. Scope и HTTP contracts

1. Расширить code-owned OAuth scope registry и consent presentation.
2. Добавить strict Zod schemas для params/query/response/problem и raw HTTP
   envelope contract для headers/body/media types.
3. Добавить canonical framed signed cursor codec с TTL и UA mapping contract.
4. Добавить route ownership и pre-auth limiter compatibility tests.

Критерий выхода: capability matrix и все boundary schemas зафиксированы
executable tests.

### Этап 2. Repository и migration

1. Добавить cursor list query и composite index.
2. Объединить revoke primitives в единый application-scoped transaction contract.
3. Добавить repository isolation/concurrency tests.

Критерий выхода: session/access/refresh изменения либо commit вместе, либо
полностью rollback; текущая Bearer session повторно проверяется в transaction.

### Этап 3. REST plugin

1. Добавить Bearer/scope guard.
2. Реализовать exact list/revoke/logout routes.
3. Подключить conditional pre-revoke cookie matching и общий clear helper.
4. Подключить problem mapper, CORS, headers, pre-auth и authenticated rate limits.

Критерий выхода: ни один REST path не попадает в Better Auth handler, а cookie
никогда не участвует в authorization.

### Этап 4. Operations и E2E

1. Подключить production distributed invalidation transport.
2. Добавить audit sink, metrics и alerts для failed delivery.
3. Обновить reverse-proxy/public-boundary documentation.
4. Выполнить один целевой Playwright spec и HTTP/repository contract tests через
   `shopana-cli`.

Критерий выхода: полный positive/negative/failure matrix проходит, transport
outage наблюдаем, а stale validation cache ограничен документированным TTL.

## 15. Зафиксированные решения

- Credential: только application OAuth Bearer access token.
- List: `sessions:read`.
- Revoke other sessions: `sessions:write`.
- Self logout: любой active application-user access token, только собственный
  Bearer `sid`.
- «Отозвать все»: все sessions кроме текущей.
- Session revoke отзывает все access/refresh families данного `sid`.
- Cursor: canonical framed, versioned, application/user-bound,
  HMAC-authenticated, TTL 15 минут.
- Pagination: weakly consistent keyset, без snapshot promise.
- Device contract: parsed UA + nullable raw UA/IP + timestamps, без GeoIP.
- Cookie match читается до revoke; mismatch не очищается.
- Invalidation: существующий `publishRequired()` после commit; success только
  после local dispatch и distributed acknowledgement.
- Audit delivery: существующий non-blocking `ApplicationAuthAuditService`.
- Zero-effect targeted retry: user invalidation без caller session ID.
- Rate limit: bounded pre-auth aggregate до runtime/crypto/DB плюс authenticated
  per-user operation buckets.
- Transport failure после commit: `503` с documented outcome unknown;
  targeted/revoke-others допускают безопасный retry, а после self-logout stale
  validation cache ограничен hard TTL 30 секунд.
- OIDC end-session и hosted logout остаются отдельным browser flow.
- Backward compatibility и backfill не создаются.
