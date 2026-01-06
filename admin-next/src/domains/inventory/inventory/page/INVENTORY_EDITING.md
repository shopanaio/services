# Inventory Table - Editing Specification

## Overview

This document describes the editing behavior for the inventory table with linked field calculations and business logic.

---

## Data Model

### Core Formula

```
Available = On Hand - Unavailable - Reserved
```

### Field Definitions

| Field         | Type   | Editable      | Description                                    |
| ------------- | ------ | ------------- | ---------------------------------------------- |
| `onHand`      | number | Yes           | Total quantity in stock                        |
| `unavailable` | number | Yes           | Unavailable (damaged, on hold)                 |
| `reserved`    | number | System        | Reserved for orders (managed by order system)  |
| `available`   | number | Calculated    | Available for sale (auto-calculated)           |

---

## Editing Mode

### Inline Cell Editing with Batch Save

User edits cells → sees diff (old → new) → clicks Save to apply all changes.

#### Flow

1. **Click cell** → input opens
2. **Enter value** → cell shows diff: `oldValue → newValue`
3. **Edit more cells** → pending changes accumulate
4. **Click Save** → all changes applied in single request

#### States

**Default state:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Product          │ SKU       │ On hand │ Unavail │ Reserved │ Available │
├──────────────────────────────────────────────────────────────────────────┤
│ iPhone 15 Pro    │ IPH-001-1 │   100   │    5    │    10    │    85     │
│ Samsung Galaxy   │ SGS-002-1 │    50   │    2    │     5    │    43     │
└──────────────────────────────────────────────────────────────────────────┘
```

**Editing state (input active):**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Product          │ SKU       │ On hand │ Unavail │ Reserved │ Available │
├──────────────────────────────────────────────────────────────────────────┤
│ iPhone 15 Pro    │ IPH-001-1 │ [150__] │    5    │    10    │    85     │
│                               ↑ editing                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Pending changes state (after edit, before save):**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Product          │ SKU       │ On hand   │ Unavail │ Reserved │ Available │
├──────────────────────────────────────────────────────────────────────────┤
│ iPhone 15 Pro    │ IPH-001-1 │ 100 → 150 │   5     │    10    │ 85 → 135  │
│ Samsung Galaxy   │ SGS-002-1 │  50 → 60  │ 2 → 5   │     5    │ 43 → 50   │
│                               ↑ changed   ↑ changed            ↑ auto-calc │
└──────────────────────────────────────────────────────────────────────────┘
│                                              [Discard]  [Save 2 changes] │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Cell Diff Display

```tsx
// Visual representation of change in cell
interface CellDiffProps {
  originalValue: number;
  newValue: number;
  isCalculated?: boolean;  // true for 'available' field
}

// Render:
// - Changed by user:     "100 → 150" (yellow background)
// - Auto-calculated:     "85 → 135"  (blue background, italic)
// - No change:           "10"        (normal)
```

#### Action Bar (appears when has pending changes)

```
┌─────────────────────────────────────────────────────────────────────┐
│  2 unsaved changes                        [Discard]  [Save changes] │
└─────────────────────────────────────────────────────────────────────┘
```

- **Discard** — cancels all pending changes, restores original values
- **Save changes** — sends batch request to server

#### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Confirm cell edit, stay in pending state |
| `Escape` | Cancel current cell edit |
| `Tab` | Confirm and move to next editable cell |
| `Ctrl+S` | Save all pending changes |
| `Ctrl+Z` | Discard all pending changes |

---

## Value Relationships & Cascading Updates

### Scenario 1: On Hand Changes

```typescript
// User increases On Hand: 100 → 150
onHandDelta = +50

// Result: Available increases proportionally
available = onHand - unavailable - reserved
available = 150 - 5 - 10 = 135  // was 85
```

**UI Preview:**

```
On hand:    100  →  150  (+50)
Unavailable:  5  →    5  (no change)
Reserved:    10  →   10  (no change)
Available:   85  →  135  (+50) ← auto-calculated, highlighted
```

### Scenario 2: Unavailable Changes

```typescript
// User increases Unavailable: 5 → 15 (damaged items found)
unavailableDelta = +10

