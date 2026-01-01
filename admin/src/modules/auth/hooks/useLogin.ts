import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { $session } from '@modules/auth/store/session';
import { useMutation } from '@apollo/client';
import {
  SignIn,
  ApiUserMutationSignInResponse,
} from '@modules/auth/graphql/signIn';
import { User } from '@src/entity/User/User';
import { ApiUserMutationSignInArgs } from '@src/graphql';

interface FormValues {
  email: string;
  password: string;
  isPersistent: boolean;
}

export const useLogin = () => {
  const [error, setError] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [signIn, {loading}] = useMutation<
    ApiUserMutationSignInResponse,
    ApiUserMutationSignInArgs
  >(SignIn);

  const { control, handleSubmit } = useForm({
    defaultValues: {
      email: '',
      password: '',
      isPersistent: true,
    },
  });

  const onSubmit = async ({ email, password, isPersistent }: FormValues) => {
    try {
      const response = await signIn({
        variables: {
          input: {
            email,
            password,
          },
        },
      });

      if (!response?.data?.userMutation?.signIn?.user) {
        throw new Error('user not found');
      }

      setError(false);
      $session.createSession({
        isPersistent,
        jwt: response?.data?.userMutation?.signIn?.jwt,
        user: User.create(response?.data?.userMutation?.signIn?.user),
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
    error,
    onSubmit: handleSubmit(onSubmit),
    passwordVisible,
    loading,
    togglePasswordVisibility: () => setPasswordVisible((prev) => !prev),
  };
};
