import { useCallback } from 'react';

const CLIENT_ID =
  '12833145747-nagqq3cmf2cbkgbvuhelg2tddf6kfu9c.apps.googleusercontent.com';
const REDIRECT_URI = `${window.location.origin}/oauth2/callback`;

export const useGoogleLogin = () => {
  const handleLogin = useCallback(() => {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    const params = {
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
      nonce: Math.random().toString(36).substring(2),
    };

    Object.keys(params).forEach((key) =>
      authUrl.searchParams.append(key, params[key as keyof typeof params]!),
    );

    window.location.assign(authUrl.toString());
  }, []);

  return handleLogin;
};
