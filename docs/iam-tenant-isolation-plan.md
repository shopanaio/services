# IAM Tenant Isolation Plan

## Цель

Переход от **логической изоляции** (все сущности в одной Casdoor organization с `domains` фильтрацией) к **физической изоляции** (каждый tenant = отдельная Casdoor Organization со своими Model, Enforcer, Roles, Permissions).

---

## Текущее состояние (проблема)

```
Casdoor Organization: shopana (одна на всех)
├── Model: model-rbac-domains          owner: shopana
├── Enforcer: enforcer-shopana         owner: shopana
├── Role: project-a-owner              owner: shopana, domains: [project-a]
├── Role: project-a-admin              owner: shopana, domains: [project-a]
├── Role: project-b-owner              owner: shopana, domains: [project-b]
├── Permission: perm-project-a-...     owner: shopana
└── ...
```

**Проблемы:**
- Все сущности принадлежат одной org `shopana`
- Изоляция только через `domains` и naming conventions (`{projectId}-{roleName}`)
- Риск утечки данных между тенантами при ошибке в коде
- `projectId` вшит в имена ролей/permissions

---

## Целевое состояние

```
Casdoor (admin org: shopana)
│
├── Tenant Organization: org-project-a
│   ├── Model: model-rbac              owner: org-project-a
│   ├── Enforcer: enforcer-main        owner: org-project-a
│   ├── Role: owner                    owner: org-project-a  ← простое имя
│   ├── Role: admin                    owner: org-project-a
│   ├── Role: manager                  owner: org-project-a
│   ├── Role: support                  owner: org-project-a
│   ├── Role: viewer                   owner: org-project-a
│   └── Permissions...                 owner: org-project-a
│
├── Tenant Organization: org-project-b
│   ├── Model: model-rbac              owner: org-project-b
│   ├── Enforcer: enforcer-main        owner: org-project-b
│   ├── Role: owner                    owner: org-project-b  ← тот же "owner", другая org
│   └── ...
│
└── ...
```

**Преимущества:**
- Физическая изоляция на уровне Casdoor
- Простые имена ролей (`owner`, не `project-a-owner`)
- Casdoor сам обеспечивает изоляцию по `owner`
- `domains` можно не использовать или использовать для sub-tenant логики

---

## Ключевые изменения

### 1. Именование

| Сущность | Было | Станет |
|----------|------|--------|
| Tenant Org | `org-{slug}` (создавалась) | `org-{slug}` (без изменений) |
| Model | `model-rbac-domains` (global) | `model-rbac` (per tenant) |
| Enforcer | `enforcer-shopana` (global) | `enforcer-main` (per tenant) |
| Role | `{projectId}-owner` | `owner` |
| Permission | `perm-{projectId}-owner-*` | `perm-owner-*` |

### 2. Владение (owner)

| Сущность | Было | Станет |
|----------|------|--------|
| Model | `shopana` | `org-{projectId}` |
| Enforcer | `shopana` | `org-{projectId}` |
| Roles | `shopana` | `org-{projectId}` |
| Permissions | `shopana` | `org-{projectId}` |

### 3. Domains в RBAC

| Использование | Было | Станет |
|---------------|------|--------|
| Role.domains | `[projectId]` | `[]` (не нужен) |
| Permission.domains | `[projectId]` | `[]` (не нужен) |
| Casbin request | `[userId, projectId, resource, action]` | `[userId, resource, action]` |

**Примечание**: `domains` можно оставить пустым или использовать в будущем для sub-tenant логики (например, несколько stores в одном project).

---

## Изменения в файлах

### 1. `constants/rbac.ts`

**Изменения:**
- Убрать `{projectId}-` из формирования имён ролей
- Добавить функции для генерации имён

```typescript
// Было:
export const CASBIN_MODEL_NAME = "model-rbac-domains";
export const CASBIN_ENFORCER_NAME = "enforcer-shopana";

// Станет:
export const CASBIN_MODEL_NAME = "model-rbac";
export const CASBIN_ENFORCER_NAME = "enforcer-main";

// Новые функции
export const getTenantOrg = (projectId: string) => `org-${projectId}`;
export const getModelId = (tenantOrg: string) => `${tenantOrg}/${CASBIN_MODEL_NAME}`;
export const getEnforcerId = (tenantOrg: string) => `${tenantOrg}/${CASBIN_ENFORCER_NAME}`;
```

**Casbin Model** (упрощённый, без domains):
```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

---

### 2. `AuthorizationRepository.ts`

**Изменения:**
- Все методы принимают `tenantOrg` как первый параметр
- `owner` сущностей = `tenantOrg`
- Убрать `domains` из Role/Permission
- Убрать `projectId` из Casbin request

```typescript
// Было:
constructor(
  private readonly client: CasdoorNodeClient,
  private readonly organization: string  // "shopana"
) {}

async enforce(userId: string, projectId: string, resource: string, action: string)
async createRole(projectId: string, roleName: string, ...)

// Станет:
constructor(
  private readonly client: CasdoorNodeClient,
  private readonly adminOrganization: string  // "shopana" - только для admin ops
) {}

