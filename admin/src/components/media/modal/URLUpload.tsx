import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import { Input } from 'antd';
import { Control, Controller } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface IUrlUploadProps {
  control: Control<{ url: string }>;
}

export const URLUpload = ({ control }: IUrlUploadProps) => {
  const { formatMessage } = useIntl();
  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        gap: var(--x2);
        flex-direction: column;
        padding: var(--x6) 0;
        height: 100%;
      `}
    >
      <Box>
        <Label required>
          <FormattedMessage id={t('media.url.label')} />
        </Label>
        <Controller
          control={control}
          name="url"
          rules={{
            required: formatMessage({ id: t('validation.urlRequired') }),
          }}
          render={({ field, fieldState }) => (
            <div>
              <Input
                data-testid="upload-url-input"
                value={field.value}
                onChange={field.onChange}
                placeholder="https://"
                status={fieldState.invalid ? 'error' : undefined}
              />
              {fieldState.error?.message && (
                <Helper>{fieldState.error.message}</Helper>
              )}
            </div>
          )}
        />
      </Box>
    </div>
  );
};
