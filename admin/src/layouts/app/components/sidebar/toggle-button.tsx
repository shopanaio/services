import { ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { createStyles } from 'antd-style';

const useStyles = createStyles(({ token }) => ({
  trigger: {
    background: token.colorFillTertiary,
    boxShadow: token.boxShadowTertiary,
    position: 'absolute',
    bottom: 20,
    right: -16,
  },
  button: {
    boxShadow: token.boxShadowTertiary,
    position: 'absolute',
    bottom: 20,
    right: -16,
  },
}));

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
