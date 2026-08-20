# Apps Service Readiness Audit

**Дата аудита:** 2026-08-20  
**Область:** `services/apps`, связанные контракты `packages/app-sdk`, `packages/broker-types`, bundled Apps и Apps Admin API e2e-спецификации  
**Итоговая оценка:** около 60%  
**Вердикт:** сервис не готов по критерию «весь заявленный API и бизнес-логика завершены»

## 1. Цель и критерии аудита

Цель аудита — определить, можно ли считать Apps service завершённым, если от него требуется:

- реализовать весь заявленный Admin GraphQL API;
- реализовать все опубликованные broker actions;
- корректно исполнять полный lifecycle установки App;
- обеспечивать строгую store isolation;
- обеспечивать безопасную работу permissions и secrets;
- синхронизировать и маршрутизировать manifest capabilities в соответствии с контрактом;
- предоставлять достоверное runtime- и installation-level health состояние;
- сохранять durable и idempotent семантику операций;
- иметь автоматизированные спецификации для критических позитивных и негативных сценариев.

Сервис считается готовым только тогда, когда API не просто подключён к обработчикам, но и выполняет заявленные бизнес-инварианты во всех допустимых состояниях.

## 2. Методика и ограничения

Проведён статический аудит:

- GraphQL schema и resolver layer;
- control-plane lifecycle;
- runtime host и router;
- repository layer и SQL migrations;
- manifest v2 и broker contracts;
- bundled App manifests;
- unit- и e2e-спецификации, относящиеся к Apps service;
- архитектурная документация проекта.

Тесты, `tsc`, dev server и browser не запускались в соответствии с правилами проекта. Build не запускался, поскольку новая версия кода не создавалась. Поэтому наличие тестов в репозитории не означает, что они проходят на текущем состоянии workspace.

## 3. Архитектурные источники истины

Основные источники контракта:

- [`knowledge/vault/architecture/provider-app-manifest.ru.md`](../../../knowledge/vault/architecture/provider-app-manifest.ru.md);
- [`packages/app-sdk/src/index.ts`](../../../packages/app-sdk/src/index.ts);
- [`packages/broker-types/src/actions/apps.ts`](../../../packages/broker-types/src/actions/apps.ts);
- [`packages/broker-types/src/actions/delivery.ts`](../../../packages/broker-types/src/actions/delivery.ts);
- [`packages/broker-types/src/actions/payments.ts`](../../../packages/broker-types/src/actions/payments.ts);
- GraphQL schema в [`src/api/graphql-admin/schema`](../src/api/graphql-admin/schema).

Ключевые заявленные инварианты:

1. Один независимый provider и его credentials/lifecycle соответствуют одной App.
2. Manifest permissions — запрашиваемый allowlist, а не автоматически выданный доступ.
3. Внешний contract разрешён только когда он объявлен manifest и выдан installation.
4. Install, update и uninstall выполняются durable workflow.
5. Suspend, resume и installation health выполняются быстрыми actions.
6. `routingMode: broadcast` сохраняет несколько одновременно доступных маршрутов.
7. Delivery carrier и shipment provider capabilities обязаны использовать store assignment и broadcast routing.
8. Secrets остаются write-only, изолированы по installation и доступны App только в доверенном execution context.
9. Lifecycle operation должна быть idempotent и наблюдаема через durable state.

## 4. Инвентарь заявленного API

### 4.1 Admin GraphQL queries

| Query | Назначение | Реализация | Статус |
| --- | --- | --- | --- |
| `appsQuery.appDefinition(code)` | Получение bundled App definition | `QueryResolver` → runtime registry | Реализовано |
| `appsQuery.apps(...)` | Каталог Apps, filtering, ordering, Relay pagination | `AppConnectionResolver` → `AppRepository` | Реализовано с оговорками |
| `appsQuery.appInstallation(id)` | Store-scoped installation lookup | DataLoader → installation repository | Реализовано |
| `appsQuery.appLifecycleOperation(id)` | Store-scoped operation lookup | DataLoader → lifecycle repository | Реализовано |

