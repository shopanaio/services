import { createStyles } from 'antd-style';
import { MdArrowBack } from 'react-icons/md';
import { Badge, Button, ButtonProps, Flex, Typography } from 'antd';
import { ReactNode } from 'react';

const useStyles = createStyles({
  header: {
    display: 'flex',
    padding: 'var(--x4) var(--x6)',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--bg-gradient)',
  },
  title: {
    paddingRight: 'var(--x3)',
    maxWidth: 1000,
  },
});

export interface IDrawerHeaderProps {
  children?: ReactNode;
  title: ReactNode;
  onClose?: () => void;
  statusSelectProps?: ReactNode;
  submitButtonProps?: ButtonProps | null;
  onSubmitAndExit?: () => void;
  extra?: ReactNode;
  name?: string;
  badgeCount?: number;
  saveLabel?: string;
  saveAndExitLabel?: string;
}

export const DrawerHeader = ({
  name,
  title,
  onClose,
  submitButtonProps,
  onSubmitAndExit,
  extra = null,
  badgeCount = 0,
  saveLabel = 'Save',
  saveAndExitLabel = 'Save and exit',
}: IDrawerHeaderProps) => {
  const { styles } = useStyles();

  return (
    <div className={styles.header}>
      <Flex gap="middle" align="center">
        <Button
          icon={<MdArrowBack />}
          onClick={onClose}
          data-testid={`close-${name ? `${name}-` : ''}drawer-button`}
        />
        <Badge
          data-testid="page-title-wrapper"
          data-count={badgeCount}
          color="var(--color-primary-10)"
          count={badgeCount}
          overflowCount={9999}
          offset={[badgeCount > 9 ? 6 : 0, 5]}
        >
          <Typography.Title
            level={4}
            className={styles.title}
            ellipsis={{ rows: 1 }}
          >
            {title}
          </Typography.Title>
        </Badge>
      </Flex>
      <Flex gap="middle" align="center">
        {extra}
        {submitButtonProps !== null && (
          <>
            {onSubmitAndExit && (
              <Button
                loading={submitButtonProps?.loading}
                disabled={submitButtonProps?.disabled}
                onClick={onSubmitAndExit}
                data-testid={`submit-and-exit-${name ? `${name}-` : ''}button`}
              >
                {saveAndExitLabel}
              </Button>
            )}
            <Button
              data-testid={`submit-${name ? `${name}-` : ''}form-button`}
              type="primary"
              children={saveLabel}
              {...submitButtonProps}
            />
          </>
        )}
      </Flex>
    </div>
  );
};
