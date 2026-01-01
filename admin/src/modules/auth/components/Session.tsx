import { $session } from '@modules/auth/store/session';
import { router } from '@modules/router/router';
import { routes } from '@modules/router/routes';
import { useSelector } from '@reframework/qx';
import { Spin } from 'antd';
import { useEffect } from 'react';
import { matchPath } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { ApiMeQueryResponse, Me } from '@modules/auth/graphql/me';
import { User } from '@src/entity/User/User';

interface ISessionProviderProps {
  children: React.ReactNode;
}

export const Session = ({ children }: ISessionProviderProps) => {
  const { isFetched, user } = useSelector($session.session);
  const { data, error } = useQuery<ApiMeQueryResponse>(Me);

  useEffect(() => {
    if (error) {
      $session.clearSession({ isFetched: true });
      console.error(error.message);
      return;
    }

    if (!data) {
      return;
    }

    $session.restoreSession({
      user: User.create(data.userQuery.me),
      isFetched: true,
    });
  }, [data, error]);

  useEffect(() => {
    if (!isFetched) {
      return;
    }

    if (!user) {
      console.warn('No user, redirecting to login');
      if (window.location.pathname.startsWith('/oauth2/callback')) {
        return;
      }

      router.navigate(routes.login.link);
      return;
    }

    if (window.location.pathname.startsWith('/oauth2/callback')) {
      return;
    }

    if (!user.isReady) {
      console.warn('No account, redirecting to account');
      router.navigate(routes.account.link);
      return;
    }

    // TODO: make mapping initial-route -> redirect-route
    if (matchPath(routes.login.route, location.pathname)) {
      router.navigate(routes.stores.link);
    }
  }, [user, isFetched]);

  if (!isFetched) {
    return <Spin />;
  }

  return children as React.ReactElement;
};