### 4.2 Admin GraphQL mutations

| Mutation | Назначение | Реализация | Статус |
| --- | --- | --- | --- |
| `appInstall` | Установить bundled App | GraphQL → `apps.installApp` → lifecycle workflow | Частично готово |
| `appUpdate` | Обновить App/config/scopes/secrets | GraphQL → `apps.updateApp` → lifecycle workflow | Частично готово |
| `appConfigure` | CAS-замена configuration и scopes | Direct control-plane transaction | Частично готово |
| `appSuspend` | Приостановить installation | GraphQL → lifecycle action/workflow | Реализовано с оговорками |
| `appResume` | Возобновить installation | GraphQL → lifecycle action/workflow | Реализовано с оговорками |
| `appUninstall` | Выполнить cleanup и удалить installation | GraphQL → lifecycle workflow | Не готово для provider cleanup |

### 4.3 Broker actions

| Action | Статус |
| --- | --- |
| `apps.installApp` | Подключён |
| `apps.updateApp` | Подключён |
| `apps.suspendApp` | Подключён |
| `apps.resumeApp` | Подключён |
| `apps.uninstallApp` | Подключён, но cleanup secrets сломан |
| `apps.executeCapability` | Подключён, есть routing/security gaps |
| `apps.listCapabilityRoutes` | Подключён, зависит от некорректной routing policy |
| `apps.listCommerceFunctionBindings` | Подключён |
| `apps.assignCapability` | Подключён, resource-mode e2e отсутствует |
| `apps.unassignCapability` | Подключён, resource-mode e2e отсутствует |

### 4.4 GraphQL entity surfaces

Следующие entity surfaces реализованы и store-scoped через request DataLoader:

- `AppDefinition`;
- `AppInstallation`;
- `AppCapabilityBinding`;
- `AppLifecycleOperation`;
- `AppManifestSnapshot`;
- Relay connections для Apps, lifecycle operations и manifest snapshots.

## 5. Оценка готовности по подсистемам

| Подсистема | Оценка | Комментарий |
| --- | ---: | --- |
| Admin GraphQL queries | 85% | Entry points и tenant-scoped reads реализованы |
| GraphQL mutation wiring | 85% | Все операции подключены, но часть бизнес-инвариантов нарушена |
| Lifecycle happy path | 70% | Install/update/suspend/resume/uninstall проходят через durable operation |
| Persistence и store isolation | 75% | GraphQL reads хорошо изолированы, internal control-plane API менее строгий |
| Configuration/scopes/secrets | 50% | Есть CAS и encryption, отсутствуют state guards и rollback |
| Capability routing | 40% | Manifest routing mode игнорируется |
| Permissions boundary | 40% | Fully-qualified permission расширяется до service-wide доступа |
| Installation health | 40% | Поле и manifest contract существуют, execution отсутствует |
| Runtime hosting и App GraphQL | 65% | Host реализован, один ключевой runtime ожидаемо FAILED в e2e |
| Автоматизированные спецификации | 65% | Широкий happy-path набор, но критические negative paths отсутствуют |

## 6. Блокирующие findings

### APP-READY-001 — P0 — Fully-qualified permission даёт service-wide доступ

**Ожидаемое поведение**

Permission вида `project.getStoreById` должна разрешать только этот contract. Только permission `project` должна трактоваться как service scope.

**Фактическое поведение**

`assertAppOutboundContractAllowed` выделяет имя target service, затем считает подходящим любое manifest permission, которое начинается с `project.` или `project:`. После этого проверяется лишь наличие такого permission в granted scopes.

Например, installation с единственным granted scope `project.getStoreById` проходит предварительную проверку для `project.deleteStore`, если downstream action не добавляет собственное ограничение.

**Влияние**

