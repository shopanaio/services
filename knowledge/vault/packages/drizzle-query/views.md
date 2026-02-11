---
tags:
  - drizzle-query
  - views
  - aggregation
  - computed-columns
related:
  - drizzle-query/index
  - drizzle-query/joins
  - drizzle-query/query-builder
---
# View Support

Query Drizzle views with computed columns and join tables to views.

## Overview

`@shopana/drizzle-query` fully supports Drizzle ORM views, including:

- Materialized and non-materialized views
- Computed/aggregated columns
- Joining tables to views
- Filtering and sorting on view columns

## Creating Views with Drizzle

### Basic View

```typescript
import { pgView, sql } from "drizzle-orm/pg-core";

const productStatsView = pgView("product_stats_view").as((qb) =>
  qb.select({
    productId: orderItems.productId,
    totalSold: sql<number>`SUM(${orderItems.quantity})`.as("total_sold"),
    revenue: sql<number>`SUM(${orderItems.quantity} * ${orderItems.price})`.as("revenue"),
    orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`.as("order_count"),
  })
  .from(orderItems)
  .groupBy(orderItems.productId)
);
```

### View with Joins

```typescript
const productSummaryView = pgView("product_summary_view").as((qb) =>
  qb.select({
    productId: products.id,
    productTitle: products.title,
    categoryName: categories.name,
    averageRating: sql<number>`AVG(${reviews.rating})`.as("average_rating"),
    reviewCount: sql<number>`COUNT(${reviews.id})`.as("review_count"),
  })
  .from(products)
  .leftJoin(categories, eq(products.categoryId, categories.id))
  .leftJoin(reviews, eq(reviews.productId, products.id))
  .groupBy(products.id, products.title, categories.name)
);
```

### Materialized View

```typescript
const salesReportView = pgMaterializedView("sales_report_mv").as((qb) =>
  qb.select({
    date: sql<string>`DATE(${orders.createdAt})`.as("date"),
    totalOrders: sql<number>`COUNT(*)`.as("total_orders"),
    totalRevenue: sql<number>`SUM(${orders.total})`.as("total_revenue"),
    averageOrderValue: sql<number>`AVG(${orders.total})`.as("average_order_value"),
  })
  .from(orders)
  .where(eq(orders.status, "completed"))
  .groupBy(sql`DATE(${orders.createdAt})`)
);
```

## Querying Views

### Basic View Query

```typescript
import { createQuery } from "@shopana/drizzle-query";

// Create query from view (auto-discovers columns)
const statsQuery = createQuery(productStatsView);

// Execute with filters
const results = await statsQuery.execute(db, {
  select: ["productId", "totalSold", "revenue"],
  where: { totalSold: { _gte: 100 } },
  order: [{ field: "revenue", direction: "desc" }],
  limit: 20,
});
```

### With Explicit Fields

```typescript
const statsQuery = createQuery(productStatsView, {
  productId: field(productStatsView.productId),
  totalSold: field(productStatsView.totalSold),
  revenue: field(productStatsView.revenue),
  orderCount: field(productStatsView.orderCount),
});
```

## Joining Tables to Views

### Table → View Join

```typescript
// View for product stats
const statsQuery = createQuery(productStatsView, {
  productId: field(productStatsView.productId),
  totalSold: field(productStatsView.totalSold),
  revenue: field(productStatsView.revenue),
});

// Products with stats from view
const productsWithStats = createQuery(products, {
  id: field(products.id),
  sku: field(products.sku),
  title: field(products.title),
  price: field(products.price),
  // Join to view
  stats: field(products.id).leftJoin(statsQuery, productStatsView.productId),
});

// Query with view data
const results = await productsWithStats.execute(db, {
  select: ["id", "sku", "title", "stats.totalSold", "stats.revenue"],
  where: {
    stats: { totalSold: { _gte: 50 } },
  },
  order: [{ field: "stats.revenue", direction: "desc" }],
});
```

### View → Table Join

```typescript
// Stats view that joins back to products
const enrichedStatsQuery = createQuery(productStatsView, {
  productId: field(productStatsView.productId),
  totalSold: field(productStatsView.totalSold),
  revenue: field(productStatsView.revenue),
  // Join to products table
  product: field(productStatsView.productId).leftJoin(productQuery, products.id),
});

