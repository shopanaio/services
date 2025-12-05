# Media Admin API - План реализации

## Текущее состояние: ~30%

| Компонент | Готовность |
|-----------|------------|
| GraphQL схема | ✅ 100% |
| Модели БД (Drizzle) | ✅ 100% |
| Apollo Server + Fastify | ✅ 100% |
| Context middleware | ✅ 100% |
| Репозитории | ❌ 10% |
| Business logic (scripts) | ❌ 0% |
| Резолверы | ❌ 20% |

---

## Этап 1: Репозитории

### 1.1 FileRepository

**Файл:** `src/repositories/FileRepository.ts`

**Методы:**

```typescript
// Чтение
findById(projectId: string, fileId: string): Promise<File | null>
findByIds(projectId: string, ids: string[]): Promise<File[]>
findAll(projectId: string, options: {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  filter?: FileFilter;
}): Promise<FileConnection>

// Запись
create(projectId: string, data: CreateFileInput): Promise<File>
update(projectId: string, fileId: string, data: UpdateFileInput): Promise<File>
softDelete(projectId: string, fileId: string): Promise<void>
hardDelete(projectId: string, fileId: string): Promise<void>

// Утилиты
findByIdempotencyKey(projectId: string, key: string): Promise<File | null>
exists(projectId: string, fileId: string): Promise<boolean>
```

**Зависимости:**
- Drizzle ORM (`db`)
- Модель `files` из `models/files.ts`

---

### 1.2 S3ObjectRepository

**Файл:** `src/repositories/S3ObjectRepository.ts`

**Методы:**

```typescript
findByFileId(projectId: string, fileId: string): Promise<S3Object | null>
findByFileIds(projectId: string, fileIds: string[]): Promise<Map<string, S3Object>>
create(projectId: string, data: CreateS3ObjectInput): Promise<S3Object>
update(projectId: string, fileId: string, data: UpdateS3ObjectInput): Promise<S3Object>
delete(projectId: string, fileId: string): Promise<void>

// Дедупликация
findByContentHash(projectId: string, hash: string): Promise<S3Object | null>
```

---

### 1.3 ExternalMediaRepository

**Файл:** `src/repositories/ExternalMediaRepository.ts`

**Методы:**

```typescript
findByFileId(projectId: string, fileId: string): Promise<ExternalMedia | null>
findByFileIds(projectId: string, fileIds: string[]): Promise<Map<string, ExternalMedia>>
create(projectId: string, data: CreateExternalMediaInput): Promise<ExternalMedia>
update(projectId: string, fileId: string, data: UpdateExternalMediaInput): Promise<ExternalMedia>
delete(projectId: string, fileId: string): Promise<void>

// Поиск по внешнему ID
findByExternalId(projectId: string, provider: FileProvider, externalId: string): Promise<ExternalMedia | null>
```

---

### 1.4 Repository (Facade)

**Файл:** `src/repositories/Repository.ts`

Обновить фасад для доступа ко всем репозиториям:

```typescript
class Repository {
  file: FileRepository;
  s3Object: S3ObjectRepository;
  externalMedia: ExternalMediaRepository;
  bucket: BucketRepository;
  uploadSession: UploadSessionRepository;
}
```

---

## Этап 2: Transaction Scripts

### 2.1 fileUpload

**Файл:** `src/scripts/file/fileUpload.ts`

**Входные данные:**
```typescript
interface FileUploadParams {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  durationMs?: number;
  altText?: string;
  idempotencyKey?: string;
  s3Data: {
    bucketId: string;
    objectKey: string;
    contentHash: string;
    etag: string;
    storageClass?: string;
  };
}
```

**Логика:**
1. Проверить idempotencyKey (если есть - вернуть существующий файл)
2. Сгенерировать публичный URL для файла
3. Создать запись в `files`
4. Создать запись в `s3Objects`
5. Вернуть File

---

### 2.2 fileUploadFromUrl

**Файл:** `src/scripts/file/fileUploadFromUrl.ts`

**Входные данные:**
```typescript
interface FileUploadFromUrlParams {
  sourceUrl: string;
  altText?: string;
  idempotencyKey?: string;
}
```

**Логика:**
1. Проверить idempotencyKey
2. Fetch файла по URL (HEAD для метаданных)
3. Скачать файл и загрузить в S3
4. Получить размеры (для изображений)
5. Создать записи в `files` + `s3Objects`
6. Вернуть File