// Result: Available decreases
available = 150 - 15 - 10 = 125  // was 135
```

**UI Preview:**

```
On hand:    150  →  150  (no change)
Unavailable:  5  →   15  (+10)
Reserved:    10  →   10  (no change)
Available:  135  →  125  (-10) ← auto-calculated, highlighted in red
```

### Reserved Field (System-Managed)

`reserved` is automatically managed by the order system:

```typescript
// Automatic triggers for reserved changes:
// - Order placed → reserved increases
// - Order shipped → reserved decreases, onHand decreases
// - Order cancelled → reserved decreases

// User CANNOT edit reserved directly
```

**UI:** The `reserved` field is displayed as read-only with tooltip:

```
Reserved: 10 ℹ️
         ↳ "Managed by order system"
```

---

## Validation Rules

### Business Constraints

```typescript
interface InventoryValidation {
  // Rule 1: Values cannot be negative
  onHand >= 0
  unavailable >= 0
  reserved >= 0

  // Rule 2: Available cannot be negative
  available >= 0
  // Therefore: onHand >= unavailable + reserved

  // Rule 3: Component values cannot exceed On Hand
  unavailable <= onHand
  reserved <= onHand - unavailable
}
```

### Validation Error Messages

| Condition                         | Error Message                                       |
| --------------------------------- | --------------------------------------------------- |
| `onHand < 0`                      | "On hand quantity cannot be negative"               |
| `unavailable > onHand`            | "Unavailable cannot exceed on hand quantity"        |
| `reserved > onHand - unavailable` | "Reserved exceeds available stock"                  |
| `available < 0`                   | "This change would result in negative availability" |

---

## UI Components

### 1. Editable Cell Component

```tsx
interface EditableCellProps {
  value: number;
  field: "onHand" | "unavailable";
  onChange: (newValue: number) => void;
  validation: ValidationResult;
}
```

**States:**

- `default` — displays current value
- `hover` — shows edit icon
- `editing` — input mode with change preview
- `saving` — loading spinner
- `error` — red border + tooltip with error message

---

## State Management (Zustand)

### Store Definition

```typescript
import { create } from "zustand";

// Editable fields (reserved is system-managed)
type EditableField = "onHand" | "unavailable";

// Single item change
interface ItemChange {
  originalValue: number;
  newValue: number;
}

// Store type
interface InventoryEditStore {
  // State
  pendingChanges: Record<string, Record<EditableField, ItemChange>>;
  activeCell: { itemId: string; field: EditableField } | null;
  status: "idle" | "editing" | "saving";

  // Actions
  startEdit: (itemId: string, field: EditableField) => void;
  updateValue: (itemId: string, field: EditableField, originalValue: number, newValue: number) => void;
  cancelCellEdit: () => void;
  discardAll: () => void;
  saveChanges: () => void;

