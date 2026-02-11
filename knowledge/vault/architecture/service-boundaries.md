---
tags:
  - architecture
  - services
  - bounded-contexts
related:
  - architecture/overview
  - patterns/federation
---

# Service Boundaries

Domain ownership and responsibilities for each service.

## Bounded Contexts

Each service is a bounded context with clear ownership of:
- **Entities** — data it creates and manages
- **Operations** — mutations it handles
- **Extensions** — types from other services it enriches

## Service Ownership Matrix

| Service | Owns | Extends | Port |
|---------|------|---------|------|
| **iam** | User, Organization, Role, Permission, Session | — | 10010 |
| **project** | Store, Locale, Currency, Settings | — | 10012 |
| **catalog** | Product, Variant, Category, Tag, Option, Feature | — | 10011 |
| **inventory** | Warehouse, Stock, InventoryItem | Variant (adds `stock`) | 10013 |
| **pricing** | Price, Discount, Promo, PriceList | Variant (adds `price`) | 10014 |
| **media** | File, Image, Asset | Product (adds `images`) | 10015 |
| **checkout** | Cart, CartItem, Checkout | — | 10016 |
| **orders** | Order, OrderItem, Fulfillment | — | 10017 |
| **payments** | Payment, Transaction, PaymentMethod | Order (adds `payment`) | 10018 |
| **delivery** | Shipment, ShippingRate, Carrier | Order (adds `shipment`) | 10019 |
| **apps** | App, AppInstallation, Webhook | — | 10020 |
| **reviews** | Review, Rating | Product (adds `reviews`) | 10021 |
| **search** | SearchIndex, SearchResult | — | 10022 |

## Service Details

### IAM (Identity & Access Management)

**Responsibility:** Authentication, authorization, user management.

**Entities:**
- `User` — user account (email, password hash, profile)
- `Organization` — company/team that owns stores
- `Role` — permission grouping (admin, manager, viewer)
- `Permission` — individual access right
- `Session` — auth session (better-auth)

**Provides:**
- User authentication (sign up, sign in, password reset)
- RBAC (Casbin policies)
- Organization membership

**Scope:** Global (not store-specific)

---

### Project

**Responsibility:** Store configuration and settings.

**Entities:**
- `Store` — individual store within organization
- `Locale` — supported languages (en, uk, ru)
- `Currency` — supported currencies (USD, UAH, EUR)
- `Settings` — store-specific configuration

**Provides:**
- Store creation and management
- Multi-locale support
- Currency configuration

---

### Catalog

**Responsibility:** Product information management.

**Entities:**
- `Product` — main product entity
- `Variant` — product variations (size, color)
- `Category` — product categorization
- `Tag` — flexible labeling
- `Option` — variant dimensions (Size, Color)
- `Feature` — product attributes (Material, Weight)

**Provides:**
- Product CRUD
- Category hierarchy
- Variant management

---

### Inventory

**Responsibility:** Stock levels and warehouse management.

**Entities:**
- `Warehouse` — physical or virtual storage location
- `Stock` — quantity at location
- `InventoryItem` — item tracking

**Extends:**
- `Variant.stock` — current stock level
- `Variant.available` — availability status

**Provides:**
- Stock tracking
- Reservation (during checkout)
- Low stock alerts

---

### Pricing

**Responsibility:** Prices, discounts, promotions.

**Entities:**
- `Price` — price for variant in currency
- `Discount` — percentage or fixed reduction
- `Promo` — promotional campaign
- `PriceList` — B2B customer-specific pricing

**Extends:**
- `Variant.price` — current price
- `Variant.compareAtPrice` — original price (for sales)

**Provides:**
- Price calculation
- Discount application
- Promotion management

---

### Media

**Responsibility:** File storage and media assets.

**Entities:**
- `File` — raw file metadata
- `Image` — processed image with variants
- `Asset` — generic media asset

**Extends:**
- `Product.images` — product gallery
- `Variant.image` — variant-specific image

**Backend:** MinIO (S3-compatible)

---

### Checkout

**Responsibility:** Shopping cart and checkout flow.

**Entities:**
- `Cart` — shopping cart
- `CartItem` — item in cart
- `Checkout` — checkout session

**Provides:**
- Cart management (add, remove, update)
- Checkout flow orchestration
- Address and shipping selection

**Uses:** Event Sourcing (Emmett)

---

### Orders

**Responsibility:** Order processing and fulfillment.

**Entities:**
- `Order` — placed order
- `OrderItem` — item in order
- `Fulfillment` — fulfillment group

**Provides:**
- Order creation (from checkout)
- Order status management
- Fulfillment tracking

**Uses:** Event Sourcing (Emmett)

---

### Payments

**Responsibility:** Payment processing.

**Entities:**
- `Payment` — payment for order
- `Transaction` — payment transaction
- `PaymentMethod` — saved payment method

**Extends:**
- `Order.payment` — payment status

**Integrations:** Stripe, LiqPay, manual

---

### Delivery

**Responsibility:** Shipping and delivery.

**Entities:**
- `Shipment` — shipping record
- `ShippingRate` — calculated shipping cost
- `Carrier` — delivery provider

**Extends:**
- `Order.shipment` — delivery status

**Integrations:** Nova Poshta, Meest

---

## Federation Type Extensions

How services extend types from other services:

```graphql
# inventory service extends Variant from catalog
extend type Variant @key(fields: "id") {
  id: ID! @external
  stock: Int!
  available: Boolean!
}

# pricing service extends Variant from catalog
extend type Variant @key(fields: "id") {
  id: ID! @external
  price: Money!
  compareAtPrice: Money
}

# media service extends Product from catalog
extend type Product @key(fields: "id") {
  id: ID! @external
  images: [Image!]!
  featuredImage: Image
}
```

## Cross-Service Dependencies

```
                    ┌─────────┐
                    │   IAM   │
                    └────┬────┘
                         │ auth
                         ▼
                    ┌─────────┐
                    │ Project │
                    └────┬────┘
                         │ store context
                         ▼
┌─────────┐        ┌─────────┐        ┌─────────┐
│ Pricing │───────►│ Catalog │◄───────│Inventory│
└─────────┘        └────┬────┘        └─────────┘
                        │                   │
                        ▼                   ▼
                   ┌─────────┐        ┌─────────┐
                   │Checkout │───────►│ Orders  │
                   └─────────┘        └────┬────┘
                                          │
                        ┌─────────────────┬┴────────────────┐
                        ▼                 ▼                 ▼
                   ┌─────────┐      ┌─────────┐       ┌─────────┐
                   │Payments │      │Delivery │       │  Media  │
                   └─────────┘      └─────────┘       └─────────┘
```

## See Also

- [[architecture/overview]] — High-level architecture
- [[patterns/federation]] — Federation pattern details
- [[architecture/multi-tenancy]] — Multi-tenancy and data isolation
