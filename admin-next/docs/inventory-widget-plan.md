# План: ProductInventoryWidget API

## Архитектура

**Snapshot + change log** — текущее состояние хранится в `warehouse_stock`, а история изменений пишется в тонкий `stock_changes` (только дельты + баланс после изменения). Чтение текущих значений — без агрегаций, история — без копирования полного снапшота.

---

## База данных (Inventory Service)

### 1. Основная таблица `warehouse_stock` (текущее состояние)

```sql
-- Существующая таблица, добавляем поля для виджета и истории
ALTER TABLE inventory.warehouse_stock ADD COLUMN
  reserved_qty INTEGER NOT NULL DEFAULT 0,
  unavailable_qty INTEGER NOT NULL DEFAULT 0;

ALTER TABLE inventory.warehouse_stock
  ADD CONSTRAINT warehouse_stock_onhand_check CHECK (quantity_on_hand >= 0),
  ADD CONSTRAINT warehouse_stock_reserved_check CHECK (reserved_qty >= 0),
  ADD CONSTRAINT warehouse_stock_unavailable_check CHECK (unavailable_qty >= 0),
  ADD CONSTRAINT warehouse_stock_unavailable_le_onhand CHECK (unavailable_qty <= quantity_on_hand);

-- Убедиться, что есть UNIQUE (project_id, warehouse_id, variant_id).
--
-- Backorder семантика:
--   quantity_on_hand >= 0 всегда (физический остаток не может быть отрицательным)
--   reserved_qty может превышать on_hand → available = on_hand - reserved - unavailable < 0
--   Backorder = max(0, -available) — реализуется через reserved > on_hand, НЕ через отрицательный on_hand
```

### 2. Журнал изменений `stock_changes` (тонкий delta-log)

```sql
CREATE TABLE inventory.stock_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq BIGINT GENERATED ALWAYS AS IDENTITY,  -- монотонный порядок, решает created_at-гонки
  project_id UUID NOT NULL,
  variant_id UUID NOT NULL REFERENCES inventory.variant(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL,

  -- Дельты (знак = направление изменения)
  delta_on_hand INTEGER NOT NULL DEFAULT 0,
  delta_reserved INTEGER NOT NULL DEFAULT 0,
  delta_unavailable INTEGER NOT NULL DEFAULT 0,
  -- SEED разрешает delta=0 для начальной миграции
  CHECK (
    movement_type = 'SEED'
    OR delta_on_hand <> 0
    OR delta_reserved <> 0
    OR delta_unavailable <> 0
  ),

  -- Баланс после изменения (заполняется одновременно с INSERT)
  on_hand_after INTEGER NOT NULL CHECK (on_hand_after >= 0),
  reserved_after INTEGER NOT NULL CHECK (reserved_after >= 0),
  unavailable_after INTEGER NOT NULL CHECK (unavailable_after >= 0),
  CONSTRAINT stock_changes_unavailable_le_onhand CHECK (unavailable_after <= on_hand_after),

  -- Тип операции (что произошло)
  movement_type VARCHAR(20) NOT NULL,
  -- 'SEED'       начальный остаток (миграция)
  -- 'RECEIVE'    приход товара
  -- 'SELL'       продажа (списание)
  -- 'RETURN'     возврат от покупателя
  -- 'ADJUST'     корректировка
  -- 'RESERVE'    резервирование под заказ
  -- 'RELEASE'    снятие резерва
  -- 'TRANSFER'   перемещение между складами

  -- Направление для TRANSFER (IN = приход на склад, OUT = уход со склада)
  -- NOT NULL для TRANSFER, NULL для остальных
  transfer_direction VARCHAR(3),
  CONSTRAINT stock_changes_transfer_dir CHECK (
    CASE
      WHEN movement_type = 'TRANSFER' THEN transfer_direction IN ('IN', 'OUT')
      ELSE transfer_direction IS NULL
    END
  ),

  -- Причина (почему произошло)
  reason VARCHAR(30),
  -- 'DAMAGE'           брак/потери
  -- 'INVENTORY_COUNT'  инвентаризация
  -- 'MANUAL'           ручная корректировка
  -- 'CUSTOMER_RETURN'  возврат покупателя

  -- Источник события (для идемпотентности/трассировки)
  source_system VARCHAR(30) NOT NULL,
  source_event_id VARCHAR(128) NOT NULL,
  -- correlation_id обязателен для TRANSFER (связка IN/OUT)
  correlation_id UUID,
  CHECK (movement_type <> 'TRANSFER' OR correlation_id IS NOT NULL),

  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  apply_status VARCHAR(10) NOT NULL DEFAULT 'APPLIED', -- APPLIED | REJECTED

  -- FK только на warehouse_id (project_id денормализован для запросов)
  CONSTRAINT stock_changes_warehouse_fk
    FOREIGN KEY (warehouse_id) REFERENCES inventory.warehouses(id) ON DELETE CASCADE
);

-- IDENTITY не создаёт UNIQUE constraint, добавляем явно
ALTER TABLE inventory.stock_changes ADD CONSTRAINT stock_changes_seq_unique UNIQUE (seq);

-- Индексы для аналитики (используем seq для корректного порядка)
CREATE INDEX idx_stock_changes_variant_seq ON inventory.stock_changes(variant_id, seq DESC);
CREATE INDEX idx_stock_changes_variant_warehouse_seq ON inventory.stock_changes(variant_id, warehouse_id, seq DESC);
CREATE INDEX idx_stock_changes_project_seq ON inventory.stock_changes(project_id, seq DESC);
CREATE INDEX idx_stock_changes_type_seq ON inventory.stock_changes(movement_type, seq DESC);
CREATE INDEX idx_stock_changes_reason_seq ON inventory.stock_changes(reason, seq DESC);

-- Идемпотентность
CREATE UNIQUE INDEX idx_stock_changes_idempotency
  ON inventory.stock_changes(project_id, source_system, source_event_id, warehouse_id, variant_id);
-- Индекс для быстрого lookup без variant_id/warehouse_id (проверка "был ли event вообще")
CREATE INDEX idx_stock_changes_idempo_lookup
  ON inventory.stock_changes(project_id, source_system, source_event_id);

-- Индекс для availableChange7d и других time-based запросов
CREATE INDEX idx_stock_changes_variant_created
  ON inventory.stock_changes(variant_id, created_at DESC);
```

