import { routes } from '@modules/router/routes';
import { Navigate } from 'react-router-dom';

export const AuthRedirect = () => {
  return <Navigate to={routes.login.link} />;
};

export const NotFoundRedirect = () => {
  return <Navigate to={routes.login.link} />;
};