- нарушение least privilege;
- возможность горизонтального расширения прав App внутри target service;
- manifest и consent UI не отражают реальные полномочия installation;
- безопасность зависит от необязательной повторной проверки в каждом downstream action.

**Доказательства**

- [`src/runtime/AppManifestContracts.ts`](../src/runtime/AppManifestContracts.ts), функция `assertAppOutboundContractAllowed`;
- [`knowledge/vault/architecture/provider-app-manifest.ru.md`](../../../knowledge/vault/architecture/provider-app-manifest.ru.md), раздел `permissions`.

**Требуемое завершение**

- различать exact contract и явно объявленный service scope;
- сравнивать fully-qualified permissions с вызываемым contract точно;
- добавить unit/e2e на запрет соседнего action того же сервиса;
- отдельно определить и документировать синтаксис service scope.

### APP-READY-002 — P0 — `routingMode` manifest игнорируется

**Ожидаемое поведение**

`routingMode: broadcast` позволяет нескольким installation одновременно публиковать один capability operation. Это обязательно для delivery provider capabilities и Commerce Functions.

**Фактическое поведение**

- `routingMode` не сохраняется в `slots`;
- GraphQL `AppCapabilityDefinition` его не возвращает;
- capability synchronization использует `isBroadcastStoreRoute(capability, operation)`;
- hardcoded policy знает только `commerce.function` и две notification operations;
- delivery capabilities из manifest не рассматриваются как broadcast.

При установке второго delivery provider assignment первого будет переведён в `disabled`.

**Влияние**

- невозможно корректно использовать несколько delivery providers;
- `listCapabilityRoutes` возвращает неполный discovery set;
- фактическая routing cardinality расходится с manifest;
- установка/возобновление одной App может неожиданно отключить другую.

**Доказательства**

- [`src/repositories/capability/capability-route-policy.ts`](../src/repositories/capability/capability-route-policy.ts);
- [`src/repositories/capability/AppCapabilityRepository.ts`](../src/repositories/capability/AppCapabilityRepository.ts), методы `sync` и `setEnabled`;
- [`packages/broker-types/src/actions/delivery.ts`](../../../packages/broker-types/src/actions/delivery.ts), `DeliveryProviderAppManifestCapability`;
- [`apps/test-fedex/app.manifest.ts`](../../../apps/test-fedex/app.manifest.ts).

**Требуемое завершение**

- сделать `routingMode` частью persisted route definition;
- использовать значение manifest при sync/resume;
- валидировать допустимую cardinality на уровне capability contract;
- добавить e2e с двумя delivery Apps в одном store;
- раскрыть routing mode в Admin GraphQL API.

### APP-READY-003 — P0 — Uninstall workflow лишён secrets до cleanup

**Ожидаемое поведение**

Uninstall workflow должен иметь доверенный installation context и доступ к secrets до завершения provider cleanup. Secrets должны быть отозваны только после успешного cleanup либо по явно определённой failure policy.

**Фактическое поведение**

При `beginExistingOperation(UNINSTALL)` service:

1. отключает capability routes;
2. отзывает все secrets;
3. переводит installation в `UNINSTALLING`;
4. только затем запускает App uninstall workflow.

Даже если ciphertext ещё существует, `AppInstallationSecretStore.resolve` запрещает доступ для `UNINSTALLING`.

**Влияние**

Provider App не сможет:

- удалить webhook;
- отозвать provider token;
- закрыть внешнюю регистрацию;
- отменить или очистить provider-side resources;
- выполнить любой authenticated cleanup.

При ошибке installation переходит в `UNINSTALL_FAILED`, но secrets уже отозваны, что также блокирует повторный cleanup.

**Доказательства**