// Query with product details
const results = await enrichedStatsQuery.execute(db, {
  select: [
    "productId",
    "totalSold",
    "revenue",
    "product.sku",
    "product.title",
    "product.category.name",
  ],
  where: {
    product: { status: "active" },
  },
});
```

## Aggregation Patterns

### Top Sellers

```typescript
const topSellers = await statsQuery.execute(db, {
  select: ["productId", "totalSold", "revenue"],
  order: [{ field: "totalSold", direction: "desc" }],
  limit: 10,
});
```

### Revenue by Category

```typescript
const categorySalesView = pgView("category_sales_view").as((qb) =>
  qb.select({
    categoryId: products.categoryId,
    totalRevenue: sql<number>`SUM(${orderItems.quantity} * ${orderItems.price})`.as("total_revenue"),
    productCount: sql<number>`COUNT(DISTINCT ${products.id})`.as("product_count"),
  })
  .from(orderItems)
  .innerJoin(products, eq(orderItems.productId, products.id))
  .groupBy(products.categoryId)
);

const categorySalesQuery = createQuery(categorySalesView, {
  categoryId: field(categorySalesView.categoryId),
  totalRevenue: field(categorySalesView.totalRevenue),
  productCount: field(categorySalesView.productCount),
  // Join to get category details
  category: field(categorySalesView.categoryId).leftJoin(categoryQuery, categories.id),
});

const results = await categorySalesQuery.execute(db, {
  select: ["category.name", "totalRevenue", "productCount"],
  order: [{ field: "totalRevenue", direction: "desc" }],
});
```

### Time-based Analytics

```typescript
const dailySalesView = pgView("daily_sales_view").as((qb) =>
  qb.select({
    date: sql<string>`DATE(${orders.createdAt})`.as("date"),
    orderCount: sql<number>`COUNT(*)`.as("order_count"),
    revenue: sql<number>`SUM(${orders.total})`.as("revenue"),
    averageOrderValue: sql<number>`AVG(${orders.total})`.as("avg_order_value"),
  })
  .from(orders)
  .where(eq(orders.status, "completed"))
  .groupBy(sql`DATE(${orders.createdAt})`)
);

const dailySalesQuery = createQuery(dailySalesView);

// Last 30 days
const results = await dailySalesQuery.execute(db, {
  where: {
    date: { _gte: thirtyDaysAgo },
  },
  order: [{ field: "date", direction: "desc" }],
});
```

## Full Example

```typescript
import { createQuery, field } from "@shopana/drizzle-query";
import { pgView, sql, eq } from "drizzle-orm/pg-core";

// Define aggregation view
const inventoryStatsView = pgView("inventory_stats_view").as((qb) =>
  qb.select({
    productId: stockLevels.productId,
    totalStock: sql<number>`SUM(${stockLevels.available})`.as("total_stock"),
    reservedStock: sql<number>`SUM(${stockLevels.reserved})`.as("reserved_stock"),
    warehouseCount: sql<number>`COUNT(DISTINCT ${stockLevels.warehouseId})`.as("warehouse_count"),
  })
  .from(stockLevels)
  .groupBy(stockLevels.productId)
);

// Query for the view
const inventoryStatsQuery = createQuery(inventoryStatsView, {
  productId: field(inventoryStatsView.productId),
  totalStock: field(inventoryStatsView.totalStock),
  reservedStock: field(inventoryStatsView.reservedStock),
  warehouseCount: field(inventoryStatsView.warehouseCount),
});

// Products with inventory from view
const productsQuery = createQuery(products, {
  id: field(products.id),
  sku: field(products.sku),
  title: field(products.title),
  price: field(products.price),
  status: field(products.status),
  category: field(products.categoryId).leftJoin(categoryQuery, categories.id),
  inventory: field(products.id).leftJoin(inventoryStatsQuery, inventoryStatsView.productId),
})
  .defaultWhere({ deletedAt: { _is: null } })
  .defaultOrder({ field: "createdAt", direction: "desc" });

// Complex query combining table and view data
const results = await productsQuery.execute(db, {
  select: [
    "id",
    "sku",
    "title",
    "price",
    "category.name",
    "inventory.totalStock",
    "inventory.reservedStock",
  ],
  where: {
    status: "active",
    inventory: {
      totalStock: { _gt: 0 },
      reservedStock: { _lt: 100 },
    },
    category: { slug: "electronics" },
  },
  order: [
    { field: "inventory.totalStock", direction: "desc" },
  ],
  limit: 50,
});
```

## Performance Considerations

### Materialized Views

Use materialized views for expensive aggregations:

```typescript
// Refresh materialized view
await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY sales_report_mv`);
```

### Indexing Views

Create indexes on view columns used in filters:

```sql
CREATE INDEX idx_product_stats_product_id
  ON product_stats_view(product_id);

CREATE INDEX idx_product_stats_revenue
  ON product_stats_view(revenue DESC);
```

### Query Hints

For complex views, consider query hints:

```typescript
const results = await db.execute(
  sql`/*+ IndexScan(product_stats_view) */ ${statsQuery.getSql({ limit: 10 })}`
);
```

## Related

- [[drizzle-query/index]] — Package overview
- [[drizzle-query/joins]] — Join definitions
- [[drizzle-query/query-builder]] — Query configuration
