# Bundle Dependencies Editor — Implementation Plan

## Overview

Visual rule-based editor for product bundle dependencies with:
- **Pricing Tab**: Rules table + dependency rules table (WHEN → THEN)
- **Chart Modal**: React Flow visual editor (opens from Pricing tab via modal stack)

---

## 1. Installation

```bash
cd admin-next && pnpm add @xyflow/react
```

---

## 2. File Structure (What to Create/Modify)

```
src/domains/inventory/products/modals/edit-components-modal/
├── index.tsx                          # MODIFY: Add dependencyRules to state
├── types.ts                           # MODIFY: Add domain types (IDependencyRule, etc.)
├── utils/
│   └── apply-id-mappings.ts           # CREATE: ID mapping helper
└── components/
    ├── index.ts                       # MODIFY: Export new components
    ├── pricing-rules-tab.tsx          # MODIFY: Add Dependency Rules section
    ├── dependency-rules-table.tsx     # CREATE: Rules table component
    └── dependency-chart-modal/        # CREATE: New modal directory
        ├── index.tsx                  # Chart modal main
        ├── types.ts                   # VIEW-MODEL types only (NodeData, EdgeData)
        ├── nodes/                     # React Flow nodes
        │   ├── item-node.tsx
        │   ├── group-node.tsx
        │   └── rule-node.tsx
        ├── sidebar/
        │   └── rule-inspector.tsx
        └── hooks/
            ├── use-derived-graph.ts   # rules → nodes/edges
            └── use-column-layout.ts   # simple column-based positioning (no dagre)
```

**Note:** Domain types (`IDependencyRule`, `IDependencyCondition`, etc.) stay in main `types.ts`.
Chart modal's `types.ts` only contains view-specific types like `NodeData`, `EdgeData`.
Custom edge component not needed for MVP — default edge with label is sufficient.

---

## 3. Types to Add (`types.ts`)

```typescript
// ============================================================================
// Dependency Rules
// ============================================================================

/**
 * Condition types (STATE-BASED, not events!)
 *
 * Key insight: These are predicates evaluated against current state,
 * not events that "fire". This avoids "why didn't rule trigger on modal open" bugs.
 */
export enum DependencyConditionType {
  /** Item is currently selected */
  IS_SELECTED = "IS_SELECTED",
  /** Item is currently NOT selected */
  IS_NOT_SELECTED = "IS_NOT_SELECTED",
  /** Item quantity >= value */
  QTY_GTE = "QTY_GTE",
  /** Item quantity <= value */
  QTY_LTE = "QTY_LTE",
  /** Item quantity == value */
  QTY_EQ = "QTY_EQ",
  /** Group meets min/max constraints */
  GROUP_VALID = "GROUP_VALID",
  /** Group does NOT meet min/max constraints */
  GROUP_INVALID = "GROUP_INVALID",
  /** Unique selected items in group >= value (e.g. 3 different items) */
  GROUP_UNIQUE_GTE = "GROUP_UNIQUE_GTE",
  /** Total quantity in group >= value (e.g. 5 total pieces) */
  GROUP_TOTAL_QTY_GTE = "GROUP_TOTAL_QTY_GTE",
}

/**
 * Action types for THEN clause
 */
export enum DependencyActionType {
  // Visibility
  SHOW = "SHOW",
  HIDE = "HIDE",
  // Availability
  ENABLE = "ENABLE",
  DISABLE = "DISABLE",
  // Quantity
  SET_QTY = "SET_QTY",
  // Pricing
  OVERRIDE_PRICE = "OVERRIDE_PRICE",  // replaces base price entirely
  ADJUST_PRICE = "ADJUST_PRICE",       // modifies base price
}

/**
 * Target type for conditions and actions
 */
export enum DependencyTargetType {
  ITEM = "ITEM",
  GROUP = "GROUP",
  BUNDLE = "BUNDLE",
}

/**
 * Single condition in WHEN clause
 *
 * All conditions in a rule are AND-ed together.
 */
export interface IDependencyCondition {
  id: string;
  conditionType: DependencyConditionType;
  targetType: DependencyTargetType;
  targetId: string;              // item or group ID
  value?: number;                // for QTY_*, GROUP_COUNT_GTE
}

/**
 * Single action in THEN clause
 */
export interface IDependencyAction {
  id: string;
  actionType: DependencyActionType;
  targetType: DependencyTargetType;
  targetId?: string;               // Optional for BUNDLE (implicit "this bundle")

  // For SET_QTY
  qtyValue?: number;

  // For OVERRIDE_PRICE / ADJUST_PRICE
  priceType?: ComponentPriceType;  // FIXED, DISCOUNT_PERCENT, MARKUP_FIXED, FREE, etc.
  priceValue?: number | null;

  // Price conflict resolution
  exclusiveKey?: string;           // e.g. "bundleDiscount" - only highest priority wins in same key
  applyTo?: "ITEM" | "COMPONENTS_SUBTOTAL";  // where discount applies (default: ITEM)

  // UX
  label?: string;                  // reason shown in UI ("Not compatible with Premium")
}

/**
 * Price Action Policy:
 *
 * OVERRIDE_PRICE (FIXED/FREE/INCLUDED):
 *   - Only ONE winner per target (highest priority)
 *   - Blocks subsequent adjustments on same target
 *
 * ADJUST_PRICE (+/-$/%):
 *   - Can stack (applied in order: fixed amounts first, then percentages)
 *   - Use exclusiveKey to prevent stacking within same "discount group"
 *   - Example: bundleDiscount key ensures only best combo discount applies
 */

/**
 * Full dependency rule
 */
export interface IDependencyRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;               // higher = wins conflicts

  // WHEN clause (all conditions must match - AND logic)
  conditions: IDependencyCondition[];

  // THEN clause (all actions execute if conditions pass)
  actions: IDependencyAction[];
}

/**
 * Tab type update
 */
export type EditComponentsTabKey =
  | "groups"
  | "pricing"   // Now includes dependency rules
  | "preview"
  | "settings";
```

