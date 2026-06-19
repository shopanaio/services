// =============================================================================
// Dropdown Cell Renderer
// =============================================================================

export {
  DropdownCellRenderer,
  YES_NO_OPTIONS,
} from "./dropdown-cell-renderer";

// =============================================================================
// Dash (empty cell placeholder)
// =============================================================================

export const Dash = () => <span className="ec-dash" />;

// =============================================================================
// Diff Display (oldValue → newValue)
// =============================================================================

interface DiffProps {
  originalValue: number | string | null;
  currentValue: number | string | null;
  isNegative?: boolean;
}

export const Diff = ({ originalValue, currentValue, isNegative }: DiffProps) => (
  <span className="ec-diff">
    <span className="ec-diff__old">{originalValue ?? ""}</span>
    <span className="ec-diff__arrow">→</span>
    <span className={isNegative ? "ec-diff__new--negative" : "ec-diff__new"}>
      {currentValue ?? ""}
    </span>
  </span>
);

// =============================================================================
// Image Placeholder
// =============================================================================

export const ImagePlaceholder = () => <div className="ec-image--placeholder" />;
