import { FilterType, IFilterSchema } from "@/layouts/filters";
import { enumOperators } from "@/layouts/filters";

export const filterSchema: IFilterSchema[] = [
  {
    key: "provider",
    label: "Provider",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "provider",
    options: [
      { label: "S3", value: "S3" },
      { label: "YouTube", value: "YOUTUBE" },
      { label: "Vimeo", value: "VIMEO" },
      { label: "URL", value: "URL" },
      { label: "Local", value: "LOCAL" },
    ],
  },
  {
    key: "mimeType",
    label: "Type",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "mimeType",
    options: [
      { label: "Image", value: "image/*" },
      { label: "Video", value: "video/*" },
      { label: "Audio", value: "audio/*" },
      { label: "PDF", value: "application/pdf" },
    ],
  },
];
