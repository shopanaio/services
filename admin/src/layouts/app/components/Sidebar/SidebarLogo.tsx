import { FullLogo } from '@/ui-kit/Logo/FullLogo';
import { Flex } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ css }, { isCollapsed }: { isCollapsed: boolean }) => ({
  logo: css`
    margin-top: 22px;
    transform: translateX(${isCollapsed ? 'var(--x5)' : '10px'});
    transition: transform 0.2s ease;

    & > * {
      flex-shrink: 0;
    }
  `,
}));

interface ISidebarLogoProps {
  isCollapsed: boolean;
}

export const SidebarLogo = ({ isCollapsed }: ISidebarLogoProps) => {
  const { styles } = useStyles({ isCollapsed });

  return (
    <Flex
      data-testid={`sidebar-logo-${isCollapsed ? 'collapsed' : 'expanded'}`}
      className={styles.logo}
      gap="var(--x3)"
      align="center"
    >
      <FullLogo noText={isCollapsed} theme="light" size={20} />
    </Flex>
  );
};
