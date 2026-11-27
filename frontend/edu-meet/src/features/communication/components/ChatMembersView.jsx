import { useLayoutEffect, useRef } from "react";
import ChatMemberItem from "./ChatMemberItem.jsx";

export default function ChatMembersView({ conversation, members }) {
  const headingRef = useRef(null);

  useLayoutEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      className="communication-chat-members"
      aria-labelledby="communication-chat-members-heading"
    >
      <div className="communication-chat-members-heading-row">
        <h2
          className="communication-chat-members-heading"
          id="communication-chat-members-heading"
          ref={headingRef}
          tabIndex={-1}
        >
          Chat Members
        </h2>
        <span
          className="communication-chat-members-count"
          aria-label={`${members.length} members`}
        >
          ({members.length})
        </span>
      </div>

      <div
        className="communication-chat-view-scroll communication-chat-members-scroll"
        role="region"
        aria-label={`${conversation.name} members`}
        tabIndex={0}
      >
        {members.length > 0 ? (
          <ul className="communication-chat-members-list">
            {members.map((member) => (
              <ChatMemberItem key={member.id} member={member} />
            ))}
          </ul>
        ) : (
          <p className="communication-chat-members-empty" role="status">
            No members listed.
          </p>
        )}
      </div>
    </section>
  );
}
