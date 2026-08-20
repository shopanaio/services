# Аудит готовности IAM service

Статус: завершённый статический аудит; release decision — **NO-GO**  
Дата: 2026-08-20  
Сервис: `services/iam`  
Целевой критерий: всё заявленное API и вся заявленная бизнес-логика завершены

## 1. Резюме

IAM service нельзя считать завершённым или готовым к production. Интегральная оценка текущей
готовности составляет **около 60%**.

Главная причина решения `NO-GO` — наличие подтверждённых разрывов между опубликованным контрактом и
реализацией:

- `userUpdateEmail` и `userUpdatePassword` опубликованы в Admin GraphQL, но возвращают
  `NOT_IMPLEMENTED`;
- одиночный запрос организации не подтверждает доступ текущего пользователя, хотя SDL обещает
  выдачу только доступной организации;
- production adapter распределённого rate limiting в репозитории отсутствует, а обязательные
  password/OTP операции без него fail closed с `503`;
- production validation social-provider credentials отсутствует и всегда возвращает
  `PROVIDER_VALIDATION_NOT_CONFIGURED`;
- несколько опубликованных полей `User` являются константными заглушками, а обновление locale
  игнорируется;
- GraphQL `authorize` возвращает denial reason под именем, которого нет в схеме;
- federation reference для `Role` бросает runtime error `not implemented`;
- значимая часть заявленной security E2E-матрицы остаётся `fixme`, особенно для email OTP;
- headless OAuth interactions и Auth Components существуют только как проектный план.

При этом application-scoped OAuth/OIDC и новый Application Admin API находятся в существенно более
зрелом состоянии, чем legacy/platform user API: присутствуют application isolation, scoped Better
Auth adapter, OAuth client management, hosted UI, resource guard, JWT live validation, service-linked
resource protection, revisioned mutations и durable administrative audit.

## 2. Область и методика аудита

Аудит выполнен по исходному коду и документации репозитория. Проверялись:

1. Admin GraphQL SDL и соответствующие resolvers.
2. Public application-auth OpenAPI и HTTP route manifest.
3. Broker actions, sagas и workflows IAM.
4. Scripts, services, repositories, scoped Better Auth adapter и migrations.
5. Production composition Nest/Kernel и wiring инфраструктурных портов.
6. Активные IAM-related E2E suites и статусы `skip`/`fixme`.
7. Документированные implementation plans, contract reports и Definition of Done.
8. Архитектурные требования knowledge base по multi-tenancy, resolver/script/repository patterns и
   service broker authorization.

### 2.1. Ограничения аудита

Согласно правилам проекта не запускались:

- tests;
- `tsc`;
- dev/start server;
- browser или Playwright;
- runtime migrations.

Build также не запускался, поскольку код не изменялся и новая версия сервиса для аудита не
требовалась. Все выводы о runtime-поведении основаны на статическом trace от внешнего контракта до
resolver/service/repository и на уже существующих contract reports.

Отдельно не проверялись реальные Google/Facebook credentials, внешняя notification delivery,
reverse proxy и production keyring environment.

## 3. Итоговая оценка

| Подсистема | Готовность | Решение | Основное обоснование |
| --- | ---: | --- | --- |
| Application Admin GraphQL | 85% | Conditional | Полный resolver surface, revision/audit/RBAC, 121 активный E2E scenario; нет production provider validator |
| OAuth/OIDC + password application auth | 75% | Conditional | Основные protocol/security paths реализованы; production rate-limit wiring и часть hardening verification не закрыты |
| Email OTP application auth | 55% | NO-GO | Runtime есть, но 30 из 44 заявленных E2E tests — `fixme` |
| Phone OTP application auth | 35% | NO-GO | Runtime и Admin configuration есть, но только 2 активных E2E scenarios |
| Social providers/account linking | 65% | NO-GO | Catalog/runtime/refactoring завершены; production validation и durable runtime audit не собраны |
| Organizations/RBAC | 70% | NO-GO | CRUD/workflows/Casbin реализованы; найден authorization gap одиночного query и API defect denial reason |
| Platform users/profile/sessions | 40% | NO-GO | Две публичные мутации не реализованы; locale/status fields и unauthenticated current некорректны |
| Service-linked applications/resources | 80% | Conditional | Broker API, protected-resource guard и Customers integration присутствуют; verification ограничена |
| Headless interactions/Auth Components | 0% | Out of current runtime / NO-GO if committed scope | Есть только проектный план, отсутствуют routes и пакеты |
| Production operations/hardening | 45% | NO-GO | Нет production rate limiter/provider validator/runtime audit adapter; security matrix частично не исполняется |