### 3.1 Important: State-Based vs Event-Based

The conditions are **predicates on current state**, not events:
- `IS_SELECTED` = "item A is currently selected" (always true/false)
- NOT "item A was just clicked"

This means:
- Rules evaluate on ANY state change
- Opening modal with A already selected → rule fires immediately
- No "missed event" bugs

### 3.2 Price Conflict Resolution

```typescript
// Example: A+B = -10%, A+B+C = -20% (should NOT stack!)
const rule10: IDependencyRule = {
  id: "r1", name: "A+B combo", priority: 100,
  conditions: [
    { id: "c1", conditionType: "IS_SELECTED", targetType: "ITEM", targetId: "itemA" },
    { id: "c2", conditionType: "IS_SELECTED", targetType: "ITEM", targetId: "itemB" },
  ],
  actions: [{
    id: "a1", actionType: "ADJUST_PRICE", targetType: "BUNDLE", targetId: "bundle",
    priceType: ComponentPriceType.DISCOUNT_PERCENT, priceValue: 10,
    exclusiveKey: "bundleDiscount",  // ← same key
    applyTo: "COMPONENTS_SUBTOTAL",
  }],
};

const rule20: IDependencyRule = {
  id: "r2", name: "A+B+C combo", priority: 200,  // ← higher priority wins
  conditions: [
    { id: "c1", conditionType: "IS_SELECTED", targetType: "ITEM", targetId: "itemA" },
    { id: "c2", conditionType: "IS_SELECTED", targetType: "ITEM", targetId: "itemB" },
    { id: "c3", conditionType: "IS_SELECTED", targetType: "ITEM", targetId: "itemC" },
  ],
  actions: [{
    id: "a1", actionType: "ADJUST_PRICE", targetType: "BUNDLE", targetId: "bundle",
    priceType: ComponentPriceType.DISCOUNT_PERCENT, priceValue: 20,
    exclusiveKey: "bundleDiscount",  // ← same key, priority wins
    applyTo: "COMPONENTS_SUBTOTAL",
  }],
};
// Result: When A+B+C selected → only -20% applies (not -30%)
```

