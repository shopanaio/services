import { Paper } from '@components/paper/Paper';
import { css } from '@emotion/react';

interface IModalPaperProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalPaper = ({ children, className }: IModalPaperProps) => {
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
