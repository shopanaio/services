# План: AG Grid Cell Selection Plugin

## Цель
Создать переиспользуемый плагин для выделения ячеек в AG Grid Community, который можно подключить к любой таблице.

## Требования
- **Drag selection**: Выделение протягиванием мыши по колонке
- **Shift+Click**: Выделение диапазона от последней ячейки
- **Ctrl/Cmd+Click**: Добавление/удаление отдельных ячеек
- **Bulk actions**: Установить значение, Копировать, Очистить
- **Визуализация**: Цветовая подсветка выделенных ячеек
- **Переиспользуемость**: Отдельный модуль, не связанный с bulk-editor

> **Примечание**: AG Grid Community не включает Range Selection (Enterprise feature), поэтому реализуем кастомное выделение через mouse events.

---

## Архитектура плагина

### Расположение
```
src/shared/components/ag-grid-cell-selection/
├── index.ts                      # Public API exports
├── types.ts                      # Типы и интерфейсы
├── useCellSelectionStore.ts      # Zustand store (standalone)
├── useCellSelection.ts           # Основной хук
├── CellSelectionProvider.tsx     # Context provider
├── SelectableCell.tsx            # Wrapper для ячеек
├── SelectionToolbar.tsx          # Toolbar с actions
├── SetValuePopover.tsx           # Popover для ввода значения
└── styles.ts                     # Стили (antd-style)
```

---

## API плагина

### 1. Типы (`types.ts`)

```typescript
export interface ICellSelection {
  rowId: string;
  field: string;
}

export interface ICellSelectionConfig {
  // Ограничить выделение одной колонкой
  singleColumnOnly?: boolean;
  // Колонки, которые можно выделять (если не указано - все)
  selectableColumns?: string[];
  // Callback при изменении выделения
  onSelectionChange?: (cells: ICellSelection[]) => void;
  // Callback для получения значения ячейки (для copy/set value)
  getCellValue?: (rowId: string, field: string) => unknown;
  // Callback для установки значения ячейки
  setCellValue?: (rowId: string, field: string, value: unknown) => void;
}

export interface ICellSelectionApi {
  // Текущее выделение
  selectedCells: ICellSelection[];
  activeColumn: string | null;
  // Проверки
  isCellSelected: (rowId: string, field: string) => boolean;
  hasSelection: () => boolean;
  // Действия
  clearSelection: () => void;
  selectAll: (field: string, rowIds: string[]) => void;
  // Bulk actions
  copySelectedValues: () => Promise<void>;
  setSelectedValues: (value: unknown) => void;
  clearSelectedValues: () => void;
}
```

### 2. Zustand Store (`useCellSelectionStore.ts`)

```typescript
import { create } from "zustand";

interface CellSelectionStore {
  // State
  selectedCells: ICellSelection[];
  isSelecting: boolean;
  selectionAnchor: ICellSelection | null;
  activeColumn: string | null;

  // Internal actions
  startSelection: (rowId: string, field: string) => void;
  extendSelection: (rowId: string, rowIds: string[]) => void;
  endSelection: () => void;
  toggleCell: (rowId: string, field: string) => void;
  selectRange: (endRowId: string, rowIds: string[]) => void;
  clearSelection: () => void;
  selectAll: (field: string, rowIds: string[]) => void;

  // Selectors
  isCellSelected: (rowId: string, field: string) => boolean;
}

// Factory для создания изолированного store
export const createCellSelectionStore = () => create<CellSelectionStore>(...);
```

### 3. Основной хук (`useCellSelection.ts`)

```typescript
import { RefObject } from "react";
import { AgGridReact } from "ag-grid-react";

export const useCellSelection = (
  gridRef: RefObject<AgGridReact>,
  config?: ICellSelectionConfig
): ICellSelectionApi => {
  // Создаёт или использует существующий store
  // Возвращает API для управления выделением
};
```

### 4. Provider (`CellSelectionProvider.tsx`)

```typescript
interface CellSelectionProviderProps {
  gridRef: RefObject<AgGridReact>;
  config?: ICellSelectionConfig;
  children: React.ReactNode;
}

export const CellSelectionProvider: React.FC<CellSelectionProviderProps>;

// Context hook
export const useCellSelectionContext: () => {
  api: ICellSelectionApi;
  handlers: {
    handleMouseDown: (rowId: string, field: string, e: React.MouseEvent) => void;
    handleMouseEnter: (rowId: string, field: string) => void;
  };
};
```

### 5. SelectableCell (`SelectableCell.tsx`)

```typescript
interface SelectableCellProps {
  rowId: string;
  field: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export const SelectableCell: React.FC<SelectableCellProps>;
```

