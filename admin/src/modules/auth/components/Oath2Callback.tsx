import { useCallback, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { GoogleSignIn } from '@modules/auth/graphql/signIn';
import { $session } from '@modules/auth/store/session';
import { User } from '@src/entity/User/User';
import { notify } from '@components/feedback/notification';
import { router } from '@modules/router/router';
import { routes } from '@modules/router/routes';
import { AppLoader } from '@modules/app/components/Loader';

export const OAuth2Callback = () => {
  const [googleSignIn] = useMutation(GoogleSignIn);

  const onSuccess = useCallback(
    async (token: string) => {
      try {
        const response = await googleSignIn({
          variables: { token },
        });
        if (!response?.data?.userMutation?.googleSignIn?.user) {
          throw new Error('user not found');
        }
        $session.createSession({
          isPersistent: true,
          jwt: response?.data?.userMutation?.googleSignIn?.jwt,
          user: User.create(response?.data?.userMutation?.googleSignIn?.user),
          isFetched: true,
        });
        window.location.assign(routes.stores.url);
      } catch (e) {
        notify.error('An error occurred during authentication.');
        router.navigate(routes.login.link);
        $session.clearSession({
          isFetched: true,
        });
      }
    },
    [googleSignIn],
  );

  useEffect(() => {
    // const hash = popup.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');

    if (code) {
      onSuccess(code);
    }
  }, [onSuccess]);

  return <AppLoader />;
};