```sql
-- Индекс для быстрого получения вариантов продукта (skuStatus и др.)
CREATE INDEX idx_variant_product_active
  ON inventory.variant(product_id) WHERE deleted_at IS NULL;
```

### Атомарный UPSERT с идемпотентностью (критично!)

**Проблема**: при параллельных запросах SELECT-проверка идемпотентности не блокирует — два потока могут оба увидеть "нет записи" и оба применить дельты. Также использование `EXCLUDED.*` в `ON CONFLICT DO UPDATE` приводит к lost-update при конкурентных операциях.

**Решение**:
- Идемпотентность через `INSERT ... ON CONFLICT DO NOTHING RETURNING`
- Инкремент от текущей строки в `DO UPDATE` (не от `EXCLUDED`)
- Валидность проверяется на реальной строке в `WHERE` (race-safe)

```sql
WITH
-- 1. Идемпотентность: INSERT с UNIQUE constraint, только один поток получит id
ins AS (
  INSERT INTO inventory.stock_changes (
    project_id, warehouse_id, variant_id,
    delta_on_hand, delta_reserved, delta_unavailable,
    movement_type, reason, transfer_direction,
    source_system, source_event_id, correlation_id, note, created_by,
    on_hand_after, reserved_after, unavailable_after  -- placeholder
  )
  SELECT
    $project_id, $warehouse_id, $variant_id,
    $delta_on_hand, $delta_reserved, $delta_unavailable,
    $movement_type, $reason, $transfer_direction,
    $source_system, $source_event_id, $correlation_id, $note, $created_by,
    0, 0, 0  -- placeholder (0>=0, 0>=0, 0>=0, 0<=0 — проходит CHECK)
  ON CONFLICT (project_id, source_system, source_event_id, warehouse_id, variant_id)
  DO NOTHING
  RETURNING id
),

-- 2. UPSERT warehouse_stock: только если ins вставился И результат валиден
up AS (
  INSERT INTO inventory.warehouse_stock (
    project_id, warehouse_id, variant_id,
    quantity_on_hand, reserved_qty, unavailable_qty
  )
  -- INSERT-ветка (строки нет): вставляем дельты как итог, но только если валидно
  SELECT
    $project_id, $warehouse_id, $variant_id,
    $delta_on_hand, $delta_reserved, $delta_unavailable
  FROM ins
  WHERE
    $delta_on_hand >= 0
    AND $delta_reserved >= 0
    AND $delta_unavailable >= 0
    AND $delta_unavailable <= $delta_on_hand

  ON CONFLICT (project_id, warehouse_id, variant_id) DO UPDATE SET
    -- UPDATE-ветка (строка есть): инкремент от текущего значения (нет lost-update)
    quantity_on_hand = inventory.warehouse_stock.quantity_on_hand + $delta_on_hand,
    reserved_qty     = inventory.warehouse_stock.reserved_qty     + $delta_reserved,
    unavailable_qty  = inventory.warehouse_stock.unavailable_qty  + $delta_unavailable,
    updated_at = NOW()
  -- Валидность проверяется на реальной строке (race-safe)
  WHERE
    EXISTS (SELECT 1 FROM ins)
    AND (inventory.warehouse_stock.quantity_on_hand + $delta_on_hand) >= 0
    AND (inventory.warehouse_stock.reserved_qty     + $delta_reserved) >= 0
    AND (inventory.warehouse_stock.unavailable_qty  + $delta_unavailable) >= 0
    AND (inventory.warehouse_stock.unavailable_qty  + $delta_unavailable)
        <= (inventory.warehouse_stock.quantity_on_hand + $delta_on_hand)

  RETURNING quantity_on_hand, reserved_qty, unavailable_qty
),

-- 3. Обновляем after-поля в stock_changes
fix AS (
  UPDATE inventory.stock_changes sc
  SET
    on_hand_after     = up.quantity_on_hand,
    reserved_after    = up.reserved_qty,
    unavailable_after = up.unavailable_qty
  FROM ins, up
  WHERE sc.id = ins.id
  RETURNING sc.*
),

-- 4. Если up не прошёл, фиксируем REJECTED, чтобы событие было идемпотентным
reject AS (
  UPDATE inventory.stock_changes sc
  SET
    on_hand_after     = COALESCE(ws.quantity_on_hand, 0),
    reserved_after    = COALESCE(ws.reserved_qty, 0),
    unavailable_after = COALESCE(ws.unavailable_qty, 0),
    apply_status      = 'REJECTED'
  FROM ins
  LEFT JOIN inventory.warehouse_stock ws
    ON ws.project_id = sc.project_id
   AND ws.warehouse_id = sc.warehouse_id
   AND ws.variant_id = sc.variant_id
  WHERE sc.id = ins.id
    AND NOT EXISTS (SELECT 1 FROM fix)
  RETURNING sc.*
),
result AS (
  SELECT 'APPLIED' as status, id FROM fix
  UNION ALL
  SELECT 'REJECTED' as status, id FROM reject
)

-- 5. Возвращаем статус + результат
SELECT
  COALESCE(r.status, 'DUPLICATE') as status,
  sc.*
FROM (SELECT 1) x
LEFT JOIN result r ON true
LEFT JOIN inventory.stock_changes sc ON sc.id = r.id;
```