### 3.1. Интерпретация процента

Процент отражает не количество файлов или строк, а способность закрыть заявленные externally
observable use cases:

- 30% — наличие внешнего API contract;
- 30% — завершённая бизнес-логика и persistence invariants;
- 20% — authorization, tenancy и security behavior;
- 15% — E2E/contract verification;
- 5% — production composition и operational readiness.

Наличие метода с правильным именем не считается завершённым API, если он возвращает заглушку,
неправильное поле, не проверяет tenant access или требует отсутствующий production adapter.

## 4. Инвентаризация внешнего API

### 4.1. Admin GraphQL

В SDL объявлено 48 namespace operations. Для всех операций существует одноимённый resolver method,
то есть структурного пробела schema-to-resolver не найдено.

| Namespace | Queries/mutations | Количество | Структурный resolver |
| --- | --- | ---: | --- |
| `UserQuery` | `current`, `mySessions`, `authorize` | 3 | Есть |
| `OrganizationQuery` | `organization`, `organizations` | 2 | Есть |
| `ApplicationQuery` | `application`, `applications` | 2 | Есть |
| `AuthMutation` | `signUp`, `signIn`, `signOut`, `tokenRefresh` | 4 | Есть |
| `UserMutation` | profile/email/password/session operations | 5 | Есть, две операции — stubs |
| `RoleMutation` | create/update/delete | 3 | Есть |
| `OrganizationMutation` | organization/member/ownership operations | 8 | Есть |
| `ApplicationMutation` | application/auth/provider/client/user security operations | 21 | Есть |

Root namespaces `userQuery`, `organizationQuery`, `applicationQuery`, `authMutation`, `userMutation`,
`roleMutation`, `organizationMutation` и `applicationMutation` также зарегистрированы.

Структурная полнота не означает поведенческую полноту. Подтверждённые functional gaps перечислены в
разделах 6–8.

### 4.2. Public application-auth HTTP/OpenAPI

Generated OpenAPI публикует 27 paths, сгруппированных следующим образом:

- password: sign-in, sign-up, verification email, verify email, password reset;
- session: list sessions, revoke session, sign out;
- email OTP: send verification OTP и sign-in;
- phone OTP: send OTP и verify;
- social sign-in;
- OAuth/OIDC: authorize, consent, continue, token, introspect, revoke, end-session, userinfo;
- JWKS и OAuth/OIDC metadata.

Эти paths представлены в effective route manifest или передаются установленному Better Auth/OAuth
Provider через IAM-owned default-deny HTTP boundary. Hosted-only HTML routes существуют отдельно и
не обязаны входить в OpenAPI.

Не найдено публичных headless interaction routes вида `/interactions/*`; они не входят в текущий
OpenAPI и описаны только в будущем плане.

### 4.3. Broker actions

В `IamBrokerActions` зарегистрированы 12 actions:

1. `getCurrentUser`;
2. `authorize`;
3. `authorizeProtectedResource`;
4. `batchAuthorize`;
5. `allocateApplicationId`;
6. `createApplication`;
7. `getServiceLinkedApplicationAuthSettings`;
8. `updateServiceLinkedApplicationAuthSettings`;
9. `validateServiceLinkedApplicationToken`;
10. `getServiceLinkedApplicationUser`;
11. `deleteServiceLinkedApplicationUser`;
12. `deleteServiceLinkedApplication`.

Ключевые consumers для service-linked application flows присутствуют в Customers service.
Protected-resource authorization вызывается также из Catalog, Media, Project, Pricing, Apps,
Notifications, Reviews, Listing и Loyalty.

### 4.4. Durable workflows и sagas

Зарегистрированы:

- organization create/update/delete sagas;
- user profile update saga;
- roles/member access workflows;
- application user created/updated/status-changed/deleted event workflows.

Role/member workflows используют `@Policy` и повторную IAM authorization evaluation. Application
user lifecycle запускается из application Better Auth hooks через broker workflow boundary.

## 5. Сильные стороны текущей реализации

### 5.1. Application-scoped identity isolation

