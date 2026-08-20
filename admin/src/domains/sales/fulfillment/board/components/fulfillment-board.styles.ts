import { createStyles } from "antd-style";

export const useFulfillmentBoardStyles = createStyles(({ css, token }) => ({
  row: css`
    min-height: 100%;
    height: 100%;
    margin-left: -20px;
    padding-left: 16px;
    padding-top: 12px;
    display: flex;
    align-items: flex-start;
    box-sizing: border-box;
  `,
  add: css`
    flex-shrink: 0;
    margin-left: 4px;
    border: none !important;
    box-shadow: ${token.boxShadowTertiary};
  `,
  column: css`
    appearance: none;
    border-radius: 6px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-width: 360px;
    height: calc(100% - 16px);
    outline: none;
  `,
  columnHeader: css`
    padding: 4px;
    display: flex;
    height: 40px;
    min-height: 40px;
    box-shadow: ${token.boxShadowTertiary};
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    border-radius: 6px;
    margin: 0 4px 4px;
  `,
  columnList: css`
    height: calc(100% - 44px);
    min-height: 80px;
    list-style: none;
    margin: 0;
    padding: 0 0 16px;
  `,
  ticketSlot: css`
    padding: 4px;
    box-sizing: border-box;
    width: 100%;
    height: 160px;
  `,
  ticket: css`
    position: relative;
    border-radius: 6px;
    box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.1);
    padding: 12px;
    min-height: 152px;
    max-height: 152px;
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    &:focus-visible {
      outline: 2px solid ${token.colorPrimary};
      outline-offset: -2px;
    }
  `,
  ticketDefault: css`
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
  `,
  ticketBlue: css`
    background: ${token.colorInfoBg};
    border: 1px solid ${token.colorInfoBorder};
  `,
  ticketGreen: css`
    background: ${token.colorSuccessBg};
    border: 1px solid ${token.colorSuccessBorder};
  `,
  ticketOrange: css`
    background: ${token.colorWarningBg};
    border: 1px solid ${token.colorWarningBorder};
  `,
  ticketRed: css`
    background: ${token.colorErrorBg};
    border: 1px solid ${token.colorErrorBorder};
  `,
  ticketPurple: css`
    background: ${token.colorPrimaryBg};
    border: 1px solid ${token.colorPrimaryBorder};
  `,
  ticketCyan: css`
    background: ${token.colorInfoBg};
    border: 1px solid ${token.colorInfoBorder};
  `,
  ticketMagenta: css`
    background: ${token.colorErrorBg};
    border: 1px solid ${token.colorErrorBorder};
  `,
  dragging: css`
    background: ${token.colorFillSecondary};
    border: 1px solid ${token.colorBorder};
  `,
  dragHandle: css`
    position: absolute;
    top: 4px;
    right: 4px;
    opacity: 0.35;
    &:hover,
    &:focus-visible {
      opacity: 1;
    }
  `,
  address: css`
    max-width: 250px;
  `,
  skeleton: css`
    display: flex;
    gap: 4px;
    height: 100%;
    padding-top: 12px;
  `,
  skeletonColumn: css`
    min-width: 360px;
    height: calc(100% - 16px);
  `,
}));
