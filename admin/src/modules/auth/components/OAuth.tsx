import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import { GoogleAuthButton } from '@modules/auth/components/GoogleAuthButton';
import { Flex, Typography } from 'antd';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

const { Text } = Typography;

const s = {
  divider: css`
    flex-grow: 1;
    height: 1px;
    background-color: var(--color-gray-3);
  `,
};

export const OAuthButtons = () => {
  return (
    <Box>
      <Box mt="1">
        <GoogleAuthButton />
      </Box>
      <Flex vertical>
        <div css={s.divider} />
        <Text>
          <FormattedMessage id={t('auth::button.or')} />
        </Text>
        <div css={s.divider} />
      </Flex>
    </Box>
  );
};