**Статусы**:
- `APPLIED` — операция выполнена, `sc.*` содержит запись
- `DUPLICATE` — идемпотентный повтор (событие уже обработано)
- `REJECTED` — результат невалиден (недостаточно стока, нарушение CHECK), запись сохранена с `apply_status = 'REJECTED'`

**Гарантии**:
- `INSERT ... ON CONFLICT DO NOTHING` — единственный race-free способ идемпотентности
- Инкремент от `warehouse_stock.*` а не от `EXCLUDED.*` — нет lost-update
- Валидность на `warehouse_stock.* + delta` в WHERE — race-safe проверка
- `reject` фиксирует REJECTED с текущими балансами — событие остаётся идемпотентным
- INSERT-ветка проверяет валидность дельт для новой строки

`movement_type` и `reason` можно оформить как ENUM, чтобы избежать мусорных значений.
Для идемпотентности `source_system` и `source_event_id` обязательны; при отсутствии
естественного идентификатора генерировать ключ на стороне источника.

### 3. Резервирования `reservations`

```sql
CREATE TYPE inventory.reservation_status AS ENUM ('ACTIVE', 'RELEASED', 'FULFILLED');

CREATE TABLE inventory.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  variant_id UUID NOT NULL REFERENCES inventory.variant(id),
  warehouse_id UUID NOT NULL,

  -- Внешняя система заказов
  order_system VARCHAR(50) NOT NULL,  -- 'SHOPANA', 'SHOPIFY', 'WOOCOMMERCE', etc.
  order_id VARCHAR(255) NOT NULL,     -- ID заказа во внешней системе

  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status inventory.reservation_status NOT NULL DEFAULT 'ACTIVE',

  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,

  -- project_id в UNIQUE для изоляции между проектами
  UNIQUE(project_id, order_system, order_id, variant_id, warehouse_id),

  -- FK только на warehouse_id (project_id денормализован)
  CONSTRAINT reservations_warehouse_fk
    FOREIGN KEY (warehouse_id) REFERENCES inventory.warehouses(id) ON DELETE CASCADE
);

CREATE INDEX idx_reservations_variant ON inventory.reservations(variant_id);
CREATE INDEX idx_reservations_order ON inventory.reservations(order_system, order_id);
```