- [`src/control-plane/AppInstallationStore.ts`](../src/control-plane/AppInstallationStore.ts), `beginExistingOperation`;
- [`src/control-plane/AppInstallationSecretStore.ts`](../src/control-plane/AppInstallationSecretStore.ts), `resolve`;
- [`src/control-plane/AppInstallationLifecycleWorkflow.ts`](../src/control-plane/AppInstallationLifecycleWorkflow.ts), ветка `UNINSTALL`.

**Требуемое завершение**

- отложить final secret revocation до успешного App uninstall workflow;
- разрешить secret resolution только активной uninstall operation конкретной installation;
- определить политику `UNINSTALL_FAILED` и retry;
- добавить App fixture, чей uninstall workflow требует secret;
- добавить e2e успешного и упавшего cleanup.

## 7. Высокоприоритетные findings

### APP-READY-004 — P1 — Installation-level `healthAction` не исполняется

Manifest contract различает:

- process-level `ShopanaApp.health()`;
- installation-level `lifecycle.healthAction`, использующий configuration/secrets конкретной installation.

Service регистрирует `healthAction` как externally routable action, однако нигде его не вызывает. `AppInstallation.healthStatus` изменяется только следующим образом:

- `HEALTHY` после успешного install;
- `UNHEALTHY` после lifecycle failure;
- `UNKNOWN` после uninstall.

Невозможно получить `DEGRADED` из фактической проверки provider connection. Нет refresh mutation, scheduled check или broker action, сохраняющего результат installation health.

**Доказательства**

- [`src/runtime/AppManifestContracts.ts`](../src/runtime/AppManifestContracts.ts);
- [`src/runtime/AppRuntimeRegistry.ts`](../src/runtime/AppRuntimeRegistry.ts);
- [`src/control-plane/AppInstallationStore.ts`](../src/control-plane/AppInstallationStore.ts);
- GraphQL field в [`src/api/graphql-admin/schema/app-installation.graphql`](../src/api/graphql-admin/schema/app-installation.graphql).

**Требуемое завершение**

- определить platform action для проверки installation health;
- вызвать manifest `healthAction` через trusted context;
- сохранять status, message/code и timestamp;
- определить periodic/on-demand strategy;
- добавить timeout/error classification;
- покрыть HEALTHY/DEGRADED/UNHEALTHY e2e.

### APP-READY-005 — P1 — `appConfigure` не ограничен lifecycle state

`appConfigure` выполняет store-scoped CAS update, но repository условие содержит только:

- текущий store;
- installation id;
- expected configuration version.

Статус installation не проверяется. Поэтому configuration и scopes можно изменить для `INSTALLING`, `UPDATING`, `UNINSTALLING` и даже `UNINSTALLED`.

Особенно опасен `UNINSTALLED`: `scope.replace` способен повторно активировать исторические grants после uninstall.

**Доказательства**

- [`src/resolvers/admin/MutationResolver.ts`](../src/resolvers/admin/MutationResolver.ts), `appConfigure`;
- [`src/control-plane/AppInstallationStore.ts`](../src/control-plane/AppInstallationStore.ts), `configure`;
- [`src/repositories/installation/AppInstallationRepository.ts`](../src/repositories/installation/AppInstallationRepository.ts), `updateConfigurationForStore`.

**Требуемое завершение**

- определить разрешённые состояния, вероятно `ACTIVE` и `SUSPENDED`;
- выполнять status check и CAS в одном SQL/transaction boundary;
- запретить re-grant scopes терминальной installation;
- добавить negative e2e для каждого transitional/terminal status.

### APP-READY-006 — P1 — Failed update не откатывает configuration, scopes и secrets

Перед запуском App update workflow service уже:

- заменяет configuration;
- увеличивает configuration version;
- заменяет granted scopes;
- сохраняет/вращает secrets.

При падении workflow `failOperation` изменяет status и route state, но не восстанавливает прежние значения.

**Влияние**

- `UPDATE_FAILED` installation работает с частично применённым новым состоянием;
- suspended installation может хранить grants/configuration, которые App не приняла;
- секрет, отклонённый provider validation, остаётся активным;
- retry не имеет надёжной previous snapshot semantics.