### 6. SelectionToolbar (`SelectionToolbar.tsx`)

```typescript
interface SelectionToolbarProps {
  // Custom actions (в дополнение к стандартным)
  extraActions?: React.ReactNode;
  // Скрыть стандартные кнопки
  hideSetValue?: boolean;
  hideCopy?: boolean;
  hideClear?: boolean;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps>;
```

---

## Использование в bulk-editor

```typescript
// BulkEditorGrid.tsx
import {
  CellSelectionProvider,
  SelectableCell,
  SelectionToolbar,
  useCellSelectionContext,
} from "@/shared/components/ag-grid-cell-selection";

export const BulkEditorGrid: React.FC = () => {
  const gridRef = useRef<AgGridReact>(null);
  const { displayRows, rows } = useBulkEditorData();
  const setFieldValue = useBulkEditorStore((s) => s.setFieldValue);

  const selectionConfig: ICellSelectionConfig = {
    singleColumnOnly: true,
    selectableColumns: ["price", "stock", "sku"], // editable columns
    getCellValue: (rowId, field) => {
      const row = displayRows.find(r => r.id === rowId);
      return row?.[field];
    },
    setCellValue: (rowId, field, value) => {
      const originalRow = rows.find(r => r.id === rowId);
      if (originalRow) {
        setFieldValue(rowId, field, originalRow[field], value);
      }
    },
  };

  return (
    <CellSelectionProvider gridRef={gridRef} config={selectionConfig}>
      <SelectionToolbar />
      <AgGridReact
        ref={gridRef}
        rowData={displayRows}
        columnDefs={columns}
        // ...
      />
    </CellSelectionProvider>
  );
};

// В cell renderer:
export const PriceCellRenderer: React.FC<Props> = (props) => {
  const { data, colDef } = props;

  return (
    <SelectableCell rowId={data.id} field={colDef.field}>
      {/* existing content */}
    </SelectableCell>
  );
};
```

---

## План реализации

### Шаг 1: Создать структуру плагина
**Путь**: `src/shared/components/ag-grid-cell-selection/`
- Создать директорию и базовые файлы
- `index.ts` с exports

### Шаг 2: Типы
**Файл**: `types.ts`
- `ICellSelection`
- `ICellSelectionConfig`
- `ICellSelectionApi`

### Шаг 3: Zustand Store
**Файл**: `useCellSelectionStore.ts`
- Factory `createCellSelectionStore()`
- Вся логика выделения (start, extend, toggle, range, clear)
- Selectors

### Шаг 4: Стили
**Файл**: `styles.ts`
- `useSelectionStyles()` с antd-style
- Стили для selected cells, toolbar

### Шаг 5: Основной хук
**Файл**: `useCellSelection.ts`
- Интеграция с AG Grid API
- `getVisibleRowIds()`
- Mouse event handlers
- Возврат `ICellSelectionApi`

### Шаг 6: Provider и Context
**Файл**: `CellSelectionProvider.tsx`
- Context с API и handlers
- Global mouseup listener
- Body class для prevent text selection

### Шаг 7: SelectableCell
**Файл**: `SelectableCell.tsx`
- Wrapper компонент
- Mouse events
- Selected styling

### Шаг 8: SelectionToolbar
**Файл**: `SelectionToolbar.tsx`
- Count display
- Set Value, Copy, Clear buttons

### Шаг 9: SetValuePopover
**Файл**: `SetValuePopover.tsx`
- Input для значения
- Apply to selected

### Шаг 10: Интеграция в bulk-editor
**Файл**: `bulk-editor/components/BulkEditorGrid.tsx`
- Обернуть в `CellSelectionProvider`
- Обновить cell renderers с `SelectableCell`

---

## Файлы

| Файл | Тип |
|------|-----|
| `shared/components/ag-grid-cell-selection/index.ts` | NEW |
| `shared/components/ag-grid-cell-selection/types.ts` | NEW |
| `shared/components/ag-grid-cell-selection/useCellSelectionStore.ts` | NEW |
| `shared/components/ag-grid-cell-selection/useCellSelection.ts` | NEW |
| `shared/components/ag-grid-cell-selection/styles.ts` | NEW |
| `shared/components/ag-grid-cell-selection/CellSelectionProvider.tsx` | NEW |
| `shared/components/ag-grid-cell-selection/SelectableCell.tsx` | NEW |
| `shared/components/ag-grid-cell-selection/SelectionToolbar.tsx` | NEW |
| `shared/components/ag-grid-cell-selection/SetValuePopover.tsx` | NEW |
| `bulk-editor/components/BulkEditorGrid.tsx` | MODIFY |
| `bulk-editor/components/cell-renderers/index.tsx` | MODIFY |
