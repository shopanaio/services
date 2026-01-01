import { FullLogo } from '@components/logo/FullLogo';
import { css } from '@emotion/react';
import { Flex } from 'antd';

interface ISidebarLogoProps {
  isCollapsed: boolean;
}

export const SidebarLogo = ({ isCollapsed }: ISidebarLogoProps) => {
  return (
    <Flex
      data-testid={`sidebar-logo-${isCollapsed ? 'collapsed' : 'expanded'}`}
      css={css`
        margin-top: 22px;
        transform: translateX(${isCollapsed ? 'var(--x5)' : '14px'});
        transition: transform 0.2s ease;

        & > * {
          flex-shrink: 0;
        }
      `}
      gap="var(--x3)"
      align="center"
    >
      <FullLogo noText={isCollapsed} theme="light" size={20} />
    </Flex>
  );
};
