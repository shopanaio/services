/**
 * Universal media item interface that works for both local files and server files
 */
export interface IMediaItem {
  id: string;
  url: string;
  name: string;
  size: number;
  ext?: string;
  /** Original file object for local files (before upload) */
  file?: File;
}

export type ViewMode = "grid" | "list";

export interface IEntityMediaGalleryProps {
  /** Current media items */
  value: IMediaItem[];
  /** Called when media items change (reorder, delete, add) */
  onChange: (items: IMediaItem[]) => void;
  /** Current view mode */
  viewMode?: ViewMode;
  /** Called when view mode changes */
  onViewModeChange?: (mode: ViewMode) => void;
  /** Whether to show view mode switcher */
  showViewSwitcher?: boolean;
  /** Whether to show the upload area */
  showUpload?: boolean;
  /** Custom upload handler - receives files, should return new media items */
  onUpload?: (files: File[]) => IMediaItem[] | Promise<IMediaItem[]>;
  /** Called when preview is requested */
  onPreview?: (item: IMediaItem, index: number) => void;
  /** Accept attribute for file input */
  accept?: string;
  /** Whether multiple files can be selected */
  multiple?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Label for cover badge */
  coverLabel?: string;
  /** Whether first item is automatically the cover */
  hasCover?: boolean;
  /** Title shown in Paper header */
  title?: string;
  /** Whether to wrap in Paper component */
  showPaper?: boolean;
  /** Extra content for Paper header */
  headerExtra?: React.ReactNode;
}