**Доказательства**

- [`src/control-plane/AppInstallationStore.ts`](../src/control-plane/AppInstallationStore.ts), `beginExistingOperation` и `failOperation`;
- [`src/control-plane/AppLifecycleService.ts`](../src/control-plane/AppLifecycleService.ts), `update` и `persistSecrets`.

**Требуемое завершение**

Один из допустимых вариантов должен быть выбран явно:

1. staging configuration/scopes/secrets с promotion после успешного workflow;
2. persisted previous snapshot и transactionally consistent rollback;
3. отдельные desired/effective revisions.

После выбора необходимы e2e на failed update и повторный retry.

### APP-READY-007 — P1 — Consent lifecycle не завершён

Manifest permissions документированы как запрашиваемые scopes. Однако install использует:

```text
grantedScopes ?? manifest.permissions
```

То есть отсутствие `grantedScopes` автоматически выдаёт все permissions. Статус `PENDING_CONSENT` никогда не является реальным persisted состоянием: новая installation создаётся сразу как `INSTALLING`.

**Влияние**

- requested permissions и granted permissions семантически смешаны;
- отсутствует явное подтверждение consent;
- невозможно отличить default grant от сознательного выбора администратора;
- `PENDING_CONSENT` является фактически мёртвым состоянием.

**Доказательства**

- [`src/control-plane/AppLifecycleService.ts`](../src/control-plane/AppLifecycleService.ts), `install`;
- [`src/control-plane/AppInstallationStore.ts`](../src/control-plane/AppInstallationStore.ts), `beginInstall`;
- [`src/repositories/models/installations.ts`](../src/repositories/models/installations.ts).

**Требуемое завершение**

- определить продуктовую модель consent;
- либо сделать `grantedScopes` обязательным explicit selection;
- либо реализовать persisted `PENDING_CONSENT` и отдельный accept operation;
- документировать поведение empty/omitted scopes;
- покрыть default, partial и denied consent.

## 8. Среднеприоритетные findings

### APP-READY-008 — P2 — Manifest snapshot не привязан к lifecycle operation

GraphQL описывает `AppManifestSnapshot` как immutable manifest, используемый lifecycle operation. Фактически snapshot хранится только с `installationId`, `version` и `manifestHash`. В lifecycle operation нет `manifestSnapshotId` или эквивалентной ссылки.

Workflow dispatch и completion читают текущий runtime manifest, а не сохранённый snapshot. При смене bundled App version между созданием и продолжением durable operation исполнение может использовать новый contract или завершиться version mismatch.

**Требуемое завершение**

- связать operation с конкретным snapshot;
- исполнять lifecycle по snapshot contract либо формально определить невозможность cross-version continuation;
- добавить restart/deploy recovery specification.

### APP-READY-009 — P2 — Provider-specific manifest invariants не валидируются runtime’ом

Общий `AppManifestSchema` проверяет форму capability, но не проверяет:

- обязательные delivery operations;
- обязательные payment operations;
- требуемый assignment mode;
- требуемый routing mode;
- соответствие optional operations реально зарегистрированным provider capabilities.

TypeScript types в `broker-types` не защищают от runtime manifest, импортированного из JS, неверной типизации или future App package.

**Требуемое завершение**

- добавить capability-contract registry с Zod validation;
- валидировать definitions до runtime registration;
- выдавать понятную startup error с app code/capability/field.

### APP-READY-010 — P2 — GraphQL capability definition не раскрывает routing mode

`AppCapabilityDefinition` содержит `key`, `assignmentMode` и `operations`, но не содержит `routingMode`. Admin и observability clients не могут увидеть фактическую discovery cardinality.

### APP-READY-011 — P2 — GraphQL user error classification основан на тексте исключения

`toAppsUserErrors`:

- возвращает raw `Error.message`;
- определяет code через `message.includes(...)`;
- не использует typed domain errors для conflict/state/scope/runtime failures.

