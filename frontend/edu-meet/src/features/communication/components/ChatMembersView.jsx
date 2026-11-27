import { useLayoutEffect, useRef, useState } from "react";
import ChatMemberItem from "./ChatMemberItem.jsx";

export default function ChatMembersView({ conversation, members, currentUserId, onMessageMember }) {
  const headingRef = useRef(null);
  const requestRef = useRef(null);
  const [openingMemberId, setOpeningMemberId] = useState(null);
  const [messageError, setMessageError] = useState(null);

  useLayoutEffect(() => {
    headingRef.current?.focus();
    return () => requestRef.current?.abort();
  }, []);

  async function handleMessage(member) {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setOpeningMemberId(member.id);
    setMessageError(null);
    try {
      await onMessageMember(member, { signal: controller.signal });
    } catch (error) {
      if (!controller.signal.aborted) setMessageError(error.message);
    } finally {
      requestRef.current = null;
      if (!controller.signal.aborted) setOpeningMemberId(null);
    }
  }

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

      {messageError && <p className="communication-chat-notice" role="alert">{messageError}</p>}
      <div
        className="communication-chat-view-scroll communication-chat-members-scroll"
        role="region"
        aria-label={`${conversation.name} members`}
        tabIndex={0}
      >
        {members.length > 0 ? (
          <ul className="communication-chat-members-list">
            {members.map((member) => (
              <ChatMemberItem
                key={member.id}
                member={member}
                onMessage={onMessageMember && member.id !== currentUserId ? () => handleMessage(member) : undefined}
                messageDisabled={openingMemberId !== null}
                openingChat={openingMemberId === member.id}
              />
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
