import { css } from '@emotion/react';
import { Button } from 'antd';
import { MouseEventHandler } from 'react';
import { MdArrowDownward, MdArrowForward } from 'react-icons/md';

interface IExpandButtonProps {
  expanded: boolean;
  onClick: MouseEventHandler<HTMLElement>;
  disabled?: boolean;
}

export const ExpandButton = ({
  expanded,
  onClick,
  disabled,
}: IExpandButtonProps) => {
  const Icon = expanded ? MdArrowDownward : MdArrowForward;

  return (
    <Button
      type="text"
      css={css`
        opacity: ${disabled ? 0.7 : 1};
      `}
      data-testid="table-row-expand-button"
      icon={<Icon />}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    />
  );
};
