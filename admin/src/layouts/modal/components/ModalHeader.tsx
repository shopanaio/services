import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { Badge, Button, ButtonProps, Typography } from 'antd';
import { ReactNode } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export interface IModalHeaderProps {
  children?: ReactNode;
  title: ReactNode;
  /** When true, title is rendered as-is without Badge/Typography wrapper */
  rawTitle?: boolean;
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
  rawTitle = false,
  submitButtonProps,
  onSubmitAndExit,
  extra = null,
  badgeCount = 0,
}: IModalHeaderProps) => {
  const { formatMessage } = useIntl();

  return (
    <div
      css={css`
        display: flex;
        padding: ${rawTitle ? '0' : 'var(--x4)'};
        padding-right: var(--x4);
        height: 48px;
        box-sizing: border-box;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-gradient);
        border-bottom: 1px solid var(--color-gray-4);
      `}
    >
      <Flex gap="3" align="center" css={css`height: 100%;`}>
        {rawTitle ? (
          title
        ) : (
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
        )}
      </Flex>
      <Flex gap="4" align="center">
        {extra}
        {submitButtonProps !== null && (
          <>
            {false && onSubmitAndExit && (
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
