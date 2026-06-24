import type { ColDef } from "ag-grid-community";
import type { IFilterSchema, IFilterValue } from "@/layouts/filters/core/types";
import type {
  FilterTransformer,
  OrderByInput,
  SortFieldMapping,
} from "@/hooks";

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

export interface IEntityPickerPageConfig<
  TWhereInput extends object = object,
  TOrderField extends string = string,
> {
  storageKey?: string;
  sortFieldMapping?: SortFieldMapping<TOrderField>;
  buildSearchCondition?: (search: string) => Partial<TWhereInput>;
  filterTransformers?: Record<string, FilterTransformer<TWhereInput>>;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

/**
 * Configuration for a specific entity type
 */
export interface IEntityPickerConfig<
  T extends IPickableEntity,
  TWhereInput extends object = object,
  TOrderField extends string = string,
> {
  /** Unique entity type identifier */
  entityType: string;
  /** Display name for the entity (singular) */
  entityName: string;
  /** Display name for the entity (plural) */
  entityNamePlural: string;
  /** Filter schema for the entity */
  filterSchema: IFilterSchema[];
  /** Whether the search input should be shown */
  searchEnabled?: boolean;
  /** Column definitions for AG Grid */
  columns: ColDef<T>[];
  /** Optional shared page config for server-backed search/filter/sort/pagination */
  pageConfig?: IEntityPickerPageConfig<TWhereInput, TOrderField>;
  /** Data provider hook */
  useData: (options: {
    filters: IFilterValue[];
    search: string;
    pageSize: number;
    first?: number;
    after?: string | null;
    last?: number;
    before?: string | null;
    where?: object | null;
    orderBy?: OrderByInput<string>[] | null;
    goToNextPage?: (endCursor: string) => void;
    goToPrevPage?: (startCursor: string) => void;
    getRangeStart?: (itemCount: number) => number;
    getRangeEnd?: (itemCount: number) => number;
    excludeIds: string[];
    queryMeta?: unknown;
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
  queryMeta?: unknown;
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
  queryMeta?: unknown;
  onConfirm: (entities: T[], ids: string[]) => void;
}

/**
 * Status configuration for StatusCellRenderer
 */
export interface IStatusConfig {
  label: string;
  color: string;
}

export type StatusMap = Record<string, IStatusConfig>;
