import { css } from '@emotion/react';
import { Button, Typography } from 'antd';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

import { EmptyState } from '@components/emptyState/EmptyState';
import emailLottie from './open-email.json';
import catlottie from './online-shop.json';

export const NoProjects = () => {
  const { formatMessage } = useIntl();
  return (
    <div
      data-testid="no-projects"
      css={css`
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        margin-top: 80px;
      `}
    >
      <EmptyState
        lottie={catlottie}
        title={formatMessage({ id: t('projects.empty.title') })}
        subtitle={formatMessage({ id: t('projects.empty.subtitle') })}
      />
    </div>
  );
};

export const UserNotVerified = () => {
  const { formatMessage } = useIntl();
  return (
    <div
      css={css`
        margin-top: 80px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: var(--x4);
      `}
    >
      <EmptyState
        lottie={emailLottie}
        data-testid="user-not-verified"
        title={formatMessage({ id: t('projects.userNotVerified.title') })}
        subtitle={formatMessage({ id: t('projects.userNotVerified.subtitle') })}
        footer={
          <>
            <Typography.Text type="secondary">
              {formatMessage({ id: t('projects.userNotVerified.checkInbox') })}
            </Typography.Text>
            <div
              css={css`
                margin-top: 120px;
                display: flex;
                justify-content: center;
                align-items: center;
              `}
            >
              <Typography.Text type="secondary">
                {formatMessage({ id: t('projects.userNotVerified.notReceived') })}
              </Typography.Text>
              <Button type="link" onClick={() => {}}>
                {formatMessage({ id: t('projects.userNotVerified.resend') })}
              </Button>
            </div>
          </>
        }
      />
    </div>
  );
};
