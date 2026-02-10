// ============================================================================
// Core (Headless)
// ============================================================================

export { usePanelStack, DEFAULT_STACK_CONFIG } from "./core";
export type {
  PanelId,
  PanelAnimationState,
  PanelStackItem,
  PanelStackConfig,
  PanelPosition,
  ActionConfig,
  SelectionPanelData,
  EditingPanelData,
  BuiltInPanelType,
} from "./core";

// ============================================================================
// Components (Building Blocks)
// ============================================================================

export {
  PanelStackContainer,
  PanelWrapper,
  PanelBase,
} from "./components";
export type {
  PanelStackContainerProps,
  PanelWrapperProps,
  PanelBaseProps,
} from "./components";

// ============================================================================
// Presets (Ready-to-use Panels)
// ============================================================================

export { SelectionPanel, EditingPanel } from "./presets";
export type { SelectionPanelProps, EditingPanelProps } from "./presets";

// ============================================================================
// Data Page Integration (Composed)
// ============================================================================

export {
  FloatingPanelStack,
  useDataPagePanels,
} from "./data-page";
export type {
  PanelConfig,
  SelectionPanelConfig,
  EditingPanelConfig,
  CustomPanelConfig,
  FloatingPanelStackProps,
  SelectionState,
  EditingState,
  UseDataPagePanelsOptions,
  UseDataPagePanelsReturn,
} from "./data-page";
