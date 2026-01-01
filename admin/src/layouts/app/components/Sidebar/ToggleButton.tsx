import { ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles({
  trigger: {
    background: 'var(--gray-3)',
    boxShadow: '0 2px 0 0 rgba(0, 0, 0, 0.04)',
    position: 'absolute',
    bottom: 20,
    right: -16,
  },
  button: {
    boxShadow: '0 2px 0 0 rgba(0, 0, 0, 0.04)',
    position: 'absolute',
    bottom: 20,
    right: -16,
  },
});

interface Props {
  isCollapsed?: boolean;
  onClick?: () => void;
}

export const ToggleButton = ({ isCollapsed, onClick }: Props) => {
  const { styles } = useStyles();

  const icon = isCollapsed ? (
    <ArrowRightOutlined size={10} />
  ) : (
    <ArrowLeftOutlined size={10} />
  );

  return (
    <Button
      className={styles.button}
      size="middle"
      icon={icon}
      onClick={onClick}
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      data-testid={
        isCollapsed ? 'expand-sidebar-button' : 'collapse-sidebar-button'
      }
    />
  );
};

export const Trigger = ({ className, ...props }: React.ComponentProps<typeof Button>) => {
  const { styles, cx } = useStyles();
  return <Button className={cx(styles.trigger, className)} {...props} />;
};