---

## 4. Main Modal Changes (`index.tsx`)

### 4.1 Add State

```typescript
// Line ~80, add to state:
const [dependencyRules, setDependencyRules] = useState<IDependencyRule[]>(
  payload?.dependencyRules ?? []
);
```

### 4.2 Pass to PricingRulesTab

```typescript
// In Tabs items, pricing tab:
{
  key: "pricing",
  label: "Pricing",
  children: (
    <PricingRulesTab
      pricingTemplates={pricingTemplates}
      onPricingTemplatesChange={setPricingTemplates}
      tieredDiscounts={tieredDiscounts}
      onTieredDiscountsChange={setTieredDiscounts}
      // NEW:
      dependencyRules={dependencyRules}
      onDependencyRulesChange={setDependencyRules}
      groups={groups}  // for source/target options
    />
  ),
}
```

### 4.3 Update Save Handler

```typescript
// In handleSave:
onSave?.({
  groups,
  pricingTemplates,
  tieredDiscounts,
  dependencyRules,  // ADD
  bundleSettings,
});
```

---

## 5. Pricing Rules Tab Changes (`pricing-rules-tab.tsx`)

### 5.1 Add Third Section: Dependency Rules

```typescript
interface IPricingRulesTabProps {
  // ... existing
  dependencyRules: IDependencyRule[];
  onDependencyRulesChange: (rules: IDependencyRule[]) => void;
  groups: IComponentGroup[];
}
```

### 5.2 New Section Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Pricing Rule Templates    [+ Add Template]                   │  ← existing
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Table: Name | Price Rule | Value | Actions             │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Tiered Discounts          [+ Add Tier]                       │  ← existing
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Table: Min Items | Discount | Description | Actions    │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Dependency Rules      [Open Chart]  [+ Add Rule]             │  ← NEW
│ ┌────────────────────────────────────────────────────────┐   │
│ │ ↕ │On│Prio│ Name           │ WHEN → THEN              │ ! │
│ │───┼──┼────┼────────────────┼──────────────────────────┼───│
│ │ ↕ │◉ │200 │ Premium locks  │ A selected → disable B,C │   │
│ │ ↕ │◉ │100 │ ABC combo      │ A+B+C → -20%             │   │
│ └────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Dependency Rules Table (`dependency-rules-table.tsx`)

### 6.1 Component Structure

```typescript
interface IDependencyRulesTableProps {
  rules: IDependencyRule[];
  onRulesChange: (rules: IDependencyRule[]) => void;
  groups: IComponentGroup[];
  onOpenChart: () => void;
  onEditRule: (ruleId: string) => void;
}

export const DependencyRulesTable = ({...}: IDependencyRulesTableProps) => {
  // Columns:
  // 1. Drag handle (↕)
  // 2. Enabled toggle (◉/○)
  // 3. Priority number
  // 4. Name
  // 5. WHEN → THEN summary (one line)
  // 6. Status/warnings (!)
  // 7. Actions (Edit, Delete)
}
```

### 6.2 WHEN → THEN Summary Format

```typescript
const formatRuleSummary = (rule: IDependencyRule, groups: IComponentGroup[]): string => {
  // Examples:
  // "A selected → disable B, C"
  // "A+B+C → -20%, hide Group X"
  // "qty(A) >= 3 → show Extras"

  const whenPart = rule.conditions
    .map(c => formatCondition(c, groups))
    .join(" + ");

  const thenPart = rule.actions
    .map(a => formatAction(a, groups))
    .join(", ");

  return `${whenPart} → ${thenPart}`;
};
```

### 6.3 Table Features

**Columns:**
| Col | Width | Content |
|-----|-------|---------|
| ↕ | 32px | Drag handle for reorder |
| On | 40px | Switch toggle |
| Prio | 60px | Inline-editable InputNumber |
| Name | 150px | Text (click to edit) |
| WHEN → THEN | flex | Summary string |
| ! | 32px | Status indicator |
| Actions | 80px | Edit, Duplicate, Delete |

