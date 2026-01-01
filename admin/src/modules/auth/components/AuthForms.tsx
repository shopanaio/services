import { useState } from 'react';
import { ForgotPasswordForm } from '@modules/auth/components/ForgotPasswordForm';
import { Box } from '@components/utility/Box';
import { SignUpForm } from '@modules/auth/components/SignUpForm';
import { SignInForm } from '@modules/auth/components/SignInForm';
import { Button, Typography } from 'antd';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';
import { Flex } from '@components/utility/Flex';

const { Text, Link } = Typography;

enum AuthType {
  SignIn = 'SignIn',
  SignUp = 'SignUp',
  ForgotPassword = 'ForgotPassword',
}

const useAuth = () => {
  const [authType, setAuthType] = useState(AuthType.SignIn);

  return {
    authType,
    setAuthType,
  };
};

export const AuthForms = () => {
  const { authType, setAuthType } = useAuth();

  if (authType === AuthType.SignIn) {
    return (
      <Box>
        <SignInForm
          onForgotPassword={() => setAuthType(AuthType.ForgotPassword)}
        />
        <Box mt="4">
          <Button
            block
            data-testid="sign-up-button"
            type="link"
            onClick={() => setAuthType(AuthType.SignUp)}
            size="large"
          >
            <Flex gap="2" justify="center">
              <Text>
                <FormattedMessage id={t('auth::button.doNotHaveAnAccount')} />
              </Text>
              <Link>
                <FormattedMessage id={t('auth::button.signUp')} />
              </Link>
            </Flex>
          </Button>
        </Box>
      </Box>
    );
  }

  if (authType === AuthType.SignUp) {
    return (
      <Box>
        <SignUpForm />
        <Box mt="4">
          <Button
            block
            data-testid="sign-in-button"
            type="link"
            onClick={() => setAuthType(AuthType.SignIn)}
            size="large"
          >
            <Flex gap="2" justify="center">
              <Text>
                <FormattedMessage id={t('auth::button.alreadyHaveAnAccount')} />
              </Text>
              <Link>
                <FormattedMessage id={t('auth::button.signIn')} />
              </Link>
            </Flex>
          </Button>
        </Box>
      </Box>
    );
  }

  if (authType === AuthType.ForgotPassword) {
    return <ForgotPasswordForm onSignIn={() => setAuthType(AuthType.SignIn)} />;
  }

  return null;
};
