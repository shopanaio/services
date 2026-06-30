import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
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
  mediaGridOverlay: {
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
  placeholderCell: {
    aspectRatio: "1/1",
    width: "100%",
    borderRadius: token.borderRadius,
    border: `1px dashed ${token.colorBorder}`,
    backgroundColor: token.colorBgLayout,
    boxSizing: "border-box",
  },
  spacerCell: {
    aspectRatio: "1/1",
  },
  uploadCell: {
    aspectRatio: "1/1",
    width: "100%",
    "&& .ant-upload": {
      width: "100%",
      height: "100%",
    },
  },
  mediaItem: {
    position: "relative",
    borderRadius: token.borderRadius,
    overflow: "hidden",
    background: token.colorBgContainer,
    aspectRatio: "1/1",
    cursor: "grab",
    "&:hover .media-actions": {
      opacity: 1,
    },
  },
  mediaItemDragging: {
    opacity: 0.5,
  },
  mediaItemSelected: {
    boxShadow: `inset 0 0 0 1px ${token.colorPrimary}`,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  mediaActions: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 2,
    opacity: 0,
    transition: "opacity 0.2s ease",
  },
  uploadArea: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: token.colorBgLayout,
    border: `2px dashed ${token.colorBorder}`,
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    "&:hover": {
      borderColor: token.colorPrimary,
      background: token.colorPrimaryBg,
    },
  },
  uploadIcon: {
    fontSize: 20,
    color: token.colorIcon,
    marginBottom: 4,
  },
  draggerIcon: {
    fontSize: 24,
    color: token.colorIcon,
    marginBottom: token.marginXS,
  },
  draggerTitle: {
    fontSize: token.fontSizeLG,
  },
  uploadText: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  fileInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "4px 8px",
    background: `linear-gradient(transparent, ${token.colorBgMask})`,
    color: token.colorTextLightSolid,
    fontSize: 10,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  emptyContainer: {
    gridColumn: "1 / -1",
    padding: "40px 20px",
  },
  emptyUploadArea: {
    padding: "40px 20px",
    border: `2px dashed ${token.colorBorder}`,
    borderRadius: token.borderRadius,
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimary,
      background: token.colorPrimaryBg,
    },
  },
  // List view styles
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  listSection: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  listSectionTitle: {
    fontSize: 12,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 8,
    borderRadius: 8,
    border: `1px solid ${token.colorBorder}`,
    background: token.colorBgContainer,
    cursor: "grab",
    "&:hover": {
      background: token.colorBgLayout,
    },
  },
  listItemDragging: {
    opacity: 0.5,
  },
  listItemSelected: {
    borderColor: token.colorPrimary,
  },
  listItemSelectionMode: {
    cursor: "pointer",
  },
  listItemStatic: {
    cursor: "pointer",
  },
  listItemMedia: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  listItemImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    objectFit: "cover",
    flexShrink: 0,
  },
  listItemInfo: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  listItemName: {
    fontSize: 13,
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  listItemMeta: {
    fontSize: 12,
    color: token.colorTextSecondary,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  listItemActions: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  dragHandle: {
    cursor: "grab",
    color: token.colorTextSecondary,
    "&:hover": {
      color: token.colorText,
    },
  },
  emptySelectionState: {
    padding: "12px 8px",
    border: `1px dashed ${token.colorBorder}`,
    borderRadius: 8,
    background: token.colorBgLayout,
  },
}));