**Status indicators (!column):**
```typescript
const getRuleStatus = (rule: IDependencyRule, groups: IComponentGroup[]): RuleStatus => {
  // ⛔ Error: rule is broken
  if (rule.conditions.length === 0) return { icon: "⛔", tooltip: "No conditions" };
  if (rule.actions.length === 0) return { icon: "⛔", tooltip: "No actions" };

  // ⚠ Warning: potential issue
  const allItemIds = groups.flatMap(g => g.items.map(i => i.id));
  const allGroupIds = groups.map(g => g.id);

  const missingTarget = rule.actions.find(a =>
    a.targetType === "ITEM" && !allItemIds.includes(a.targetId!) ||
    a.targetType === "GROUP" && !allGroupIds.includes(a.targetId!)
  );
  if (missingTarget) return { icon: "⚠", tooltip: "References deleted item/group" };

  const missingSource = rule.conditions.find(c =>
    c.targetType === "ITEM" && !allItemIds.includes(c.targetId) ||
    c.targetType === "GROUP" && !allGroupIds.includes(c.targetId)
  );
  if (missingSource) return { icon: "⚠", tooltip: "References deleted item/group" };

  return { icon: "", tooltip: "" };  // OK
};
```

**Duplicate action:**
```typescript
const handleDuplicate = (rule: IDependencyRule) => {
  const newRule: IDependencyRule = {
    ...rule,
    id: `rule-${Date.now()}`,
    name: `${rule.name} (copy)`,
    priority: rule.priority - 1,  // Slightly lower priority
    conditions: rule.conditions.map(c => ({ ...c, id: `cond-${Date.now()}-${Math.random()}` })),
    actions: rule.actions.map(a => ({ ...a, id: `act-${Date.now()}-${Math.random()}` })),
  };
  onRulesChange([...rules, newRule]);
};
```

---

## 7. Chart Modal (`dependency-chart-modal/`)

### 7.1 Modal Registration

Add to `/domains/inventory/products/modals/modals.ts`:

```typescript
export const DEPENDENCY_CHART_MODAL_TYPE = 'dependency-chart';
export const useDependencyChartModal = createModalStackHook(DEPENDENCY_CHART_MODAL_TYPE);
```

### 7.2 Draft State (Cancel actually cancels!)

Modal maintains local draft state, only commits on Save:

```typescript
const DependencyChartModal = ({ groups, rules, onSave, onCancel }) => {
  // Draft state - changes don't affect parent until Save
  const [draftRules, setDraftRules] = useState<IDependencyRule[]>(rules);

  const updateDraftRule = useCallback((ruleId: string, updater: (r: IDependencyRule) => IDependencyRule) => {
    setDraftRules(prev => prev.map(r => r.id === ruleId ? updater(r) : r));
  }, []);

  const handleSave = () => {
    onSave(draftRules);  // Commit to parent
  };

  const handleCancel = () => {
    onCancel();  // Discard all changes
  };

  // Graph derived from draftRules (not parent rules)
  const { nodes, edges } = useDerivedGraph(groups, draftRules);
};
```

### 7.3 Modal Layout (index.tsx)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Dependency Rules Chart                                [Auto-layout] [✕ Close]│
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┬──────────────────────────────┐ │
│ │ CHART (React Flow)                        │ INSPECTOR (Sidebar)          │ │
│ │ ┌───────────────────────────────────────┐ │ ┌──────────────────────────┐ │ │
│ │ │ [ItemNode A] ───selected───> [Rule#1] │ │ │ Rule #1                  │ │ │
│ │ │                              │        │ │ │ [Enabled ◉]  Prio [200]  │ │ │
│ │ │                          disable      │ │ │ Name [Premium locks]     │ │ │
│ │ │                              ↓        │ │ ├──────────────────────────┤ │ │
│ │ │                         [ItemNode B]  │ │ │ WHEN                     │ │ │
│ │ │                                       │ │ │ [Item A] [selected ▼]    │ │ │
│ │ │  [MiniMap] [Controls]                 │ │ │ + Add condition          │ │ │
│ │ └───────────────────────────────────────┘ │ ├──────────────────────────┤ │ │
│ │                                           │ │ THEN                     │ │ │
│ │                                           │ │ 1) [disable] [Item B ▼]  │ │ │
│ │                                           │ │ + Add action             │ │ │
│ │                                           │ └──────────────────────────┘ │ │
│ └───────────────────────────────────────────┴──────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Cancel]                                              [Save changes]         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 React Flow Setup

