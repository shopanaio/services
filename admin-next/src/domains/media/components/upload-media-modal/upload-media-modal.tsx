"use client";

import { useState, useCallback } from "react";
import { Upload, Input, Button, Tabs, message } from "antd";
import type { UploadFile } from "antd";
import { Paper } from "@/ui-kit/paper";
import {
  CloudUploadOutlined,
  LinkOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import {
  ModalLayout,
  ModalHeader,
  useModalStackContext,
} from "@/layouts/modals";
import { useStyles } from "./upload-media-modal.styles";
import { parseMediaUrl } from "./upload-media-modal.utils";
import type { IUploadMediaModalPayload } from "../../modals";

const { Dragger } = Upload;

// ============================================
// Types
// ============================================

export interface UploadedMedia {
  id: string;
  url: string;
  name: string;
  type: "image" | "video" | "youtube";
  thumbnailUrl?: string;
  file?: File;
}

export interface IUploadMediaModalProps {
  onClose: () => void;
  onUpload: (media: UploadedMedia[]) => void | Promise<void>;
  accept?: string;
  maxSize?: number; // in MB
  maxFiles?: number;
}

// ============================================
// Component
// ============================================

export const UploadMediaModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IUploadMediaModalPayload;

  // Props from payload with defaults
  const accept = typedPayload?.accept ?? "image/*,video/*";
  const maxSize = typedPayload?.maxSize ?? 10;
  const maxFiles = typedPayload?.maxFiles ?? 20;
  const onUploadCallback = typedPayload?.onUpload;

  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlMedia, setUrlMedia] = useState<UploadedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Combine all media for preview
  const allMedia: UploadedMedia[] = [
    ...fileList
      .filter((f) => f.originFileObj || f.url)
      .map((f) => ({
        id: f.uid,
        url:
          f.url ||
          (f.originFileObj ? URL.createObjectURL(f.originFileObj) : ""),
        name: f.name,
        type: (f.type?.startsWith("video/") ? "video" : "image") as
          | "image"
          | "video",
        file: f.originFileObj,
      })),
    ...urlMedia,
  ];

  // Handle file upload
  const handleUploadChange = useCallback(
    (info: { fileList: UploadFile[] }) => {
      const { fileList: newFileList } = info;
      // Filter by size
      const validFiles = newFileList.filter((file) => {
        if (file.size && file.size / 1024 / 1024 > maxSize) {
          message.error(`${file.name} exceeds ${maxSize}MB limit`);
          return false;
        }
        return true;
      });

      // Limit total files
      if (validFiles.length + urlMedia.length > maxFiles) {
        message.warning(`Maximum ${maxFiles} files allowed`);
        setFileList(validFiles.slice(0, maxFiles - urlMedia.length));
        return;
      }

      setFileList(validFiles);
    },
    [maxSize, maxFiles, urlMedia.length]
  );

  // Handle URL add
  const handleAddUrl = useCallback(async () => {
    if (!urlInput.trim()) return;

    const trimmedUrl = urlInput.trim();

    // Check for duplicates
    if (urlMedia.some((m) => m.url === trimmedUrl)) {
      message.warning("This URL has already been added");
      return;
    }

    // Check total limit
    if (allMedia.length >= maxFiles) {
      message.warning(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsLoading(true);

    try {
      const parsed = await parseMediaUrl(trimmedUrl);

      if (!parsed) {
        message.error(
          "Invalid URL. Please enter a valid image or YouTube URL."
        );
        return;
      }

      const newMedia: UploadedMedia = {
        id: `url-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url: parsed.url,
        name: parsed.name,
        type: parsed.type,
        thumbnailUrl: parsed.thumbnailUrl,
      };

      setUrlMedia((prev) => [...prev, newMedia]);
      setUrlInput("");
      message.success("Media added successfully");
    } catch {
      message.error("Failed to process URL");
    } finally {
      setIsLoading(false);
    }
  }, [urlInput, urlMedia, allMedia.length, maxFiles]);

  // Handle remove media
  const handleRemoveMedia = useCallback((id: string) => {
    setFileList((prev) => prev.filter((f) => f.uid !== id));
    setUrlMedia((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (allMedia.length === 0) {
      message.warning("Please add at least one media file");
      return;
    }

    setIsLoading(true);
    try {
      await onUploadCallback?.(allMedia);
      pop();
    } catch {
      message.error("Failed to upload media");
    } finally {
      setIsLoading(false);
    }
  }, [allMedia, onUploadCallback, pop]);

  // Custom upload request (don't actually upload, just add to list)
  const customRequest = useCallback((options) => {
    setTimeout(() => options.onSuccess?.("ok"), 0);
  }, []);

  // Render preview item
  const renderPreviewItem = (media: UploadedMedia) => {
    const thumbnailUrl = media.thumbnailUrl || media.url;

    return (
      <div key={media.id} className={styles.previewItem}>
        {media.type === "youtube" ? (
          <div className={styles.previewVideo}>
            {media.thumbnailUrl ? (
              <img
                src={media.thumbnailUrl}
                alt={media.name}
                className={styles.previewImage}
              />
            ) : (
              <PlayCircleOutlined style={{ fontSize: 32 }} />
            )}
          </div>
        ) : media.type === "video" ? (
          <div className={styles.previewVideo}>
            <PlayCircleOutlined style={{ fontSize: 32 }} />
            <Text style={{ color: "#fff", marginTop: 8 }}>{media.name}</Text>
          </div>
        ) : (
          <img
            src={thumbnailUrl}
            alt={media.name}
            className={styles.previewImage}
          />
        )}
        <button
          className={styles.previewRemove}
          onClick={() => handleRemoveMedia(media.id)}
          type="button"
        >
          <DeleteOutlined style={{ fontSize: 12 }} />
        </button>
      </div>
    );
  };

  return (
    <ModalLayout
      name="upload-media"
      header={
        <ModalHeader
          name="upload-media"
          title="Upload Media"
          onClose={pop}
          submitButtonProps={{
            children: "Upload",
            onClick: handleSave,
            loading: isLoading,
            disabled: allMedia.length === 0,
          }}
        />
      }
    >
      <div className={styles.container}>
        <Paper className={styles.paper}>
          {/* Tabs */}
          <Tabs
            type="card"
            size="small"
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as "upload" | "url")}
            className={styles.tabsContainer}
            items={[
              {
                key: "upload",
                icon: <CloudUploadOutlined />,
                label: "Upload Files",
              },
              {
                key: "url",
                icon: <LinkOutlined />,
                label: "Add from URL",
              },
            ]}
          />

          <div className={styles.tabContent}>
            {/* Upload Tab Content */}
            {activeTab === "upload" && (
              <div className={styles.draggerWrapper}>
                <Dragger
                  className={styles.dragger}
                  multiple
                  accept={accept}
                  fileList={fileList}
                  onChange={handleUploadChange}
                  customRequest={customRequest}
                  showUploadList={false}
                >
                  <CloudUploadOutlined className={styles.uploadIcon} />
                  <p className={styles.uploadTitle}>Drag and drop files here</p>
                  <p className={styles.uploadHint}>
                    or <span className={styles.browseLink}>browse</span> to
                    choose files
                  </p>
                </Dragger>
              </div>
            )}

            {/* URL Tab Content */}
            {activeTab === "url" && (
              <div className={styles.urlSection}>
                <div className={styles.urlInputWrapper}>
                  <Input
                    className={styles.urlInput}
                    placeholder="Enter image URL or YouTube video URL"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onPressEnter={handleAddUrl}
                    prefix={<LinkOutlined />}
                  />
                  <Button
                    className={styles.urlButton}
                    type="primary"
                    onClick={handleAddUrl}
                    loading={isLoading}
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Paper>

        {/* Preview Section */}
        {allMedia.length > 0 && (
          <div className={styles.previewSection}>
            <div className={styles.previewTitle}>
              Added Media ({allMedia.length}/{maxFiles})
            </div>
            <div className={styles.previewGrid}>
              {allMedia.map(renderPreviewItem)}
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className={styles.footerInfo}>
          <InfoCircleOutlined className={styles.infoIcon} />
          <span>
            First image will be set as the featured media. Drag to reorder after
            upload.
          </span>
        </div>
      </div>
    </ModalLayout>
  );
};
