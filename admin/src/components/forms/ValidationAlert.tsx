import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import { Alert, Typography } from 'antd';
import { useEffect, useMemo } from 'react';
import { FieldErrors } from 'react-hook-form';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IValidationAlertProps {
  errors: FieldErrors;
  className?: string;
}

const formatErrors = (
  errors: FieldErrors | Record<string, FieldErrors> | string,
): string[] => {
  if (!errors) {
    return [];
  }

  if (typeof errors === 'string') {
    return [errors];
  }

  if (typeof errors?.message === 'string') {
    return [errors.message];
  }

  if (Array.isArray(errors)) {
    return errors.flatMap(formatErrors);
  }

  if (typeof errors?.root?.message === 'string') {
    return [errors.root.message];
  }

  if (errors?.types) {
    return Object.values(errors.types).flatMap(formatErrors);
  }

  if (errors && typeof errors === 'object') {
    return Object.values(errors).flatMap(formatErrors as any);
  }

  return [];
};

export const ValidationAlert = ({
  errors,
  className,
}: IValidationAlertProps) => {
  const { formatMessage } = useIntl();
  const formattedErrors = useMemo(
    () => [...new Set(formatErrors(errors).filter(Boolean))],
    [errors],
  );

  useEffect(() => {
    window.scrollTo({ behavior: 'smooth', top: 0 });
  }, [formattedErrors]);

  if (!formattedErrors.length) {
    return null;
  }

  return (
    <Box className={className}>
      <Alert
        showIcon
        type="error"
        message={formatMessage({ id: t('validation.someFieldsNotValid') })}
        description={
          <ul
            data-testid="validation-alert"
            css={css`
              margin: 0;
            `}
          >
            {formattedErrors.map((error, idx) => (
              <li key={idx} data-testid="validation-alert-error">
                <Typography.Text key={idx}>{error}</Typography.Text>
              </li>
            ))}
          </ul>
        }
      />
    </Box>
  );
};