`reserved_qty` в `warehouse_stock` — агрегат по активным резервам; нужна строгая транзакция и периодическая сверка
с `reservations` (SUM quantity WHERE status = 'ACTIVE').

### 4. Настройки алертов `product_inventory_settings`

```sql
CREATE TABLE inventory.product_inventory_settings (
  product_id UUID PRIMARY KEY REFERENCES inventory.product(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  alert_threshold_method VARCHAR(20) NOT NULL DEFAULT 'SAFETY_STOCK',
  alert_minimum_stock INTEGER NOT NULL DEFAULT 10,
  backorder_enabled BOOLEAN NOT NULL DEFAULT false,
  backorder_max_days INTEGER,
  backorder_max_qty INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Планируемые поступления `inbound_supply`

```sql
CREATE TABLE inventory.inbound_supply (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  variant_id UUID NOT NULL REFERENCES inventory.variant(id),
  warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id),

  source_type VARCHAR(30) NOT NULL, -- PURCHASE_ORDER, TRANSFER, RETURN
  source_id UUID NOT NULL,

  expected_at TIMESTAMPTZ NOT NULL,
  qty_expected INTEGER NOT NULL CHECK (qty_expected > 0),
  qty_received INTEGER NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED', -- PLANNED, IN_TRANSIT, RECEIVED, CANCELED

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(source_type, source_id, variant_id, warehouse_id)
);

CREATE INDEX idx_inbound_supply_variant_date
  ON inventory.inbound_supply(variant_id, warehouse_id, expected_at);
```

---

## Как считать данные для виджета

### quantities.onHand
```sql
SELECT COALESCE(SUM(ws.quantity_on_hand), 0)
FROM inventory.warehouse_stock ws
JOIN inventory.variant v ON v.id = ws.variant_id
WHERE v.product_id = $1
  AND v.deleted_at IS NULL;
```

### quantities.reserved
```sql
SELECT COALESCE(SUM(ws.reserved_qty), 0)
FROM inventory.warehouse_stock ws
JOIN inventory.variant v ON v.id = ws.variant_id
WHERE v.product_id = $1
  AND v.deleted_at IS NULL;
```

### quantities.availableForSale
```sql
-- availableForSale = onHand - reserved - unavailable
SELECT
  COALESCE(SUM(ws.quantity_on_hand - ws.reserved_qty - ws.unavailable_qty), 0) as available_for_sale
