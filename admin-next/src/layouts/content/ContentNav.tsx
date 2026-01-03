import { createStyles } from 'antd-style';
import { Button, Flex, Skeleton, Typography } from 'antd';
import { ReactNode } from 'react';
import { DrawerPaper } from '@/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@/layouts/drawer/components/PaperHeader';

const useStyles = createStyles(({ css }, { isActive }: { isActive: boolean }) => ({
  navItem: css`
    cursor: pointer;
    margin-bottom: 1px;
    border-radius: var(--radius-base);
    padding: 0 var(--x4);
    height: 40px;
    &:hover span {
      text-decoration: underline;
    }
    ${isActive ? 'background-color: var(--color-gray-3);' : ''}
  `,
  activeText: css`
    ${isActive ? 'color: var(--color-primary);' : ''}
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
        <div style={{ marginTop: 'var(--x4)' }}>
          <Button onClick={onCreate}>{createLabel}</Button>
        </div>
      )}
      {description && (
        <div style={{ marginTop: 'var(--x4)' }}>
          <Typography.Text type="secondary">{description}</Typography.Text>
        </div>
      )}
    </DrawerPaper>
  );
};
