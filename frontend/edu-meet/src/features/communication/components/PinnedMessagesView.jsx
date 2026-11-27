import { useLayoutEffect, useRef } from "react";
import PinnedMessageItem from "./PinnedMessageItem.jsx";

export default function PinnedMessagesView({ conversation, messages }) {
  const headingRef = useRef(null);

  useLayoutEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      className="communication-pinned-messages"
      aria-labelledby="communication-pinned-messages-heading"
    >
      <div className="communication-pinned-messages-heading-row">
        <h2
          className="communication-pinned-messages-heading"
          id="communication-pinned-messages-heading"
          ref={headingRef}
          tabIndex={-1}
        >
          Pinned Messages
        </h2>
        <span
          className="communication-pinned-messages-count"
          aria-label={`${messages.length} pinned messages`}
        >
          ({messages.length})
        </span>
      </div>

      <div
        className="communication-chat-view-scroll communication-pinned-messages-scroll"
        role="region"
        aria-label={`${conversation.name} pinned messages`}
        tabIndex={0}
      >
        {messages.length > 0 ? (
          <ol className="communication-pinned-message-list">
            {messages.map((message) => (
              <PinnedMessageItem key={message.id} message={message} />
            ))}
          </ol>
        ) : (
          <p className="communication-pinned-messages-empty" role="status">
            No pinned messages.
          </p>
        )}
      </div>
    </section>
  );
}
