import { createStyles } from "antd-style";

// ============================================================================
// Main Header Styles
// ============================================================================

export const useHeaderStyles = createStyles(({ token }) => ({
  statusTag: {
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 500,
  },
  metaText: {
    fontSize: token.fontSizeSM,
  },
  actionButton: {
    padding: 0,
  },
  productTitle: {},
  divider: {
    marginBlock: token.margin,
  },
  kpiTile: {
    padding: "12px 16px",
    background: token.colorBgElevated,
  },
  kpiTileValue: {
    fontSize: 20,
  },
}));

// ============================================================================
// User Popover Styles
// ============================================================================

export const useUserPopoverStyles = createStyles(({ token }) => ({
  userPopover: {
    padding: "4px 0",
  },
  userAvatar: {
    backgroundColor: token.purple2,
    color: token.purple6,
    flexShrink: 0,
  },
  userName: {
    display: "block",
    fontSize: 14,
    lineHeight: 1.4,
  },
  userEmail: {
    fontSize: 12,
  },
}));

// ============================================================================
// Share Popover Styles
// ============================================================================

export const useSharePopoverStyles = createStyles(() => ({
  sharePopover: {
    width: 340,
  },
  shareInput: {
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
    fontSize: 12,
  },
}));
