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
  unavailable_qty INTEGER NOT NULL DEFAULT 0,
  last_change_id UUID;

ALTER TABLE inventory.warehouse_stock
  ADD CONSTRAINT warehouse_stock_reserved_check CHECK (reserved_qty >= 0),
  ADD CONSTRAINT warehouse_stock_unavailable_check CHECK (unavailable_qty >= 0);

-- Убедиться, что есть UNIQUE (project_id, warehouse_id, variant_id).
-- Backorder разрешен, поэтому CHECK на non-negative available не добавляем.
-- При необходимости добавить FK: last_change_id REFERENCES inventory.stock_changes(id).
```

### 2. Журнал изменений `stock_changes` (тонкий delta-log)

```sql
CREATE TABLE inventory.stock_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  variant_id UUID NOT NULL REFERENCES inventory.variant(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id),

  -- Дельты (знак = направление изменения)
  delta_on_hand INTEGER NOT NULL DEFAULT 0,
  delta_reserved INTEGER NOT NULL DEFAULT 0,
  delta_unavailable INTEGER NOT NULL DEFAULT 0,
  CHECK (delta_on_hand <> 0 OR delta_reserved <> 0 OR delta_unavailable <> 0),

  -- Баланс после изменения (история без пересчета)
  on_hand_after INTEGER NOT NULL,
  reserved_after INTEGER NOT NULL,
  unavailable_after INTEGER NOT NULL,

  -- Тип операции (что произошло)
  movement_type VARCHAR(20) NOT NULL,
  -- 'RECEIVE'    приход товара
  -- 'SELL'       продажа (списание)
  -- 'RETURN'     возврат от покупателя
  -- 'ADJUST'     корректировка
  -- 'RESERVE'    резервирование под заказ
  -- 'RELEASE'    снятие резерва
  -- 'TRANSFER'   перемещение между складами

  -- Причина (почему произошло)
  reason VARCHAR(30),
  -- 'DAMAGE'           брак/потери
  -- 'INVENTORY_COUNT'  инвентаризация
  -- 'MANUAL'           ручная корректировка
  -- 'CUSTOMER_RETURN'  возврат покупателя

  -- Источник события (для идемпотентности/трассировки)
  source_system VARCHAR(30),
  source_event_id VARCHAR(128),
  correlation_id UUID, -- например, transfer_id для связки двух движений

  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- Индексы для аналитики
CREATE INDEX idx_stock_changes_variant_date ON inventory.stock_changes(variant_id, created_at DESC);
CREATE INDEX idx_stock_changes_variant_warehouse_date ON inventory.stock_changes(variant_id, warehouse_id, created_at DESC);
CREATE INDEX idx_stock_changes_project_date ON inventory.stock_changes(project_id, created_at DESC);
CREATE INDEX idx_stock_changes_type_date ON inventory.stock_changes(movement_type, created_at DESC);
CREATE INDEX idx_stock_changes_reason_date ON inventory.stock_changes(reason, created_at DESC);
CREATE UNIQUE INDEX idx_stock_changes_idempotency
  ON inventory.stock_changes(source_system, source_event_id, warehouse_id, variant_id);
```

Все изменения стока выполняются одной транзакцией: обновление `warehouse_stock` + insert в `stock_changes` (delta и balance_after).
Чтобы не терять обновления при конкуренции, использовать `SELECT ... FOR UPDATE` по `warehouse_stock`
или оптимистическую блокировку через `last_change_id`.
`movement_type` и `reason` можно оформить как ENUM, чтобы избежать мусорных значений.

### 3. Резервирования `reservations`

```sql
CREATE TABLE inventory.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  variant_id UUID NOT NULL REFERENCES inventory.variant(id),
  warehouse_id UUID NOT NULL REFERENCES inventory.warehouses(id),

  -- Внешняя система заказов
  order_system VARCHAR(50) NOT NULL,  -- 'SHOPANA', 'SHOPIFY', 'WOOCOMMERCE', etc.
  order_id VARCHAR(255) NOT NULL,     -- ID заказа во внешней системе

  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, RELEASED, FULFILLED

  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,

  UNIQUE(order_system, order_id, variant_id, warehouse_id)
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
-- backorder = max(0, -(available_for_sale))
SELECT COALESCE(SUM(GREATEST(-(ws.quantity_on_hand - ws.reserved_qty - ws.unavailable_qty), 0)), 0) as backorder_qty
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
  AND s.status IN ('PLANNED', 'IN_TRANSIT');