Реализованы отдельные application users, accounts, sessions, verifications, OAuth clients, consents,
JWKS и token rows. Scoped adapter принудительно добавляет application predicates и active realm
predicates к Better Auth operations.

### 5.2. OAuth/OIDC protocol boundary

Присутствуют:

- versioned exact method/path allowlist;
- default-deny для plugin-management, DCR и запрещённых grants;
- safe path normalization;
- raw request bridge;
- exact application resource enforcement;
- Authorization Code + S256 PKCE policy;
- public/confidential client management;
- immutable resource/grants/response types/protocol version;
- confidential secret hashing и one-time secret response;
- application-scoped JWT keys и mandatory claims;
- introspection/revocation/live-state binding.

### 5.3. Application Admin API

Applications, auth configuration, auth methods, providers, OAuth clients и application users имеют
read/write GraphQL surface. Mutations используют optimistic revision, Casbin authorization,
service-linked resource protection, safe error mapping, cache invalidation и administrative audit.

### 5.4. Social providers

Google/Facebook metadata собрана в code-owned catalog. Persisted provider ID и scopes проверяются
fail closed; credentials encrypted; callbacks публикуются exact routes; account linking explicit;
implicit email linking запрещён. Refactoring contract report отмечен `completed`.

### 5.5. Administrative audit

Application Admin mutations используют durable local PostgreSQL adapter по умолчанию. Success audit
участвует в ambient transaction, failure audit записывается после rollback. Secrets и полные URI не
входят в safe diff.

### 5.6. Service-linked resource boundary

Для service-owned applications сохраняется binding на trusted caller service/owner. Organization
admin mutation дополнительно проходит `@ProtectedResource`; service owner использует отдельные
broker actions с linked-owner checks.

## 6. P0 — блокеры завершённости и релиза

### IAM-P0-001. `userUpdateEmail` не реализован

**Контракт:** `UserMutation.userUpdateEmail` опубликован в Admin GraphQL.  
**Факт:** script всегда возвращает `NOT_IMPLEMENTED`; repository method `updateEmail` существует, но
из mutation business flow не вызывается.  
**Влияние:** профильный UI содержит hook обновления email, но operation не может успешно завершиться.  
**Файлы:**

- `src/api/graphql-admin/schema/base.graphql`;
- `src/resolvers/admin/UserMutationResolver.ts`;
- `src/scripts/user/UserUpdateEmailScript.ts`;
- `src/repositories/user/UserRepository.ts`.

**Критерий закрытия:** реализовать current-user validation, uniqueness/normalization, verification
policy, session/token consequences, safe errors и targeted E2E.

### IAM-P0-002. `userUpdatePassword` не реализован

**Контракт:** `UserMutation.userUpdatePassword` опубликован в Admin GraphQL.  
**Факт:** script всегда возвращает `success=false`, `NOT_IMPLEMENTED`.  
**Влияние:** пользователь не может сменить platform/admin password через заявленный API.  
**Файлы:**

- `src/resolvers/admin/UserMutationResolver.ts`;
- `src/scripts/user/UserUpdatePasswordScript.ts`.

**Критерий закрытия:** Better Auth-owned password verification/change, revocation policy, audit-safe
errors и E2E для неверного текущего пароля, password policy и session behavior.

### IAM-P0-003. Одиночный organization query не проверяет access

**Контракт:** `OrganizationQuery.organization` документирован как «Get organization by ID or name
(if user has access)».  
**Факт:** resolver декодирует ID или выполняет `findByName`, затем сразу создаёт
`OrganizationResolver`. Ни query, ни resolver не имеют `@TypePolicy` или явной membership/RBAC
проверки. Middleware разрешает anonymous GraphQL requests.  
**Влияние:** вероятный IDOR/tenant information disclosure через organization metadata и вложенные
membership/application fields.  
**Файлы:**

- `src/api/graphql-admin/schema/organization.graphql`;
- `src/resolvers/admin/OrganizationQueryResolver.ts`;
- `src/resolvers/admin/OrganizationResolver.ts`;
- `src/api/graphql-admin/contextMiddleware.ts`.

**Критерий закрытия:** singular query должен скрывать чужую/недоступную organization как not found;
вложенные membership/applications не должны обходить собственные policies. Добавить anonymous,
cross-user и cross-organization E2E.

### IAM-P0-004. Production rate-limit adapter отсутствует

