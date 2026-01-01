import { useMutation } from '@apollo/client';
import {
  SignUp,
  ApiUserMutationSignUpResponse,
} from '@modules/auth/graphql/signUp';
import { $session } from '@modules/auth/store/session';
import { User } from '@src/entity/User/User';
import { ApiUserMutationSignUpArgs } from '@src/graphql';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface IAuthValues {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const useRegister = () => {
  const [error, setError] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  // const startSession = useSetSession();

  const [signUp, { loading }] = useMutation<
    ApiUserMutationSignUpResponse,
    ApiUserMutationSignUpArgs
  >(SignUp);

  const { control, handleSubmit, watch } = useForm({
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (error) {
      const subscription = watch(() => {
        setError(false);
        subscription.unsubscribe();
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [error, watch]);

  const onSubmit = async (values: IAuthValues) => {
    try {
      const response = await signUp({
        variables: {
          input: {
            email: values.email,
            firstName: values.firstName,
            lastName: values.lastName,
            password: values.password,
            language: 'en',
            timezone: 'Europe/Kiev',
          },
        },
      });

      if (!response.data?.userMutation.signUp.user) {
        throw new Error('user not found');
      }

      setError(false);
      $session.createSession({
        isPersistent: true,
        jwt: response.data?.userMutation.signUp.jwt,
        user: User.create(response.data?.userMutation.signUp.user),
        isFetched: true,
      });
    } catch (e) {
      console.error(e);
      setError(true);
      $session.clearSession({
        isFetched: true,
      });
    }
  };

  return {
    control,
    loading,
    error,
    onSubmit: handleSubmit(onSubmit),
    passwordVisible,
    togglePasswordVisibility: () => setPasswordVisible((prev) => !prev),
  };
};
