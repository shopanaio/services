# Media Service — аудит готовности API и бизнес-логики

**Дата аудита:** 2026-08-20  
**Объект аудита:** `services/media`  
**Цель:** определить, завершены ли все заявленные API и бизнес-логика Media service.  
**Итоговая оценка готовности:** **58% — сервис не готов к production**.

## 1. Итоговый вывод

Media service имеет почти полный внешний API: admin GraphQL, storefront federation, broker actions,
CDN routing, загрузка файлов, external media, prepared sources, back-references и lifecycle удаления
структурно реализованы и подключены. Production build сервиса проходит успешно вместе с typecheck,
lint и formatting check.

При этом завершённость API surface не означает завершённость бизнес-операций. В реализации остаются
блокирующие дефекты безопасности, консистентности S3/DB, hard-delete workflow и event delivery.
Некоторые операции принимают данные, которые не помещаются в соответствующие колонки БД, а часть
заявленных возможностей либо не влияет на runtime, либо формирует неверный результат.

Сервис нельзя считать завершённым до устранения как минимум всех Critical и High findings из этого
документа и появления автоматических проверок их acceptance criteria.

## 2. Сводная оценка

| Область | Оценка | Статус |
|---|---:|---|
| Admin GraphQL API surface | 90% | Основные query/mutation присутствуют |
| Storefront federation API | 85% | Типы и reference resolvers подключены |
| Broker API | 85% | Основные межсервисные actions зарегистрированы |
| Upload и metadata | 55% | Работает happy path, нет целостной транзакционной модели |
| CDN delivery | 65% | Основной routing есть, один документированный provider сломан |
| File lifecycle и GC | 50% | State machine существует, но нарушены race/event гарантии |
| Multi-tenancy и authorization | 75% | GraphQL lookup в основном tenant-safe, broker trust слишком широк |
| Безопасность | 45% | SSRF/MIME защита есть, private-file storage небезопасен |
| Наблюдаемость и восстановление | 40% | Логи есть, но нет полноценного recovery для orphan/lost-event случаев |
| Автоматическая верификация | 10% | В `services/media` не найдено тестов |

## 3. Методика и ограничения аудита

Проверены:

- `README.md` и документы completion/deletion plan;
- admin и storefront GraphQL schemas;
- root/type resolvers и DataLoader;
- scripts и их Zod DTO;
- repositories, Drizzle models и migrations;
- S3 integration;
- CDN delivery service и встроенные adapters;
- hard-delete, cleanup и garbage-collector workflows;
- scheduler;
- broker actions и фактические consumers в других сервисах;
- service configuration и локальная MinIO policy.

Выполнена production-сборка через `shopana-cli`:

```text
yarn shopana build -s media
Build: passed
Typecheck: passed
Lint: passed
Formatting check: passed
```

Тесты, отдельный `tsc`, dev/start server и browser не запускались согласно правилам проекта.
Статическая проверка показала, что в `services/media` отсутствуют `*.spec.ts` и `*.test.ts`.

## 4. Инвентаризация заявленного API

### 4.1 Admin GraphQL queries

| Query | Реализация | Оценка |
|---|---|---|
| `mediaSettings` | Есть | Работает для store asset group |
| `cdnDeliveryPreview` | Есть | Основной routing есть, наследует дефекты adapters |
| `cdnAdapterCapabilities` | Есть | Возвращает зарегистрированные keys |
| `node` / `nodes` | Есть | Поддерживает File, CDN configuration и routing rule |
| `file` | Есть | Tenant-scoped через request DataLoader |
| `files` | Есть | Relay pagination, state scope и limit 100 |

### 4.2 Admin GraphQL mutations

| Группа | Mutation | Реализация | Основной риск |
|---|---|---|---|
| Bucket | `bucketCreate` | Частичная | Создаёт только DB metadata, не S3 bucket |
| CDN | create/update/delete/setDefault/test | Есть | DTO/DB mismatch, Cloudinary path bug |
| Routing | create/update/delete | Есть | Слабая типизация JSON overrides |
| Upload | `fileUpload` | Частичная | Нет S3/DB atomicity и compensation |
| Upload | `fileUploadFromUrl` | Частичная | Основная SSRF защита есть; остаются consistency risks |
| External | `fileCreateExternal` | Частичная | URL/provider не валидируются полностью |
| File | `fileUpdate` | Частичная | DTO/DB mismatch; нельзя обновить video metadata |
| Delete | single/many | Частичная | Race condition и синхронный permanent delete |
| Restore | single/many | Частичная | DB state и `deletedAt` меняются неатомарно |
| Delete recovery | `fileClearError` | Есть | Работает только при согласованной deletion-state записи |
| Avatar | `avatarUpload` | Частичная | Нет S3/DB compensation |
| Prepared source | create/update/delete | Частичная | Основная tenant validation есть; лимиты DTO расходятся с DB |

