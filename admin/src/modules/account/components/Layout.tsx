import { Paper } from '@components/paper/Paper';
import { css } from '@emotion/react';
import { ReactNode } from 'react';

const s = {
  container: css`
    background: var(--bg-gradient);
    width: 100vw;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--x6);
  `,
};

interface IStoresLayoutProps {
  children: ReactNode;
  loading?: boolean;
  className?: string;
}

export const AccountLayout = ({ children }: IStoresLayoutProps) => {
  return (
    <div css={s.container} data-testid="account-layout">
      <Paper
        css={css`
          min-height: 400px;
          max-width: 600px;
          min-height: 700px;
          padding: var(--x6);
          flex-direction: column;
          display: flex;
        `}
      >
        {children}
      </Paper>
    </div>
  );
};