```

### salesVelocity.pendingOrders
```sql
SELECT COUNT(DISTINCT (r.order_system, r.order_id))
FROM inventory.reservations r
JOIN inventory.variant v ON v.id = r.variant_id
WHERE v.product_id = $1
  AND v.deleted_at IS NULL
  AND r.status = 'ACTIVE';
```

### salesVelocity.weekOverWeekChange
```sql
-- net change on_hand за 7 дней; если нужна только продажа, фильтровать movement_type = 'SELL'
SELECT COALESCE(SUM(sc.delta_on_hand), 0)
FROM inventory.stock_changes sc
JOIN inventory.variant v ON v.id = sc.variant_id
WHERE v.product_id = $1
  AND v.deleted_at IS NULL
  AND sc.created_at >= NOW() - INTERVAL '7 days';
```

### skuStatus (low stock, out of stock, backorder)
```sql
WITH variant_stock AS (
  SELECT
    v.id,
    COALESCE(SUM(ws.quantity_on_hand - ws.reserved_qty - ws.unavailable_qty), 0) as available
  FROM inventory.variant v
  LEFT JOIN inventory.warehouse_stock ws ON ws.variant_id = v.id
  WHERE v.product_id = $1 AND v.deleted_at IS NULL
  GROUP BY v.id
),
warehouse_available AS (
  SELECT
    ws.variant_id,
    ws.warehouse_id,
    (ws.quantity_on_hand - ws.reserved_qty - ws.unavailable_qty) as available
  FROM inventory.warehouse_stock ws
  JOIN inventory.variant v ON v.id = ws.variant_id
  WHERE v.product_id = $1 AND v.deleted_at IS NULL
),
warehouse_oos AS (
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
        OVER (PARTITION BY sc.variant_id, sc.warehouse_id ORDER BY sc.created_at) as prev_available
    FROM inventory.stock_changes sc
  ) sc
  WHERE sc.available_after <= 0
    AND (sc.prev_available IS NULL OR sc.prev_available > 0)
  GROUP BY sc.variant_id, sc.warehouse_id
),
variant_oos AS (
  SELECT
    wa.variant_id,
    MIN(wo.out_of_stock_since) as out_of_stock_since
  FROM warehouse_available wa
  LEFT JOIN warehouse_oos wo
    ON wo.variant_id = wa.variant_id AND wo.warehouse_id = wa.warehouse_id
  WHERE wa.available <= 0
  GROUP BY wa.variant_id
),
variant_backorder_eta AS (
  SELECT
    v.id,
    MIN(s.expected_at) as backorder_expected_at
  FROM inventory.variant v
  LEFT JOIN inventory.inbound_supply s
    ON s.variant_id = v.id
    AND s.status IN ('PLANNED', 'IN_TRANSIT')
  WHERE v.product_id = $1 AND v.deleted_at IS NULL
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

### Расчет backorder_expected_at (по складу)
```sql
-- deficit = max(0, reserved_qty - quantity_on_hand)
WITH deficit AS (
  SELECT
    ws.project_id,
    ws.variant_id,
    ws.warehouse_id,
    GREATEST(ws.reserved_qty - ws.quantity_on_hand, 0) as deficit
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

-- История стока на любую дату
SELECT COALESCE((
  SELECT sc.on_hand_after
  FROM inventory.stock_changes sc
  WHERE sc.variant_id = $1 AND sc.created_at <= $2
  ORDER BY sc.created_at DESC
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

type InventorySalesVelocity {
  pendingOrders: Int!
  weekOverWeekChange: Int!
}

type InventoryAlertThreshold {
  method: ThresholdMethod!
  minimumStock: Int!
}

type ProductInventoryWidget {
  quantities: InventoryQuantities!
  skuStatus: InventorySkuStatus!
  backorder: InventoryBackorder!
  salesVelocity: InventorySalesVelocity!
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
1. `repositories/models/stock.ts` — добавить reserved_qty, unavailable_qty, last_change_id

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
1. Миграция: CREATE stock_changes
2. Миграция: CREATE reservations
3. Миграция: CREATE product_inventory_settings
4. Миграция: CREATE inbound_supply
5. Миграция: ALTER warehouse_stock (добавить поля)
6. Drizzle models

### Phase 2: API
1. InventoryWidgetRepository с SQL запросами
2. GraphQL schema
3. Resolver

### Phase 3: Интеграция
1. Обновить существующие операции (variantSetStock и др.) чтобы писали в stock_changes и обновляли warehouse_stock в одной транзакции
2. Добавить reconcile job для сверки `reserved_qty` с `reservations` (на случай рассинхрона)