### 4.3 Storefront GraphQL

Реализованы federated references для:

- `Image`;
- `MediaImage`;
- `GenericFile`;
- `Video`;
- `VideoSource`;
- `ExternalVideo`;
- `Model3d`;
- `Model3dSource`.

Storefront file loading использует scoped DataLoader и отбрасывает soft-deleted файлы. Однако
доступ к private generated files определяется только ownership и знанием File ID; отдельного
publication/access-control состояния у storefront media нет.

### 4.4 Broker actions

Зарегистрированы:

- `createAssetGroup`, `getAssetGroup`, `deleteAssetGroup`;
- `validateOwnedFile`;
- `fileLink`, `fileLinkMany`, `fileUnlink`, `fileUnlinkMany`;
- `syncEntityFiles`, `entityDeleted`;
- `uploadGeneratedFile`, `deleteOwnedFiles`.

Broker payloads валидируются Zod schemas. При этом вызывающая сторона может самостоятельно
передавать `owner` и `entityRef.service`; в Media service нет проверки caller identity против этих
значений. Это требует отдельного trust-boundary решения для broker layer.

## 5. Блокирующие findings

### MEDIA-001 — Private generated files сохраняются в публичном bucket

**Severity:** Critical  
**Категория:** Security / privacy

`UploadGeneratedFileScript` используется для generated artifacts, включая customer data exports.
Файл помечается как private только в DB metadata:

```typescript
meta: { generated: true, access: "PRIVATE" }
```

Однако объект загружается в тот же bucket, что и публичные media files, и получает `buildPublicUrl`:

- `src/scripts/file/GeneratedFileScripts.ts:56-78`;
- `src/infrastructure/s3/client.ts:108-130`.

Локальная и e2e инфраструктура явно открывают весь bucket для anonymous public access:

- `docker-compose.yml:73-75`;
- `e2e/docker-compose.infra.yml:51-53`.

`CdnDeliveryService` при `meta.access === "PRIVATE"` возвращает presigned URL, но это только способ
resolution. Он не отменяет anonymous bucket policy и не делает уже публичный object key приватным.
Кроме того, admin field `File.originUrl` возвращает сохранённый прямой URL без private guard.

**Последствия:** возможное раскрытие customer exports и других private artifacts; защита зависит от
секретности object key, а не от access policy.

**Требуемое завершение:** private objects должны храниться в отдельном private bucket/prefix с
policy, запрещающей anonymous read. `originUrl` для private files не должен возвращать публичный
storage URL. Доступ должен происходить только через короткоживущий signed delivery path.

### MEDIA-002 — `deleteAssetGroup` оставляет все физические объекты в S3

**Severity:** Critical  
**Категория:** Data lifecycle / storage leakage

`AssetGroupDeleteScript` удаляет asset group напрямую из БД. FK cascade удаляет `files`,
`s3_objects`, deletion states и back-references, но S3 objects не удаляются:

- `src/scripts/assetGroup/AssetGroupDeleteScript.ts:16-44`;
- `src/repositories/AssetGroupRepository.ts:74-80`.

Эта action вызывается реальными store/organization deletion saga:

- `services/project/src/sagas/StoreDeleteSaga.ts:56-83`;
- `services/iam/src/sagas/OrganizationDeleteSaga.ts:56-82`.

После DB cascade GC больше не способен найти object keys. Объекты остаются навсегда, а при public
bucket policy продолжают быть доступными.

**Требуемое завершение:** удаление asset group должно быть durable workflow: зафиксировать перечень
объектов, удалить/поставить на удаление каждый object, обеспечить retry и только затем завершить
удаление metadata. Нужен recoverable журнал, не зависящий от уже удалённой `files` row.

