import { css } from '@emotion/react';
import { ReactNode } from 'react';

const s = {
  paper: css`
    box-sizing: border-box;
    border-radius: var(--radius-base);
    background-color: var(--color-gray-1);
    box-shadow: var(--box-shadow-paper);
    width: 100%;
  `,
};

interface IPaperProps {
  children: ReactNode;
  className?: string;
}

export const Paper = ({ children, className }: IPaperProps) => {
  return (
    <div css={s.paper} className={className}>
      {children}
    </div>
  );
};
