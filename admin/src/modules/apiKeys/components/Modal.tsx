import { ValidationAlert } from '@components/forms/ValidationAlert';
import {
  Alert,
  Button,
  DatePicker,
  Input,
  Modal,
  Select,
  Typography,
} from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { css } from '@emotion/react';
import { Flex } from '@components/utility/Flex';
import { Label } from '@components/forms/Label';
import { useEffect, useState } from 'react';
import { useCreateApiKey } from '@modules/apiKeys/hooks/mutations';
import { IApiKey } from '@src/entity/ApiKey/ApiKey';
import dayjs from 'dayjs';
import { notify } from '@components/feedback/notification';
import { getCopyableProps } from '@components/utility/Copyable';
import { Paper } from '@components/paper/Paper';
import { Box } from '@components/utility/Box';

interface IApiKeyFormValues {
  name: string;
  dueDate: string;
  customDate: dayjs.Dayjs | null;
}

interface IApiKeyModalProps {
  open: boolean;
  onClose: () => void;
  apiKey: IApiKey | null;
}

const format = 'MMM DD, YYYY';
const options = [
  { label: `1 month (${dayjs().add(1, 'month').format(format)})`, value: '1m' },
  {
    label: `6 months (${dayjs().add(6, 'month').format(format)})`,
    value: '6m',
  },
  { label: `1 year (${dayjs().add(1, 'year').format(format)})`, value: '1y' },
  { label: 'Custom', value: 'custom' },
  { label: 'Never', value: 'never' },
];

export const ApiKeyModal = ({ open, apiKey, onClose }: IApiKeyModalProps) => {
  const methods = useForm({ defaultValues: {} as IApiKeyFormValues });

  const [value, setValue] = useState<string | null>(null);
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState, watch, reset } = methods;
  const { createApiKey } = useCreateApiKey();
  const dueDate = watch('dueDate');

  useEffect(() => {
    if (open) {
      setValue(null);
      setErrors({});
      setLoading(false);
      reset({
        name: '',
        dueDate: '1m',
        customDate: dayjs(),
      });
    }
  }, [open, reset]);

  const onOk = handleSubmit(async (data) => {
    try {
      if (!data.name) {
        setErrors({ name: 'Name is required' });
        return;
      }
      if (!data.dueDate || (data.dueDate === 'custom' && !data.customDate)) {
        setErrors({ dueDate: 'Expiration is required' });
        return;
      }

      setErrors({});
      let dueDate = null;
      if (data.dueDate === 'custom') {
        dueDate = data.customDate;
      } else if (data.dueDate === 'never') {
        dueDate = null;
      } else if (data.dueDate === '1m') {
        dueDate = dayjs().add(1, 'month');
      } else if (data.dueDate === '6m') {
        dueDate = dayjs().add(6, 'month');
      } else if (data.dueDate === '1y') {
        dueDate = dayjs().add(1, 'year');
      }

      setLoading(true);
      // Update existing apiKey
      const response = await createApiKey({
        name: data.name,
        dueDate: dueDate ? dueDate.toISOString() : null,
      });
      if (!response.data?.projectMutation.createApiKey) {
        throw new Error();
      }
      setValue(response.data?.projectMutation.createApiKey!!);
    } catch {
      notify.error('Failed to create apiKey');
      onClose();
    } finally {
      setLoading(false);
    }
  });

  if (value) {
    return (
      <Modal
        destroyOnClose
        open={open}
        width={600}
        footer={null}
        title="Api key"
        onCancel={onClose}
        cancelButtonProps={{
          'data-testid': 'modal-cancel-button',
        }}
        okText="Save"
      >
        <Flex direction="column" gap="4" pt="4">
          <Typography.Text
            css={css`
              margin-bottom: 0;
            `}
          >
            Your API key has been created.
          </Typography.Text>
          <Paper>
            <Box px="4" py="2" bg="var(--color-gray-2)">
              <Typography.Text
                type="secondary"
                copyable={getCopyableProps(value)}
              >
                {value}
              </Typography.Text>
            </Box>
          </Paper>

          <Alert
            css={css``}
            style={{
              padding: 'var(--x4)',
            }}
            description="Save this API key in a safe place. You will not be able to see it again."
            type="info"
          />
          <Button type="primary" block onClick={onClose}>
            I have saved my API key
          </Button>
        </Flex>
      </Modal>
    );
  }

  return (
    <Modal
      destroyOnClose
      open={open}
      width={600}
      title={
        <Flex
          data-testid="feature-modal-header"
          align="center"
          justify="space-between"
          w="100%"
          pr="10"
          css={css`
            width: 100%;
          `}
        >
          <Typography.Title level={5}>Create api key</Typography.Title>
        </Flex>
      }
      onOk={onOk}
      onCancel={onClose}
      cancelButtonProps={{
        'data-testid': 'modal-cancel-button',
      }}
      okButtonProps={{
        loading,
        disabled: !formState.isDirty,
        'data-testid': 'modal-submit-button',
      }}
      okText="Save"
    >
      <ValidationAlert errors={errors} />
      <Flex w="100%" direction="column" mt="4">
        <Label required>Token name</Label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => {
            return (
              <Input
                value={field.value}
                onChange={field.onChange}
                placeholder="Enter name"
                data-testid="api-key-name-input"
              />
            );
          }}
        />
      </Flex>
      <Flex w="100%" direction="column" mt="4">
        <Label required>Expiration</Label>
        <Flex gap="4" w="100%">
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => {
              return (
                <Select
                  css={css`
                    min-width: 200px;
                  `}
                  value={field.value}
                  options={options}
                  onChange={field.onChange}
                  data-testid="api-key-expiration-select"
                />
              );
            }}
          />
          {dueDate === 'custom' && (
            <Controller
              name="customDate"
              control={control}
              render={({ field }) => {
                console.log(field.value, 'customDate');
                return (
                  <DatePicker
                    allowClear={false}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select date"
                    data-testid="api-key-expiration-date-picker"
                  />
                );
              }}
            />
          )}
        </Flex>
      </Flex>
    </Modal>
  );
};