### MEDIA-003 — Hard delete выполняет безусловный DB delete после устаревающей lock-проверки

**Severity:** Critical  
**Категория:** Race condition / data loss

Workflow валидирует `(state = DELETING, deleting_started_at = expected)` перед S3 delete, но затем
вызывает `FileRepository.hardDelete(fileId)`, который удаляет только по `id`:

- `src/workflows/FileHardDeleteWorkflow.ts:116-138`;
- `src/repositories/FileRepository.ts:379-389`.

В completion plan был заявлен `hardDeleteIfDeleting`, но он не реализован. Между проверкой lock и
DB delete GC может выполнить `resetStuckDeleting`. После reset пользователь может восстановить файл,
но старый workflow всё равно удалит восстановленную row.

**Требуемое завершение:** финальный DB delete обязан быть conditional по state и конкретному
`deleting_started_at`. Желательно также повторно валидировать lock после S3 step. Возвращаемый false
должен считаться безопасным abort, а не successful deletion.

### MEDIA-004 — `fileHardDeleted` может быть потерян после успешного DB delete

**Severity:** Critical  
**Категория:** Event delivery / cross-service consistency

Workflow сначала удаляет `files` row, затем запускает cleanup workflow, который публикует
`fileHardDeleted`:

- `src/workflows/FileHardDeleteWorkflow.ts:136-146`;
- `src/workflows/FileDeleteCleanupWorkflow.ts:31-63`.

Если cleanup start или `events.emit` падает, catch пытается вызвать `markErrorAndRollback`, но
deletion-state row уже удалена каскадом. При повторном запуске workflow получает `file_not_found` и
завершается без события.

Catalog рассчитывает на это событие для очистки product media registry:

- `services/catalog/src/handlers/index.ts:292-310`.

**Требуемое завершение:** использовать transactional outbox либо durable deletion journal, который
переживает удаление `files`. Hard-delete workflow не должен терять обязанность публикации события
после удаления основной row.

### MEDIA-005 — Permanent delete блокирует GraphQL request и batch выполняется последовательно

**Severity:** High  
**Категория:** API semantics / availability

`FileDeleteScript`, `FileDeleteManyScript` и `DeleteOwnedFilesScript` используют
`broker.runWorkflow`. Этот метод ожидает `handle.getResult()`:

- `src/scripts/file/FileDeleteScript.ts:46-61`;
- `src/scripts/file/FileDeleteManyScript.ts:58-96`;
- `src/scripts/file/GeneratedFileScripts.ts:128-137`;
- `packages/shared-kernel/src/broker/ServiceBroker.ts:175-200`.

Это противоречит документированному fire-and-forget поведению. Batch mutation последовательно
ожидает до 100 hard-delete workflows. `startedHardDeleteIds` фактически означает «workflow полностью
завершился», а не «durably accepted».

**Требуемое завершение:** использовать `startWorkflow`, возвращающий результат после durable accept.
Batch start должен иметь ограниченную concurrency и не ожидать физического удаления объектов.

## 6. High findings

### MEDIA-006 — Upload не является атомарной или компенсируемой бизнес-операцией

**Severity:** High

Happy path upload выполняет:

1. `putObject` в S3;
2. insert в `files`;
3. insert в `s3_objects`;
4. insert в `file_deletion_states`.

Шаги не объединены DB transaction и не имеют compensation для S3:

- `src/scripts/file/FileUploadMultipartScript.ts:102-153`;
- `src/scripts/file/FileUploadFromUrlScript.ts:186-238`;
- `src/scripts/file/ProfileAvatarUploadScript.ts:105-156`;
- `src/scripts/file/GeneratedFileScripts.ts:56-87`.

Возможные состояния после ошибки:

- S3 object без DB metadata;
- `files` row без `s3_objects`;
- active file без deletion-state;
- generated file без back-reference;
- повтор upload с тем же idempotency key возвращает INTERNAL_ERROR из-за race на unique index.

**Требуемое завершение:** DB writes должны выполняться одной транзакцией; для S3 нужен deterministic
object key и compensation/reconciliation workflow. Idempotency должна обрабатывать concurrent
unique conflict как возврат уже созданного результата.

### MEDIA-007 — Soft delete и restore меняют две модели неатомарно

**Severity:** High

