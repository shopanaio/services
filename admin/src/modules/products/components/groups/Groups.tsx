import { Paper } from '@components/paper/Paper';
import { ProductGroupsTable } from '@modules/products/components/groups/GroupsTable';
import {
  defaultValues,
  IProductGroupFormValues,
} from '@modules/products/components/groups/schema';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { syntheticId } from '@src/utils/synthetic-id';
import { Button } from 'antd';
import { useFormContext } from 'react-hook-form';
import { MdAdd } from 'react-icons/md';
import { useIntl } from 'react-intl';

export const ProductGroups = ({
  onDone,
  loading,
  onDelete,
  onSort,
}: {
  onDone: (value: IProductGroupFormValues[]) => void;
  loading: boolean;
  onDelete: (id: ID) => void;
  onSort: (groups: IProductGroupFormValues[]) => void;
}) => {
  const intl = useIntl();
  const { setValue, watch } = useFormContext();
  const groups = watch('groups') || [];

  const isEditing = groups.some((it: any) => it.isEditing);

  const setGroups = (groups: any[]) => {
    setValue('groups', groups, { shouldDirty: true });
  };

  const onAdd = () => {
    setGroups([
      ...groups,
      {
        ...defaultValues,
        isEditing: true,
        isNew: true,
        id: syntheticId(),
      },
    ]);
  };

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={intl.formatMessage({
          id: 'products.tabs.components',
        })}
        name="groups"
        extra={
          <Button
            icon={<MdAdd />}
            onClick={onAdd}
            data-testid="add-group-products-button"
          />
        }
      />
      {groups.length > 0 && (
        <Paper>
          <ProductGroupsTable
            value={groups}
            onChange={setGroups}
            isEditing={isEditing}
            onDone={onDone}
            loading={loading}
            onDelete={onDelete}
            onSort={onSort}
          />
        </Paper>
      )}
    </DrawerPaper>
  );
};