async ensureModelExists(tenantOrg: string): Promise<Result>
async ensureEnforcerExists(tenantOrg: string): Promise<Result>
async enforce(tenantOrg: string, userId: string, resource: string, action: string)
async createRole(tenantOrg: string, roleName: string, ...)
async getRoles(tenantOrg: string): Promise<Role[]>
// ... все методы с tenantOrg
```

**Ключевые изменения в методах:**

```typescript
// ensureModelExists
const model = {
  owner: tenantOrg,           // ← tenantOrg вместо this.organization
  name: CASBIN_MODEL_NAME,    // "model-rbac" (простое имя)
  modelText: CASBIN_MODEL_TEXT,
};

// ensureEnforcerExists
const enforcer = {
  owner: tenantOrg,
  name: CASBIN_ENFORCER_NAME,
  model: `${tenantOrg}/${CASBIN_MODEL_NAME}`,
};

// createRole
const role: Role = {
  owner: tenantOrg,           // ← tenantOrg
  name: roleName,             // "owner", не "project-a-owner"
  domains: [],                // ← пусто, изоляция через owner
};

// createPermission
const permission: Permission = {
  owner: tenantOrg,
  name: `perm-${roleName}-${resource}-${effect}`,  // без projectId
  roles: [`${tenantOrg}/${roleName}`],
  domains: [],
};

// enforce
const permissionId = `${tenantOrg}/perm-${roleName}`;
const modelId = `${tenantOrg}/${CASBIN_MODEL_NAME}`;
const enforcerId = `${tenantOrg}/${CASBIN_ENFORCER_NAME}`;
const casbinRequest = [userId, resource, action];  // без projectId
```

---

### 3. `ProvisionTenantScript.ts`

**Изменения:**
- После создания Organization, создать Model и Enforcer для неё
- Роли создавать с простыми именами

```typescript
async execute(params: ProvisionTenantParams) {
  const { displayName, slug, ownerId } = params;
  const tenantOrg = `org-${slug}`;

  // Step 1: Create Casdoor Organization (уже есть)
  await this.createOrganization(tenantOrg, displayName);

  // Step 2: Create Model for this tenant (NEW)
  const modelResult = await this.repository.authorization.ensureModelExists(tenantOrg);
  if (!modelResult.success) {
    return { error: "Failed to create model" };
  }

  // Step 3: Create Enforcer for this tenant (NEW)
  const enforcerResult = await this.repository.authorization.ensureEnforcerExists(tenantOrg);
  if (!enforcerResult.success) {
    return { error: "Failed to create enforcer" };
  }

  // Step 4: Create predefined roles (упрощённые имена)
  for (const roleName of Object.values(PREDEFINED_ROLES)) {
    await this.repository.authorization.createRole(
      tenantOrg,
      roleName,  // "owner", не "project-a-owner"
      ROLE_DISPLAY_NAMES[roleName],
      ROLE_DESCRIPTIONS[roleName]
    );

    // Create permissions for role
    for (const perm of ROLE_PERMISSIONS[roleName].allow) {
      await this.repository.authorization.createPermission(
        tenantOrg,
        roleName,
        perm.resource,
        perm.actions,
        "Allow"
      );
    }
  }

  // Step 5: Attach owner role to creator
  await this.repository.authorization.attachUserRole(
    tenantOrg,
    ownerId,
    PREDEFINED_ROLES.OWNER
  );

  return {
    tenantId: tenantOrg,
    roles: Object.values(PREDEFINED_ROLES),  // ["owner", "admin", ...]
  };
}
```

---

### 4. Скрипты авторизации

**Все скрипты вычисляют `tenantOrg` из `projectId`:**

```typescript
// AuthorizeScript.ts
async execute(params: AuthorizeParams) {
  const { userId, projectId, resource, action } = params;
  const tenantOrg = getTenantOrg(projectId);  // "org-{projectId}"

  // Check cache
  const cached = await this.authCache.getAuthResult(tenantOrg, userId, resource, action);
  if (cached.hit) return { allowed: cached.allowed };

  // Call Casdoor
  const allowed = await this.repository.authorization.enforce(
    tenantOrg,
    userId,
    resource,
    action
  );

  // Cache result
  await this.authCache.setAuthResult(tenantOrg, userId, resource, action, allowed);

  return { allowed };
}
```

**Аналогично для:**
- `BatchAuthorizeScript.ts`
- `GetUserRoleScript.ts`
- `AttachUserRoleScript.ts`
- `DetachUserRoleScript.ts`
- `CreateRoleScript.ts`
- `UpdateRoleScript.ts`
- `DeleteRoleScript.ts`
- `ListRolesScript.ts`

---

### 5. DTO (опционально)

**Вариант A: Вычислять `tenantOrg` внутри скриптов (рекомендуется)**
```typescript
// Params остаются без изменений
interface AuthorizeParams {
  userId: string;
  projectId: string;  // используется для вычисления tenantOrg
  resource: string;
  action: string;
}
```

**Вариант B: Добавить `tenantOrg` в params**
```typescript
interface AuthorizeParams {
  tenantOrg: string;  // явно передаётся
  userId: string;
  projectId: string;
  resource: string;
  action: string;
}
```

**Рекомендация**: Вариант A — меньше изменений, tenantOrg вычисляется автоматически.

---

### 6. `AuthorizationCache.ts`

**Изменения:**
- Ключи кеша используют `tenantOrg` вместо `projectId`

```typescript
// Было:
private authCacheKey(projectId: string, userId: string, resource: string, action: string) {
  return `iam:auth:${projectId}:${userId}:${resource}:${action}`;
}

