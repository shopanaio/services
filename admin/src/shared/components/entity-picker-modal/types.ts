import type { ColDef } from "ag-grid-community";
import type { IFilterSchema, IFilterValue } from "@/layouts/filters/core/types";

/**
 * Base interface for pickable entities
 * All entities used in picker must implement this
 */
export interface IPickableEntity {
  id: string;
  title: string;
  image?: string | null;
  status?: string;
}

/**
 * Pagination state for entity picker
 */
export interface IEntityPickerPagination {
  total: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
  rangeStart: number;
  rangeEnd: number;
}

/**
 * Data provider hook return type
 */
export interface IEntityPickerDataResult<T extends IPickableEntity> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  pagination: IEntityPickerPagination;
  onNext: () => void;
  onPrev: () => void;
  onPageSizeChange: (size: number) => void;
}

/**
 * Configuration for a specific entity type
 */
export interface IEntityPickerConfig<T extends IPickableEntity> {
  /** Unique entity type identifier */
  entityType: string;
  /** Display name for the entity (singular) */
  entityName: string;
  /** Display name for the entity (plural) */
  entityNamePlural: string;
  /** Filter schema for the entity */
  filterSchema: IFilterSchema[];
  /** Column definitions for AG Grid */
  columns: ColDef<T>[];
  /** Data provider hook */
  useData: (options: {
    filters: IFilterValue[];
    search: string;
    pageSize: number;
  }) => IEntityPickerDataResult<T>;
  /** Get unique row ID */
  getRowId: (entity: T) => string;
}

/**
 * Props for EntityPickerContent component (internal)
 */
export interface IEntityPickerContentProps<T extends IPickableEntity> {
  config: IEntityPickerConfig<T>;
  selectionMode: "single" | "multi";
  initialSelection: string[];
  excludeIds: string[];
  maxSelection?: number;
  onSelectionChange: (selectedIds: string[], selectedEntities: T[]) => void;
}

/**
 * Modal stack payload for entity picker
 */
export interface IEntityPickerPayload<T extends IPickableEntity = IPickableEntity> {
  entityType: string;
  selectionMode?: "single" | "multi";
  initialSelection?: string[];
  excludeIds?: string[];
  maxSelection?: number;
  onConfirm: (entities: T[]) => void;
}

/**
 * Status configuration for StatusCellRenderer
 */
export interface IStatusConfig {
  label: string;
  color: string;
}

export type StatusMap = Record<string, IStatusConfig>;
