Ниже — **подробная схема ProductsSection** (в твоём стиле: Paper + header controls + table + footer), но **enterprise-ready**: merchandising rules, bulk actions, validations, conflicts, permissions, scopes, saved views.

---

## ProductsSection — Enterprise Detailed (схема)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  ProductsSection                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Header Row                                                                              │  │
│  │  Products (128)                                                                          │  │
│  │                                                                                          │  │
│  │  Left controls:                                                                           │  │
│  │   View: [Assigned ●] [Rule-based ○] [All results ○]   Saved views: [Default ▼]          │  │
│  │                                                                                          │  │
│  │  Center controls:                                                                         │  │
│  │   Search: [  title / SKU / brand...  ]  (⌕)                                              │  │
│  │   Filters: [Status ▼] [Stock ▼] [Price ▼] [Brand ▼] [Tags ▼] [Attributes ▼] [More ▾]    │  │
│  │                                                                                          │  │
│  │  Right controls:                                                                          │  │
│  │   Sort: [Name ▼]  [↕]  Page size: [10 ▼]                                                  │  │
│  │   Actions: [+ Assign Products] [Bulk actions ▼] [Export ▼]                               │  │
│  │                                                                                          │  │
│  │  NEW: Permission hints (inline, enterprise)                                               │  │
│  │   If readonly: "You have view-only access"  |  If locked: "Locked by @anna"              │  │
│  └────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                               │
│  NEW: Mode-specific panel                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  A) Assigned mode (manual list)                                                           │  │
│  │  ┌──────────────────────────────────────────────────────────────────────────────────┐    │  │
│  │  │  Manual ordering: [Drag to reorder] [Auto-sort ▼] [Reset order]                   │    │  │
│  │  │  Pins: 12   Excludes: 5   Conflicts: 2   [Review conflicts]                       │    │  │
│  │  └──────────────────────────────────────────────────────────────────────────────────┘    │  │
│  │                                                                                          │  │
│  │  B) Rule-based mode (merchandising engine)                                                 │  │
│  │  ┌──────────────────────────────────────────────────────────────────────────────────┐    │  │
│  │  │  Ruleset: "Premium Audio"  (v3)      Status: ✓ Valid      Last run: 2 min ago     │    │  │
│  │  │  Query: (Category=Audio) AND (Status=Active) AND (Price < 500)                    │    │  │
│  │  │  Sort strategy: Bestsellers (30d)                                                   │    │  │
│  │  │  Boost: Brand=Sony (+20), Tag=Featured (+30)                                       │    │  │
│  │  │  Bury: Stock=false (-50)                                                            │    │  │
│  │  │  Exclude: Archived, HiddenFromCatalog                                               │    │  │
│  │  │  Preview impact: +12 / -5   Conflicts: 2   Coverage: 94%                            │    │  │
│  │  │  [Edit rules] [Validate] [Run preview] [Save as view]                              │    │  │
│  │  └──────────────────────────────────────────────────────────────────────────────────┘    │  │
│  │                                                                                          │  │
│  │  C) All results mode (search across catalog)                                              │  │
│  │  ┌──────────────────────────────────────────────────────────────────────────────────┐    │  │
│  │  │  Searching across all products…                                                     │    │  │
│  │  │  Quick actions: [Assign selected] [Exclude selected]                                │    │  │
│  │  └──────────────────────────────────────────────────────────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                               │
│  NEW: Inline alerts row (enterprise quality + governance)                                     │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  ⚠ 2 conflicts found: 1 product excluded by policy, 1 product violates stock rule        │  │
│  │  [Open conflict center]  [Download report]                                                │  │
│  └────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                               │
│  Table                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Select □  | Product (Avatar + title)        | SKU      | Price  | Status | Stock | Flags │  │
│  │ ─────────────────────────────────────────────────────────────────────────────────────── │  │
│  │  □         | [img] Sony WH-1000XM5          | SNY-1000 | $349   | ● Active| Yes  | Pinned │  │
│  │            |    Brand: Sony  ·  Updated 2d  |          |        |        |      |          │  │
│  │            |    Quick: [Pin] [Exclude] [Open] [⋯]                                       │  │
│  │ ─────────────────────────────────────────────────────────────────────────────────────── │  │
│  │  □         | [img] Bose QC45                 | BSE-QC45 | $279   | ● Active| No   | ⚠ OOS  │  │
│  │            |    Quick: [Pin] [Exclude] [Open] [⋯]                                       │  │
│  │ ─────────────────────────────────────────────────────────────────────────────────────── │  │
│  │  □         | [img] JBL Flip 6                | JBL-FL6  |  $99   | ● Draft | Yes  | —      │  │
│  │            |    Quick: [Assign] [Open] [⋯]                                               │  │
│  └────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                               │
│  NEW: Bulk actions bar (appears when selection >0)                                            │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Selected: 6   [Assign to category] [Exclude from category] [Pin] [Unpin] [Export]        │  │
│  │  More: [Change status] [Set priority] [Add tag] [Remove tag]                               │  │
│  └────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                               │
│  Footer                                                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Showing 1–10 of 128     Page 1/13     [< Prev]  [Next >]     Jump to: [ 1 ▼ ]            │  │
│  │  NEW: Performance hint: "Rule preview computed in 180ms"                                  │  │
│  └────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Enterprise-готовые детали (что именно “новое” тут)

### 1) Saved Views (очень enterprise)

- Выпадашка **Saved views**: “Default”, “High margin”, “OOS issues”, “Pinned only”
- Каждая view хранит: `mode + filters + sort + columns + pageSize`

### 2) Conflict Center

Конфликт — это не “ошибка”, а _управляемая сущность_:

- “Excluded by policy”
- “In wrong category”
- “Violates stock rule”
- “HiddenFromCatalog but pinned”

Кнопка **Open conflict center** открывает drawer со списком конфликтов + решениями.

### 3) Merchandising engine

- `mode: MANUAL | RULES`
- Правила: query + sort strategy + boost/bury + excludes
- `Validate` и `Run preview` обязательны до сохранения

### 4) Bulk ops

Массовые:

- Assign / Unassign
- Pin / Unpin
- Exclude / Unexclude
- Export
- (опционально) change status — если есть права

### 5) Permission-aware UI

Если `canEdit=false`:

- кнопки выключены
- показывается “view-only”
  Если `lockedBy`:
- “Locked by …” и запрет редактирования

---

## Мини-спека для твоих текущих типов (как вписать без ломки)

Твой `ProductsSection` props можно расширить так:

```ts
interface IProductsSectionEnterprise {
  mode: "ASSIGNED" | "RULES" | "ALL";
  savedViews: { id: ID; name: string }[];
  conflictsCount: number;
  permissions: { canEdit: boolean; canBulk: boolean; canManageRules: boolean };
  merchandising?: ICategoryEnterprise["merchandising"];
}
```

---

Если хочешь, могу следующим сообщением:

- расписать **точные компоненты antd** (Segmented, Dropdown, Table row actions, Drawer для conflicts, Collapse для rules)
- и структуру **columns** (с `render`, `sorter`, `filters`, sticky header, rowSelection) — прям готовую для реализации.