  // Computed
  hasChanges: () => boolean;
  getChangesCount: () => number;
  getItemChange: (itemId: string, field: EditableField) => ItemChange | null;
}
```

### Store Implementation

```typescript
export const useInventoryEditStore = create<InventoryEditStore>((set, get) => ({
  // Initial state
  pendingChanges: {},
  activeCell: null,
  status: "idle",

  // Actions
  startEdit: (itemId, field) => {
    set({ activeCell: { itemId, field }, status: "editing" });
  },

  updateValue: (itemId, field, originalValue, newValue) => {
    set((state) => {
      // If value returned to original, remove the change
      if (originalValue === newValue) {
        const { [itemId]: itemChanges, ...rest } = state.pendingChanges;
        if (itemChanges) {
          const { [field]: _, ...remainingFields } = itemChanges;
          if (Object.keys(remainingFields).length === 0) {
            return { pendingChanges: rest, activeCell: null };
          }
          return {
            pendingChanges: { ...rest, [itemId]: remainingFields },
            activeCell: null,
          };
        }
        return { activeCell: null };
      }

      // Add/update the change
      return {
        pendingChanges: {
          ...state.pendingChanges,
          [itemId]: {
            ...state.pendingChanges[itemId],
            [field]: { originalValue, newValue },
          },
        },
        activeCell: null,
      };
    });
  },

  cancelCellEdit: () => {
    set({ activeCell: null });
  },

  discardAll: () => {
    set({ pendingChanges: {}, activeCell: null, status: "idle" });
  },

  saveChanges: () => {
    set({ status: "saving" });
    // After successful save:
    // set({ pendingChanges: {}, status: "idle" });
  },

  // Computed
  hasChanges: () => Object.keys(get().pendingChanges).length > 0,

  getChangesCount: () => {
    const changes = get().pendingChanges;
    return Object.values(changes).reduce(
      (count, fields) => count + Object.keys(fields).length,
      0
    );
  },

  getItemChange: (itemId, field) => {
    return get().pendingChanges[itemId]?.[field] ?? null;
  },
}));
```

### Usage in Component

```tsx
function InventoryCell({ itemId, field, currentValue }: Props) {
  const {
    activeCell,
    startEdit,
    updateValue,
    cancelCellEdit,
    getItemChange,
  } = useInventoryEditStore();

  const change = getItemChange(itemId, field);
  const isEditing = activeCell?.itemId === itemId && activeCell?.field === field;

  if (isEditing) {
    return (
      <Input
        defaultValue={change?.newValue ?? currentValue}
        onBlur={(e) => updateValue(itemId, field, currentValue, Number(e.target.value))}
        onKeyDown={(e) => e.key === "Escape" && cancelCellEdit()}
        autoFocus
      />
    );
  }

  // Show diff if has pending change
  if (change) {
    return (
      <span className="cell-diff">
        {change.originalValue} → {change.newValue}
      </span>
    );
  }

  return (
    <span onClick={() => startEdit(itemId, field)}>
      {currentValue}
    </span>
  );
}
```

### Action Bar Component

```tsx
function InventoryActionBar() {
  const { hasChanges, getChangesCount, discardAll, saveChanges, status } =
    useInventoryEditStore();

  if (!hasChanges()) return null;

  return (
    <div className="action-bar">
      <span>{getChangesCount()} unsaved changes</span>
      <Button onClick={discardAll}>Discard</Button>
      <Button type="primary" onClick={saveChanges} loading={status === "saving"}>
        Save changes
      </Button>
    </div>
  );
}
```

### Calculation Engine

```typescript
function calculateInventory(
  values: Partial<InventoryValues>,
  base: InventoryValues
): CalculationResult {
  const onHand = values.onHand ?? base.onHand;
  const unavailable = values.unavailable ?? base.unavailable;
  const reserved = values.reserved ?? base.reserved;

  const available = onHand - unavailable - reserved;

  const validation = validateInventory({
    onHand,
    unavailable,
    reserved,
    available,
  });

  return {
    values: { onHand, unavailable, reserved, available },
    changes: {
      onHand: onHand - base.onHand,
      unavailable: unavailable - base.unavailable,
      reserved: reserved - base.reserved,
      available: available - base.available,
    },
    isValid: validation.isValid,
    errors: validation.errors,
  };
}
```

---

## Audit Log Integration

All changes are recorded in the audit log:

```typescript
interface InventoryAuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  itemId: string;
  action: "adjustment";
  changes: {
    field: "onHand" | "unavailable";
    previousValue: number;
    newValue: number;
    delta: number;
  };
  reason: "manual";  // always manual

  // Computed fields that changed as result
  computedChanges: {
    available: { from: number; to: number };
  };
}
```

---

## Implementation Checklist

- [ ] Zustand store `useInventoryEditStore`
- [ ] Editable cell renderer with inline editing
- [ ] Cell diff display component (`100 → 150`)
- [ ] Real-time calculation for `available`
- [ ] Validation (non-negative, constraints)
- [ ] Action bar (Discard / Save changes)
- [ ] Keyboard navigation (Enter, Escape, Tab)
- [ ] Unit tests for store logic
