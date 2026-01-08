'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Input, Select, Button, Typography, Flex, Switch, Alert } from 'antd';
import { PlusOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, RowDragEndEvent, SelectionChangedEvent } from 'ag-grid-community';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createStyles } from 'antd-style';
import { Paper } from '../../components/Paper';
import { PaperHeader } from '../../components/PaperHeader';
import { generateVariants, countPotentialVariants } from './utils/generateVariants';
import type { ISectionProps } from './types';
import type { IOptionInput, IGeneratedVariant } from './utils/generateVariants';

const useStyles = createStyles(({ token }) => ({
  switchRow: {
    padding: 12,
    background: token.colorBgLayout,
    borderRadius: 8,
    marginBottom: 16,
  },
  switchDescription: {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginLeft: 28,
    marginTop: 4,
  },
  optionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionsDescription: {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginBottom: 12,
  },
  optionCard: {
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    background: token.colorBgContainer,
    '&:last-child': {
      marginBottom: 0,
    },
  },
  optionCardDragging: {
    opacity: 0.5,
  },
  optionRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  },
  optionDragHandle: {
    cursor: 'grab',
    color: token.colorTextSecondary,
    padding: '8px 4px',
    '&:hover': {
      color: token.colorText,
    },
  },
  optionField: {
    flex: 1,
  },
  optionFieldLabel: {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginBottom: 4,
  },
  optionDelete: {
    marginTop: 4,
  },
  variantsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  variantsDescription: {
    fontSize: 12,
    color: token.colorTextSecondary,
    marginBottom: 12,
  },
  gridContainer: {
    height: 300,
    width: '100%',
    '& .ag-header': {
      background: token.colorBgLayout,
    },
    '& .ag-row': {
      cursor: 'default',
    },
  },
  tip: {
    marginTop: 12,
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  warningAlert: {
    marginBottom: 12,
  },
}));

// Sortable Option Card Component
interface ISortableOptionCardProps {
  option: IOptionInput;
  index: number;
  onUpdate: (id: string, updates: Partial<IOptionInput>) => void;
  onDelete: (id: string) => void;
}

const SortableOptionCard = ({
  option,
  index,
  onUpdate,
  onDelete,
}: ISortableOptionCardProps) => {
  const { styles, cx } = useStyles();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cx(styles.optionCard, isDragging && styles.optionCardDragging)}
    >
      <div className={styles.optionRow}>
        <span
          className={styles.optionDragHandle}
          {...attributes}
          {...listeners}
        >
          <HolderOutlined />
        </span>

        <div className={styles.optionField} style={{ maxWidth: 160 }}>
          <div className={styles.optionFieldLabel}>Title</div>
          <Input
            placeholder="e.g. Color"
            value={option.name}
            onChange={(e) => onUpdate(option.id, { name: e.target.value })}
          />
        </div>

        <div className={styles.optionField}>
          <div className={styles.optionFieldLabel}>Values</div>
          <Select
            mode="tags"
            placeholder="Type and press Enter"
            tokenSeparators={[',']}
            value={option.values}
            onChange={(values) => onUpdate(option.id, { values })}
            style={{ width: '100%' }}
          />
        </div>

        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          className={styles.optionDelete}
          onClick={() => onDelete(option.id)}
        />
      </div>
    </div>
  );
};