**Контракт:** production password/OTP operations требуют shared atomic
`ApplicationAuthRateLimitPort`; при отказе обязательные security operations должны fail closed.  
**Факт:** in-memory adapter создаётся только для `development`. В репозитории не найден provider
production implementation. При `availability="required"` отсутствие port приводит к
`503 temporarily_unavailable`.  
**Влияние:** password sign-in/sign-up/reset, email OTP и phone OTP не являются production-operational
в текущей composition без внешнего, нигде не собранного adapter.  
**Файлы:**

- `src/iam.nest-service.ts`;
- `src/services/ApplicationAuthRateLimiter.ts`.

**Критерий закрытия:** предоставить и зарегистрировать shared atomic adapter, fail startup в
production при его отсутствии, проверить multi-replica semantics и outage behavior.

### IAM-P0-005. Production social-provider validation отсутствует

**Контракт:** `applicationAuthProviderValidate` должен безопасно проверять credentials и возвращать
`VALID`, `INVALID` или `UNAVAILABLE`. Structural decryption не считается validation.  
**Факт:** production implementation port отсутствует; fallback всегда возвращает
`PROVIDER_VALIDATION_NOT_CONFIGURED`; другой adapter существует только для E2E environment flag.  
**Влияние:** заявленная administrative validation operation не может вернуть `VALID` в production.  
**Файлы:**

- `src/services/ApplicationAuthProviderValidationPort.ts`;
- `src/iam.nest-service.ts`.

**Критерий закрытия:** upstream-safe Google/Facebook validators, timeout/redaction policy,
registration в production composition и positive/invalid/unavailable tests.

### IAM-P0-006. Runtime social audit не является durable в production composition

**Контракт:** runtime social/link/unlink security events должны иметь append-only production sink и
delivery-failure counter.  
**Факт:** `ApplicationAuthAuditPort` optional; если port отсутствует, event только записывается в
operational logger. Production adapter/wiring в репозитории не найден.  
**Влияние:** security audit retention и incident investigation не соответствуют документированному
contract.  
**Файлы:**

- `src/services/ApplicationAuthAuditService.ts`;
- `src/iam.nest-service.ts`.

**Критерий закрытия:** durable append-only adapter, retention/failure-counter policy, production
startup validation и delivery-failure E2E/contract test.

## 7. P1 — функциональные и контрактные дефекты

### IAM-P1-001. `User.locale`, `isForbidden`, `isDeleted` — заглушки

SDL публикует поля как реальные user properties. Resolver всегда возвращает `null`, `false`,
`false`; соответствующие persistence fields отсутствуют.

Решение должно быть прямым: либо реализовать поля и business semantics, либо удалить их из схемы.
Проект запрещает сохранять фиктивный backward-compatible contract.

### IAM-P1-002. `userUpdateProfile(locale)` молча игнорируется

Resolver передаёт GraphQL `locale` как `language`, script включает его в проверку «есть ли изменения»,
но не добавляет в `updateData`. Repository также не принимает locale/language. Mutation может
вернуть success без изменения значения.

Это особенно опасно как silent-success defect: клиент не получает user error и считает настройку
сохранённой.

### IAM-P1-003. `authorize.deniedReason` возвращается под неправильным именем

GraphQL ожидает `AuthorizePayload.deniedReason`. Resolver возвращает `{ allowed, reason }` и выводит
результат через `console.log`. При denial поле `deniedReason` остаётся undefined/null, несмотря на
наличие причины в `AuthorizeScript`.

Нужно вернуть exact schema field, удалить console logging и проверить unauthenticated/denied cases.

### IAM-P1-004. Неаутентифицированный `userQuery.current` создаёт resolver с пустым ID

Admin context middleware инициализирует `currentUser` объектом `{ id: "" }`. `current()` проверяет
только существование объекта, а не `currentUser.id`, и создаёт `UserResolver("")`. Ожидаемый
GraphQL contract — `current: null`, а фактическое выполнение может завершиться preload not found
error.

### IAM-P1-005. `Role` federation reference не реализован

SDL объявляет `Role @key(fields: "id")`. `__resolveReference` всегда бросает
`Role federation reference resolver not implemented`, поскольку internal resolver загружает роль по
`organizationId/domain/name`.

Нужно либо добавить repository/load-by-global-id path, либо изменить federation key на реально
поддерживаемый immutable key.

