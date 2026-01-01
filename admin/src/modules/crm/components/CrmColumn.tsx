import { IRenderColumnProps } from '@components/boards/Container/Container';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { ICrmColumn } from '@src/entity/Order/Crm';
import { Badge, Button } from 'antd';
import { CSSProperties, memo } from 'react';
import { MdAdd, MdDragIndicator } from 'react-icons/md';

export const container = css`
  appearance: none;
  /* background-color: var(--color-gray-1); */
  border-radius: var(--radius-base);
  /* box-shadow: var(--box-shadow-paper); */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  font-size: 1em;
  grid-auto-rows: max-content;
  min-height: var(--column-height);
  min-width: 360px;
  outline: none;
  /* overflow: hidden; */
  /* margin-right: var(--x2); */
  /* padding: 0 var(--x1); */
  box-sizing: border-box;
`;

export const header = css`
  padding: var(--x1);
  display: flex;
  height: var(--header-height);
  box-shadow: var(--box-shadow-paper);
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-gray-4);
  background-color: var(--color-gray-1);
  margin-bottom: var(--x2);
  border-radius: var(--radius-base);
  margin: 0 var(--x1) var(--x1);
`;

export const list = css`
  height: calc(var(--column-height) - var(--header-height));
  list-style: none;
  margin: 0;
  padding: 0 0 var(--x4);
`;

export const CrmColumnComponent = memo(
  ({
    handleProps,
    children,
    dragOverlay,
    disabled,
    count = 0,
    data,
    onEdit,
  }: IRenderColumnProps & {
    data: ICrmColumn;
    onEdit: (data: ICrmColumn) => void;
  }) => {
    if (!data) {
      return <div>Internal. No data</div>;
    }

    return (
      <div
        css={container}
        style={
          {
            '--column-height': dragOverlay
              ? '40px'
              : 'calc(var(--container-height) - 16px)',
            '--header-height': '40px',
          } as CSSProperties
        }
      >
        <div css={header}>
          <Flex align="center" data-testid="board-column-header">
            <Button
              data-testid="board-column-drag-handle"
              {...handleProps}
              disabled={disabled}
              type="text"
              icon={<MdDragIndicator />}
            />
            <Button
              data-testid="board-column-title"
              css={css`
                padding: var(--x1) var(--x2);
              `}
              onClick={() => onEdit(data)}
              type="text"
            >
              {data.title}
              <Badge
                data-testid="page-title-wrapper"
                data-count={count}
                color="var(--color-primary-10)"
                count={count}
                overflowCount={9999}
                offset={[0, 0]}
              />
            </Button>
          </Flex>
          {/* <Flex>
            <Button
              onClick={() => onEdit(data)}
              type="text"
              icon={<MdAdd size={18} />}
            />
          </Flex> */}
        </div>
        {!dragOverlay && (
          <div data-testid="board-column" css={list}>
            {children}
          </div>
        )}
      </div>
    );
  },
);
