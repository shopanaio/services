import { createStyles } from "antd-style";

// ============================================================================
// Media Section Styles
// ============================================================================

export const useMediaStyles = createStyles(({ token }) => ({
  mediaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gridGap: 8,
    position: "relative",
    "& > *:nth-child(1)": {
      gridColumnStart: "span 2",
      gridRowStart: "span 2",
    },
  },
  mediaOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gridGap: 8,
    pointerEvents: "none",
    "& > *:nth-child(1)": {
      gridColumnStart: "span 2",
      gridRowStart: "span 2",
    },
  },
  mediaImage: {
    width: "100%",
    aspectRatio: "1/1",
    objectFit: "cover",
    borderRadius: 4,
  },
  mediaPreview: {
    fontSize: token.fontSizeSM,
  },
  mediaMoreButton: {
    aspectRatio: "1/1",
    background: token.colorBgContainerDisabled,
    borderRadius: 4,
    fontSize: 12,
  },
  mediaFeaturedWrapper: {
    position: "relative",
  },
  uploadCell: {
    aspectRatio: "1/1",
    width: "100%",
  },
  uploadArea: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    background: token.colorBgLayout,
    border: `2px dashed ${token.colorBorder}`,
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxSizing: "border-box" as const,
    "&:hover": {
      borderColor: token.colorPrimary,
      background: token.colorPrimaryBg,
    },
  },
  uploadIcon: {
    fontSize: 20,
    color: token.colorIcon,
  },
}));

// ============================================================================
// Hierarchy Section Styles
// ============================================================================

export const useHierarchyStyles = createStyles(() => ({
  sectionLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    display: "block",
  },
}));

// ============================================================================
// Products Section Styles
// ============================================================================

export const useProductsStyles = createStyles(({ token }) => ({
  productsTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
    overflowX: "auto" as const,
    "& th, & td": {
      padding: "10px 12px",
      textAlign: "left",
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
      verticalAlign: "middle",
    },
    "& th": {
      fontWeight: 500,
      color: token.colorTextSecondary,
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: "0.3px",
      background: token.colorBgContainer,
    },
    "& tbody tr:nth-child(even) td": {
      background: token.colorBgLayout,
    },
    "& tr:last-child td": {
      borderBottom: "none",
    },
    "& tr:hover td": {
      background: token.colorBgLayout,
    },
  },
  productImage: {
    borderRadius: 4,
    objectFit: "cover",
    flexShrink: 0,
  },
  productImagePlaceholder: {
    width: 40,
    height: 40,
    background: token.colorBgContainerDisabled,
    borderRadius: 4,
    flexShrink: 0,
  },
  productTitle: {
    fontSize: 13,
  },
  productSku: {
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
    fontSize: 11,
    color: token.colorTextSecondary,
  },
  stockIcon: {
    fontSize: 10,
  },
  stockLabel: {
    fontSize: 11,
  },
  pagination: {
    padding: "8px 0",
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    marginTop: 8,
  },
  paginationCount: {
    fontSize: 12,
  },
}));
