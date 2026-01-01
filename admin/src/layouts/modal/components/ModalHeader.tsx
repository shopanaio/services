import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { useEntityDrawer } from '@src/layouts/drawers/hooks/useEntityDrawer';
import { Badge, Button, ButtonProps, Typography } from 'antd';
import { ReactNode } from 'react';
import { MdArrowBack } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export interface IModalHeaderProps {
  children?: ReactNode;
  title: ReactNode;
  onClose?: () => void;
  statusSelectProps?: ReactNode;
  submitButtonProps?: ButtonProps | null;
  onSubmitAndExit?: () => void;
  extra?: ReactNode;
  name?: string;
  badgeCount?: number;
}

export const ModalHeader = ({
  name,
  title,
  submitButtonProps,
  onSubmitAndExit,
  extra = null,
  badgeCount = 0,
}: IModalHeaderProps) => {
  const { close } = useEntityDrawer();
  const { formatMessage } = useIntl();

  return (
    <div
      css={css`
        display: flex;
        padding: var(--x4);
        justify-content: space-between;
        align-items: center;
        background: var(--bg-gradient);
        border-bottom: 1px solid var(--color-gray-4);
      `}
    >
      <Flex gap="3" align="center">
        <Button
          icon={<MdArrowBack />}
          onClick={close}
          data-testid={`close-${name ? `${name}-` : ''}modal-button`}
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
            css={css`
              padding-right: var(--x3);
            `}
            ellipsis={{ rows: 1 }}
            style={{
              maxWidth: '1000px',
            }}
          >
            {title}
          </Typography.Title>
        </Badge>
      </Flex>
      <Flex gap="4" align="center">
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
                {formatMessage({ id: t('layouts.common.saveAndExit') })}
              </Button>
            )}
            <Button
              data-testid={`submit-${name ? `${name}-` : ''}form-button`}
              type="primary"
              children={formatMessage({ id: t('layouts.common.save') })}
              {...submitButtonProps}
            />
          </>
        )}
      </Flex>
    </div>
  );
};
