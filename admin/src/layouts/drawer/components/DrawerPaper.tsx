import { Paper } from '@components/paper/Paper';
import { css } from '@emotion/react';

interface IDrawerPaperProps {
  children: React.ReactNode;
  className?: string;
}

export const DrawerPaper = ({ children, className }: IDrawerPaperProps) => {
  return (
    <Paper
      className={className}
      css={css`
        padding: var(--x4);
        min-height: 50px;
      `}
    >
      {children}
    </Paper>
  );
};
