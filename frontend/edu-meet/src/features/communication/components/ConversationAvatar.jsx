import { useState } from "react";

export default function ConversationAvatar({ type, imageUrl, size = 50 }) {
  const [failedImageUrl, setFailedImageUrl] = useState(null);

  const avatarType = type === "group" ? "group" : "individual";
  const imageFailed = imageUrl && failedImageUrl === imageUrl;

  return (
    <span
      className={`communication-avatar communication-avatar--${avatarType}`}
      style={{ "--communication-avatar-size": `${size}px` }}
      aria-hidden="true"
    >
      {avatarType === "group" ? (
        <svg
          className="communication-avatar-fallback"
          viewBox="0 0 50 50"
          focusable="false"
        >
          <circle cx="18" cy="17" r="6" />
          <circle cx="33" cy="17" r="6" />
          <path d="M4 42v-3c0-7 5-12 12-12s12 5 12 12v3H4Z" />
          <path d="M24 42v-3c0-7 4-12 10-12s12 5 12 12v3H24Z" />
        </svg>
      ) : (
        <svg
          className="communication-avatar-fallback"
          viewBox="0 0 50 50"
          focusable="false"
        >
          <circle cx="25" cy="17" r="8" />
          <path d="M8 43v-3c0-9 7-15 17-15s17 6 17 15v3H8Z" />
        </svg>
      )}
      {imageUrl && !imageFailed && (
        <img
          className="communication-avatar-image"
          src={imageUrl}
          alt=""
          onError={() => setFailedImageUrl(imageUrl)}
        />
      )}
    </span>
  );
}
