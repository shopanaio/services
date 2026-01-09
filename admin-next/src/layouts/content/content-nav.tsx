import { createStyles } from 'antd-style';
import { Button, Flex, Skeleton, Typography } from 'antd';
import { ReactNode } from 'react';
import { DrawerPaper } from '@/layouts/drawer/components/drawer-paper';
import { DrawerPaperHeader } from '@/layouts/drawer/components/paper-header';

const useStyles = createStyles(({ css, token }, { isActive }: { isActive: boolean }) => ({
  navItem: css`
    cursor: pointer;
    margin-bottom: 1px;
    border-radius: ${token.borderRadius}px;
    padding: 0 ${token.padding}px;
    height: 40px;
    &:hover span {
      text-decoration: underline;
    }
    ${isActive ? `background-color: ${token.colorFillTertiary};` : ''}
  `,
  activeText: css`
    ${isActive ? `color: ${token.colorText};` : ''}
  `,
}));

interface MenuItem {
  id: string;
  title: string;
}

interface IContentNavProps {
  onOpen?: (id: string) => void;
  activeId?: string;
  items: MenuItem[];
  onCreate?: () => void;
  loading?: boolean;
  title?: string;
  createLabel?: string;
  description?: ReactNode;
}

const NavItem = ({
  item,
  isActive,
  onClick,
}: {
  item: MenuItem;
  isActive: boolean;
  onClick: () => void;
}) => {
  const { styles } = useStyles({ isActive });

  return (
    <Flex
      align="center"
      onClick={onClick}
      className={styles.navItem}
      data-testid={`nav-item-${item.id}`}
    >
      <Typography.Text ellipsis className={styles.activeText}>
        {item.title}
      </Typography.Text>
    </Flex>
  );
};

export const ContentNav = ({
  onOpen,
  onCreate,
  activeId,
  items,
  loading,
  title = 'Navigation',
  createLabel = 'Create new',
  description,
}: IContentNavProps) => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader title={title} name="content" />
      <div>
        {loading && <Skeleton title={false} paragraph={{ rows: 3 }} active />}
        {items.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            onClick={() => onOpen?.(item.id)}
          />
        ))}
      </div>
      {onCreate && (
        <div style={{ marginTop: 16 }}>
          <Button onClick={onCreate}>{createLabel}</Button>
        </div>
      )}
      {description && (
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="secondary">{description}</Typography.Text>
        </div>
      )}
    </DrawerPaper>
  );
};
