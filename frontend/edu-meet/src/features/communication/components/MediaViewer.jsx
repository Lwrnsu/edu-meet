import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { downloadChatAttachment } from "../services/attachmentDownload.js";

export default function MediaViewer({ attachment, trigger, onClose }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = useId();
  const [status, setStatus] = useState("loading");
  const [downloadError, setDownloadError] = useState(null);
  const isVideo = Boolean(attachment.videoUrl);
  const mediaLabel = isVideo ? "video" : "image";

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    closeRef.current.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [trigger]);

  return createPortal(
    <dialog
      className="communication-media-viewer"
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <header className="communication-media-viewer-header">
        <h2 id={titleId}>{attachment.name}</h2>
        <button type="button" ref={closeRef} onClick={onClose} aria-label={`Close ${mediaLabel} viewer`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </header>
      <div
        className="communication-media-viewer-stage"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        {status === "error" ? (
          <p role="status">
            {isVideo ? "Video" : "Image"} preview unavailable.{" "}
            <button type="button" onClick={() =>
              downloadChatAttachment(attachment).catch((error) => setDownloadError(error.message))
            }>Download file</button>
          </p>
        ) : isVideo ? (
          <video src={attachment.videoUrl} controls playsInline preload="metadata"
            aria-label={attachment.name} onError={() => setStatus("error")} />
        ) : (
          <>
            {status === "loading" && <p role="status">Loading image…</p>}
            <img
              src={attachment.previewUrl}
              alt={attachment.name}
              className={status === "loading" ? "communication-media-viewer-loading" : undefined}
              onLoad={() => setStatus("ready")}
              onError={() => setStatus("error")}
            />
          </>
        )}
        {downloadError && <p role="alert">{downloadError}</p>}
      </div>
    </dialog>,
    document.body,
  );
}
