import { createStyles } from "antd-style";

export const useSelectionStyles = createStyles(({ token }) => ({
  // Wrapper for selectable cells
  selectableCell: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    cursor: "cell",
    userSelect: "none",
    transition: "background-color 0.1s, box-shadow 0.1s",
  },

  // Selected cell highlight
  selected: {
    backgroundColor: token.colorPrimaryBg,
    boxShadow: `inset 0 0 0 2px ${token.colorPrimary}`,
  },

  // Selection toolbar container
  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: token.marginSM,
    padding: `${token.paddingXS}px ${token.paddingSM}px`,
    backgroundColor: token.colorPrimaryBg,
    borderRadius: token.borderRadius,
    marginBottom: token.marginSM,
    border: `1px solid ${token.colorPrimaryBorder}`,
  },

  // Selection count text
  selectionCount: {
    fontSize: token.fontSizeSM,
    color: token.colorPrimary,
    fontWeight: 500,
    marginRight: "auto",
  },

  // Button group in toolbar
  toolbarActions: {
    display: "flex",
    alignItems: "center",
    gap: token.marginXS,
  },

  // Popover content for set value
  setValuePopover: {
    minWidth: 200,
  },

  setValueInput: {
    marginBottom: token.marginSM,
  },

  setValueActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: token.marginXS,
  },
}));

/**
 * Global styles to apply to body during selection
 * Prevents text selection while dragging
 */
export const SELECTING_BODY_CLASS = "ag-grid-cell-selecting";

export const globalSelectingStyles = `
  body.${SELECTING_BODY_CLASS} {
    user-select: none !important;
    -webkit-user-select: none !important;
  }
`;