```typescript
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const nodeTypes = {
  item: ItemNode,
  group: GroupNode,
  rule: RuleNode,
};

const edgeTypes = {
  dependency: DependencyEdge,
};
```

### 7.4 Node Components

**ItemNode** (`nodes/item-node.tsx`):
```typescript
// Shows: Item name, image thumbnail, base price
// Ports: selected, deselected, qtyChanged (output)
// Style: Compact card with icon
```

**GroupNode** (`nodes/group-node.tsx`):
```typescript
// Shows: Group name, item count, min/max constraints
// Ports: valid, invalid, countsChanged (output)
// Contains: Collapsed list of items (expandable)
```

**RuleNode** (`nodes/rule-node.tsx`):
```typescript
// Shows: Rule name, priority badge, enabled indicator
// Ports: trigger inputs (left), action outputs (right)
// Click: Opens inspector sidebar
```

### 7.5 Inspector Sidebar (`sidebar/rule-inspector.tsx`)

```typescript
interface IRuleInspectorProps {
  rule: IDependencyRule | null;
  groups: IComponentGroup[];
  onRuleChange: (rule: IDependencyRule) => void;
  onClose: () => void;
}
```

---

## 8. Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ EditComponentsModal (index.tsx)                                 │
│   state: dependencyRules[]                                      │
│     ↓                                                           │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ PricingRulesTab                                         │   │
│   │   ├─ PricingTemplates table (existing)                  │   │
│   │   ├─ TieredDiscounts table (existing)                   │   │
│   │   └─ DependencyRulesTable (NEW)                         │   │
│   │         ├─ Edit rule → push DependencyChartModal        │   │
│   │         └─ Open Chart → push DependencyChartModal       │   │
│   └─────────────────────────────────────────────────────────┘   │
│                          ↓ modal stack                          │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ DependencyChartModal                                    │   │
│   │   ├─ React Flow canvas (DERIVED from rules)             │   │
│   │   └─ RuleInspector sidebar (edit selected rule)         │   │
│   │         └─ onSave → pop() with updated rules            │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 8.1 Graph is DERIVED (Critical!)

**Do NOT store nodes/edges as separate state.** Graph is computed from:
- `groups[]` → ItemNodes, GroupNodes
- `dependencyRules[]` → RuleNodes + Edges

```typescript
// hooks/use-derived-graph.ts
const useDerivedGraph = (
  groups: IComponentGroup[],
  rules: IDependencyRule[]
) => {
  return useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // 1. Create item/group nodes from groups
    groups.forEach(group => {
      nodes.push({
        id: `group:${group.id}`,
        type: "group",
        data: { group },
        position: { x: 0, y: 0 }, // auto-layout later
      });

      group.items.forEach(item => {
        nodes.push({
          id: `item:${item.id}`,
          type: "item",
          data: { item, groupId: group.id },
          position: { x: 0, y: 0 },
        });
      });
    });

    // 2. Create rule nodes + edges from rules
    rules.forEach(rule => {
      nodes.push({
        id: `rule:${rule.id}`,
        type: "rule",
        data: { rule },
        position: { x: 0, y: 0 },
      });

      // Edges: condition sources → rule
      rule.conditions.forEach(cond => {
        edges.push({
          id: `cond:${cond.id}`,
          source: `${cond.targetType.toLowerCase()}:${cond.targetId}`,
          target: `rule:${rule.id}`,
          label: formatConditionLabel(cond),
          type: "dependency",
        });
      });

      // Edges: rule → action targets
      rule.actions.forEach(action => {
        edges.push({
          id: `action:${action.id}`,
          source: `rule:${rule.id}`,
          target: `${action.targetType.toLowerCase()}:${action.targetId}`,
          label: formatActionLabel(action),
          type: "dependency",
        });
      });
    });

    return { nodes, edges };
  }, [groups, rules]);
};
```

