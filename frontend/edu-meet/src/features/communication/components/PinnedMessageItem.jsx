import pushPinIcon from "../assets/push-pin.png";
import ConversationAvatar from "./ConversationAvatar.jsx";

function getPinnedTimestamp(message) {
  const timestamp = message.timestamp ?? "";
  if (!message.createdAt) {
    return timestamp.toUpperCase();
  }

  const createdAt = new Date(message.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    return timestamp.toUpperCase();
  }

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(createdAt);

  return [weekday, timestamp].filter(Boolean).join(" ").toUpperCase();
}

export default function PinnedMessageItem({ message, onNavigate, onUnpin }) {
  const senderName =
    message.senderName ??
    (message.direction === "outgoing" ? "You" : "Group member");

  return (
    <li
      className="communication-pinned-message-card"
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onNavigate?.();
        }
      }}
    >
      <ConversationAvatar
        type="individual"
        imageUrl={message.avatarUrl}
        size={60}
      />
      <div className="communication-pinned-message-content">
        <span className="communication-pinned-message-sender">
          {senderName}
        </span>
        <div className="communication-message-bubble communication-message-bubble--incoming communication-pinned-message-bubble">
          <p className="communication-message-text communication-pinned-message-text">
            {message.text}
          </p>
        </div>
      </div>
      <time
        className="communication-pinned-message-time"
        dateTime={message.createdAt}
      >
        {getPinnedTimestamp(message)}
      </time>
      <button
        className="communication-pinned-message-unpin"
        type="button"
        aria-label="Unpin message"
        onClick={(event) => {
          event.stopPropagation();
          onUnpin?.();
        }}
      >
        <img
          className="communication-pinned-message-icon"
          src={pushPinIcon}
          alt=""
          aria-hidden="true"
        />
      </button>
    </li>
  );
}
