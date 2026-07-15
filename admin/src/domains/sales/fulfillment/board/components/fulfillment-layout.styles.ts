import { createStyles } from "antd-style";

export const useFulfillmentLayoutStyles = createStyles(({ css, token }) => ({
  root: css`
    height: 100vh;
    min-width: 0;
    padding: 16px 16px 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: ${token.colorBgContainer};
  `,
  header: css`
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-shrink: 0;
  `,
  title: css`margin: 0 !important;`,
  filters: css`
    min-height: 57px;
    margin: 0 -15px;
    padding: 16px 16px 1px;
    overflow: hidden;
    flex-shrink: 0;
    background: linear-gradient(180deg, ${token.colorFillAlter} 0%, ${token.colorBgContainer} 100%);
  `,
  viewport: css`
    min-height: 0;
    min-width: 0;
    flex: 1;
    overflow: auto;
  `,
  progress: css`position: absolute; inset: 0 0 auto;`,
}));
