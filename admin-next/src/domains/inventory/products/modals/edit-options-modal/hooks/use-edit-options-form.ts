import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  editOptionsSchema,
  type IEditOptionsFormValues,
  type IOptionGroup,
  type IOptionValue,
  type ISwatch,
  type FeatureStyleType,
} from "../edit-options-modal.schema";
import { DEFAULT_SWATCH } from "../edit-options-modal.constants";

interface UseEditOptionsFormProps {
  defaultValues?: IEditOptionsFormValues;
  onSubmit?: (data: IEditOptionsFormValues) => void;
}

export const useEditOptionsForm = ({
  defaultValues = { groups: [] },
  onSubmit,
}: UseEditOptionsFormProps = {}) => {
  const { control, handleSubmit, watch, setValue, getValues } =
    useForm<IEditOptionsFormValues>({
      resolver: zodResolver(editOptionsSchema),
      defaultValues,
    });

  const { fields, remove, append, move } = useFieldArray({
    control,
    name: "groups",
  });

  const watchedGroups = watch("groups");

  const handleUpdateGroupName = useCallback(
    (groupIndex: number, name: string) => {
      setValue(`groups.${groupIndex}.name`, name);
    },
    [setValue]
  );

  const handleUpdateGroupStyle = useCallback(
    (groupIndex: number, style: FeatureStyleType) => {
      setValue(`groups.${groupIndex}.style`, style);
    },
    [setValue]
  );

  const handleDeleteGroup = useCallback(
    (groupIndex: number) => {
      remove(groupIndex);
    },
    [remove]
  );

  const handleUpdateValueLabel = useCallback(
    (groupIndex: number, valueIndex: number, label: string) => {
      setValue(`groups.${groupIndex}.values.${valueIndex}.label`, label);
    },
    [setValue]
  );

  const handleUpdateValueSwatch = useCallback(
    (groupIndex: number, valueIndex: number, swatch: ISwatch) => {
      setValue(`groups.${groupIndex}.values.${valueIndex}.swatch`, swatch);
    },
    [setValue]
  );

  const handleDeleteValue = useCallback(
    (groupIndex: number, valueIndex: number) => {
      const currentValues = getValues(`groups.${groupIndex}.values`);
      const newValues = currentValues.filter((_, idx) => idx !== valueIndex);
      setValue(`groups.${groupIndex}.values`, newValues);
    },
    [setValue, getValues]
  );

  const handleAddValue = useCallback(
    (groupIndex: number) => {
      const currentValues = getValues(`groups.${groupIndex}.values`);
      const newValue: IOptionValue = {
        id: `val-${Date.now()}`,
        label: "",
        slug: "",
        sortIndex: currentValues.length,
        swatch: { ...DEFAULT_SWATCH },
      };
      setValue(`groups.${groupIndex}.values`, [...currentValues, newValue]);
    },
    [setValue, getValues]
  );

  const handleReorderValues = useCallback(
    (groupIndex: number, values: IOptionValue[]) => {
      setValue(`groups.${groupIndex}.values`, values);
    },
    [setValue]
  );

  const handleAddGroup = useCallback(() => {
    const currentGroups = getValues("groups");
    const newGroup: IOptionGroup = {
      id: `opt-${Date.now()}`,
      name: "New Option",
      slug: "new-option",
      style: "radio",
      values: [],
      sortIndex: currentGroups.length,
    };
    append(newGroup);
  }, [append, getValues]);

  const handleMoveGroup = useCallback(
    (oldIndex: number, newIndex: number) => {
      move(oldIndex, newIndex);
    },
    [move]
  );

  const submitForm = useCallback(
    (data: IEditOptionsFormValues) => {
      onSubmit?.(data);
    },
    [onSubmit]
  );

  return {
    fields,
    watchedGroups,
    handleSubmit: handleSubmit(submitForm),
    handleUpdateGroupName,
    handleUpdateGroupStyle,
    handleDeleteGroup,
    handleUpdateValueLabel,
    handleUpdateValueSwatch,
    handleDeleteValue,
    handleAddValue,
    handleReorderValues,
    handleAddGroup,
    handleMoveGroup,
  };
};