---

### 2.3 fileCreateExternal

**Файл:** `src/scripts/file/fileCreateExternal.ts`

**Входные данные:**
```typescript
interface FileCreateExternalParams {
  provider: 'YOUTUBE' | 'VIMEO' | 'URL';
  url: string;
  altText?: string;
  idempotencyKey?: string;
}
```

**Логика:**
1. Проверить idempotencyKey
2. Распарсить URL (извлечь YouTube/Vimeo ID)
3. Получить метаданные от провайдера (oEmbed API)
4. Создать запись в `files` (provider = YOUTUBE/VIMEO/URL)
5. Создать запись в `externalMedia`
6. Вернуть File

---

### 2.4 fileUpdate

**Файл:** `src/scripts/file/fileUpdate.ts`

**Входные данные:**
```typescript
interface FileUpdateParams {
  fileId: string;
  altText?: string;
  originalName?: string;
  meta?: Record<string, unknown>;
}
```

**Логика:**
1. Найти файл по ID
2. Проверить что файл существует и не удалён
3. Обновить поля
4. Вернуть обновлённый File

---

### 2.5 fileDelete

**Файл:** `src/scripts/file/fileDelete.ts`

**Входные данные:**
```typescript
interface FileDeleteParams {
  fileId: string;
  permanent?: boolean; // hard delete
}
```

**Логика:**
1. Найти файл по ID
2. Проверить что файл существует
3. Если permanent:
   - Удалить из S3 (если S3 provider)
   - Удалить из `s3Objects` или `externalMedia`
   - Удалить из `files`
4. Иначе:
   - Установить `deletedAt = now()`
5. Вернуть успех

---

## Этап 3: GraphQL Resolvers

### 3.1 Query Resolvers

**Файл:** `src/api/graphql-admin/resolvers/queries/`

```typescript
// node.ts
MediaQuery.node = async (_, { id }) => {
  const [type, realId] = decodeGlobalId(id);
  if (type === 'File') {
    return repository.file.findById(projectId, realId);
  }
  return null;
};

// nodes.ts
MediaQuery.nodes = async (_, { ids }) => {
  // Группировать по типам, загрузить пакетно
};

// file.ts
MediaQuery.file = async (_, { id }) => {
  const realId = decodeGlobalId(id)[1];
  return repository.file.findById(projectId, realId);
};

// files.ts
MediaQuery.files = async (_, args) => {
  return repository.file.findAll(projectId, args);
};
```

---

### 3.2 Mutation Resolvers

**Файл:** `src/api/graphql-admin/resolvers/mutations/`

```typescript
// fileUpload.ts
MediaMutation.fileUpload = async (_, { input }) => {
  return scripts.fileUpload(input, services);
};

// fileUploadFromUrl.ts
MediaMutation.fileUploadFromUrl = async (_, { input }) => {
  return scripts.fileUploadFromUrl(input, services);
};

// fileCreateExternal.ts
MediaMutation.fileCreateExternal = async (_, { input }) => {
  return scripts.fileCreateExternal(input, services);
};

// fileUpdate.ts
MediaMutation.fileUpdate = async (_, { input }) => {
  return scripts.fileUpdate(input, services);
};

// fileDelete.ts
MediaMutation.fileDelete = async (_, { input }) => {
  return scripts.fileDelete(input, services);
};
```

---

### 3.3 Type Resolvers

**Файл:** `src/api/graphql-admin/resolvers/types/`

```typescript
// file.ts
File: {
  id: (file) => encodeGlobalId('File', file.id),

  s3Data: async (file) => {
    if (file.provider !== 'S3') return null;
    return repository.s3Object.findByFileId(projectId, file.id);
  },

  externalData: async (file) => {
    if (!['YOUTUBE', 'VIMEO', 'URL'].includes(file.provider)) return null;
    return repository.externalMedia.findByFileId(projectId, file.id);
  },

  dimensions: (file) => {
    if (!file.width || !file.height) return null;
    return { width: file.width, height: file.height };
  },

  // Federation
  __resolveReference: async (ref) => {
    return repository.file.findById(projectId, ref.id);
  },
}
```

---

## Этап 4: DataLoader (оптимизация N+1)