`files.deleted_at` и `file_deletion_states.deletion_state` являются двумя представлениями одного
lifecycle, но обновляются отдельными запросами:

- `src/scripts/file/FileDeleteScript.ts:40-44`;
- `src/scripts/file/FileDeleteManyScript.ts:44-49`;
- `src/scripts/file/FileRestoreScript.ts:16-24`;
- `src/scripts/file/FileRestoreManyScript.ts:50-59`.

Ошибка между запросами создаёт состояния `deleted_at != null + ACTIVE` либо
`deleted_at != null + отсутствующая deletion-state`. GraphQL resolver дополнительно маскирует
отсутствующую state как `ACTIVE`, что скрывает corruption.

**Требуемое завершение:** lifecycle transition должен выполняться одной транзакцией и возвращать
результат из одного repository operation. Отсутствующая deletion-state для существующего файла
должна считаться invariant violation, а не ACTIVE.

### MEDIA-008 — DTO принимают значения, не помещающиеся в DB columns

**Severity:** High

Примеры:

| Поле | Zod/API limit | DB limit |
|---|---:|---:|
| `files.alt_text` | 1024 | 255 |
| `files.original_name` | 1024 | 255 |
| `buckets.bucket_name` | 255 | 63 |
| `buckets.region` | 100 | 32 |
| `buckets.status` | 50 | 16 |
| `cdn_configurations.name` | 255 | 128 |
| `cdn_configurations.provider` | 100 | 64 |
| `cdn_configurations.signing_mode` | 100 | 32 |
| `cdn_routing_rules.name` | 255 | 128 |
| `media_sources.kind` | 64 | 32 |

Основные ссылки:

- `src/scripts/file/dto/FileUpdateDto.ts`;
- `src/scripts/file/dto/FileCreateExternalDto.ts`;
- `src/scripts/bucket/dto/BucketCreateDto.ts`;
- `src/scripts/cdn/dto/CdnConfigurationDto.ts`;
- `src/scripts/cdn/dto/CdnRoutingRuleDto.ts`;
- `src/scripts/mediaSource/dto/MediaSourceDto.ts`;
- `src/repositories/models/*.ts`.

Валидный с точки зрения GraphQL/Zod request падает на уровне PostgreSQL и превращается в generic
`INTERNAL_ERROR`.

**Требуемое завершение:** определить единый набор констант limits или привести DB columns и DTO к
одному контракту. Проверка должна завершаться field-level user error до DB query.

### MEDIA-009 — `bucketCreate` не создаёт bucket и не подключает его к upload routing

**Severity:** High

Mutation создаёт только строку в `media.buckets`:

- `src/scripts/bucket/BucketCreateScript.ts:10-27`;
- `src/repositories/BucketRepository.ts:85-100`.

Она не вызывает `makeBucket`, не проверяет bucket connectivity и credentials. Все upload scripts
игнорируют store buckets, status и priority и используют bucket name из service config через
`getBucketName()` + `getDefault()`.

Таким образом API позволяет создать metadata для несуществующего bucket, но не позволяет реально
направить туда upload.

**Требуемое завершение:** либо удалить неподдерживаемую bucket management поверхность, либо
реализовать provisioning/verification, selection policy, archive/rotation lifecycle и безопасное
хранение credentials. Пустые `UploadSessionRepository` и `BucketRotationLogRepository` не должны
оставаться частью active repository contract без реализованных сценариев.

### MEDIA-010 — Документированный Cloudinary profile формирует неправильный URL

**Severity:** High

README задаёт Cloudinary base URL с pathname:

```text
https://res.cloudinary.com/your-cloud/image/upload
```

Но `composedOptionsTransformAdapter` использует `base.origin`, полностью отбрасывая pathname:

- `README.md:174-197`;
- `src/infrastructure/cdn/adapters/composedOptionsTransformAdapter.ts:43-53`.

Полученный URL не содержит cloud name и `/image/upload`.

**Требуемое завершение:** path placement должен сохранять нормализованный pathname configured
`baseUrl`. Нужны golden tests для всех пяти заявленных provider profiles.

### MEDIA-011 — Video metadata невозможно довести до заявленного состояния

**Severity:** High

GraphQL и README заявляют dimensions и duration для video. Однако:

- `analyzeMedia` извлекает width/height только для изображений;
- upload всегда записывает `durationMs: null`;
- `fileUpdate` не принимает width, height или durationMs;
- внешнего processor API для обновления этих полей нет.