FROM inventory.warehouse_stock ws
JOIN inventory.variant v ON v.id = ws.variant_id
WHERE v.product_id = $1 AND v.deleted_at IS NULL;
```

### backorder.quantity
```sql
-- backorder = max(0, -SUM(available_for_sale))
SELECT GREATEST(COALESCE(-SUM(ws.quantity_on_hand - ws.reserved_qty - ws.unavailable_qty), 0), 0) as backorder_qty
FROM inventory.warehouse_stock ws
JOIN inventory.variant v ON v.id = ws.variant_id
WHERE v.product_id = $1 AND v.deleted_at IS NULL;
```

### backorder.etaAvgDays
```sql
-- Средневзвешенное ETA по планируемым поставкам
SELECT
  SUM(EXTRACT(EPOCH FROM (s.expected_at - NOW())) * (s.qty_expected - s.qty_received))
  / NULLIF(SUM(s.qty_expected - s.qty_received), 0) / 86400 AS eta_avg_days
FROM inventory.inbound_supply s
JOIN inventory.variant v ON v.id = s.variant_id
WHERE v.product_id = $1
  AND v.deleted_at IS NULL
  AND s.status IN ('PLANNED', 'IN_TRANSIT')
  AND s.expected_at >= NOW();
```

### availableChange7d
```sql
-- net change available за 7 дней
-- Оптимизация: сначала получаем variant_id, затем фильтруем stock_changes по IN
WITH product_variants AS (
  SELECT id FROM inventory.variant
  WHERE product_id = $1 AND deleted_at IS NULL
)
SELECT COALESCE(SUM(sc.delta_on_hand - sc.delta_reserved - sc.delta_unavailable), 0)
FROM inventory.stock_changes sc
WHERE sc.variant_id IN (SELECT id FROM product_variants)
  AND sc.created_at >= NOW() - INTERVAL '7 days';
```

### skuStatus (low stock, out of stock, backorder)
```sql
WITH product_variants AS (
  -- Сначала определяем варианты продукта для фильтрации stock_changes
  SELECT id FROM inventory.variant
  WHERE product_id = $1 AND deleted_at IS NULL
),
variant_stock AS (
  SELECT
    v.id,
    COALESCE(SUM(ws.quantity_on_hand - ws.reserved_qty - ws.unavailable_qty), 0) as available
  FROM product_variants v
  LEFT JOIN inventory.warehouse_stock ws ON ws.variant_id = v.id
  GROUP BY v.id
),
warehouse_available AS (
  SELECT
    ws.variant_id,
    ws.warehouse_id,
    (ws.quantity_on_hand - ws.reserved_qty - ws.unavailable_qty) as available
  FROM inventory.warehouse_stock ws
  WHERE ws.variant_id IN (SELECT id FROM product_variants)
),
warehouse_oos AS (
  -- Фильтруем stock_changes ДО окна LAG для производительности
  SELECT
    sc.variant_id,
    sc.warehouse_id,
    MAX(sc.created_at) as out_of_stock_since
  FROM (
    SELECT
      sc.variant_id,
      sc.warehouse_id,
      sc.created_at,
      (sc.on_hand_after - sc.reserved_after - sc.unavailable_after) as available_after,
      LAG(sc.on_hand_after - sc.reserved_after - sc.unavailable_after)
        OVER (PARTITION BY sc.variant_id, sc.warehouse_id ORDER BY sc.seq) as prev_available
    FROM inventory.stock_changes sc
    WHERE sc.variant_id IN (SELECT id FROM product_variants)  -- фильтр до окна
  ) sc
  WHERE sc.available_after <= 0
    AND (sc.prev_available IS NULL OR sc.prev_available > 0)
  GROUP BY sc.variant_id, sc.warehouse_id
),
warehouse_oos_fallback AS (
  SELECT
    wa.variant_id,
    wa.warehouse_id,
    ws.updated_at as out_of_stock_since
  FROM warehouse_available wa
  JOIN inventory.warehouse_stock ws
    ON ws.variant_id = wa.variant_id
   AND ws.warehouse_id = wa.warehouse_id
  WHERE wa.available <= 0
    AND NOT EXISTS (
      SELECT 1
      FROM warehouse_oos wo
      WHERE wo.variant_id = wa.variant_id
        AND wo.warehouse_id = wa.warehouse_id
    )
),
variant_oos AS (
  SELECT
    wa.variant_id,
    MIN(COALESCE(wo.out_of_stock_since, wof.out_of_stock_since)) as out_of_stock_since
  FROM warehouse_available wa
  LEFT JOIN warehouse_oos wo
    ON wo.variant_id = wa.variant_id AND wo.warehouse_id = wa.warehouse_id
  LEFT JOIN warehouse_oos_fallback wof
    ON wof.variant_id = wa.variant_id AND wof.warehouse_id = wa.warehouse_id
  WHERE wa.available <= 0
  GROUP BY wa.variant_id
),
variant_backorder_eta AS (
  SELECT
    v.id,
    MIN(s.expected_at) as backorder_expected_at
  FROM product_variants v
  LEFT JOIN inventory.inbound_supply s
    ON s.variant_id = v.id
    AND s.status IN ('PLANNED', 'IN_TRANSIT')
  GROUP BY v.id
)
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE available > 0 AND available < $2) as low_stock_count,
  COUNT(*) FILTER (WHERE available <= 0 AND backorder_expected_at IS NULL) as out_of_stock_count,
  AVG(EXTRACT(DAY FROM NOW() - vo.out_of_stock_since))
    FILTER (WHERE available <= 0 AND backorder_expected_at IS NULL) as out_of_stock_avg_days,
  COUNT(*) FILTER (WHERE available <= 0 AND backorder_expected_at IS NOT NULL) as backorder_count,
  AVG(EXTRACT(DAY FROM backorder_expected_at - NOW())) FILTER (WHERE available <= 0 AND backorder_expected_at IS NOT NULL) as backorder_avg_days