**Benefits:**
- Single source of truth (`dependencyRules`)
- No sync bugs between graph state and rule data
- Editing in sidebar → rules update → graph re-renders automatically

### 8.2 Handle-Based Connect (determines condition/action type)

Nodes have typed handles so `onConnect` knows what to create:

**ItemNode handles:**
```typescript
// Output handles (for conditions)
"cond:selected"      // → IS_SELECTED
"cond:notSelected"   // → IS_NOT_SELECTED
"cond:qty"           // → QTY_GTE (opens qty input)

// Input handles (for actions)
"act:availability"   // → ENABLE/DISABLE
"act:visibility"     // → SHOW/HIDE
"act:price"          // → OVERRIDE_PRICE/ADJUST_PRICE
"act:qty"            // → SET_QTY
```

**GroupNode handles:**
```typescript
// Output handles
"cond:valid"         // → GROUP_VALID
"cond:invalid"       // → GROUP_INVALID
"cond:countUnique"   // → GROUP_UNIQUE_GTE
"cond:countTotal"    // → GROUP_TOTAL_QTY_GTE

// Input handles
"act:visibility"     // → SHOW/HIDE
"act:availability"   // → ENABLE/DISABLE
```

**RuleNode handles:**
```typescript
"in"    // single input for all conditions
"out"   // single output for all actions
```

**Connect logic:**
```typescript
const onConnect = useCallback((connection: Connection) => {
  const [sourceType, sourceId] = connection.source!.split(":");
  const [targetType, targetId] = connection.target!.split(":");
  const sourceHandle = connection.sourceHandle;
  const targetHandle = connection.targetHandle;

  // Item/Group → Rule = add condition
  if (targetType === "rule" && sourceHandle?.startsWith("cond:")) {
    const conditionType = handleToConditionType(sourceHandle);
    // e.g. "cond:selected" → IS_SELECTED

    const newCondition: IDependencyCondition = {
      id: `cond-${Date.now()}`,
      conditionType,
      targetType: sourceType.toUpperCase() as DependencyTargetType,
      targetId: sourceId,
      // value: prompted if conditionType needs it (QTY_GTE, etc.)
    };

    updateDraftRule(targetId, rule => ({
      ...rule,
      conditions: [...rule.conditions, newCondition],
    }));
  }

  // Rule → Item/Group = add action
  if (sourceType === "rule" && targetHandle?.startsWith("act:")) {
    const actionType = handleToActionType(targetHandle);
    // e.g. "act:availability" → DISABLE (default, editable in sidebar)

    const newAction: IDependencyAction = {
      id: `act-${Date.now()}`,
      actionType,
      targetType: targetType.toUpperCase() as DependencyTargetType,
      targetId,
    };

    updateDraftRule(sourceId, rule => ({
      ...rule,
      actions: [...rule.actions, newAction],
    }));

    // Open sidebar to configure action details
    setSelectedRuleId(sourceId);
  }
}, [updateDraftRule, setSelectedRuleId]);
```

Edge appears automatically via derived graph. Sidebar opens for fine-tuning.

### 8.3 Simple Column Layout (no dagre dependency)

```typescript
// hooks/use-column-layout.ts
const COLUMN_X = { items: 0, rules: 350, bundle: 700 };
const NODE_HEIGHT = 80;
const NODE_GAP = 20;

export const useColumnLayout = (nodes: Node[]): Node[] => {
  return useMemo(() => {
    // Group nodes by type
    const itemNodes = nodes.filter(n => n.type === "item" || n.type === "group");
    const ruleNodes = nodes.filter(n => n.type === "rule");
    const bundleNodes = nodes.filter(n => n.type === "bundle");

    // Position items in left column
    itemNodes.forEach((node, i) => {
      node.position = { x: COLUMN_X.items, y: i * (NODE_HEIGHT + NODE_GAP) };
    });

    // Position rules in center column
    ruleNodes.forEach((node, i) => {
      node.position = { x: COLUMN_X.rules, y: i * (NODE_HEIGHT + NODE_GAP) };
    });

    // Position bundle in right column (single node)
    bundleNodes.forEach((node, i) => {
      node.position = { x: COLUMN_X.bundle, y: i * (NODE_HEIGHT + NODE_GAP) };
    });

    return [...itemNodes, ...ruleNodes, ...bundleNodes];
  }, [nodes]);
};
```