Ссылки:

- `src/infrastructure/media/analyze.ts:93-101`;
- `src/scripts/file/FileUploadMultipartScript.ts:126-141`;
- `src/scripts/file/dto/FileUpdateDto.ts:5-15`.

**Требуемое завершение:** определить processor-owned action/API для безопасного обновления media
metadata и processing state либо извлекать обязательные video metadata при upload.

## 7. Medium findings

### MEDIA-012 — Production error masking сохраняет исходное сообщение большинства ошибок

`formatError` возвращает ошибку без изменений, если существует любой `extensions.code`:

- `src/infrastructure/graphql/queryProtection.ts:19-30`.

Стандартные internal GraphQL errors обычно также имеют code, поэтому их исходное сообщение не
маскируется. Stack trace может быть отключён Apollo production defaults, но domain/internal message
остаётся доступным клиенту.

**Требуемое завершение:** allowlist безопасных codes/messages; все неизвестные и
`INTERNAL_SERVER_ERROR` должны преобразовываться в стабильный generic response с request ID.

### MEDIA-013 — External media URL и provider contract валидируются недостаточно

`fileCreateExternalSchema` проверяет URL только как непустую строку длиной до 2048:

- `src/scripts/file/dto/FileCreateExternalDto.ts:4-16`.

Нет проверки HTTP(S), соответствия YouTube/Vimeo host выбранному provider, формата externalId и
безопасности `thumbnailUrl`. Некорректный URL сохраняется как canonical origin URL.

**Требуемое завершение:** provider-neutral URL policy минимум с HTTP(S); для встроенных
YouTube/Vimeo — нормализатор host/external ID. Невалидный URL должен давать field-level error.

### MEDIA-014 — `thumbnailUrl` external media не становится storefront preview

`fileCreateExternal` сохраняет `thumbnailUrl` только внутри `providerMeta`. Storefront
`ExternalVideo.previewImage` использует исключительно `previewFileId`. В результате input принимается
и сохраняется, но не выполняет ожидаемую функцию preview image.

**Требуемое завершение:** либо удалить поле из mutation contract, либо импортировать thumbnail как
управляемый File и установить `previewFileId`, либо явно отразить external thumbnail в storefront
contract.

### MEDIA-015 — CDN configuration разрешает unusable adapter keys

Admin API предоставляет `cdnAdapterCapabilities`, но create/update не отклоняют неизвестные
`transformStrategy` и `signingMode`. Конфигурация успешно сохраняется, а runtime затем silently
fallback-ит на origin URL.

**Требуемое завершение:** при включённой configuration проверять registry keys либо требовать
явного allow-unknown режима для externally registered adapters.

### MEDIA-016 — JSON CDN configuration недостаточно валидирована

`providerConfig`, `transformConfig` и `transformOverrides` принимают произвольный JSON object.
Заявленные compose/keyMap/valueMap/range структуры не имеют полной schema validation. Malformed
configuration сохраняется и обнаруживается только при runtime URL resolution.

Также нет механизма, запрещающего сохранять credential-looking values в `providerConfig`, хотя
README требует хранить секреты только через `secretRef`.

**Требуемое завершение:** versioned Zod schema для известных generic adapter contracts; проверка
secret-like keys; preview/create должны использовать одинаковую строгую validation path.

### MEDIA-017 — Broker caller не связан с переданными `owner` и `entityRef.service`

Broker actions позволяют caller самостоятельно указать owner и service entity reference. Media
service проверяет существование/ownership файла, но не проверяет, что вызывающий service имеет право
выступать от имени переданного `entityRef.service` или удалять конкретную группу.

**Требуемое завершение:** формализовать trusted service identity в broker context и валидировать её
для destructive/linking actions либо явно закрепить полностью доверенную внутреннюю модель и
ограничить доступ к broker transport.

### MEDIA-018 — Некоторые batch errors теряют конкретный file ID

Scripts возвращают `{ id, code }`, но GraphQL resolver преобразует ошибки в `GenericUserError` с
одинаковым `field: ["ids"]`, не включая проблемный ID. Клиент не может надёжно сопоставить ошибку с
элементом batch.

**Требуемое завершение:** payload должен содержать typed per-item results либо field path с index и
стабильный offending ID.