export const VariantsSection = ({ formState, updateFormState }: ISectionProps) => {
  const { styles } = useStyles();
  const gridRef = useRef<AgGridReact>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Regenerate variants when options change
  useEffect(() => {
    if (formState.hasVariants) {
      const newVariants = generateVariants(formState.options);
      // Preserve enabled state for existing variants
      const updatedVariants = newVariants.map((newVar) => {
        const existing = formState.variants.find((v) => v.title === newVar.title);
        return existing ? { ...newVar, enabled: existing.enabled } : newVar;
      });
      updateFormState('variants', updatedVariants);
    }
  }, [formState.options, formState.hasVariants]);

  const handleHasVariantsChange = useCallback(
    (checked: boolean) => {
      updateFormState('hasVariants', checked);
      if (checked) {
        // Add empty option by default
        const emptyOption: IOptionInput = {
          id: `option-${Date.now()}`,
          name: '',
          values: [],
        };
        updateFormState('options', [emptyOption]);
      } else {
        updateFormState('options', []);
        updateFormState('variants', []);
      }
    },
    [updateFormState]
  );

  const handleAddOption = useCallback(() => {
    const newOption: IOptionInput = {
      id: `option-${Date.now()}`,
      name: '',
      values: [],
    };
    updateFormState('options', [...formState.options, newOption]);
  }, [formState.options, updateFormState]);

  const handleUpdateOption = useCallback(
    (id: string, updates: Partial<IOptionInput>) => {
      updateFormState(
        'options',
        formState.options.map((opt) =>
          opt.id === id ? { ...opt, ...updates } : opt
        )
      );
    },
    [formState.options, updateFormState]
  );

  const handleDeleteOption = useCallback(
    (id: string) => {
      updateFormState(
        'options',
        formState.options.filter((opt) => opt.id !== id)
      );
    },
    [formState.options, updateFormState]
  );

  const handleOptionsReorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = formState.options.findIndex((o) => o.id === active.id);
      const newIndex = formState.options.findIndex((o) => o.id === over.id);
      updateFormState('options', arrayMove(formState.options, oldIndex, newIndex));
    }
  };

  const handleVariantSelectionChange = useCallback(
    (event: SelectionChangedEvent) => {
      const selectedIds = new Set(
        event.api.getSelectedRows().map((row: IGeneratedVariant) => row.id)
      );
      updateFormState(
        'variants',
        formState.variants.map((v) => ({
          ...v,
          enabled: selectedIds.has(v.id),
        }))
      );
    },
    [formState.variants, updateFormState]
  );

  const handleRowDragEnd = useCallback(
    (event: RowDragEndEvent) => {
      const { node, overIndex } = event;
      if (overIndex === undefined || overIndex === null) return;

      const data = [...formState.variants];
      const fromIndex = data.findIndex((v) => v.id === node.data.id);
      if (fromIndex === -1) return;

      const [removed] = data.splice(fromIndex, 1);
      data.splice(overIndex, 0, removed);
      updateFormState('variants', data);
    },
    [formState.variants, updateFormState]
  );

  const handleSelectAll = useCallback(() => {
    updateFormState(
      'variants',
      formState.variants.map((v) => ({ ...v, enabled: true }))
    );
    gridRef.current?.api?.selectAll();
  }, [formState.variants, updateFormState]);

  const handleDeselectAll = useCallback(() => {
    updateFormState(
      'variants',
      formState.variants.map((v) => ({ ...v, enabled: false }))
    );
    gridRef.current?.api?.deselectAll();
  }, [formState.variants, updateFormState]);

  // Build dynamic columns based on options
  const columnDefs = useMemo<ColDef<IGeneratedVariant>[]>(() => {
    const baseCols: ColDef<IGeneratedVariant>[] = [
      {
        headerCheckboxSelection: true,
        checkboxSelection: true,
        width: 50,
        pinned: 'left',
        lockPosition: true,
        suppressMovable: true,
      },
      {
        rowDrag: true,
        width: 50,
        pinned: 'left',
        lockPosition: true,
        suppressMovable: true,
      },
      {
        headerName: 'Variant',
        field: 'title',
        flex: 1,
        minWidth: 150,
      },
    ];

    // Add dynamic columns for each option
    const validOptions = formState.options.filter((o) => o.name.trim());
    const optionCols: ColDef<IGeneratedVariant>[] = validOptions.map((opt) => ({
      headerName: opt.name,
      valueGetter: (params) => {
        const optionValue = params.data?.options.find((o) => o.name === opt.name);
        return optionValue?.value || '';
      },
      width: 100,
    }));

    return [...baseCols, ...optionCols];
  }, [formState.options]);

  const onGridReady = useCallback(
    (params: GridReadyEvent) => {
      // Pre-select enabled variants
      params.api.forEachNode((node) => {
        if (node.data?.enabled) {
          node.setSelected(true);
        }
      });
    },
    []
  );

  const potentialVariantCount = countPotentialVariants(formState.options);
  const enabledCount = formState.variants.filter((v) => v.enabled).length;
  const showWarning = potentialVariantCount > 50;

  return (
    <Paper>
      <PaperHeader title="Variants" />

      <div className={styles.switchRow}>
        <Switch
          checked={formState.hasVariants}
          onChange={handleHasVariantsChange}
        />
        <Typography.Text style={{ marginLeft: 8, fontWeight: 500 }}>
          This is a product with variants
        </Typography.Text>
        <div className={styles.switchDescription}>
          When unchecked, we will create a default variant for you
        </div>
      </div>

      {formState.hasVariants && (
        <>
          <div className={styles.optionsHeader}>
            <Typography.Text strong>Product options</Typography.Text>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddOption}
            >
              Add
            </Button>
          </div>
          <div className={styles.optionsDescription}>
            Define the options for the product, e.g. color, size, etc.
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleOptionsReorder}
          >
            <SortableContext
              items={formState.options.map((o) => o.id)}
              strategy={verticalListSortingStrategy}
            >
              {formState.options.map((option, index) => (
                <SortableOptionCard
                  key={option.id}
                  option={option}
                  index={index}
                  onUpdate={handleUpdateOption}
                  onDelete={handleDeleteOption}
                />
              ))}
            </SortableContext>
          </DndContext>

          {formState.variants.length > 0 && (
            <>
              <div className={styles.variantsHeader}>
                <Typography.Text strong>
                  Product variants ({enabledCount}/{formState.variants.length})
                </Typography.Text>
                <Flex gap={8}>
                  <Button size="small" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button size="small" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                </Flex>
              </div>
              <div className={styles.variantsDescription}>
                This ranking will affect the variants&apos; order in your storefront.
              </div>

              {showWarning && (
                <Alert
                  type="warning"
                  message={`You are about to create ${potentialVariantCount} variants. Consider reducing options to improve performance.`}
                  className={styles.warningAlert}
                  showIcon
                />
              )}

              <div className={styles.gridContainer}>
                <AgGridReact
                  ref={gridRef}
                  rowData={formState.variants}
                  columnDefs={columnDefs}
                  rowSelection="multiple"
                  rowDragManaged={true}
                  rowDragEntireRow={true}
                  animateRows={true}
                  suppressRowClickSelection={true}
                  onSelectionChanged={handleVariantSelectionChange}
                  onRowDragEnd={handleRowDragEnd}
                  onGridReady={onGridReady}
                  getRowId={(params) => params.data.id}
                  domLayout="normal"
                  rowHeight={40}
                  headerHeight={40}
                />
              </div>

              <div className={styles.tip}>
                Tip: Variants left unchecked won&apos;t be created. You can always create and edit variants afterwards but this list fits the variations in your product options.
              </div>
            </>
          )}
        </>
      )}
    </Paper>
  );
};