### IAM-P1-006. Несогласованность документации OAuth Phase 0

Compatibility spike продолжает указывать незакрытые exit gates, часть которых уже реализована в
коде и phase reports. Документ также исторически утверждает отсутствие phone plugin/routes, хотя
текущая реализация и OpenAPI их содержат.

Это не runtime defect, но мешает объективному release decision. Нужен единый актуальный checklist
без параллельных противоречащих статусов.

### IAM-P1-007. Headless interactions не реализованы

`application-auth-headless-interactions-plan.ru.md` имеет статус «проектный план» и прямо называет
будущие пакеты `packages/auth-core` и `packages/auth-react`. Эти пакеты, interaction repository,
service, credential model и routes в кодовой базе отсутствуют.

Для release scope нужно принять одно из двух решений:

1. явно исключить headless interactions/Auth Components из текущего IAM release contract;
2. реализовать полный план до его Definition of Done.

Промежуточное заявление headless capability без реализации недопустимо.

## 8. Тестовое покрытие

### 8.1. Статическая инвентаризация активных suites

| Suite | Spec files | Объявленных tests | `fixme` | Declared/runtime skips |
| --- | ---: | ---: | ---: | ---: |
| `application-admin-api` | 6 | 121 | 0 | 0 |
| `application-auth-password` | 12 | 223 | 15 | 0 |
| `application-auth-email-otp` | 10 | 44 | 30 | 0 |
| `application-auth-phone-otp` | 1 | 2 | 0 | 0 |
| `iam-admin-api` | 2 | 19 | 0 | 0 |
| `rbac-api` | 23 | 210 | 0 | 9 declarations/calls |
| `users-admin-api` | 2 | 10 | 0 | 0 |

Количество tests рассчитано статическим поиском вызовов `test(...)`, `test.fixme(...)` и
`test.skip(...)`; оно не означает успешное выполнение.

### 8.2. Покрытие platform user API

Активный `users-admin-api` проверяет только sign-up/sign-in. Не найдено активного targeted E2E для:

- `userUpdateEmail`;
- `userUpdatePassword`;
- `userUpdateProfile(locale)`;
- `userQuery.current` без авторизации;
- `mySessions`;
- session revoke/revoke-all;
- token refresh;
- `User.locale/isForbidden/isDeleted`.

Именно в этой непокрытой части находятся обнаруженные stubs и contract defects.

### 8.3. Password application-auth gaps

Из 223 scenarios 15 помечены `fixme`. Среди них:

- rate-limit window clock and adapter failure;
- lost invalidation event/revision fallback;
- database/cache failure behavior;
- mandatory-claim and non-application actor validation с валидной signature;
- некоторые delivery observability и isolation cases.

Основные happy paths, OAuth Authorization Code, isolation, session/token lifecycle и web security
представлены существенно лучше, чем другие IAM domains.

### 8.4. Email OTP gaps

30 из 44 tests — пустые `test.fixme`. Незакрыты целые группы:

- live configuration invalidation;
- delivery observability;
- session/token lifecycle;
- application isolation;
- public boundary;
- OAuth authorization continuation;
- CSRF/cookie/web security.

Наличие runtime кода и Phase 5 report не заменяет executable verification security contract.

### 8.5. Phone OTP gaps

Есть только два положительных signup-oriented scenarios. Недостаточно покрыты:

- sign-in existing user;
- registration disabled;
- invalid/expired/replayed OTP;
- rate limits и anti-enumeration;
- provider/delivery outage;
- application/organization isolation;
- session lifecycle и live validation;
- CSRF/hosted UI boundary;
- Admin capability configuration.

### 8.6. RBAC gaps

Есть skipped Role Transitions suite и runtime skips для site-admin scenarios. Отдельные комментарии о
не реализованном `roleUpdate` устарели относительно кода, что также требует очистки test contract.

Нужен обязательный targeted test singular organization access, поскольку текущие organization tests
проверяют scoped list, но не подтверждают authorization для `organization(id|name)`.

## 9. Production composition readiness

### 9.1. Обязательные зависимости

