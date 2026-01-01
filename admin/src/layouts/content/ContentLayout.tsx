import { Paper } from '@components/paper/Paper';
import { css } from '@emotion/react';
import { Outlet } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const ContentLayout = () => {
  const { formatMessage } = useIntl();

  return (
    <div
      css={css`
        display: grid;
        grid-template-columns: 1fr 200px;
        grid-column-gap: var(--x4);
      `}
      className="content-layout"
    >
      <Outlet />
      <Paper>{formatMessage({ id: t('layouts.content.title') })}</Paper>
    </div>
  );
};