**Файл:** `src/api/graphql-admin/dataloaders/`

```typescript
// fileLoader.ts
const fileLoader = new DataLoader<string, File>(async (ids) => {
  const files = await repository.file.findByIds(projectId, ids);
  return ids.map(id => files.find(f => f.id === id) ?? null);
});

// s3ObjectLoader.ts
const s3ObjectLoader = new DataLoader<string, S3Object>(async (fileIds) => {
  const map = await repository.s3Object.findByFileIds(projectId, fileIds);
  return fileIds.map(id => map.get(id) ?? null);
});

// externalMediaLoader.ts
const externalMediaLoader = new DataLoader<string, ExternalMedia>(async (fileIds) => {
  const map = await repository.externalMedia.findByFileIds(projectId, fileIds);
  return fileIds.map(id => map.get(id) ?? null);
});
```

---

## Этап 5: Интеграции

### 5.1 S3 Client

**Файл:** `src/infrastructure/s3/`

```typescript
// client.ts
class S3Client {
  upload(bucket: string, key: string, body: Buffer): Promise<UploadResult>
  delete(bucket: string, key: string): Promise<void>
  getSignedUrl(bucket: string, key: string, expiresIn: number): Promise<string>
  headObject(bucket: string, key: string): Promise<ObjectMetadata>
}
```

### 5.2 External Media Providers

**Файл:** `src/infrastructure/providers/`

```typescript
// youtube.ts
class YouTubeProvider {
  parseUrl(url: string): { videoId: string } | null
  getMetadata(videoId: string): Promise<VideoMetadata>
  getThumbnailUrl(videoId: string): string
}

// vimeo.ts
class VimeoProvider {
  parseUrl(url: string): { videoId: string } | null
  getMetadata(videoId: string): Promise<VideoMetadata>
}
```

---

## Этап 6: Тестирование

### 6.1 Unit Tests

```
src/
├── repositories/__tests__/
│   ├── FileRepository.test.ts
│   ├── S3ObjectRepository.test.ts
│   └── ExternalMediaRepository.test.ts
├── scripts/file/__tests__/
│   ├── fileUpload.test.ts
│   ├── fileUploadFromUrl.test.ts
│   ├── fileCreateExternal.test.ts
│   ├── fileUpdate.test.ts
│   └── fileDelete.test.ts
```

### 6.2 Integration Tests

```
src/api/graphql-admin/__tests__/
├── queries/
│   ├── file.test.ts
│   └── files.test.ts
└── mutations/
    ├── fileUpload.test.ts
    ├── fileUploadFromUrl.test.ts
    ├── fileCreateExternal.test.ts
    ├── fileUpdate.test.ts
    └── fileDelete.test.ts
```

---

## Порядок реализации

| # | Задача | Оценка | Зависимости |
|---|--------|--------|-------------|
| 1 | FileRepository | 2-3ч | - |
| 2 | S3ObjectRepository | 1-2ч | #1 |
| 3 | ExternalMediaRepository | 1-2ч | #1 |
| 4 | fileUpload script | 2-3ч | #1, #2 |
| 5 | fileUpdate script | 1ч | #1 |
| 6 | fileDelete script | 1-2ч | #1, #2, #3 |
| 7 | Query resolvers | 2ч | #1 |
| 8 | Mutation resolvers | 2ч | #4, #5, #6 |
| 9 | Type resolvers (s3Data, externalData) | 1ч | #2, #3 |
| 10 | DataLoaders | 2ч | #1, #2, #3 |
| 11 | S3 Client | 3-4ч | - |
| 12 | fileUploadFromUrl script | 3-4ч | #4, #11 |
| 13 | External providers (YouTube, Vimeo) | 2-3ч | - |
| 14 | fileCreateExternal script | 2ч | #3, #13 |
| 15 | Unit tests | 4-6ч | #1-#14 |
| 16 | Integration tests | 4-6ч | #1-#14 |

**Общая оценка:** 30-40 часов

---

## Приоритеты

### MVP (минимум для работы)
1. FileRepository (базовые методы)
2. fileUpload, fileUpdate, fileDelete scripts
3. Query и Mutation resolvers
4. Type resolvers

### После MVP
5. DataLoaders
6. S3 Client интеграция
7. fileUploadFromUrl
8. External providers
9. fileCreateExternal
10. Тесты
