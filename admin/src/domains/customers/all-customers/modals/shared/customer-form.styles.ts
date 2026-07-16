import { createStyles } from "antd-style";

export const useCustomerFormStyles = createStyles(({ token }) => ({
  container: { display: "flex", flexDirection: "column", gap: token.marginSM },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: token.margin, "@media (max-width: 620px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
  threeColumns: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: token.margin, "@media (max-width: 720px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
  full: { gridColumn: "1 / -1" },
  field: { minWidth: 0 },
  label: { display: "block", marginBottom: 6, fontWeight: 500 },
  help: { display: "block", marginTop: 4, color: token.colorTextSecondary, fontSize: token.fontSizeSM },
  error: { display: "block", marginTop: 4, color: token.colorError, fontSize: token.fontSizeSM },
  collectionRow: { paddingBlock: token.paddingSM, borderBottom: `1px solid ${token.colorBorderSecondary}`, "&:last-child": { borderBottom: 0 } },
  rowSummary: { minWidth: 0 },
  statusOptions: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", "@media (max-width: 480px)": { gridTemplateColumns: "minmax(0, 1fr)" } },
  statusOption: { minHeight: 52, borderRadius: 0, "&:first-child": { borderStartStartRadius: token.borderRadiusLG, borderEndStartRadius: token.borderRadiusLG }, "&:last-child": { borderStartEndRadius: token.borderRadiusLG, borderEndEndRadius: token.borderRadiusLG }, "@media (max-width: 480px)": { "&:first-child": { borderRadius: `${token.borderRadiusLG}px ${token.borderRadiusLG}px 0 0` }, "&:last-child": { borderRadius: `0 0 ${token.borderRadiusLG}px ${token.borderRadiusLG}px` } } },
  consequence: { padding: token.padding, borderRadius: token.borderRadiusLG, background: token.colorFillTertiary },
  truncationAlert: { marginBottom: token.marginSM },
}));
