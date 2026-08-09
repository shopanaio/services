import { useCallback } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  createTemporaryOptionId,
  createTemporaryOptionValueId,
} from "../../../mappers";
import type { IEditOptionsFormValues } from "../edit-options-modal.schema";
import type {
  OptionEditorGroup,
  OptionEditorCategory,
  OptionEditorSwatch,
  OptionEditorValue,
} from "../types";

interface UseEditOptionsFormProps {
  defaultValues?: IEditOptionsFormValues;
  onChange?: () => void;
}

function moveArray<T>(items: T[], oldIndex: number, newIndex: number): T[] {
  const next = [...items];
  const [item] = next.splice(oldIndex, 1);

  if (!item) {
    return items;
  }

  next.splice(newIndex, 0, item);
  return next;
}

function normalizeValueSortIndexes(
  values: OptionEditorValue[],
): OptionEditorValue[] {
  return values.map((value, index) => ({
    ...value,
    sortIndex: index,
  }));
}

function normalizeGroupSortIndexes(
  groups: OptionEditorGroup[],
): OptionEditorGroup[] {
  return groups.map((group, index) => ({
    ...group,
    sortIndex: index,
    values: normalizeValueSortIndexes(group.values),
  }));
}

function createEmptyValue(input: {
  sortIndex: number;
}): OptionEditorValue {
  return {
    id: createTemporaryOptionValueId(),
    name: "",
    slug: "",
    sortIndex: input.sortIndex,
    swatch: null,
  };
}

export const useEditOptionsForm = ({
  defaultValues = { groups: [] },
  onChange,
}: UseEditOptionsFormProps = {}) => {
  const { control, watch, setValue, getValues } =
    useForm<IEditOptionsFormValues>({
      defaultValues: {
        groups: normalizeGroupSortIndexes(defaultValues.groups),
      },
    });

  const { fields, replace } = useFieldArray({
    control,
    name: "groups",
  });

  const watchedGroups = watch("groups") ?? [];

  const notifyChange = useCallback(() => {
    onChange?.();
  }, [onChange]);

  const replaceGroups = useCallback(
    (groups: OptionEditorGroup[]) => {
      replace(normalizeGroupSortIndexes(groups));
      notifyChange();
    },
    [notifyChange, replace],
  );

  const handleUpdateGroupName = useCallback(
    (groupIndex: number, name: string) => {
      setValue(`groups.${groupIndex}.name`, name, { shouldDirty: true });
      notifyChange();
    },
    [notifyChange, setValue],
  );

  const handleUpdateGroupCategory = useCallback(
    (groupIndex: number, category: OptionEditorCategory) => {
      const group = getValues(`groups.${groupIndex}`);
      setValue(`groups.${groupIndex}`, {
        ...group,
        category,
      }, { shouldDirty: true });
      notifyChange();
    },
    [getValues, notifyChange, setValue],
  );

  const handleDeleteGroup = useCallback(
    (groupIndex: number) => {
      replaceGroups(getValues("groups").filter((_, index) => index !== groupIndex));
    },
    [getValues, replaceGroups],
  );

  const handleUpdateValueName = useCallback(
    (groupIndex: number, valueIndex: number, name: string) => {
      setValue(`groups.${groupIndex}.values.${valueIndex}.name`, name, {
        shouldDirty: true,
      });
      notifyChange();
    },
    [notifyChange, setValue],
  );

  const handleUpdateValueSwatch = useCallback(
    (
      groupIndex: number,
      valueIndex: number,
      swatch: OptionEditorSwatch,
    ) => {
      setValue(
        `groups.${groupIndex}.values.${valueIndex}.swatch`,
        swatch,
        { shouldDirty: true },
      );
      notifyChange();
    },
    [notifyChange, setValue],
  );

  const handleDeleteValue = useCallback(
    (groupIndex: number, valueIndex: number) => {
      const group = getValues(`groups.${groupIndex}`);

      if (group.values.length <= 1) {
        return;
      }

      const values = group.values.filter((_, index) => index !== valueIndex);

      setValue(
        `groups.${groupIndex}.values`,
        normalizeValueSortIndexes(values),
        { shouldDirty: true },
      );
      notifyChange();
    },
    [getValues, notifyChange, setValue],
  );

  const handleAddValue = useCallback(
    (groupIndex: number) => {
      const group = getValues(`groups.${groupIndex}`);
      const currentValues = group.values;
      const newValue = createEmptyValue({ sortIndex: currentValues.length });

      setValue(
        `groups.${groupIndex}.values`,
        normalizeValueSortIndexes([...currentValues, newValue]),
        { shouldDirty: true },
      );
      notifyChange();
    },
    [getValues, notifyChange, setValue],
  );

  const handleReorderValues = useCallback(
    (groupIndex: number, values: OptionEditorValue[]) => {
      setValue(
        `groups.${groupIndex}.values`,
        normalizeValueSortIndexes(values),
        { shouldDirty: true },
      );
      notifyChange();
    },
    [notifyChange, setValue],
  );

  const handleAddGroup = useCallback(() => {
    const currentGroups = getValues("groups");
    const newGroup: OptionEditorGroup = {
      id: createTemporaryOptionId(),
      name: "New Option",
      slug: "",
      category: null,
      sortIndex: currentGroups.length,
      values: [
        createEmptyValue({ sortIndex: 0 }),
      ],
    };

    replaceGroups([...currentGroups, newGroup]);
  }, [getValues, replaceGroups]);

  const handleMoveGroup = useCallback(
    (oldIndex: number, newIndex: number) => {
      replaceGroups(moveArray(getValues("groups"), oldIndex, newIndex));
    },
    [getValues, replaceGroups],
  );

  return {
    fields,
    watchedGroups,
    handleUpdateGroupName,
    handleUpdateGroupCategory,
    handleDeleteGroup,
    handleUpdateValueName,
    handleUpdateValueSwatch,
    handleDeleteValue,
    handleAddValue,
    handleReorderValues,
    handleAddGroup,
    handleMoveGroup,
  };
};
