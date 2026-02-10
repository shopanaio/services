import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css, token }) => ({
  widgetContainer: css`
    border: 1px solid ${token.colorBorder};
    align-items: center;
    background-color: ${token.colorBgContainer};
    border-radius: ${token.borderRadius}px;
    box-shadow: ${token.boxShadowTertiary};
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    gap: ${token.paddingXXS}px;
    min-height: 40px;
    outline: 4px solid transparent;
    padding: 3px;
    transition: all 0.2s ease;
    width: 100%;

    &:has(input[data-node-type='ui-filter-search']:focus) {
      outline-color: ${token.colorFillSecondary};
      border-color: ${token.colorText};
    }
  `,

  row: css`
    cursor: pointer;
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    padding: ${token.paddingXS}px;
    align-items: center;
    border-bottom: 1px solid ${token.colorFillTertiary};

    &:hover {
      background-color: ${token.colorBgLayout};
    }

    &:hover button:first-of-type {
      background-color: ${token.colorFillSecondary};
    }
  `,

  header: css`
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    padding: ${token.paddingXS}px;
    align-items: center;
    border-bottom: 1px solid ${token.colorFillTertiary};
  `,

  filterLabelButton: css`
    text-align: left;
    background-color: ${token.colorFillTertiary};
    display: flex;
    align-items: center;
    gap: ${token.paddingSM}px;
  `,

  filterNode: css`
    cursor: pointer;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    overflow: hidden;
    background-color: ${token.colorFillTertiary};
    border: 1px solid ${token.colorBorder};
    border-radius: ${token.borderRadius}px;
    transition: all 0.2s ease;
    box-sizing: border-box;
    outline: 1px solid transparent;

    &:focus,
    &:focus-within {
      outline-color: ${token.colorFill};
      border-color: ${token.colorText};

      & + [data-remove-tag] {
        display: flex;
      }
    }
  `,

  filterNodeLeft: css`
    padding: 0 ${token.paddingXS}px;
    height: 30px;
    display: flex;
    align-items: center;
    background-color: transparent;
    transition: all 0.2s ease;
  `,

  filterNodeCenterWrapper: css`
    --bg: ${token.colorBgContainer};
    height: 30px;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
  `,

  filterNodeCenter: css`
    height: 30px;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
    background: linear-gradient(
      to right,
      transparent 49.5%,
      var(--bg) 50%,
      var(--bg) 100%
    );
  `,

  filterNodeRight: css`
    display: flex;
    align-items: center;
    padding: 0 ${token.paddingXXS}px;
    background-color: var(--bg);
    height: 32px;
    min-width: 50px;
  `,

  filterCloseBadge: css`
    display: none;
    background-color: ${token.colorText};
    color: ${token.colorBgContainer};
    width: 18px;
    height: 18px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    cursor: pointer;
    z-index: 9;

    &:focus,
    &:hover,
    &:active {
      display: flex;
    }

    &:hover {
      background-color: ${token.colorTextSecondary};
    }
  `,

  operatorTag: css`
    display: block;
    min-width: 30px !important;
    text-align: center;
  `,

  breadcrumbTag: css`
    margin: 0;
    cursor: pointer;
    font-size: ${token.fontSize}px;
    padding: ${token.paddingXXS}px ${token.paddingSM}px;
  `,

  searchInput: css`
    width: unset;
    flex-grow: 1;
  `,
}));

export const cardBodyStyle: React.CSSProperties = {
  boxShadow: 'var(--ant-box-shadow-secondary)',
  borderRadius: 'var(--ant-border-radius)',
  padding: 16,
  maxHeight: 'max(calc(100vh - 300px), 400px)',
  overflow: 'auto',
};
