import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { GoogleIcon } from '@modules/auth/components/GoogleIcon';
import { useGoogleLogin } from '@modules/auth/hooks/useGoogleLogin';
import { Button } from 'antd';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const GoogleAuthButton = () => {
  const login = useGoogleLogin();

  return (
    <>
      <Button block onClick={() => login()} size="large" shape="round">
        <Flex
          align="center"
          justify="center"
          w="100%"
          css={css`
            position: relative;
          `}
        >
          <GoogleIcon
            size={24}
            css={css`
              position: absolute;
              left: 0;
              top: -2px;
            `}
          />
          <FormattedMessage id={t('auth::button.continueWithGoogle')} />
        </Flex>
      </Button>
    </>
  );
};
