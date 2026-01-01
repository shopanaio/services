import { useForm } from 'react-hook-form';
import { $session } from '@modules/auth/store/session';
import { useMutation } from '@apollo/client';
import {
  ApiMutationForgotPasswordResponse,
  ForgotPassword,
} from '@modules/auth/graphql/forgotPassword';
import { ApiUserMutationForgotPasswordArgs } from '@src/graphql';
import { useState } from 'react';

interface FormValues {
  email: string;
}

export const useForgotPassword = () => {
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [forgotPassword, { loading }] = useMutation<
    ApiMutationForgotPasswordResponse,
    ApiUserMutationForgotPasswordArgs
  >(ForgotPassword);

  const { control, handleSubmit } = useForm({
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async ({ email }: FormValues) => {
    try {
      setError(false);
      const response = await forgotPassword({
        variables: {
          input: {
            email,
          },
        },
      });

      if (!response?.data) {
        throw new Error('User with this email does not exist');
      }
      setSuccess(true);
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
    success,
    error,
    loading,
    onSubmit: handleSubmit(onSubmit),
  };
};
