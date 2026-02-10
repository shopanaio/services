import { createStyles } from "antd-style";

export const useStyles = createStyles(({ token }) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: 16,
  },
  optionGroup: {},
  optionGroupDragging: {
    opacity: 0.4,
  },
  dragOverlay: {
    boxShadow: token.boxShadowSecondary,
    borderRadius: 8,
    transform: "scale(1.02)",
    cursor: "grabbing",
  },
  optionGroupHeader: {
    display: "flex",
    alignItems: "center",
    padding: "4px 0",
    background: token.colorBgLayout,
    borderRadius: 8,
    marginBottom: 8,
  },
  optionGroupDragHandle: {
    cursor: "grab",
    color: token.colorTextSecondary,
    display: "flex",
    alignItems: "center",
    "&:hover": {
      color: token.colorText,
    },
    "&:active": {
      cursor: "grabbing",
    },
  },
  inputPrefix: {
    marginLeft: 4,
    marginRight: 8,
  },
  optionGroupName: {
    fontWeight: 500,
    fontSize: 14,
  },
  optionGroupSlug: {
    fontSize: 12,
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
  },
  optionGroupDisplayType: {
    fontSize: 12,
  },
  optionGroupBody: {},
  valuesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  valueRow: {},
  valueRowDragging: {
    opacity: 0.4,
  },
  valueDragHandle: {
    cursor: "grab",
    color: token.colorTextSecondary,
    display: "flex",
    alignItems: "center",
    "&:hover": {
      color: token.colorText,
    },
    "&:active": {
      cursor: "grabbing",
    },
  },
  swatchTrigger: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    cursor: "pointer",
    border: `1px solid ${token.colorBorderSecondary}`,
    overflow: "hidden",
    flexShrink: 0,
    padding: 2,

    "&:hover": {
      borderColor: token.colorPrimary,
    },
  },
  swatchColor: {
    width: "100%",
    height: "100%",
    borderRadius: "100%",
  },
  swatchImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "100%",
  },
  swatchImagePlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: token.colorBgLayout,
    color: token.colorTextSecondary,
    borderRadius: "100%",
    fontSize: 12,
  },
  swatchPopoverContent: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    width: 236,
  },
  swatchColorTabs: {},
  swatchColorTab: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  swatchColorTabDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  swatchDropZone: {
    width: "100%",
    aspectRatio: "1/1",
    "& .ant-upload-drag": {
      height: "100%",
    },
  },
  swatchDraggerIcon: {
    fontSize: 24,
    color: token.colorIcon,
    marginBottom: token.marginXS,
  },
  swatchDraggerTitle: {
    fontSize: token.fontSizeLG,
  },
  swatchImagePreview: {
    position: "relative" as const,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  swatchImagePreviewImg: {
    width: "100%",
    height: 120,
    objectFit: "cover" as const,
    display: "block",
  },
  swatchImageRemove: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    background: token.colorBgMask,
    border: "none",
    borderRadius: 4,
    color: token.colorTextLightSolid,
    "&:hover": {
      background: token.colorBgMask,
      opacity: 0.9,
      color: token.colorTextLightSolid,
    },
  },
}));