// Станет:
private authCacheKey(tenantOrg: string, userId: string, resource: string, action: string) {
  return `iam:auth:${tenantOrg}:${userId}:${resource}:${action}`;
}
```

**Аналогично для:**
- `userRoleCacheKey`
- `roleVersionKey`
- `userVersionKey`

---

## Порядок реализации

### Шаг 1: Обновить constants/rbac.ts
- [ ] Изменить `CASBIN_MODEL_NAME` на `model-rbac`
- [ ] Изменить `CASBIN_ENFORCER_NAME` на `enforcer-main`
- [ ] Добавить упрощённый `CASBIN_MODEL_TEXT` (без domains)
- [ ] Добавить функции `getTenantOrg`, `getModelId`, `getEnforcerId`

### Шаг 2: Обновить AuthorizationRepository.ts
- [ ] Переименовать `organization` → `adminOrganization`
- [ ] Добавить `tenantOrg` параметр во все методы
- [ ] Обновить `ensureModelExists(tenantOrg)`
- [ ] Обновить `ensureEnforcerExists(tenantOrg)`
- [ ] Обновить `enforce(tenantOrg, ...)` — убрать projectId из request
- [ ] Обновить `createRole(tenantOrg, ...)` — owner = tenantOrg
- [ ] Обновить `createPermission(tenantOrg, ...)` — owner = tenantOrg
- [ ] Обновить все остальные методы
- [ ] Убрать `isSystemRole` с projectId prefix

### Шаг 3: Обновить ProvisionTenantScript.ts
- [ ] Вычислять `tenantOrg = getTenantOrg(slug)`
- [ ] Вызывать `ensureModelExists(tenantOrg)` после создания org
- [ ] Вызывать `ensureEnforcerExists(tenantOrg)`
- [ ] Создавать роли с простыми именами
- [ ] Обновить rollback логику

### Шаг 4: Обновить скрипты авторизации
- [ ] AuthorizeScript — вычислять tenantOrg, передавать в repository
- [ ] BatchAuthorizeScript
- [ ] GetUserRoleScript
- [ ] AttachUserRoleScript
- [ ] DetachUserRoleScript
- [ ] CreateRoleScript
- [ ] UpdateRoleScript
- [ ] DeleteRoleScript
- [ ] ListRolesScript

### Шаг 5: Обновить кеширование
- [ ] AuthorizationCache — использовать tenantOrg в ключах
- [ ] Обновить методы invalidation

### Шаг 6: Тестирование
- [ ] Создать новый tenant
- [ ] Проверить что Model/Enforcer создаются в tenant org
- [ ] Проверить что роли имеют простые имена
- [ ] Проверить enforce работает
- [ ] Проверить изоляцию между tenants

---

## Миграция существующих данных

Если есть существующие данные:

**Вариант 1: Пересоздание (рекомендуется для dev/staging)**
- Удалить старые роли/permissions
- При следующем provisionTenant создадутся новые

**Вариант 2: Миграционный скрипт**
```typescript
async function migrateToTenantIsolation() {
  // Для каждого существующего project
  for (const project of projects) {
    const tenantOrg = getTenantOrg(project.id);

    // 1. Создать Model/Enforcer в tenant org
    await authRepo.ensureModelExists(tenantOrg);
    await authRepo.ensureEnforcerExists(tenantOrg);

    // 2. Скопировать роли (переименовать)
    const oldRoles = await authRepo.getRoles(project.id);
    for (const role of oldRoles) {
      const newRoleName = role.name.replace(`${project.id}-`, '');
      await authRepo.createRole(tenantOrg, newRoleName, ...);
      // Скопировать permissions
      // Скопировать user assignments
    }

    // 3. Удалить старые роли
    for (const role of oldRoles) {
      await authRepo.deleteRole(role.name);
    }
  }
}
```

---

## Риски и митигация

| Риск | Митигация |
|------|-----------|
| Несовместимость с существующими данными | Миграционный скрипт или пересоздание |
| Ошибки в вычислении tenantOrg | Unit тесты, e2e тесты |
| Увеличение количества объектов в Casdoor | Model/Enforcer per tenant — приемлемо |
| Производительность (больше объектов) | Кеширование, индексы в Casdoor |

---

## Результат

После реализации:

1. **Полная изоляция** — каждый tenant имеет свои Model, Enforcer, Roles, Permissions
2. **Простые имена** — роли называются `owner`, `admin`, без `projectId`
3. **Безопасность** — Casdoor сам обеспечивает изоляцию по `owner`
4. **Масштабируемость** — можно добавлять tenants без конфликтов имён
