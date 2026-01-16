import {
  FilterType,
  IFilterSchema,
  enumOperators,
  numberOperators,
  dateOperators,
} from "@/layouts/filters";

export const filterSchema: IFilterSchema[] = [
  {
    key: "provider",
    label: "Provider",
    description: "Filter by storage provider",
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
    description: "Filter by file type",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "mimeType",
    options: [
      { label: "Image", value: "image" },
      { label: "Video", value: "video" },
      { label: "Audio", value: "audio" },
      { label: "PDF", value: "application/pdf" },
    ],
  },
  {
    key: "sizeBytes",
    label: "Size",
    description: "Filter by file size in bytes",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "sizeBytes",
  },
  {
    key: "createdAt",
    label: "Created",
    description: "Filter by creation date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "createdAt",
  },
];