Layout:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Item A      │────▶│ Rule #1     │────▶│ Bundle      │
└─────────────┘     └─────────────┘     └─────────────┘
┌─────────────┐     ┌─────────────┐
│ Item B      │────▶│ Rule #2     │
└─────────────┘     └─────────────┘
┌─────────────┐
│ Group X     │
└─────────────┘
```

---

## 9. ID Mappings (Temp IDs → Server IDs)

When saving, server returns `idMappings: Map<tempId, realId>`.
Dependency rules reference `targetId` which may be temp IDs.

```typescript
// utils/apply-id-mappings.ts
export const applyIdMappingsToDependencyRules = (
  rules: IDependencyRule[],
  idMappings: Map<string, string>
): IDependencyRule[] => {
  return rules.map(rule => ({
    ...rule,
    conditions: rule.conditions.map(cond => ({
      ...cond,
      targetId: idMappings.get(cond.targetId) ?? cond.targetId,
    })),
    actions: rule.actions.map(action => ({
      ...action,
      targetId: idMappings.get(action.targetId) ?? action.targetId,
    })),
  }));
};

// Usage in save handler:
const handleSave = async () => {
  const result = await saveComponents({ groups, pricingTemplates, ... });

  // Apply mappings to rules before storing
  const mappedRules = applyIdMappingsToDependencyRules(
    dependencyRules,
    result.idMappings
  );

  // Now rules have real server IDs
};
```

---

## 10. Implementation Phases

### Phase 1: Foundation (MVP)
1. Install `@xyflow/react`
2. Add types to `types.ts`
3. Add `dependencyRules` state to `index.tsx`
4. Create `DependencyRulesTable` with basic CRUD
5. Inline editing in table (no chart yet)
6. Add `applyIdMappingsToDependencyRules` utility

### Phase 2: Chart Modal
1. Register `DependencyChartModal` in modal stack
2. Create `useDerivedGraph` hook (rules → nodes/edges)
3. Create `useColumnLayout` hook (simple 3-column positioning)
4. Read-only visualization with draft state
5. Node components with typed handles

### Phase 3: Interactive Editing
1. Add `RuleInspector` sidebar
2. Click rule node → edit in sidebar
3. Handle-based `onConnect` (creates typed conditions/actions)
4. Graph auto-updates via derived state

### Phase 4: Advanced Features
1. Rule validation (detect conflicts, cycles)
2. Priority drag-reorder in table
3. Copy/duplicate rules
4. Bulk enable/disable

---

## 11. Key Files to Edit

| File | Action | Description |
|------|--------|-------------|
| `types.ts` | MODIFY | Add dependency rule types |
| `index.tsx` | MODIFY | Add `dependencyRules` state, pass to tab |
| `pricing-rules-tab.tsx` | MODIFY | Add DependencyRulesTable section |
| `components/index.ts` | MODIFY | Export new components |
| `dependency-rules-table.tsx` | CREATE | Rules table with inline editing, status, duplicate |
| `utils/apply-id-mappings.ts` | CREATE | ID mapping helper |
| `dependency-chart-modal/index.tsx` | CREATE | Modal with draft state |
| `dependency-chart-modal/hooks/use-derived-graph.ts` | CREATE | Rules → nodes/edges |
| `dependency-chart-modal/hooks/use-column-layout.ts` | CREATE | Simple 3-column layout |
| `dependency-chart-modal/nodes/*.tsx` | CREATE | ItemNode, GroupNode, RuleNode with handles |
| `modals/modals.ts` | MODIFY | Register chart modal hook |

---

## 12. Dependencies

```json
{
  "@xyflow/react": "^12.x"
}
```

No additional dependencies needed — uses existing:
- `antd` (Table, Select, Input, Button, etc.)
- `antd-style` (createStyles)
- `@ant-design/icons`

---

## 13. Example Rules

### Example 1: Premium locks basics (disable B, C when A selected)

```typescript
const premiumLocksRule: IDependencyRule = {
  id: "rule-1",
  name: "Premium locks basics",
  enabled: true,
  priority: 200,
  conditions: [
    {
      id: "cond-1",
      conditionType: DependencyConditionType.IS_SELECTED,
      targetType: DependencyTargetType.ITEM,
      targetId: "item-premium-a",
    }
  ],
  actions: [
    {
      id: "act-1",
      actionType: DependencyActionType.DISABLE,
      targetType: DependencyTargetType.ITEM,
      targetId: "item-basic-b",
      label: "Not compatible with Premium",
    },
    {
      id: "act-2",
      actionType: DependencyActionType.DISABLE,
      targetType: DependencyTargetType.ITEM,
      targetId: "item-basic-c",
      label: "Not compatible with Premium",
    }
  ],
};
```

### Example 2: Combo discount (A+B+C = 20% off)

```typescript
const comboDiscountRule: IDependencyRule = {
  id: "rule-2",
  name: "ABC combo deal",
  enabled: true,
  priority: 200,
  conditions: [
    { id: "c1", conditionType: DependencyConditionType.IS_SELECTED, targetType: DependencyTargetType.ITEM, targetId: "itemA" },
    { id: "c2", conditionType: DependencyConditionType.IS_SELECTED, targetType: DependencyTargetType.ITEM, targetId: "itemB" },
    { id: "c3", conditionType: DependencyConditionType.IS_SELECTED, targetType: DependencyTargetType.ITEM, targetId: "itemC" },
  ],
  actions: [
    {
      id: "a1",
      actionType: DependencyActionType.ADJUST_PRICE,
      targetType: DependencyTargetType.BUNDLE,
      // targetId omitted for BUNDLE (implicit)
      priceType: ComponentPriceType.DISCOUNT_PERCENT,
      priceValue: 20,
      exclusiveKey: "bundleDiscount",
      applyTo: "COMPONENTS_SUBTOTAL",
      label: "ABC Combo: 20% off",
    }
  ],
};
```

### Example 3: Item quantity-based rule (show Extras when item qty >= 3)

```typescript
const qtyBasedRule: IDependencyRule = {
  id: "rule-3",
  name: "Bulk extras unlock",
  enabled: true,
  priority: 100,
  conditions: [
    {
      id: "c1",
      conditionType: DependencyConditionType.QTY_GTE,
      targetType: DependencyTargetType.ITEM,
      targetId: "itemA",
      value: 3,
    }
  ],
  actions: [
    {
      id: "a1",
      actionType: DependencyActionType.SHOW,
      targetType: DependencyTargetType.GROUP,
      targetId: "extrasGroup",
      label: "Unlocked with 3+ items",
    }
  ],
};
```

### Example 4: Group-based rule (discount when 5+ unique items in group)

```typescript
const groupDiscountRule: IDependencyRule = {
  id: "rule-4",
  name: "Bulk group discount",
  enabled: true,
  priority: 150,
  conditions: [
    {
      id: "c1",
      conditionType: DependencyConditionType.GROUP_UNIQUE_GTE,  // ← unique items, not total qty
      targetType: DependencyTargetType.GROUP,
      targetId: "drinksGroup",
      value: 5,
    }
  ],
  actions: [
    {
      id: "a1",
      actionType: DependencyActionType.ADJUST_PRICE,
      targetType: DependencyTargetType.BUNDLE,
      priceType: ComponentPriceType.DISCOUNT_PERCENT,
      priceValue: 10,
      exclusiveKey: "groupDiscount",
      applyTo: "COMPONENTS_SUBTOTAL",
      label: "5+ drinks: 10% off",
    }
  ],
};
```
