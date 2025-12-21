# План улучшения RBAC системы

## Текущее состояние

Текущая модель (`src/constants/rbac.ts:26-41`) использует **точное сравнение**:

```
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

Это означает что `product != product.*` — wildcards **не работают**.

---

## 1. Wildcards для ресурсов

### Вариант A: keyMatch для иерархии ресурсов

```
[matchers]
m = g(r.sub, p.sub) && keyMatch(r.obj, p.obj) && keyMatch(r.act, p.act)
```

| Паттерн | Запрос | Результат |
|---------|--------|-----------|
| `*` | `product` | ✓ |
| `product/*` | `product/123` | ✓ |
| `order.*` | `order.comment` | ✗ (нужен `/`) |

### Вариант B: keyMatch2 для REST-style ресурсов

```
[matchers]
m = g(r.sub, p.sub) && keyMatch2(r.obj, p.obj) && keyMatch2(r.act, p.act)
```

| Паттерн | Запрос | Результат |
|---------|--------|-----------|
| `/products/:id` | `/products/123` | ✓ |
| `/orders/*` | `/orders/456/items` | ✓ |

### Вариант C: regexMatch для произвольных паттернов

```
[matchers]
m = g(r.sub, p.sub) && regexMatch(r.obj, p.obj) && r.act == p.act
```

| Паттерн | Запрос | Результат |
|---------|--------|-----------|
| `product\..*` | `product.variant` | ✓ |
| `order\.(read\|write)` | `order.read` | ✓ |

---

## 2. Иерархия ролей (Subroles)

Сейчас плоские роли. Casbin поддерживает **наследование ролей**:

```csv
# Policy
p, manager, product, read
p, manager, product, write

# Role hierarchy
g, admin, manager    # admin наследует от manager
g, owner, admin      # owner наследует от admin
```

**Результат:**
- `manager` → `product:read`, `product:write`
- `admin` → всё что у manager + свои права
- `owner` → всё что у admin + свои права

**Изменение в модели не требуется** — `g = _, _` уже поддерживает иерархию до 10 уровней.

---

## 3. Шаги реализации

### Шаг 1: Обновить Casbin модель

**Файл:** `src/constants/rbac.ts`

```typescript
export const CASBIN_MODEL_TEXT = `
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act, eft

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub) && keyMatch(r.obj, p.obj) && keyMatch(r.act, p.act)
`.trim();
```

**Изменения:**
- `p = sub, obj, act` → `p = sub, obj, act, eft` (добавлен effect)
- Policy effect теперь поддерживает deny
- Matcher использует `keyMatch` для wildcards

### Шаг 2: Добавить иерархию ролей при провижининге

**Файл:** `src/repositories/authorization/AuthorizationRepository.ts`

```typescript
/**
 * Provision role hierarchy for a tenant
 * viewer < support < manager < admin < owner
 */
async provisionRoleHierarchy(tenantOrg: string): Promise<void> {
  const hierarchy = [
    ["support", "viewer"],
    ["manager", "support"],
    ["admin", "manager"],
    ["owner", "admin"],
  ];

  for (const [child, parent] of hierarchy) {
    await this.addGroupingPolicy(tenantOrg, child, parent);
  }
}

/**
 * Add grouping policy (role inheritance)
 */