Это делает API codes нестабильными и потенциально раскрывает внутренние DB/runtime сообщения.

### APP-READY-012 — P2 — Catalog query выполняет database synchronization

`AppRepository.getConnection` сначала выполняет `synchronizeCatalog`, поэтому read query имеет write side effects. Это усложняет:

- read-only database access;
- прогнозируемую latency;
- error semantics query;
- горизонтальное масштабирование и кэширование.

Желательно синхронизировать bundled catalog на startup/deployment или отдельным control-plane process.

## 9. Что уже реализовано качественно

Несмотря на blockers, в сервисе есть значительная завершённая основа.

### 9.1 Store-scoped GraphQL reads

- request-scoped DataLoader;
- repository methods с `storeId` conditions;
- foreign installation/operation возвращается как `null`;
- federation references используют store-scoped loaders;
- Relay connection для lifecycle и snapshots сначала проверяет принадлежность installation текущему store.

### 9.2 Durable lifecycle skeleton

- persisted lifecycle operation;
- deterministic workflow id;
- idempotency key uniqueness на installation;
- advisory lock для install slot;
- explicit transition statuses;
- operation timestamps и failure state;
- capability activation/deactivation связано с lifecycle.

### 9.3 Secret storage foundation

- AES-256-GCM encryption;
- master key обязателен в production;
- write-only GraphQL contract;
- secret rotation incrementирует version;
- App получает secret только через execution context;
- plaintext не сохраняется в installation/configuration payload.

### 9.4 Runtime isolation

- App actions имеют namespace `apps.<app-code>.*`;
- прямой вызов App action без trusted App context блокируется;
- manifest contracts сверяются с зарегистрированными actions/workflows;
- Commerce Function ограничена read-only actions;
- runtime failure одной optional App может быть изолирован.

### 9.5 GraphQL contract completeness на уровне wiring

Не обнаружено GraphQL operation, объявленной schema, но полностью отсутствующей в resolver/control-plane layer. Основной дефицит находится в бизнес-семантике, а не в наличии методов.

## 10. Состояние автоматизированных спецификаций

### 10.1 Найденные Apps Admin API e2e suites

- `app-discovery.spec.ts`;
- `configuration-scopes-secrets.spec.ts`;
- `idempotency-concurrency.spec.ts`;
- `installation-lifecycle.spec.ts`;
- `installation-queries.spec.ts`;
- `rbac-store-isolation.spec.ts`;
- `runtime-capabilities-observability.spec.ts`.

Они покрывают:

- основные lifecycle happy paths;
- install retry;
- idempotency и часть concurrency;
- store isolation и RBAC;
- configuration CAS;
- scope replacement;
- secret rotation и redaction;
- capability synchronization для одной App;
- runtime discovery и process health;
- lifecycle/snapshot observability.

### 10.2 Unit specs внутри service

Найдены пять spec-файлов:

- `AppsPlatformActions.spec.ts`;
- `capability-error-classification.spec.ts`;
- `AppCapabilityRepository.spec.ts`;
- `AppBrokerFacadeFactory.spec.ts`;
- `AppsRuntimeRouter.spec.ts`.

### 10.3 Критические отсутствующие сценарии

- exact permission против соседнего action того же сервиса;
- две broadcast delivery Apps в одном store;
- uninstall workflow, которому нужен secret;
- `UNINSTALL_FAILED` retry с credentials;
- failed update rollback/staging;
- `appConfigure` во всех transitional/terminal statuses;
- реальный installation `healthAction`;
- `DEGRADED` health;
- runtime validation неверного provider manifest;
- durable lifecycle continuation после runtime version change;
- resource assignment cross-store isolation.

Последний сценарий прямо помечен `test.fixme` в [`e2e/tests/apps-admin-api/runtime-capabilities-observability.spec.ts`](../../../e2e/tests/apps-admin-api/runtime-capabilities-observability.spec.ts), поскольку единственный resource-mode App ожидаемо находится в состоянии `FAILED` в e2e.

