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
  out_of_stock_since TIMESTAMPTZ,
  backorder_expected_at TIMESTAMPTZ,
  last_change_id UUID;

ALTER TABLE inventory.warehouse_stock
  ADD CONSTRAINT warehouse_stock_reserved_check CHECK (reserved_qty >= 0),
  ADD CONSTRAINT warehouse_stock_unavailable_check CHECK (unavailable_qty >= 0);
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

  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- Индексы для аналитики
CREATE INDEX idx_stock_changes_variant_date ON inventory.stock_changes(variant_id, created_at DESC);
CREATE INDEX idx_stock_changes_project_date ON inventory.stock_changes(project_id, created_at DESC);
CREATE INDEX idx_stock_changes_type_date ON inventory.stock_changes(movement_type, created_at DESC);
CREATE INDEX idx_stock_changes_reason_date ON inventory.stock_changes(reason, created_at DESC);
```

Все изменения стока выполняются одной транзакцией: обновление `warehouse_stock` + insert в `stock_changes` (delta и balance_after).

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

### 4. Настройки алертов `product_inventory_settings`

```sql
CREATE TABLE inventory.product_inventory_settings (
  product_id UUID PRIMARY KEY REFERENCES inventory.product(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  alert_threshold_method VARCHAR(20) NOT NULL DEFAULT 'SAFETY_STOCK',
  alert_minimum_stock INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
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

### salesVelocity.pendingOrders
```sql
SELECT COUNT(DISTINCT r.order_id)
FROM inventory.reservations r
JOIN inventory.variant v ON v.id = r.variant_id
WHERE v.product_id = $1
  AND v.deleted_at IS NULL
  AND r.status = 'ACTIVE';
```

### salesVelocity.weekOverWeekChange
```sql
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
    COALESCE(SUM(ws.quantity_on_hand - ws.reserved_qty - ws.unavailable_qty), 0) as available,
    ws.out_of_stock_since,
    ws.backorder_expected_at
  FROM inventory.variant v
  LEFT JOIN inventory.warehouse_stock ws ON ws.variant_id = v.id
  WHERE v.product_id = $1 AND v.deleted_at IS NULL
  GROUP BY v.id, ws.out_of_stock_since, ws.backorder_expected_at
)
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE available > 0 AND available < $2) as low_stock_count,
  COUNT(*) FILTER (WHERE available <= 0 AND backorder_expected_at IS NULL) as out_of_stock_count,
  AVG(EXTRACT(DAY FROM NOW() - out_of_stock_since)) FILTER (WHERE available <= 0) as out_of_stock_avg_days,
  COUNT(*) FILTER (WHERE backorder_expected_at IS NOT NULL) as backorder_count,
  AVG(EXTRACT(DAY FROM backorder_expected_at - NOW())) FILTER (WHERE backorder_expected_at IS NOT NULL) as backorder_avg_days
FROM variant_stock;
```

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

### Изменить модели
1. `repositories/models/stock.ts` — добавить reserved_qty, unavailable_qty, out_of_stock_since, backorder_expected_at, last_change_id

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
4. Миграция: ALTER warehouse_stock (добавить поля)
5. Drizzle models

### Phase 2: API
1. InventoryWidgetRepository с SQL запросами
2. GraphQL schema
3. Resolver

### Phase 3: Интеграция
1. Обновить существующие операции (variantSetStock и др.) чтобы писали в stock_changes и обновляли warehouse_stock в одной транзакции