FROM variant_stock
LEFT JOIN variant_backorder_eta USING (id)
LEFT JOIN variant_oos vo ON vo.variant_id = variant_stock.id;
```

### Семантика out_of_stock_since / backorder_expected_at
- `out_of_stock_since`: вычисляется по `stock_changes` как момент последнего перехода `available_after` из `> 0` в `<= 0`
  (по складу, затем `MIN` по складам).
- `backorder_expected_at`: вычисляется из `inbound_supply` (можно кэшировать отдельно, но в `warehouse_stock` не храним).
- В виджете используется `MIN(expected_at)` по `inbound_supply`; при необходимости заменить на расчет по дефициту.

### Seed миграция для существующих остатков

При первой миграции добавить стартовую запись в `stock_changes` для каждой строки `warehouse_stock`:

```sql
-- Требуется pgcrypto для digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Seed-записи для существующих остатков
-- source_event_id должен быть <= 128 символов, используем короткий хеш
INSERT INTO inventory.stock_changes (
  project_id, warehouse_id, variant_id,
  delta_on_hand, delta_reserved, delta_unavailable,
  on_hand_after, reserved_after, unavailable_after,
  movement_type, source_system, source_event_id, created_at
)
SELECT
  ws.project_id,
  ws.warehouse_id,
  ws.variant_id,
  0, 0, 0,  -- delta=0 разрешено для SEED
  ws.quantity_on_hand,
  COALESCE(ws.reserved_qty, 0),
  COALESCE(ws.unavailable_qty, 0),
  'SEED',
  'MIGRATION',
  -- Детерминированный короткий ключ с префиксом seed: (5 + 64 hex = 69 символов < 128)
  'seed:' || encode(digest(concat_ws(':', ws.project_id::text, ws.warehouse_id::text, ws.variant_id::text), 'sha256'), 'hex'),
  COALESCE(ws.updated_at, ws.created_at, NOW())
