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
  /** Called when preview is requested */
  onPreview?: (item: ApiFile, index: number) => void;
  /** Accept attribute for file input */
  accept?: string;
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
}
