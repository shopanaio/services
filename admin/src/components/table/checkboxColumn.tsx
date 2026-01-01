import { Checkbox } from 'antd';

export interface ICheckboxColumnProps {
  isCheckedItem: (id: number) => boolean;
  onChange: (id: number, checked: boolean) => void;
  checkEverything: () => void;
  checkNothing: () => void;
  checkboxStatus: 'indeterminate' | 'checked' | 'unchecked';
}

export const getCheckboxColumn = <T extends { id: number }>({
  isCheckedItem,
  onChange,
  checkEverything,
  checkNothing,
  checkboxStatus: status,
}: ICheckboxColumnProps) => {
  return {
    render: (_: unknown, { id }: T) => {
      return (
        <Checkbox
          checked={isCheckedItem(id)}
          onChange={({ target }) => {
            onChange(id, (target as HTMLInputElement).checked);
          }}
        />
      );
    },
    title: (
      <Checkbox
        checked={status === 'checked'}
        indeterminate={status === 'indeterminate'}
        onChange={() => {
          if (status === 'unchecked') {
            checkEverything();
            return;
          }

          checkNothing();
        }}
      />
    ),
    width: 50,
  };
};