## 11. Bundled Apps и интеграционная готовность

Apps service bundle содержит:

- `hello-world`;
- `shopana-online-store`;
- `shopana-headless`;
- `shopana-smtp`;
- `test-fedex`;
- `test-stripe`;
- `test-twilio`.

В основной [`config.yml`](../../../config.yml) все они включены и помечены `required: true`.

В e2e `shopana-online-store` помечена optional и спецификации ожидают её runtime status `FAILED`. В результате:

- resource assignment path не проверяется end-to-end;
- штатная готовность единственной resource-mode App не доказана;
- основная и e2e startup policy расходятся.

До объявления Apps platform завершённой требуется READY fixture с `assignmentMode: resource`, даже если production Online Store ещё не готов.

## 12. Рекомендуемый порядок завершения

### Этап 1 — Security и destructive lifecycle

1. Исправить exact/service-scope permission matching.
2. Исправить secret lifecycle uninstall.
3. Добавить state guards для configure.
4. Зафиксировать consent semantics.

### Этап 2 — Capability correctness

1. Persist и использовать `routingMode`.
2. Убрать hardcoded broadcast policy либо сделать её contract registry.
3. Добавить provider manifest validation.
4. Добавить multi-provider delivery e2e.
5. Завершить resource assignment e2e.

### Этап 3 — Configuration lifecycle

1. Выбрать staging/rollback модель update.
2. Разделить desired и effective configuration revision при необходимости.
3. Обеспечить согласованную promotion scopes/secrets.
4. Добавить failed update/retry e2e.

### Этап 4 — Health и observability

1. Реализовать execution `healthAction`.
2. Сохранять result/message/timestamp.
3. Добавить on-demand и/или scheduled checks.
4. Добавить GraphQL observability fields.

### Этап 5 — Durable versioning и API hardening

1. Привязать lifecycle operation к manifest snapshot.
2. Определить deploy/restart semantics.
3. Перейти на typed domain errors.
4. Убрать catalog writes из read query.

## 13. Definition of Done

Apps service можно считать завершённым только при выполнении всех условий:

- [ ] fully-qualified permission не расширяется до service scope;
- [ ] consent/grants имеют однозначную persisted семантику;
- [ ] uninstall cleanup имеет controlled доступ к secrets;
- [ ] failed uninstall допускает безопасный retry;
- [ ] update configuration/scopes/secrets применяется атомарно или через staging;
- [ ] configure запрещён в недопустимых states;
- [ ] `routingMode` сохраняется и используется;
- [ ] два delivery providers одновременно доступны через broadcast discovery;
- [ ] resource assignment проверен end-to-end;
- [ ] installation `healthAction` исполняется и сохраняет результат;
- [ ] provider-specific manifest contracts валидируются runtime’ом;
- [ ] lifecycle operation привязана к immutable manifest snapshot;
- [ ] typed domain errors формируют стабильные GraphQL user error codes;
- [ ] все перечисленные negative paths покрыты автоматизированными спецификациями;
- [ ] целевые Apps e2e suites проходят на чистой инфраструктуре;
- [ ] required bundled Apps стартуют в READY или явно исключены из production bundle.

## 14. Финальный вывод

Apps service имеет хорошо развитый каркас control-plane и почти полный API wiring. Он уже пригоден для демонстрации happy path, тестовых provider Apps и дальнейшей разработки платформы.

Однако сервис пока нельзя считать завершённым или безопасным для полноценной provider ecosystem. Три P0 finding затрагивают permission boundary, broadcast routing и authenticated uninstall cleanup. Дополнительные P1 gaps делают installation health, consent и update failure semantics незавершёнными.

До закрытия этих пунктов API формально существует, но не гарантирует заявленную бизнес-семантику во всех состояниях.
