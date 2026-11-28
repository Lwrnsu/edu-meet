import { useEffect, useRef, useState } from "react";
import { downloadChatAttachment, fetchChatAttachment } from "../services/attachmentDownload.js";

const INLINE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const VIDEO_EXTENSIONS = new Set(["MP4", "WEBM", "MOV", "M4V", "AVI", "MKV", "MPEG", "MPG", "OGV", "3GP", "WMV"]);

export default function MessageAttachment({ attachment, onOpenMedia }) {
  const container = useRef(null);
  const inlineVideo = useRef(null);
  const [failedPreviewUrl, setFailedPreviewUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const { name, contentType, downloadUrl, accessToken } = attachment;
  const extension = name.match(/\.([a-z\d]{1,10})$/i)?.[1].toUpperCase();
  const isImage = INLINE_IMAGE_TYPES.has(contentType);
  const isVideo = contentType?.startsWith("video/") || VIDEO_EXTENSIONS.has(extension);
  const isPdf = contentType === "application/pdf" || extension === "PDF";
  const canPreview = isImage && previewUrl && failedPreviewUrl !== previewUrl && onOpenMedia;
  // Native media requests cannot attach the chat API's bearer header.
  const videoUrl = isVideo ? attachment.videoUrl : null;

  useEffect(() => {
    if (!isImage) return;
    const controller = new AbortController();
    const { signal } = controller;
    let objectUrl;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      fetchChatAttachment({ downloadUrl, accessToken }, { signal })
        .then((blob) => {
          if (signal.aborted) return;
          // Only render a blob whose type agrees with the server-validated metadata.
          if (blob.type !== contentType) return;
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
        })
        .catch(() => {});
    }, { rootMargin: "200px" });
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isImage, contentType, downloadUrl, accessToken]);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    try {
      await downloadChatAttachment(attachment);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="communication-message-attachment" ref={container}>
      {videoUrl && failedPreviewUrl !== videoUrl && (
        <>
          <video className="communication-attachment-video" ref={inlineVideo} src={videoUrl}
            controls playsInline preload="metadata" aria-label={name}
            onError={() => setFailedPreviewUrl(videoUrl)} />
          {onOpenMedia && (
            <button className="communication-attachment-download" type="button"
              onClick={(event) => {
                inlineVideo.current?.pause();
                onOpenMedia(attachment, event.currentTarget);
              }}>
              Open video viewer
            </button>
          )}
        </>
      )}
      {canPreview && (
        <button
          className="communication-attachment-preview"
          type="button"
          aria-label={"Open image: " + name}
          onClick={(event) => onOpenMedia({ ...attachment, previewUrl }, event.currentTarget)}
        >
          <img src={previewUrl} alt="" loading="lazy" onError={() => setFailedPreviewUrl(previewUrl)} />
        </button>
      )}
      <button className="communication-attachment-download" type="button"
        aria-label={"Download " + name} disabled={isDownloading} onClick={handleDownload}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {isVideo ? (
            <path d="M3 6h18v12H3zM10 9l5 3-5 3z" />
          ) : (
            <>
              <path d="M6 3h8l4 4v14H6zM14 3v5h4" />
              {isPdf ? <path d="M9 14h6m-6 3h6" /> : null}
            </>
          )}
        </svg>
        <span className="communication-attachment-filename">{name}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" />
        </svg>
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
