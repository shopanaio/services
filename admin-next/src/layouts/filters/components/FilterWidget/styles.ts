import { createStyles } from 'antd-style';

export const useStyles = createStyles(({ css }) => ({
  widgetContainer: css`
    border: 1px solid var(--color-border);
    align-items: center;
    background-color: var(--color-gray-1);
    border-radius: var(--radius-base);
    box-shadow: var(--box-shadow-border);
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    gap: var(--x1);
    min-height: 40px;
    outline: 4px solid transparent;
    padding: 3px;
    transition: all 0.2s ease;
    width: 100%;

    &:has(input[data-node-type='ui-filter-search']:focus) {
      outline-color: var(--color-gray-4);
      border-color: var(--color-primary-10);
    }
  `,

  row: css`
    cursor: pointer;
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    padding: var(--x2);
    align-items: center;
    border-bottom: 1px solid var(--color-gray-3);

    &:hover {
      background-color: var(--color-gray-2);
    }

    &:hover button:first-of-type {
      background-color: var(--color-gray-4);
    }
  `,

  header: css`
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    padding: var(--x2);
    align-items: center;
    border-bottom: 1px solid var(--color-gray-3);
  `,

  filterLabelButton: css`
    text-align: left;
    background-color: var(--color-gray-3);
    display: flex;
    align-items: center;
    gap: var(--x3);
  `,

  filterNode: css`
    cursor: pointer;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    overflow: hidden;
    background-color: var(--color-gray-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-base);
    transition: all 0.2s ease;
    box-sizing: border-box;
    outline: 1px solid transparent;

    &:focus,
    &:focus-within {
      outline-color: var(--color-gray-5);
      border-color: var(--color-gray-10);

      & + [data-remove-tag] {
        display: flex;
      }
    }
  `,

  filterNodeLeft: css`
    padding: 0 var(--x2);
    height: 30px;
    display: flex;
    align-items: center;
    background-color: transparent;
    transition: all 0.2s ease;
  `,

  filterNodeCenterWrapper: css`
    --bg: var(--color-gray-1);
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
    padding: 0 var(--x1);
    background-color: var(--bg);
    height: 32px;
    min-width: 50px;
  `,

  filterCloseBadge: css`
    display: none;
    background-color: var(--color-primary-10);
    color: var(--color-primary-1);
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
      background-color: var(--color-primary-9);
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
    font-size: var(--font-size);
    padding: var(--x1) var(--x3);
  `,

  searchInput: css`
    width: unset;
    flex-grow: 1;
  `,
}));

export const cardBodyStyle: React.CSSProperties = {
  boxShadow: 'var(--box-shadow-menu)',
  borderRadius: 'var(--radius-base)',
  padding: 'var(--x4)',
  maxHeight: 'max(calc(100vh - 300px), 400px)',
  overflow: 'auto',
};
