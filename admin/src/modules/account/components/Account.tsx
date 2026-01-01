import { CreateAccountForm } from '@modules/account/components/CreateAccountForm';
import { AccountForm } from '@modules/account/components/Form';
import { AccountFormSkeleton } from '@modules/account/components/FormSkeleton';
import { AccountLayout } from '@modules/account/components/Layout';
import { $session } from '@modules/auth/store/session';
import { useSelector } from '@reframework/qx';
import { useInitialDelay } from '@src/hooks/useInitialDelay';
import { useMemo } from 'react';

const Account = () => {
  const ready = useInitialDelay();
  const { user } = useSelector($session.session);

  const isUserReady = !!user?.isReady;

  const form = useMemo(() => {
    if (!ready || !user) {
      return <AccountFormSkeleton />;
    }

    if (!isUserReady) {
      return <CreateAccountForm user={user} />;
    }

    return <AccountForm user={user} />;
  }, [user, ready, isUserReady]);

  return <AccountLayout loading={!ready || !user}>{form}</AccountLayout>;
};

// react.lazy
// eslint-disable-next-line import/no-default-export
export default Account;
