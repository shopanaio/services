import { useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  OptionDisplayType,
  type ApiProductOption,
  type ApiProductOptionValue,
  type ApiProductOptionSwatchInput,
} from "@/graphql/types";
import type { IEditOptionsFormValues } from "../edit-options-modal.schema";
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

  const handleUpdateGroupDisplayType = useCallback(
    (groupIndex: number, displayType: OptionDisplayType) => {
      setValue(`groups.${groupIndex}.displayType`, displayType);
    },
    [setValue]
  );

  const handleDeleteGroup = useCallback(
    (groupIndex: number) => {
      remove(groupIndex);
    },
    [remove]
  );

  const handleUpdateValueName = useCallback(
    (groupIndex: number, valueIndex: number, name: string) => {
      setValue(`groups.${groupIndex}.values.${valueIndex}.name`, name);
    },
    [setValue]
  );

  const handleUpdateValueSwatch = useCallback(
    (groupIndex: number, valueIndex: number, swatch: ApiProductOptionSwatchInput) => {
      setValue(`groups.${groupIndex}.values.${valueIndex}.swatch`, swatch as ApiProductOption["values"][0]["swatch"]);
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
      const newValue: ApiProductOptionValue = {
        __typename: "ProductOptionValue",
        id: `val-${Date.now()}`,
        name: "",
        slug: "",
        swatch: { ...DEFAULT_SWATCH, __typename: "ProductOptionSwatch", id: `swatch-${Date.now()}`, file: null, metadata: null },
      };
      setValue(`groups.${groupIndex}.values`, [...currentValues, newValue]);
    },
    [setValue, getValues]
  );

  const handleReorderValues = useCallback(
    (groupIndex: number, values: ApiProductOptionValue[]) => {
      setValue(`groups.${groupIndex}.values`, values);
    },
    [setValue]
  );

  const handleAddGroup = useCallback(() => {
    const newGroup: ApiProductOption = {
      __typename: "ProductOption",
      id: `opt-${Date.now()}`,
      name: "New Option",
      slug: "new-option",
      displayType: OptionDisplayType.Buttons,
      values: [],
    };
    append(newGroup);
  }, [append]);

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
    handleUpdateGroupDisplayType,
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
