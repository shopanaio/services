import type { MenuProps } from "antd";
import type { ReactNode } from "react";
import type { ApiFile } from "@/graphql/types";

export type ViewMode = "grid" | "list";

export interface IEntityMediaGalleryProps {
  /** Current media items (already uploaded ApiFile objects) */
  value: ApiFile[];
  /** Called when media items change (reorder, delete, add) */
  onChange: (items: ApiFile[]) => void;
  /** Current view mode */
  viewMode?: ViewMode;
  /** Called when view mode changes */
  onViewModeChange?: (mode: ViewMode) => void;
  /** Whether to show view mode switcher */
  showViewSwitcher?: boolean;
  /** Whether to show the upload area */
  showUpload?: boolean;
  /** Whether to show a dedicated upload button in the populated gallery header */
  showUploadButtonInHeader?: boolean;
  /** Whether media can be removed from the gallery */
  allowDelete?: boolean;
  /** Whether media can be promoted to featured */
  allowSetFeatured?: boolean;
  /** Whether checkbox selection is enabled */
  selectionMode?: boolean;
  /** Selected media IDs when selection mode is enabled */
  selectedIds?: string[];
  /** Called when selected media IDs change */
  onSelectedIdsChange?: (ids: string[]) => void;
  /** Called when preview is requested */
  onPreview?: (item: ApiFile, index: number) => void;
  /** Accept attribute for file input */
  accept?: string;
  /** Maximum file size in MB for new uploads */
  maxSize?: number;
  /** Maximum number of media items in the gallery */
  maxFiles?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Label for featured badge */
  featuredLabel?: string;
  /** Whether first item is automatically the featured */
  hasFeatured?: boolean;
  /** Title shown in Paper header */
  title?: string;
  /** Extra content for Paper header */
  headerExtra?: React.ReactNode;
  /** Minimum number of cells to show (fills empty cells with placeholders) */
  minCells?: number;
  /** Optional badge rendered over a grid thumbnail */
  renderItemBadge?: (file: ApiFile, index: number) => ReactNode;
  /** Optional metadata rendered in list mode */
  renderListMeta?: (file: ApiFile, index: number) => ReactNode;
  /** Optional domain-specific menu items appended to built-in item actions */
  getItemMenuItems?: (file: ApiFile, index: number) => MenuProps["items"];
  /** Optional domain-specific item editor */
  onEditItem?: (file: ApiFile, index: number) => void;
  /** Label for the domain-specific item editor */
  editItemLabel?: string;
}
