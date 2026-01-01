import { Select } from 'antd';
import { Control, Controller } from 'react-hook-form';

export type IStatusesRecord = Record<
  string,
  { value: string; label: JSX.Element | string; disabled?: boolean }
>;

interface IStatusSelectProps {
  name: string;
  statuses: IStatusesRecord;
  placeholder?: string;
  className?: string;
  control?: Control<any>;
}

export const StatusSelect = ({
  name,
  control,
  statuses,
  placeholder = '',
  className,
}: IStatusSelectProps) => {
  return (
    <Controller
      {...(control ? { control } : {})}
      name={name}
      render={({ field, fieldState }) => {
        return (
          <Select
            className={className}
            value={field.value}
            onChange={field.onChange}
            placeholder={placeholder}
            data-testid="status-select"
            options={Object.values(statuses)
              .filter((it) => !it.disabled)
              .map((it) => ({
                value: it.value,
                label: it.label,
                'data-testid': `${name}-option-${it.value}`,
              }))}
            status={fieldState?.invalid ? 'error' : undefined}
          />
        );
      }}
    />
  );
};
