import doubleTickIcon from "../assets/double-tick.png";

export default function MessageBubble({ message, isOutgoing, isLast }) {
  const status = message.status === "double-tick" && !message.isLocal;

  return (
    <li className="communication-message-bubble-row">
      {isOutgoing && isLast && (
        <div className="communication-message-metadata">
          <time dateTime={message.createdAt}>{message.timestamp}</time>
          {status && (
            <img
              className="communication-message-status"
              src={doubleTickIcon}
              alt=""
              aria-label="Message status"
            />
          )}
        </div>
      )}
      <div
        className={`communication-message-bubble communication-message-bubble--${isOutgoing ? "outgoing" : "incoming"}`}
      >
        <p className="communication-message-text">{message.text}</p>
      </div>
      {!isOutgoing && isLast && (
        <time
          className="communication-message-metadata"
          dateTime={message.createdAt}
        >
          {message.timestamp}
        </time>
      )}
    </li>
  );
}
