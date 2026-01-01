import { FullLogo } from '@components/logo/FullLogo';
import { Paper } from '@components/paper/Paper';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { UserMenu } from '@modules/account/components/UserMenu';
import { SkeletonTabs } from '@modules/projects/components/SkeletonTabs';
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
    padding: var(--x10);
  `,
  paper: css`
    min-height: 400px;
    max-width: 600px;
    min-height: 700px;
    padding: var(--x6);
    flex-direction: column;
    display: flex;
  `,
  contentBox: css`
    height: 100%;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  `,
};

interface IStoresLayoutProps {
  children: ReactNode;
  userMenu?: boolean;
  loading?: boolean;
  className?: string;
}

export const StoresLayout = ({
  children,
  userMenu = true,
  loading,
}: IStoresLayoutProps) => {
  return (
    <div css={s.container} data-testid="projects-layout">
      <Paper css={s.paper}>
        <Flex justify="space-between" align="center" h="40px">
          <FullLogo size={20} />
          {userMenu && <UserMenu />}
        </Flex>
        <Box css={s.contentBox} mt="10">
          {loading ? <SkeletonTabs /> : children}
        </Box>
      </Paper>
    </div>
  );
};