## 8. Положительно реализованные элементы

Следующие части соответствуют заявленному направлению и могут быть сохранены при доработке:

- tenant-scoped `FileLoader` и storefront loading;
- запрет private/reserved targets и DNS pinning для URL fetch;
- manual redirect handling и response-size cap;
- MIME sniffing по content и allowlist;
- pagination ceiling `MAX_PAGE_SIZE = 100`;
- query depth и complexity rules;
- production introspection gating;
- CDN adapter registry и capabilities query;
- HMAC secret resolution через `secretRef`;
- data-driven routing rules с deterministic priority order;
- prepared video/3D source relations;
- file back-reference registry и usage summary;
- three-state deletion model и DB CHECK constraints;
- retryable/fatal error classification;
- stuck-DELETING reset и retention-based GC;
- tenant checks перед admin file mutation;
- GraphQL Global ID decoding по ожидаемому entity type.

## 9. Обязательная программа завершения

### Phase 0 — Security containment

1. Разделить public и private object storage.
2. Запретить anonymous access к generated/private artifacts.
3. Убрать прямой private `originUrl` из API.
4. Добавить regression tests на невозможность anonymous GET private object.

### Phase 1 — File lifecycle correctness

1. Реализовать conditional hard delete по state + lock token/timestamp.
2. Сделать soft-delete и restore атомарными.
3. Ввести durable outbox/deletion journal для `fileHardDeleted`.
4. Переделать `deleteAssetGroup` в durable cleanup workflow.
5. Перевести client-triggered permanent delete на `startWorkflow`.
6. Сохранить per-item batch outcome.

### Phase 2 — Upload consistency

1. Объединить DB inserts одной транзакцией.
2. Добавить S3 compensation/reconciliation.
3. Обработать concurrent idempotency conflict.
4. Ввести детектор orphan objects/metadata.
5. Привести private/public URL generation к storage class.

### Phase 3 — Contract alignment

1. Синхронизировать Zod и DB limits.
2. Решить судьбу bucket management API.
3. Добавить video metadata processor contract.
4. Валидировать external URLs.
5. Определить семантику `thumbnailUrl`.
6. Исправить Cloudinary URL construction.
7. Добавить schema validation CDN JSON contracts.

### Phase 4 — Verification

Минимально необходимы тесты:

- upload success и compensation на каждом failure point;
- concurrent idempotent upload;
- tenant isolation для всех File/CDN/MediaSource operations;
- SSRF: IPv4, IPv6, mapped IPv6, DNS rebinding, redirects, metadata endpoints;
- MIME spoofing и size limits;
- private/public storage policy;
- soft-delete/restore atomicity;
- reset-stuck vs restore vs hard-delete races;
- hard-delete event delivery после retry/restart;
- GC cooldown/FATAL behavior;
- asset-group deletion с физической очисткой;
- пять documented CDN provider golden URLs;
- malformed CDN configuration;
- GraphQL page/depth/complexity limits;
- production error masking;
- DTO boundary values для каждой varchar/integer column;
- storefront exclusion soft-deleted и private unpublished media.

## 10. Definition of Done

Media service может считаться завершённым только когда одновременно выполнено следующее:

- все Critical и High findings закрыты;
- private object никогда не доступен через anonymous/public URL;
- каждая S3 mutation имеет transaction/compensation/reconciliation strategy;
- hard delete не может удалить restored file;
- `fileHardDeleted` доставляется at least once после успешного физического удаления;
- удаление asset group не оставляет физические объекты;
- API validation полностью совпадает с DB constraints;
- все задокументированные CDN profiles дают корректные golden URLs;
- video metadata имеет завершённый producer/update contract;
- permanent delete возвращается после durable workflow accept, не после S3 completion;
- нет активных пустых repository/API abstractions без поддерживаемого сценария;
- build и обязательный automated test suite проходят через `shopana-cli`;
- acceptance criteria из этого отчёта представлены исполняемыми тестами.

## 11. Финальный статус

**Статус:** `NOT READY`  
**Рекомендация:** не использовать Media service как завершённый production storage/media boundary.  
**Главная причина:** текущая реализация обеспечивает широкий API surface и happy path, но не
гарантирует privacy, целостность S3/DB и надёжный lifecycle удаления при сбоях и concurrency.