| Dependency | Development | Production wiring в репозитории | Поведение при отсутствии |
| --- | --- | --- | --- |
| Root key provider | Environment | Environment contract | Startup/keyring failure |
| Email delivery | Notifications default adapter | Есть broker adapter | Realm build/delivery fail closed |
| SMS delivery | Notifications default adapter | Есть broker adapter | Phone flow fail closed |
| SMS provider availability | Notifications default adapter | Есть broker adapter | Phone method configuration unavailable |
| Rate limit | In-memory fallback | **Не найдено** | Required password/OTP returns 503 |
| Admin audit | Local PostgreSQL adapter | Есть | Durable by default |
| Runtime social audit | Logger fallback | **Не найдено** | Нет durable retention |
| Provider credential validation | E2E-only deterministic adapter | **Не найдено** | Всегда `UNAVAILABLE` |
| Distributed live-state invalidation | Optional | **Не найдено** | Local fan-out + до 30s cache reread ceiling |

Distributed invalidation optional по текущему contract и не является абсолютным blocker, если
30-second ceiling принят как release SLA. Остальные три отсутствующих production adapters должны
быть явно закрыты либо обязательной startup validation, либо документированным ограничением release.

### 9.2. Конфигурация и exposure

Production должен дополнительно подтвердить:

- explicit HTTPS `IAM_PUBLIC_BASE_URL`;
- exact reverse-proxy publication только approved application-auth paths;
- отсутствие внешней публикации `/graphql`;
- trusted proxy CIDR allowlist;
- root-key versions и rotation runbook;
- notification delivery profiles/templates;
- migration state и отсутствие legacy non-empty incompatible data.

Эти условия описаны в operations runbook, но в рамках статического аудита environment не
верифицировался.

## 10. Сопоставление с Definition of Done

### 10.1. OAuth/OIDC runtime plan

| Критерий | Статус | Комментарий |
| --- | --- | --- |
| Application isolation | Частично подтверждён | Реализация сильная, но не вся negative matrix executable |
| Immutable resource + PKCE | Реализован | Guard, client policy, claims присутствуют |
| Password/email OTP flags | Реализован | Runtime есть; test closure неполный |
| Delivery purposes/templates | Реализован | Production dependency behavior требует verification |
| Safe account linking | Реализован | Catalog and explicit-link policy присутствуют |
| Live validation | Реализован | Некоторые failure/fallback cases `fixme` |
| Block/revoke/disable lifecycle | Реализован | Targeted coverage неполный |
| Все negative security scenarios | **Не выполнен** | Password/OTP fixme matrix |
| Runbooks | Частично | Operations docs есть, incident/retention/load closure не подтверждён |
| Hosted UI CSP/CSRF/cookie/WCAG/locale | Частично | Код есть, вся verification matrix не закрыта |
| Load/observability/audit retention | **Не выполнен** | Нет runtime durable audit adapter и load evidence |

### 10.2. Application Admin API plan

| Критерий | Статус | Комментарий |
| --- | --- | --- |
| Settings/providers/clients/users через GraphQL | Реализован | Полный structural surface |
| Trusted platform actor + Casbin | Реализован | Application mutations проверяют actor/RBAC |
| Service-linked protection | Реализован | `@ProtectedResource` и broker boundary |
| Protocol policy нельзя ослабить | Реализован | Server-owned client policy |
| Secrets не попадают в audit | Реализован | Safe diff, hashed/encrypted storage |
| Tenant isolation negative scenarios | В основном | Application Admin suite зрелая |
| Revision/cache invalidation | Реализован | Optimistic revision + local/distributed bus contract |
| Durable admin audit fail closed | Реализован | Local PostgreSQL adapter |
| Полностью настроить realm без БД | **Не выполнен полностью** | Provider validation production unavailable; dependencies требуют external wiring |

### 10.3. Общий IAM contract

Общий критерий не выполнен из-за platform user stubs, organization access gap, federation defect,
production adapter gaps и незакрытой E2E-матрицы.

## 11. План закрытия

### Этап 1. Немедленные security/API blockers

1. Закрыть authorization `OrganizationQuery.organization` и nested access.
2. Исправить `authorize.deniedReason` и убрать `console.log`.
3. Исправить anonymous `userQuery.current`.
4. Реализовать или удалить `userUpdateEmail` и `userUpdatePassword` из текущего SDL.
5. Реализовать или удалить фиктивные `User.locale/isForbidden/isDeleted`.
6. Исправить silent ignore locale.
7. Исправить `Role.__resolveReference` или federation key.

### Этап 2. Production dependencies

