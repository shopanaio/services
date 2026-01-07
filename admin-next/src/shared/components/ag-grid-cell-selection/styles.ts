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