async addGroupingPolicy(
  tenantOrg: string,
  childRole: string,
  parentRole: string
): Promise<boolean> {
  // Casdoor API to add g policy
  // g, child, parent means child inherits from parent
  const policy = {
    ptype: "g",
    v0: `${tenantOrg}/${childRole}`,
    v1: `${tenantOrg}/${parentRole}`,
  };

  return await this.client.sdk.addPolicy(policy);
}
```

**Файл:** `src/scripts/tenant/ProvisionTenantScript.ts`

Добавить вызов после создания ролей:

```typescript
// After creating roles
await this.repository.authorization.provisionRoleHierarchy(tenantOrg);
```

### Шаг 3: Упростить permissions

С иерархией достаточно определить **инкрементальные** права:

```typescript
export const ROLE_PERMISSIONS: Record<PredefinedRoleName, RolePermissionDef> = {
  viewer: {
    allow: [{ resource: "*", actions: ["read"] }],
  },
  support: {
    // Наследует read от viewer, добавляет write на orders
    allow: [
      { resource: "order/*", actions: ["write"] },
      { resource: "order/comment", actions: ["write"] },
    ],
  },
  manager: {
    // Наследует от support, добавляет управление продуктами
    allow: [
      { resource: "product/*", actions: ["write", "publish"] },
      { resource: "category/*", actions: ["write"] },
      { resource: "media/*", actions: ["upload"] },
      { resource: "order/*", actions: ["fulfill"] },
    ],
  },
  admin: {
    // Наследует от manager, получает полный доступ с ограничениями
    allow: [{ resource: "*", actions: ["*"] }],
    deny: [
      { resource: "project", actions: ["delete"] },
      { resource: "project/billing", actions: ["*"] },
    ],
  },
  owner: {
    // Полный доступ без ограничений
    allow: [{ resource: "*", actions: ["*"] }],
  },
};
```

### Шаг 4: Миграция существующих тенантов

```typescript
// src/scripts/migration/MigrateRbacModelScript.ts

export class MigrateRbacModelScript extends Script<void, void> {
  async execute(): Promise<void> {
    const tenants = await this.getAllTenants();

    for (const tenant of tenants) {
      // 1. Update model
      await this.repository.authorization.updateModel(
        tenant.org,
        CASBIN_MODEL_TEXT
      );

      // 2. Add role hierarchy
      await this.repository.authorization.provisionRoleHierarchy(tenant.org);

      // 3. Invalidate cache
      await this.cache.authorization.invalidateTenant(tenant.org);
    }
  }
}
```

---

## 4. Функции pattern matching в Casbin

| Функция | Паттерн | Match | Использование |
|---------|---------|-------|---------------|
| `keyMatch` | `/foo*` | `/foo`, `/foobar` | URL paths |
| `keyMatch2` | `/foo/:id` | `/foo/123` | REST params |
| `keyMatch3` | `/foo/{id}` | `/foo/123` | Alternative syntax |
| `keyMatch4` | `/foo/{id}/bar/{name}` | Multiple params | |
| `regexMatch` | `^product\..*$` | Regex | Complex patterns |
| `globMatch` | `*.txt` | Glob | File patterns |

---

## 5. Тестирование

### Unit тесты для wildcards

```typescript
describe("RBAC Wildcards", () => {
  it("should match * wildcard", async () => {
    // owner has resource: "*", action: "*"
    expect(await enforce(owner, "product", "read")).toBe(true);
    expect(await enforce(owner, "order", "delete")).toBe(true);
  });

  it("should match resource hierarchy", async () => {
    // support has resource: "order/*"
    expect(await enforce(support, "order/123", "write")).toBe(true);
    expect(await enforce(support, "order/123/items", "write")).toBe(true);
    expect(await enforce(support, "product", "write")).toBe(false);
  });
});
```

### Unit тесты для иерархии

```typescript
describe("Role Hierarchy", () => {
  it("admin should inherit manager permissions", async () => {
    // manager can write products
    expect(await enforce(admin, "product", "write")).toBe(true);
  });

  it("owner should inherit admin permissions", async () => {
    expect(await enforce(owner, "product", "write")).toBe(true);
  });

  it("admin deny should override inherited allow", async () => {
    // admin has deny on project/delete
    expect(await enforce(admin, "project", "delete")).toBe(false);
    // but owner should be able to
    expect(await enforce(owner, "project", "delete")).toBe(true);
  });
});
```

---

## 6. Риски и mitigation

| Риск | Вероятность | Влияние | Mitigation |
|------|-------------|---------|------------|
| Breaking change для существующих permissions | Высокая | Высокое | Миграция с тестированием на staging |
| Performance degradation от pattern matching | Низкая | Среднее | Кэширование, бенчмарки |
| Неправильная иерархия ролей | Средняя | Высокое | Подробные тесты |
| Casdoor API не поддерживает grouping policies | Низкая | Высокое | Проверить API заранее |

---

## 7. Источники

- [RBAC with Pattern | Casbin](https://casbin.org/docs/rbac-with-pattern/)
- [RBAC | Casbin](https://casbin.org/docs/rbac/)
- [Permission Configuration | Casdoor](https://casdoor.org/docs/permission/permission-configuration/)