1. Добавить shared atomic rate-limit adapter и mandatory production startup check.
2. Добавить Google/Facebook provider validation adapters.
3. Добавить durable runtime security audit adapter и retention/failure counter.
4. Зафиксировать distributed invalidation SLA и production adapter decision.

### Этап 3. Verification closure

1. Добавить targeted platform user/session suite.
2. Превратить password `fixme` в executable tests.
3. Реализовать email OTP suites, сейчас состоящие из пустых `fixme`.
4. Расширить phone OTP test matrix до parity с email/password security invariants.
5. Включить singular organization cross-tenant/anonymous tests.
6. Разобраться с skipped RBAC cases и удалить устаревшие комментарии.

### Этап 4. Contract/documentation convergence

1. Обновить OAuth compatibility spike на фактическое состояние Phase 2–7 и phone OTP.
2. Зафиксировать scope headless interactions: current release exclusion или обязательная
   реализация.
3. Свести phase reports, plans и operations runbook в единый release checklist.
4. Добавить evidence для load, audit retention, incident response и provider/delivery outage.

## 12. Release gates

IAM может перейти в состояние `READY` только если одновременно выполнены следующие gates:

- [ ] В опубликованном GraphQL/OpenAPI/Broker API нет stubs и unconditional fake values.
- [ ] Все mutation inputs либо реально сохраняются, либо отклоняются; silent success отсутствует.
- [ ] Singular и connection reads одинаково соблюдают organization/application tenancy.
- [ ] Все federation `@key` имеют рабочий `__resolveReference`.
- [ ] Production composition содержит обязательные rate-limit, provider validation и audit adapters.
- [ ] Password, email OTP, phone OTP и social flows имеют достаточную negative security matrix.
- [ ] P0/P1 IAM findings закрыты targeted tests.
- [ ] Все IAM-related `fixme`/`skip` классифицированы как implemented, explicitly out of scope или
      release blocker; неизвестных состояний нет.
- [ ] Headless interactions явно включены или исключены из release scope.
- [ ] Targeted IAM build и разрешённые проверки успешно выполнены через `shopana-cli`.
- [ ] Production configuration/runbooks проверены на реальной deployment composition.

## 13. Итоговое решение

Текущий IAM — не пустой и не ранний prototype: application auth и Application Admin API содержат
значительный объём качественной security-oriented реализации. Однако зрелость подсистем сильно
неравномерна. Новый application OAuth/OIDC stack сосуществует с незавершённым platform user API,
organization authorization gap и отсутствующими production adapters.

Поэтому итоговая оценка остаётся:

```text
Implementation readiness: ~60%
API completeness: partial
Business logic completeness: partial
Security verification: partial
Production readiness: NO-GO
```

Следующая переоценка должна выполняться после закрытия всех P0 findings и production adapter wiring,
а не только после увеличения числа реализованных OAuth paths.

## 14. Проверенные источники

Основные документы и файлы:

- [OAuth/OIDC implementation plan](./application-users-oauth-oidc-implementation-plan.ru.md);
- [OAuth/OIDC operations](./application-users-oauth-oidc-integration.md);
- [Application Admin API plan](./application-auth-admin-api-implementation-plan.ru.md);
- [OAuth client management plan](./application-oauth-client-management-api-plan.ru.md);
- [Headless interactions plan](./application-auth-headless-interactions-plan.ru.md);
- [Password E2E coverage plan](./application-users-password-e2e-coverage-plan.ru.md);
- [Social provider refactoring contract report](./application-social-providers-refactoring-contract-report.md);
- [Application authentication OpenAPI](./application-auth-openapi.md);
- `src/api/graphql-admin/schema/*.graphql`;
- `src/resolvers/admin/*.ts`;
- `src/api/http/application-auth/*`;
- `src/auth/*`;
- `src/services/*`;
- `src/repositories/*`;
- `src/actions/index.ts`;
- `src/workflows/*`;
- `src/sagas/*`;
- `migrations/domains/*`;
- `e2e/tests/application-admin-api/*`;
- `e2e/tests/application-auth-password/*`;
- `e2e/tests/application-auth-email-otp/*`;
- `e2e/tests/application-auth-phone-otp/*`;
- `e2e/tests/iam-admin-api/*`;
- `e2e/tests/rbac-api/*`;
- `e2e/tests/users-admin-api/*`.