FROM inventory.warehouse_stock ws;
```

**Fallback для SKU без истории**: если `stock_changes` пустой — использовать `warehouse_stock.updated_at` как `out_of_stock_since`.

### Расчет backorder_expected_at (по складу)
```sql
-- deficit = max(0, reserved_qty - quantity_on_hand)
WITH deficit AS (
  SELECT
    ws.project_id,
    ws.variant_id,
    ws.warehouse_id,
    GREATEST(ws.reserved_qty + ws.unavailable_qty - ws.quantity_on_hand, 0) as deficit
  FROM inventory.warehouse_stock ws
  WHERE ws.variant_id = $1 AND ws.warehouse_id = $2
),
supply AS (
  SELECT
    s.expected_at,
    SUM(s.qty_expected - s.qty_received) OVER (
      ORDER BY s.expected_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as running_qty
  FROM inventory.inbound_supply s
  JOIN deficit d
    ON d.variant_id = s.variant_id AND d.warehouse_id = s.warehouse_id
  WHERE s.status IN ('PLANNED', 'IN_TRANSIT')
)
SELECT expected_at
FROM supply
JOIN deficit d ON true
WHERE running_qty >= d.deficit
ORDER BY expected_at
LIMIT 1;
```

### Политика backorder
- `backorder_enabled = false`: запрет на `RESERVE` если `available_for_sale <= 0`.
- `backorder_enabled = true`: `RESERVE` разрешен, `available_for_sale` может быть отрицательным.
- Лимиты `backorder_max_days` / `backorder_max_qty` применяются на уровне бизнес-логики.

---

## Дополнительная аналитика (бонус от change log)

```sql
-- Продажи за последние 30 дней
SELECT COALESCE(SUM(-delta_on_hand), 0)
FROM inventory.stock_changes
WHERE variant_id = $1 AND movement_type = 'SELL' AND created_at >= NOW() - INTERVAL '30 days';

-- История стока на любую дату (сортировка по created_at + seq для корректности)
SELECT COALESCE((
  SELECT sc.on_hand_after
  FROM inventory.stock_changes sc
  WHERE sc.variant_id = $1 AND sc.created_at <= $2
  ORDER BY sc.created_at DESC, sc.seq DESC
  LIMIT 1
), 0);

-- Топ продаваемых товаров
SELECT variant_id, SUM(-delta_on_hand) as sold
FROM inventory.stock_changes
WHERE movement_type = 'SELL' AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY variant_id
ORDER BY sold DESC;
```

---

## GraphQL Schema

```graphql
enum ThresholdMethod {
  SAFETY_STOCK
  REORDER_POINT
}

type SkuStatusMetric {
  count: Int!
  averageDays: Float
}

type InventoryQuantities {
  availableForSale: Int!
  onHand: Int!
  reserved: Int!
  unavailable: Int!
}

type InventorySkuStatus {
  total: Int!
  lowStock: SkuStatusMetric!
  outOfStock: SkuStatusMetric!
  backorder: SkuStatusMetric!
}

type InventoryBackorder {
  quantity: Int!
  etaAvgDays: Float
}

type InventoryAlertThreshold {
  method: ThresholdMethod!
  minimumStock: Int!
}

type ProductInventoryWidget {
  quantities: InventoryQuantities!
  availableChange7d: Int!
  skuStatus: InventorySkuStatus!
  backorder: InventoryBackorder!
  alertThreshold: InventoryAlertThreshold!
}

extend type WidgetQuery {
  inventory(productId: ID!): ProductInventoryWidget
}
```

---

## Файлы для создания/изменения (Inventory Service)

### Новые модели (Drizzle)
1. `repositories/models/stock-changes.ts`
2. `repositories/models/reservations.ts`
3. `repositories/models/product-inventory-settings.ts`
4. `repositories/models/inbound-supply.ts`

### Изменить модели
1. `repositories/models/stock.ts` — добавить reserved_qty, unavailable_qty

### Новые файлы
1. `repositories/inventory-widget/InventoryWidgetRepository.ts`
2. `resolvers/admin/InventoryWidgetResolver.ts`
3. `api/graphql-admin/schema/inventory-widget.graphql`

### Изменить
1. `repositories/models/index.ts` — экспорт новых моделей
2. `resolvers/admin/index.ts` — добавить resolver

---

## Порядок реализации

### Phase 1: Database
1. Миграция: CREATE stock_changes (с seq BIGINT GENERATED ALWAYS AS IDENTITY)
2. Миграция: CREATE reservations
3. Миграция: CREATE product_inventory_settings
4. Миграция: CREATE inbound_supply
5. Миграция: ALTER warehouse_stock (добавить поля + CHECK constraints)
6. Миграция: SEED stock_changes для существующих warehouse_stock
7. Drizzle models

### Phase 2: API
1. InventoryWidgetRepository с SQL запросами
2. GraphQL schema
3. Resolver

### Phase 3: Интеграция
1. Обновить существующие операции (variantSetStock и др.) чтобы писали в stock_changes и обновляли warehouse_stock в одной транзакции
2. Добавить reconcile job для сверки `reserved_qty` с `reservations` (на случай рассинхронизации)
